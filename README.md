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
- Inside the Capacitor shell, PWA SW registration and the install prompt are skipped (`isNativeApp()`)

## Capacitor iOS (Phase 1 shell)

The iOS app is a Capacitor shell that loads the hosted Next.js app via `server.url` so native plugins (Face ID, Network, Push) inject correctly. It does **not** replace deploy — APIs and UI still run on the server.

| Item | Value |
| ---- | ----- |
| Bundle / app id | `app.regi.ios` |
| Local webDir | `capacitor-www/` (bootstrap + offline shell) |
| Default host | `https://regi-90502049802.us-central1.run.app` |

**Prerequisites:** Xcode (Capacitor 8 uses Swift Package Manager for plugins), Apple team for signing.

```bash
# Sync native project + copy webDir
npm run cap:sync

# Open the .xcodeproj in Xcode.app (File → Open if needed)
npm run cap:ios
```

**Point the shell at local Next** (needed to see unreleased UI like Face ID in the simulator):

```bash
# Terminal A — Next.js on :8080
npm run dev

# Terminal B — point the iOS shell at local Next (localhost works in Simulator)
npm run cap:sync:local
```

**Restart `npm run dev` after changing `next.config.ts`** (needs `allowedDevOrigins` for Capacitor).

Then Run again from Xcode (⌘R). Settings should show **Security → Face ID unlock**.

For a physical iPhone, use your Mac’s LAN IP and add that host to `allowedDevOrigins`:

```bash
CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:8080 npm run cap:sync
```

To point back at production Cloud Run: `npm run cap:sync`.

### Phase 2 native features (4.2)

- **Face ID / Touch ID unlock** — Settings → Security (Device Hub: enable biometrics via `devicectl`)
- **Offline / chrome** — in-app offline overlay; usage strings in `Info.plist`

### Phase 3 — native push (APNs → FCM)

Push on iOS uses `@capacitor-firebase/messaging` (not web VAPID). Tokens are stored in `push_tokens.platform` (`web` | `ios` | `android`).

**One-time Apple / Firebase setup (required before push works on device):**

1. Apple Developer → Identifiers → App ID `app.regi.ios` → enable **Push Notifications**
2. Create an **APNs Auth Key** (`.p8`) and note Key ID + Team ID
3. Firebase Console → Project settings → add an **iOS app** with bundle ID `app.regi.ios`
4. Upload the APNs Auth Key under Cloud Messaging
5. Download `GoogleService-Info.plist` into `ios/App/App/` (gitignored) and add it to the **App** target’s Copy Bundle Resources (missing this causes a black screen on launch — Firebase Messaging crashes without the plist in the app bundle)
6. In Xcode: Signing & Capabilities → confirm **Push Notifications** (+ Background Modes → Remote notifications)
7. `npm run cap:sync` (or `cap:sync:local` for localhost) then Stop → Run in Xcode

APNs entitlement: Debug uses `App.entitlements` (`aps-environment` = `development`); Release/Archive uses `AppRelease.entitlements` (`production`) for TestFlight / App Store.

**In-app:** Settings → Push toggle. Native path requests notification permission, fetches an FCM token, and `POST /api/push/register` with `platform: "ios"`.

Simulator note: remote push often needs a **physical iPhone**; local permission/token flows can still be exercised.

### Phase 4 — legal, privacy, account deletion

Public HTTPS pages (required before App Review):

- Privacy Policy: `https://YOUR_HOST/privacy`
- Terms of Use: `https://YOUR_HOST/terms`

