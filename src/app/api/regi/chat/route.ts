import { NextResponse } from "next/server";
import type { RegiChatRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  continueRegiReply,
  generateRegiBootstrap,
  generateRegiReply,
  isCompleteRegiMessage,
  isTruncatedRegiMessage,
} from "@/lib/ai/regiChat";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { buildQuickActions, loadRegiGarageContext } from "@/lib/regi/context";
import type { RegiChatMessageDto } from "@/lib/regi/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;
const HISTORY_LIMIT = 100;

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:regi:chat"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(result) },
    );
  }

  return result;
}

function serializeMessage(message: {
  id: string;
  role: RegiChatRole;
  content: string;
  createdAt: Date;
}): RegiChatMessageDto {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

/**
 * GET /api/regi/chat — persisted history + quick-action chips.
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  try {
    const auth = await verifyRequest(request);
    if (!auth.ok) return auth.response;

    const profile = await getOrCreateUser(auth.decoded);
    const context = await loadRegiGarageContext(profile.id, profile.name);

    const rows = await prisma.regiChatMessage.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "asc" },
      take: HISTORY_LIMIT,
    });

    let messages = rows;
    if (
      rows.length === 1 &&
      rows[0]?.role === "assistant" &&
      !isCompleteRegiMessage(rows[0].content)
    ) {
      const opener = await generateRegiBootstrap(context);
      const repaired = await prisma.regiChatMessage.update({
        where: { id: rows[0].id },
        data: { content: opener },
      });
      messages = [repaired];
    } else if (rows.length >= 2) {
      const last = rows[rows.length - 1];
      const previous = rows[rows.length - 2];
      if (
        last?.role === "assistant" &&
        previous?.role === "user" &&
        isTruncatedRegiMessage(last.content)
      ) {
        const history = rows.slice(0, -2).map((row) => ({
          role: row.role as "user" | "assistant",
          content: row.content,
        }));
        const reply = await continueRegiReply({
          context,
          history,
          userMessage: previous.content,
          partialReply: last.content,
        });
        if (!isTruncatedRegiMessage(reply) && reply !== last.content) {
          const repaired = await prisma.regiChatMessage.update({
            where: { id: last.id },
            data: { content: reply },
          });
          messages = [...rows.slice(0, -1), repaired];
        }
      }
    }

    return NextResponse.json(
      {
        messages: messages.map(serializeMessage),
        quickActions: buildQuickActions(context),
      },
      { headers: rateLimitHeaders(limited) },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not load chat with Regi. Try refreshing the page." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }
}

/**
 * POST /api/regi/chat
 * Body: { message?: string, bootstrap?: boolean }
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  try {
    const auth = await verifyRequest(request);
    if (!auth.ok) return auth.response;

    const profile = await getOrCreateUser(auth.decoded);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }

    const bootstrap = body.bootstrap === true;
    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    if (!bootstrap && !message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }

    const context = await loadRegiGarageContext(profile.id, profile.name);

    const existing = await prisma.regiChatMessage.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "asc" },
      take: HISTORY_LIMIT,
    });

    if (bootstrap) {
      if (existing.length > 0) {
        return NextResponse.json(
          {
            messages: existing.map(serializeMessage),
            quickActions: buildQuickActions(context),
          },
          { headers: rateLimitHeaders(limited) },
        );
      }

      const opener = await generateRegiBootstrap(context);
      const assistant = await prisma.regiChatMessage.create({
        data: {
          userId: profile.id,
          role: "assistant",
          content: opener,
        },
      });

      return NextResponse.json(
        {
          messages: [serializeMessage(assistant)],
          quickActions: buildQuickActions(context),
        },
        { headers: rateLimitHeaders(limited) },
      );
    }

    const userRow = await prisma.regiChatMessage.create({
      data: {
        userId: profile.id,
        role: "user",
        content: message,
      },
    });

    const history = [...existing, userRow].map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));

    const reply = await generateRegiReply({
      context,
      history: history.slice(0, -1),
      userMessage: message,
    });

    const assistantRow = await prisma.regiChatMessage.create({
      data: {
        userId: profile.id,
        role: "assistant",
        content: reply,
      },
    });

    const all = [...existing, userRow, assistantRow].map(serializeMessage);

    return NextResponse.json(
      {
        messages: all,
        quickActions: buildQuickActions(context),
      },
      { headers: rateLimitHeaders(limited) },
    );
  } catch {
    return NextResponse.json(
      { error: "Regi couldn't respond right now. Try again in a moment." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }
}
