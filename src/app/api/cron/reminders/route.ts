import { NextResponse } from "next/server";
import { createNotificationService } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/reminders/cronAuth";
import { runReminderTick } from "@/lib/reminders/tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily renewal-reminder cron.
 *
 * Secured by CRON_SECRET via `x-cron-secret` or `Authorization: Bearer <CRON_SECRET>`.
 *
 * Cloud Scheduler setup (do NOT run from the app — ops/docs only):
 *
 * ```bash
 * gcloud scheduler jobs create http regi-daily-reminders \
 *   --project=regi-app-v1 \
 *   --location=us-central1 \
 *   --schedule="0 15 * * *" \
 *   --time-zone="America/Denver" \
 *   --uri="https://YOUR_CLOUD_RUN_URL/api/cron/reminders" \
 *   --http-method=POST \
 *   --headers="x-cron-secret=YOUR_CRON_SECRET" \
 *   --attempt-deadline=320s
 * ```
 *
 * Use `gcloud scheduler jobs update http regi-daily-reminders ...` if the job already exists.
 */
export async function POST(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await runReminderTick({
      db: prisma,
      notificationService: createNotificationService(),
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/reminders] tick failed", message);
    return NextResponse.json(
      { ok: false, error: "Reminder tick failed" },
      { status: 500 },
    );
  }
}
