# Sentry MVP (production error monitoring)

REGI reports **unexpected client and server errors** to Sentry in **production** and **staging** only. There is no DSN in the repo. Without a DSN the SDK does not initialize (safe no-op). Local `next dev` / Vitest also stay quiet even if a DSN is present.

This is error monitoring only. Source maps, release tagging, Capacitor native, and full performance tracing are follow-ups.

## Environment variables

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `SENTRY_DSN` | Server runtime (Cloud Run) | Node/edge SDK + `onRequestError` |
| `NEXT_PUBLIC_SENTRY_DSN` | Build-time (Docker ARG) and/or runtime | Browser SDK (`instrumentation-client.ts`) |
| `SENTRY_ENVIRONMENT` | Server runtime | `production` or `staging` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Build-time and/or runtime | Same, for the browser |

Either DSN is enough on the server (`SENTRY_DSN` wins, then `NEXT_PUBLIC_SENTRY_DSN`). The root layout also passes the runtime DSN into `SentryClientInit`, so a Cloud Run secret works for the browser **without a rebuild**.

Init stays off when:

- both DSN values are blank, or
- `NODE_ENV` is `development` or `test`, or
- the resolved environment is not `production` / `staging`

Do **not** invent or commit a DSN. Leave `.env.example` / local `.env` blank.

## Where Derek / ops add the real DSN

1. [Sentry](https://sentry.io) → create (or reuse) an org + a **Next.js** project (e.g. `regi-app`).
2. Project Settings → Client Keys (DSN). Copy the DSN (it is designed to be public in the browser bundle).
3. Store it in Secret Manager (same pattern as the Firebase web API key):

```bash
printf '%s' 'PASTE_DSN_HERE' | gcloud secrets create regi-sentry-dsn \
  --project=regi-app-v1 \
  --data-file=-

# Cloud Run runtime SA
gcloud secrets add-iam-policy-binding regi-sentry-dsn \
  --project=regi-app-v1 \
  --member="serviceAccount:regi-admin@regi-app-v1.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

4. Attach it on the next Cloud Run deploy. In `cloudbuild.yaml` **Deploy** step, add to `--set-secrets` (do this only after the secret exists, or the deploy fails):

```text
SENTRY_DSN=regi-sentry-dsn:latest,NEXT_PUBLIC_SENTRY_DSN=regi-sentry-dsn:latest
```

`SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` are already set to `production` in Cloud Build. For a staging service, set both to `staging`.

Optional: pass `_NEXT_PUBLIC_SENTRY_DSN` as a Cloud Build substitution so the client DSN is also inlined at `next build` (same value; not required if the Cloud Run secret is set).

## What is captured

- Browser / React render errors (`instrumentation-client.ts`, `SentryClientInit`, `FeatureErrorBoundary`)
- Next.js route `error.tsx` / `global-error.tsx`
- Unhandled App Router / API exceptions (`instrumentation.ts` → `onRequestError`)
- Swallowed 500s on cron, auth email, push register, admin renewals/users, document upload-url, and garage photo mutations (`captureRouteException`)

Feature boundaries wrap renewal concierge, start-renewal, document vault, document/scan preview, and garage photo upload so a crash in one of those trees does not take down the whole app.

## Alerts (email / Slack)

Nothing in this repo sends alert email or Slack. Turn that on in the Sentry UI after the DSN is live:

1. Sentry → **Alerts** → **Create Alert Rule**.
2. When: **Number of errors** is above 0 in 1 hour, or **A new issue is created**.
3. Filter: environment `production` (add a second rule for `staging` if you want it quieter).
4. Then:
   - **Send a notification** → Email (project members or a specific address such as Derek).
   - And/or **Slack** — Settings → Integrations → Slack → add the workspace, then pick a channel (`#regi-alerts`).
5. Optional: also enable **Issue Owners** so new issues email the assignee.

Sentry’s default project email for new issues is enough for an MVP if you skip a custom rule.

## Manual verify (after a real DSN is set)

Do this on staging or a production build (`NODE_ENV=production`). `next dev` will not send events.

1. Confirm Cloud Run (or `.env` for `next start`) has `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` and environment `production` or `staging`.
2. Temporary test only — add a button that `throw new Error("Sentry verify: client")`, click it, then **remove the button**.
3. Temporary test only — throw inside a route handler such as `GET /api/health`, hit it, then **remove the throw**.
4. Open Sentry → **Issues**. You should see both events within a minute.
5. Fire the alert rule (or wait for the new issue email/Slack).

Do not leave verify throws in `main`.

## Out of MVP

- Source map upload (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `sourcemaps.disable` is currently `true`)
- Release tagging niceties
- Capacitor native crash reporting
- Performance tracing (`tracesSampleRate` is `0`)
- Session Replay / user feedback widget
