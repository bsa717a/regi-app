# REGI

Vehicle registration management — never forget a registration again.

This repository is a **production-shaped scaffold** for the REGI Next.js app (App Router, Prisma, Firebase Auth, PWA, Cloud Run). Feature work lands in follow-up tasks.

## Stack

- **Next.js** (App Router, TypeScript, React Server Components)
- **Tailwind CSS**
- **Prisma** → PostgreSQL
- **Firebase Auth** (client SDK + Admin SDK)
- **PWA** (`manifest.json` + service worker)
- **Google Cloud Run** (Docker + Cloud Build → Artifact Registry)

## Prerequisites

- Node.js 20+
- npm
- Docker (for local Postgres)

## Local development

### 1. Environment

```bash
cp .env.example .env.local
```

Fill in Firebase values when you start auth work. Database URL in `.env.example` already matches docker-compose.

Prisma reads `DATABASE_URL` from the environment (export it, or use a local `.env` that is gitignored).

### 2. Start Postgres

```bash
docker compose up -d
```

Host port **5435** → container `5432`. Credentials: user `regi` / password `regi_password` / db `regi`.

### 3. Prisma

```bash
export DATABASE_URL="postgresql://regi:regi_password@localhost:5435/regi"
npx prisma generate
npx prisma migrate dev --name init
```

(`migrate` applies once a migration exists; on a fresh scaffold you can create the first migration with the command above.)

### 4. App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Scripts

| Script            | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Next.js dev server                           |
| `npm run build`   | Production build (`standalone` output)       |
| `npm run start`   | Start production server (port from `PORT`)   |
| `npm run lint`    | ESLint                                       |
| `npm test`        | Vitest unit tests (`--passWithNoTests`)      |
| `npm run test:e2e`| Playwright E2E stub (`--pass-with-no-tests`) |
| `npm run db:generate` | `prisma generate`                        |
| `npm run db:migrate`  | `prisma migrate dev`                     |
| `npm run db:studio`   | Prisma Studio                            |

## Project layout (high level)

```
src/
  app/                 # App Router pages + API route handlers
  components/          # Shared UI (incl. PWA register)
  lib/
    firebase/          # Client + Admin SDK init
    notifications/     # NotificationService + email abstraction
    prisma.ts          # Prisma client singleton
prisma/                # schema + migrations
public/                # static assets, manifest, service worker
```

## Notifications

`src/lib/notifications` defines:

- Channels: `push` | `email` | `sms` (SMS modeled only — never sent in MVP)
- `DefaultNotificationService` — templates + prefs-aware dispatch
- `EmailProvider` + `MockEmailProvider` (default) / `SendGridEmailProvider` when `NOTIFICATION_EMAIL_PROVIDER=sendgrid`
- `FcmPushProvider` — Admin SDK `sendEachForMulticast` to tokens in `push_tokens` (set `NOTIFICATION_PUSH_PROVIDER=noop` to force the no-op)
- Editable copy in `src/lib/notifications/templates.ts` (`template_key` + `{{variables}}`)

### Web push (FCM)

1. **Client** — Settings → Push toggle requests notification permission (not on page load), obtains an FCM token with `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, and `POST /api/push/register`s it. Turning push off calls `DELETE /api/push/token`.
2. **Storage** — `push_tokens` rows: `user_id`, unique `token`, optional `user_agent`, `created_at`, `last_seen_at`.
3. **Background** — `/firebase-messaging-sw.js` (rewritten to `/api/firebase-messaging-sw`) displays notifications when the app is not focused. The PWA shell SW (`/sw.js`) remains separate for caching/offline.
4. **Server send** — Reminder cron + renewal status changes call `NotificationService` with `channel: "push"`. Tokens are loaded for the user; invalid tokens are pruned after FCM errors.
5. **Blank VAPID** — If `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is empty, the push toggle is disabled with an explanatory note and nothing crashes. Add a Web Push certificate key in Firebase Console → Project settings → Cloud Messaging when ready.

## PWA

