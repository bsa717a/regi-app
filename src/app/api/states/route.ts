import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { parseStateRulesConfig } from "@/lib/stateEngine/parseConfig";
import { stateName } from "@/lib/vehicles/states";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

/**
 * Active states from `state_rules` — inserting a row enables a state
 * without a frontend code change.
 */
export async function GET(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:states"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  await getOrCreateUser(auth.decoded);

  const rows = await prisma.stateRule.findMany({
    where: { active: true },
    orderBy: { stateCode: "asc" },
  });

  const states = rows
    .map((row) => {
      const config = parseStateRulesConfig(row.config);
      if (!config) return null;
      return {
        code: row.stateCode,
        name: config.displayName || stateName(row.stateCode),
        dueSoonThresholdDays: config.renewalWindow.dueSoonThresholdDays,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return NextResponse.json(
    { states },
    { headers: rateLimitHeaders(limited) },
  );
}
