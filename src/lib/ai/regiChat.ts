import { GoogleGenAI } from "@google/genai";
import type { RegiGarageContext } from "@/lib/regi/types";
import { formatGarageContextForPrompt } from "@/lib/regi/context";
import { REGI_APP_FEATURES_REPLY } from "@/lib/regi/constants";

export type RegiChatTurn = {
  role: "user" | "assistant";
  content: string;
};

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export function isRegiChatConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function systemPrompt(context: RegiGarageContext): string {
  const garage = formatGarageContextForPrompt(context);
  const name = context.userFirstName ?? "there";

  return `You are Regi, a friendly and slightly witty AI helper inside the REGI vehicle registration app. You help users understand their garage, registration expirations, documents, and app features.

Personality:
- Warm, concise, like texting a knowledgeable friend — not corporate or robotic.
- Light humor is welcome when appropriate; never snarky or dismissive.
- Use the user's first name (${name}) occasionally, not every sentence.
- Keep replies to 1–3 short paragraphs max unless listing features.

Rules:
- ONLY use facts from the garage context below. Never invent vehicles, dates, plates, or document counts.
- If you don't know something, say so and suggest where in the app to look.
- Do not give legal advice; stick to what the app shows and general registration reminders.
- Do not mention being an AI model unless asked.
- Plain text only — no markdown headers, no bullet syntax with asterisks unless listing app features.

Garage context:
${garage}`;
}

function fallbackBootstrap(context: RegiGarageContext): string {
  const name = context.userFirstName;
  const hey = name ? `Hey ${name}` : "Hey";

  if (context.vehicleCount === 0) {
    return `${hey} — your garage is wide open right now. Want help adding your first registration?`;
  }

  const next = context.soonestExpiration;
  if (!next) {
    return `${hey} — what can I do for you today?`;
  }

  if (next.daysUntilExpiration < 0) {
    return `${hey} — heads up, your ${next.label} registration looks expired. Want to talk through what's next?`;
  }

  if (next.daysUntilExpiration === 0) {
    return `${hey} — your ${next.label} registration expires today. I can help you get organized.`;
  }

  if (next.daysUntilExpiration <= 14) {
    return `${hey} — your ${next.label} registration is up in ${next.daysUntilExpiration} day${next.daysUntilExpiration === 1 ? "" : "s"}. Want a quick rundown?`;
  }

  if (context.vehicleCount === 1) {
    return `${hey} — you've got ${next.label} in the garage, good through ${next.expiresOn}. What can I help with?`;
  }

  return `${hey} — next up is ${next.label} in ${next.daysUntilExpiration} days. You've got ${context.vehicleCount} registrations on file. What's on your mind?`;
}

function fallbackReply(context: RegiGarageContext, userMessage: string): string {
  const lower = userMessage.trim().toLowerCase();

  if (lower.includes("expir")) {
    if (context.vehicleCount === 0) {
      return "Nothing expiring yet — your garage is empty. Add a registration from the Garage tab when you're ready.";
    }
    const lines = context.vehicles
      .slice(0, 5)
      .map(
        (vehicle) =>
          `${vehicle.label}: ${vehicle.status.toLowerCase()}, ${vehicle.daysUntilExpiration} day(s) (${vehicle.expiresOn})`,
      );
    return `Here's what's on the board:\n${lines.join("\n")}`;
  }

  return "I'm having a little trouble connecting right now, but your garage data is safe. Try again in a moment, or tap App features to see what REGI can do.";
}

export function cannedRegiReply(message: string): string | null {
  const normalized = message.trim().toLowerCase();
  if (normalized === "app features" || normalized === "what can this app do?") {
    return REGI_APP_FEATURES_REPLY;
  }
  return null;
}

export function isCompleteRegiMessage(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 28) return false;
  return /[.!?](?:['"])?$/.test(trimmed);
}

function isCompleteMessage(text: string): boolean {
  return isCompleteRegiMessage(text);
}

export async function generateRegiBootstrap(context: RegiGarageContext): Promise<string> {
  const fallback = fallbackBootstrap(context);
  const client = getGeminiClient();
  if (!client) return fallback;

  try {
    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: [
        {
          text: `${systemPrompt(context)}

Write one complete opening greeting (1–2 sentences, max 220 characters). You already reviewed their garage. Mention the soonest expiring registration with days remaining, or an empty garage. Must end with proper punctuation. No markdown.`,
        },
      ],
      config: { temperature: 0.85, maxOutputTokens: 256 },
    });

    const text = response.text?.trim();
    if (text && isCompleteMessage(text)) return text;
    return fallback;
  } catch {
    return fallback;
  }
}

export async function generateRegiReply(input: {
  context: RegiGarageContext;
  history: RegiChatTurn[];
  userMessage: string;
}): Promise<string> {
  const canned = cannedRegiReply(input.userMessage);
  if (canned) return canned;

  const client = getGeminiClient();
  if (!client) return fallbackReply(input.context, input.userMessage);

  const contents = [
    { text: systemPrompt(input.context) },
    ...input.history.slice(-12).map((turn) => ({
      text: turn.role === "user" ? `User: ${turn.content}` : `Regi: ${turn.content}`,
    })),
    { text: `User: ${input.userMessage}` },
  ];

  try {
    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents,
      config: { temperature: 0.7, maxOutputTokens: 512 },
    });

    const text = response.text?.trim();
    return text || fallbackReply(input.context, input.userMessage);
  } catch {
    return fallbackReply(input.context, input.userMessage);
  }
}
