import { GoogleGenAI, type GenerateContentConfig, type GenerateContentResponse } from "@google/genai";
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

function isGoogleSearchEnabled(): boolean {
  const flag = process.env.REGI_ENABLE_GOOGLE_SEARCH?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export function isRegiChatConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function regiReplyConfig(maxOutputTokens: number): GenerateContentConfig {
  const config: GenerateContentConfig = {
    temperature: 0.7,
    maxOutputTokens,
    thinkingConfig: { thinkingBudget: 0 },
  };

  if (isGoogleSearchEnabled()) {
    config.tools = [{ googleSearch: {} }];
  }

  return config;
}

function extractResponseText(response: GenerateContentResponse): string {
  return response.text?.trim() ?? "";
}

function responseWasTruncated(response: GenerateContentResponse): boolean {
  const reason = response.candidates?.[0]?.finishReason;
  return reason === "MAX_TOKENS";
}

function mergeContinuationText(base: string, extra: string): string {
  const left = base.trimEnd();
  const right = extra.trimStart();
  if (!right) return left;
  if (!left) return right;
  if (/[a-zA-Z]$/.test(left) && /^['a-z]/.test(right)) {
    return `${left}${right}`;
  }
  return `${left} ${right}`;
}

async function continuePartialReply(input: {
  client: GoogleGenAI;
  model: string;
  contents: Array<{ text: string }>;
  config: GenerateContentConfig;
  partialText: string;
}): Promise<string> {
  let text = input.partialText.trim();
  if (!text || !isTruncatedRegiMessage(text)) return text;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const continuation = await input.client.models.generateContent({
      model: input.model,
      contents: [
        ...input.contents,
        { text: `Regi: ${text}` },
        {
          text: "Continue Regi's previous reply from exactly where it stopped. Finish the cut-off sentence and add at most one closing sentence. Do not repeat earlier text.",
        },
      ],
      config: {
        ...input.config,
        maxOutputTokens: 512,
        tools: undefined,
      },
    });

    const extra = extractResponseText(continuation);
    if (!extra) break;

    text = mergeContinuationText(text, extra);
    if (!isTruncatedRegiMessage(text) && !responseWasTruncated(continuation)) break;
  }

  return text;
}

async function ensureCompleteReply(input: {
  client: GoogleGenAI;
  model: string;
  contents: Array<{ text: string }>;
  config: GenerateContentConfig;
  initialResponse: GenerateContentResponse;
}): Promise<string> {
  const text = extractResponseText(input.initialResponse);

  const needsContinuation =
    text.length > 0 &&
    (isTruncatedRegiMessage(text) || responseWasTruncated(input.initialResponse));

  if (!needsContinuation) return text;

  return continuePartialReply({
    client: input.client,
    model: input.model,
    contents: input.contents,
    config: input.config,
    partialText: text,
  });
}

function systemPrompt(context: RegiGarageContext): string {
  const garage = formatGarageContextForPrompt(context);
  const name = context.userFirstName ?? "there";

  return `You are Regi, a friendly and knowledgeable AI vehicle assistant inside the REGI registration app. You help with registrations AND general vehicle ownership — maintenance, specs, how things work, and what owners should know.

Personality:
- Warm, concise, like texting a knowledgeable friend — not corporate or robotic.
- Light humor is welcome when appropriate; never snarky or dismissive.
- Use the user's first name (${name}) occasionally, not every sentence.
- Keep most replies to 1–4 short paragraphs unless listing steps or app features.

What you can help with:
- Registration expirations, documents, and navigating the REGI app (use garage data below).
- General vehicle questions: maintenance schedules, oil/fluid intervals, tires, EV care, specs, troubleshooting basics, ownership tips.
- When the user asks about "my truck" or "my Rivian", match their question to a vehicle in their garage when possible.

Rules for garage-specific facts:
- For expiration dates, document counts, plates, and what's in their REGI garage, ONLY use the garage context below — never invent vehicles or dates.
- If garage data doesn't answer the question, say so.

Rules for general vehicle knowledge:
- Answer maintenance and ownership questions helpfully using your knowledge and web search when needed.
- Tailor advice to the specific year/make/model from their garage when relevant (e.g. Rivian R1T oil change intervals).
- For maintenance: give practical guidance and mention checking the owner's manual or a qualified mechanic for the final word — don't refuse the question.
- Do not give legal advice about registration law; general reminders are fine.
- Do not mention being an AI model unless asked.
- Plain text only — no markdown headers; bullets with • are fine for steps.
- Always finish with a complete sentence — never stop mid-word or mid-thought.

Garage context (authoritative for registration data):
${garage}`;
}

function fallbackBootstrap(context: RegiGarageContext): string {
  const name = context.userFirstName;
  const hey = name ? `Hey ${name}` : "Hey";

  if (context.vehicleCount === 0) {
    return `${hey} — your garage is wide open right now. Ask me about adding a registration, or anything vehicle-related.`;
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
    return `${hey} — your ${next.label} registration is up in ${next.daysUntilExpiration} day${next.daysUntilExpiration === 1 ? "" : "s"}. Ask me about that, maintenance, or anything else.`;
  }

  if (context.vehicleCount === 1) {
    return `${hey} — you've got ${next.label} in the garage, good through ${next.expiresOn}. Registrations, maintenance, specs — fire away.`;
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

  return "I'm having a little trouble connecting right now. Try again in a moment — I can help with registrations, maintenance, and general vehicle questions.";
}

export function cannedRegiReply(message: string): string | null {
  const normalized = message.trim().toLowerCase();
  if (normalized === "app features" || normalized === "what can this app do?") {
    return REGI_APP_FEATURES_REPLY;
  }
  return null;
}

export function isTruncatedRegiMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/[.!?](?:['"])?$/.test(trimmed)) return false;

  const lines = trimmed.split("\n");
  const lastLine = (lines[lines.length - 1] ?? "").trim();

  // Structured multi-line replies (lists) are complete without terminal punctuation.
  if (lines.length > 1 && lastLine.length >= 8) return false;

  const lastWord = lastLine.split(/\s+/).pop() ?? "";
  if (/^[a-z]+['']?[a-z]*$/i.test(lastWord) && lastWord.length <= 5) {
    return true;
  }

  if (lines.length === 1 && trimmed.length >= 40) return true;

  return false;
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

Write one complete opening greeting (1–2 sentences, max 240 characters). You already reviewed their garage. Mention the soonest expiring registration with days remaining, or an empty garage. Hint that you can also help with general vehicle questions. Must end with proper punctuation. No markdown.`,
        },
      ],
      config: { temperature: 0.85, maxOutputTokens: 256, thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = response.text?.trim();
    if (text && isCompleteMessage(text)) return text;
    return fallback;
  } catch {
    return fallback;
  }
}

export async function continueRegiReply(input: {
  context: RegiGarageContext;
  history: RegiChatTurn[];
  userMessage: string;
  partialReply: string;
}): Promise<string> {
  const client = getGeminiClient();
  if (!client) return input.partialReply;

  const contents = [
    { text: systemPrompt(input.context) },
    ...input.history.slice(-12).map((turn) => ({
      text: turn.role === "user" ? `User: ${turn.content}` : `Regi: ${turn.content}`,
    })),
    { text: `User: ${input.userMessage}` },
  ];

  try {
    return await continuePartialReply({
      client,
      model: getGeminiModel(),
      contents,
      config: regiReplyConfig(2048),
      partialText: input.partialReply,
    });
  } catch {
    return input.partialReply;
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
      config: regiReplyConfig(2048),
    });

    const text = await ensureCompleteReply({
      client,
      model: getGeminiModel(),
      contents,
      config: regiReplyConfig(2048),
      initialResponse: response,
    });

    return text || fallbackReply(input.context, input.userMessage);
  } catch {
    return fallbackReply(input.context, input.userMessage);
  }
}