- `public/manifest.json` — name, icons (192/512 + maskable), `display: standalone`, `start_url` / `scope`
- `public/sw.js` — app-shell precache + offline fallback (`public/offline.html`)
- `PwaRegister` + `PwaInstallPrompt` — registers the SW; captures `beforeinstallprompt` (“Install REGI”); iOS gets an Add to Home Screen hint
- Meta: `theme-color`, Apple web app capable, `viewport-fit=cover`, safe-area insets on header/bottom nav

## Renewal reminders (daily cron)

`POST /api/cron/reminders` evaluates every vehicle against that state's `state_rules.config.reminderSchedule`, upserts `notifications` rows idempotently (`dedupe_key`), and dispatches due email/push sends.

**Auth:** require `CRON_SECRET` via header `x-cron-secret` or `Authorization: Bearer <CRON_SECRET>` (401 otherwise).

### Cloud Scheduler

```bash
gcloud scheduler jobs create http regi-daily-reminders \
  --project=regi-app-v1 \
  --location=us-central1 \
  --schedule="0 15 * * *" \
  --time-zone="America/Denver" \
  --uri="https://YOUR_CLOUD_RUN_URL/api/cron/reminders" \
  --http-method=POST \
  --headers="x-cron-secret=YOUR_CRON_SECRET" \
  --attempt-deadline=320s
```

If the job already exists, use `gcloud scheduler jobs update http regi-daily-reminders ...` with the same flags.

## Deployment (Cloud Run)

`next.config.ts` sets `output: "standalone"`. The multi-stage `Dockerfile` copies `.next/standalone` + static assets and listens on **8080**.

### Automatic deploy (merge to `main`)

Every push to `main` runs [.github/workflows/deploy-main.yml](.github/workflows/deploy-main.yml), which submits [cloudbuild.yaml](cloudbuild.yaml):

1. Build + push the image to Artifact Registry  
2. `prisma migrate deploy` against Cloud SQL (no seed)  
3. Deploy Cloud Run service `regi`

**GitHub secret required:** `GCP_SA_KEY` — JSON key for `regi-deploy@regi-app-v1.iam.gserviceaccount.com` (Cloud Build submit). Runtime secrets stay in Secret Manager (`regi-database-url`, `regi-cron-secret`, `regi-gemini-api-key`).

Manual re-run: Actions → **Deploy main** → **Run workflow**.

Production URL: https://regi-90502049802.us-central1.run.app

### Manual deploy (optional)

```bash
gcloud builds submit \
  --project=regi-app-v1 \
  --config=cloudbuild.yaml \
  --substitutions="_COMMIT_SHA=$(git rev-parse --short HEAD)"
```

`DATABASE_URL` for Cloud Run uses the Cloud SQL Auth Proxy **unix socket** form (Secret Manager — never commit it):

```text
postgresql://USER:PASSWORD@localhost/DB_NAME?host=/cloudsql/regi-app-v1:us-central1:regi-db
```

**Required at runtime**

| Variable | Notes |
| -------- | ----- |
| `DATABASE_URL` | Cloud SQL unix-socket URL (Secret Manager) |
| `FIREBASE_PROJECT_ID` / ADC | Admin SDK via the Cloud Run service account |
| `NEXT_PUBLIC_FIREBASE_*` | Client Firebase config (public; baked at image build) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web Push key; blank disables push UI gracefully |
| `GCS_BUCKET` / `GCP_PROJECT_ID` | Document vault |
| `CRON_SECRET` | Secures `POST /api/cron/reminders` |
| `GEMINI_API_KEY` | Registration card scan (Secret Manager) |
| `GEMINI_MODEL` | Gemini model id (default `gemini-2.5-flash`) |
| `NOTIFICATION_EMAIL_PROVIDER` + SendGrid vars | When using real email |
| `NEXT_PUBLIC_APP_URL` | Canonical origin (invite links, etc.) |

### Cloud Scheduler

See [Renewal reminders (daily cron)](#renewal-reminders-daily-cron) for the `gcloud scheduler jobs create http regi-daily-reminders ...` command. Point `--uri` at your Cloud Run URL.

### Local Postgres (dev)

`docker compose up -d` maps host **5435** → container `5432`. See [Local development](#local-development).