Production examples: [Privacy](https://regi-90502049802.us-central1.run.app/privacy), [Terms](https://regi-90502049802.us-central1.run.app/terms).

**In-app:** Settings → Legal links; Settings → Delete account (Guideline 5.1.1(v)). Signup requires agreeing to both documents.

**iOS:** `Info.plist` usage strings (camera, photos, Face ID) and `PrivacyInfo.xcprivacy` in the App target. App Store Connect Nutrition Labels are listed in `src/lib/legal/appStorePrivacyLabels.ts` for Phase 5.

Optional: `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` (defaults to `support@regi.app`).

### Phase 5 — App Store Connect (listing only, not submission)

Copy-paste values live in [`src/lib/legal/appStoreListing.ts`](src/lib/legal/appStoreListing.ts). Filling Connect **does not** put REGI on the App Store.

| Field | Value |
| ----- | ----- |
| Bundle ID | `app.regi.ios` |
| Name / subtitle | REGI / Never miss a registration |
| Category | Lifestyle (secondary: Productivity) |
| Privacy | https://regi-90502049802.us-central1.run.app/privacy |
| Support | https://regi-90502049802.us-central1.run.app/support |
| Terms | https://regi-90502049802.us-central1.run.app/terms |
| Age rating | 4+ (see `APP_STORE_AGE_RATING`) |
| Nutrition Labels | `src/lib/legal/appStorePrivacyLabels.ts` |
| Encryption | HTTPS-only exemption (`ITSAppUsesNonExemptEncryption = false`) |
| Devices | iPhone only (avoids iPad 13″ screenshot requirement) |
| App icon | 1024×1024 PNG, no alpha (already in the iOS asset catalog) |

**In Connect**

1. Apps → **+** → iOS, bundle `app.regi.ios`, SKU `regi-ios`.
2. Paste name, subtitle, description, keywords, What’s New, URLs from `appStoreListing.ts`.
3. App Privacy → Nutrition Labels (not used for tracking; all purposes App Functionality).
4. Age rating questionnaire.
5. Screenshots: one **6.9″** portrait set from the Capacitor app (1320×2868 preferred). Shot list is in `APP_STORE_SCREENSHOTS`.
6. App Review Information: your phone/email; demo account (create a **verified Firebase user** on production and populate a garage — do not use `demo@regi.app` from local seed; do not commit the password).
7. Notes for Review: `APP_STORE_REVIEW_NOTES`.

Do **not** click Submit for Review yet — that is Phase 6 (TestFlight + build upload).

Do not commit secrets, `GoogleService-Info.plist`, or Xcode user state.

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

**GitHub secret required:** `GCP_SA_KEY` — JSON key for `regi-deploy@regi-app-v1.iam.gserviceaccount.com` (Cloud Build submit).

**Secret Manager (never commit values):** `regi-database-url`, `regi-cron-secret`, `regi-gemini-api-key`, `regi-firebase-web-api-key`.

Manual re-run: Actions → **Deploy main** → **Run workflow**.

Production URL: https://regi-90502049802.us-central1.run.app

### Firebase web API key (Secret Manager)

`NEXT_PUBLIC_FIREBASE_API_KEY` is client-visible after build, but must **not** live in git. Cloud Build loads it from Secret Manager (`regi-firebase-web-api-key`) for the Docker build-arg and Cloud Run env.

One-time setup (paste the key locally; do not commit it):

```bash
# Create (or: gcloud secrets versions add regi-firebase-web-api-key --data-file=-)
printf '%s' 'PASTE_KEY_HERE' | gcloud secrets create regi-firebase-web-api-key \
  --project=regi-app-v1 \
  --data-file=-

# Cloud Build SA (confirm member via: gcloud secrets get-iam-policy regi-database-url --project=regi-app-v1)
gcloud secrets add-iam-policy-binding regi-firebase-web-api-key \
  --project=regi-app-v1 \
  --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Run runtime SA
gcloud secrets add-iam-policy-binding regi-firebase-web-api-key \
  --project=regi-app-v1 \
  --member="serviceAccount:regi-admin@regi-app-v1.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Restrict / rotate the key (after a leak):** GCP Console → APIs & Services → Credentials → browser key for `regi-app-v1`. Prefer create a new key → store in Secret Manager → deploy → disable the old key. Application restrictions: HTTP referrers for:

- `https://regi-90502049802.us-central1.run.app/*`
- `https://regi-app-v1.firebaseapp.com/*` (required — Firebase email verification / password-reset links open here)
- `https://regi-app-v1.web.app/*`
- `http://localhost:8080/*` and `http://localhost:3000/*` if you sign in locally

API restrictions: Identity Toolkit / Token Service and only Firebase APIs this app uses. Then check Metrics/Logs for unexpected usage.

Firebase email links also embed the project’s original Web API key. After that key was deleted in the August 2026 rotation, the hosted handler at `regi-app-v1.firebaseapp.com/__/auth/action` fails with **“Try verifying your email again — Your request to verify your email has expired or the link has already been used.”** The one-time `oobCode` is still valid; only the key in the URL is dead.

After deploying the in-app handler at `/auth/action`, point Firebase email templates at it: Authentication → Templates → **Customize action URL** → `https://regi-90502049802.us-central1.run.app/auth/action` (Identity Platform `notification.sendEmail.callbackUri`). The REGI page applies the code with the live browser key. Until that URL is saved, new emails still open the broken hosted page.

**Close GitHub secret scanning alert:** after the key is restricted or rotated and plaintext is gone from `main` → Security → Secret scanning alerts → mark the Google API Key alert as **Revoked**.

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
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Secret Manager `regi-firebase-web-api-key` (build + runtime) |
| `NEXT_PUBLIC_FIREBASE_*` | Other client Firebase config (project id, auth domain, etc.) |
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
