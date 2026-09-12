# Staging Cloud Run (pre-merge UI walks)

Durable **non-prod** REGI environment for smart UI walks **before** merging to `main`. Production deploy is unchanged: [`.github/workflows/deploy-main.yml`](../.github/workflows/deploy-main.yml) still owns Cloud Run service `regi` and concurrency group `deploy-main`.

This is **Approach A**. Per-PR preview services (Approach B) are a follow-up; this file documents the hook.

## Isolation decisions (locked — not undecided)

| Concern | Decision | Why |
| --- | --- | --- |
| **Postgres / staging DB** | **SEPARATE** from prod (hard requirement) | Staging must never read or migrate production data. Database name `regi_staging` on instance `regi-db`; secret `regi-staging-database-url`. Migrate-guard refuses DB name `regi`. |
| **Firebase** | **SEPARATE** project `regi-app-staging` | Chosen. Walks must not share `regi-app-v1` Auth. |
| Stripe | Sandbox / yellow | Do not block walks or this PR. |

**Firebase — alternative considered, then rejected.** The cheaper default would have been the **same** Firebase project `regi-app-v1` with clearly labeled demo users only (authorized domain + referrer for the staging Cloud Run URL, no live customer accounts). Derek (via Dina) corrected that: staging must **not** use `regi-app-v1` even for demo users. Auth, UIDs, and the web API key are therefore a distinct Firebase/GCP project `regi-app-staging`. Cloud Build refuses any non-prod deploy that still points at `regi-app-v1` Firebase config.

## Why Approach A (not B) first

| | Approach A — durable `regi-staging` | Approach B — per-PR Cloud Run |
| --- | --- | --- |
| Cost | One service, `min-instances=0`, `max-instances=1`, same Cloud SQL **instance**, extra **database** only | A service (and often a DB) per open PR |
| Walks | Stable URL Hub/Regi can bookmark | URL changes every PR |
| Isolation from prod | Separate Postgres DB, **separate Firebase project**, secrets, GCS, image tags | Same, plus per-PR blast radius |
| Ops | Derek creates resources once | More IAM, cleanup, and Cloud Run quota work |

A is cheaper and enough for pre-merge walks. B can plug in later: the same `cloudbuild.yaml` + `scripts/cloudbuild-target.mjs` already accept `regi-pr-<n>` and image tag `pr-<n>` against the **same** staging DB / bucket / secrets (`workflow_dispatch` inputs on **Deploy staging**).

Do **not** point staging at prod `DATABASE_URL`, Firebase project `regi-app-v1`, or bucket `regi-app-v1-documents`. Guards in Cloud Build refuse that.

## URL pattern

| Env | Cloud Run service | URL |
| --- | --- | --- |
| Production | `regi` | https://regi-90502049802.us-central1.run.app (canonical https://app.regireg.com) |
| Staging (A) | `regi-staging` | https://regi-staging-90502049802.us-central1.run.app |
| Preview (B, later) | `regi-pr-<number>` | `https://regi-pr-<number>-90502049802.us-central1.run.app` |

Health check (confirms you are not on prod):

```text
GET https://regi-staging-90502049802.us-central1.run.app/api/health
```

Expect `"service": "regi-staging"`, `"environment": "staging"`, and `"firebaseProjectId": "regi-app-staging"`.

Cloud Run / Cloud SQL / Secret Manager stay in GCP project `regi-app-v1`, region `us-central1`. **Firebase Auth is a different project:** `regi-app-staging`.

## How to deploy staging

After Derek finishes the one-time GCP / Firebase checklist below:

1. Merge this infra (or run the workflow from a branch that has it).
2. GitHub → Actions → **Deploy staging** → **Run workflow**.
   - Default: service `regi-staging`, tag prefix `staging`.
   - Optional Approach B hook: service `regi-pr-12`, tag prefix `pr-12`.
3. Or push the `staging` branch (auto-deploys `regi-staging`).

The workflow submits the **same** [`cloudbuild.yaml`](../cloudbuild.yaml) as prod, with isolated substitutions from [`scripts/cloudbuild-target.mjs`](../scripts/cloudbuild-target.mjs):

- Image tags `staging-<sha>` and `staging` — **never** `app:latest`
- Secrets `regi-staging-database-url` + `regi-staging-cron-secret` + `regi-staging-firebase-web-api-key`
- Firebase project **`regi-app-staging`** (web app id + sender id from GitHub variables — never `regi-app-v1`)
- GCS `regi-app-v1-staging-documents`
- `NOTIFICATION_EMAIL_PROVIDER=mock` (no Resend to real inboxes)
- `SENTRY_ENVIRONMENT=staging`
- No Firebase Hosting CDN purge
- Concurrency group `deploy-staging-…` — **not** `deploy-main`

Manual (same substitutions):

```bash
SHORT_SHA="$(git rev-parse --short HEAD)"
SUBS="$(node scripts/cloudbuild-target.mjs substitutions --service=regi-staging --image-tag-prefix=staging --commit-sha="${SHORT_SHA}")"
gcloud builds submit \
  --project=regi-app-v1 \
  --config=cloudbuild.yaml \
  --substitutions="${SUBS}"
```

`deploy-main.yml` is intentionally untouched: it still passes only `_COMMIT_SHA` and uses yaml prod defaults.

## How Hub / Regi walks use staging

1. Point the walk **base URL** at `https://regi-staging-90502049802.us-central1.run.app` — never `app.regireg.com` or the prod Cloud Run URL.
2. Confirm `/api/health` reports `regi-staging` / `staging`.
3. Sign in with users from the **staging Firebase project `regi-app-staging` only**. Never prod `regi-app-v1` accounts.
4. Exercise the PR’s UI (garage, renewals, documents, Regi chat, etc.). Staging data is disposable.
5. Stripe sandbox stays yellow — do not block a walk on payments.
6. After the walk, leave a note on the feature PR. **Do not merge to prod from a walk** unless the feature PR is ready; this staging infra PR itself should stay open until Derek reviews.

Walks can target a feature branch by running **Deploy staging** with that ref (workflow_dispatch), then walking the durable URL.

## Firebase (SEPARATE project — required)

**Decision: separate.** Not same-project demo users, and not left open.

The cheaper path (same `regi-app-v1` + demo-only accounts) was considered and **rejected**. Derek (via Dina) locked staging to its own Firebase project so walk Auth cannot touch production users, even accidentally.

| | Production | Staging |
| --- | --- | --- |
| Firebase / GCP project id | `regi-app-v1` | **`regi-app-staging`** |
| Auth domain | `regi-app-v1.firebaseapp.com` | `regi-app-staging.firebaseapp.com` |
| Storage bucket | `regi-app-v1.firebasestorage.app` | `regi-app-staging.firebasestorage.app` |
| Web API key secret | `regi-firebase-web-api-key` | `regi-staging-firebase-web-api-key` |
| Web `appId` / `messagingSenderId` | baked into `cloudbuild.yaml` prod defaults | GitHub Actions variables (from the **staging** web app) |

Cloud Build guards refuse any non-prod deploy that still has `regi-app-v1` Firebase ids or the prod API-key secret.

If Firebase project id `regi-app-staging` is already taken globally, stop and say so — do not silently reuse `regi-app-v1`.

### Derek-only: create the Firebase project + web app

1. [Firebase Console](https://console.firebase.google.com/) → **Add project**.
   - Project name: `regi-app-staging`
   - **Project ID must be `regi-app-staging`**
   - Attach the same billing account as `regi-app-v1` if prompted
   - Google Analytics optional (skip is fine)
2. This creates a **separate GCP project** `regi-app-staging`. Cloud Run still deploys in `regi-app-v1`; only Auth/FCM live here.
3. Build → **Authentication** → Get started → enable **Email/Password**.
4. Project settings (gear) → **Add app** → Web → nickname `regi-staging`. Copy `firebaseConfig`:
   - `apiKey` → Secret Manager (below)
   - `appId` → GitHub variable `STAGING_FIREBASE_APP_ID`
   - `messagingSenderId` → GitHub variable `STAGING_FIREBASE_MESSAGING_SENDER_ID`
   - Confirm `projectId` / `authDomain` / `storageBucket` match the table above
5. Authentication → Settings → **Authorized domains** → add `regi-staging-90502049802.us-central1.run.app` (and `localhost` if you sign in locally against staging config).
6. Authentication → Users → create walk users in **this** project only (e.g. `walk@regi-staging.invalid` or a mailbox you control). Verify them in the console — staging email is `mock`, so no reset/verify mail will send.
7. Cloud Messaging → Web Push certificates → optional VAPID key → GitHub variable `STAGING_FIREBASE_VAPID_KEY` (blank disables push UI).
8. APIs & Services (in **`regi-app-staging`**) → Credentials → restrict the staging browser key HTTP referrers to:
   - `https://regi-staging-90502049802.us-central1.run.app/*`
   - `http://localhost:8080/*` and `http://localhost:3000/*` only if needed
9. Enable **Identity Toolkit** / Firebase Auth APIs on `regi-app-staging` if the console has not already.

### Derek-only: store the web API key + GitHub variables

Secrets live in GCP project **`regi-app-v1`** (where Cloud Build runs), but the **value** is the staging web key:

```bash
printf '%s' 'STAGING_FIREBASE_WEB_API_KEY' | gcloud secrets create regi-staging-firebase-web-api-key \
  --project=regi-app-v1 --data-file=-
```

Grant Secret Accessor on `regi-staging-firebase-web-api-key` to Cloud Build SA and `regi-admin@regi-app-v1.iam.gserviceaccount.com` (same pattern as `regi-firebase-web-api-key`).

GitHub repo `bsa717a/regi-app` → Settings → Secrets and variables → Actions → **Variables**:

| Variable | From staging `firebaseConfig` |
| --- | --- |
| `STAGING_FIREBASE_APP_ID` | `appId` (`1:<staging-number>:web:<hex>`) |
| `STAGING_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` (not `90502049802`) |
| `STAGING_FIREBASE_VAPID_KEY` | optional |

**Deploy staging** fails closed until those variables are set to non-prod values.

### Derek-only: Admin SDK IAM (Cloud Run → staging Firebase)

Cloud Run runtime SA is still `regi-admin@regi-app-v1.iam.gserviceaccount.com` (ADC). Staging sets `FIREBASE_PROJECT_ID=regi-app-staging`.

On GCP project **`regi-app-staging`**:

```bash
gcloud projects add-iam-policy-binding regi-app-staging \
  --member="serviceAccount:regi-admin@regi-app-v1.iam.gserviceaccount.com" \
  --role="roles/firebaseauth.admin"

gcloud projects add-iam-policy-binding regi-app-staging \
  --member="serviceAccount:regi-admin@regi-app-v1.iam.gserviceaccount.com" \
  --role="roles/firebasemessaging.admin"
```

(`roles/firebase.admin` is broader if you prefer one role.)

Do **not** download a prod service-account JSON into staging.

### Priority 2 seeded applicant

After a walk user exists in **`regi-app-staging`**, you may set:

- `STAGING_DEMO_APPLICANT_EMAIL`
- `STAGING_DEMO_APPLICANT_FIREBASE_UID` (UID from the **staging** project)

Then `DATABASE_URL=<staging> npx prisma db seed` against the **staging** DB only. See [Priority 2 hook](#priority-2-seeded-demo-applicant).

## Derek-only GCP checklist (one-time)

Billing must already be on `regi-app-v1`. These cannot be done from this repo.

### 1. Isolated Cloud SQL database (required)

**Cheaper (recommended):** new database on the existing instance `regi-app-v1:us-central1:regi-db` — not a second instance.

```sql
CREATE DATABASE regi_staging;
CREATE USER regi_staging WITH PASSWORD 'PASTE_UNIQUE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE regi_staging TO regi_staging;
-- connect to regi_staging, then:
GRANT ALL ON SCHEMA public TO regi_staging;
ALTER DATABASE regi_staging OWNER TO regi_staging;
```

The database **name must include `staging`** (or `preview` / `pr_`). Cloud Build migrate-guard refuses name `regi` (prod).

**Optional stronger isolation:** new instance `regi-staging-db`. Then pass `_CLOUD_SQL_INSTANCE` later; not wired in Approach A defaults.

### 2. Secret Manager

| Secret | Used by | Notes |
| --- | --- | --- |
| `regi-staging-database-url` | Build migrate + Cloud Run `DATABASE_URL` | Unix-socket URL, **staging DB only** |
| `regi-staging-cron-secret` | Cloud Run `CRON_SECRET` | Do not reuse prod. No staging Scheduler job unless you add one later. |

```text
postgresql://regi_staging:PASSWORD@localhost/regi_staging?host=/cloudsql/regi-app-v1:us-central1:regi-db
```

Reuse (not Auth): `regi-gemini-api-key`, `regi-resend-api-key` (mounted but unused while email is `mock`). Optional `regi-sentry-dsn` later — attach only after the secret exists ([docs/sentry.md](sentry.md)).

**Do not reuse** `regi-firebase-web-api-key` — staging has its own secret. See the Firebase section above.

```bash
printf '%s' 'STAGING_DATABASE_URL' | gcloud secrets create regi-staging-database-url \
  --project=regi-app-v1 --data-file=-
printf '%s' 'STAGING_CRON_SECRET' | gcloud secrets create regi-staging-cron-secret \
  --project=regi-app-v1 --data-file=-
```

### 3. IAM

Grant **Secret Manager Secret Accessor** on the new secrets (`regi-staging-database-url`, `regi-staging-cron-secret`, `regi-staging-firebase-web-api-key`) to:

- Cloud Build SA: `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` (confirm via `gcloud secrets get-iam-policy regi-database-url`)
- Cloud Run runtime SA: `regi-admin@regi-app-v1.iam.gserviceaccount.com`

`regi-deploy@regi-app-v1.iam.gserviceaccount.com` already submits builds via GitHub secret `GCP_SA_KEY` — no new GitHub secret. It needs Cloud Build + the usual deploy roles it already has for prod.

Runtime SA already has Cloud SQL Client on `regi-db`. That is enough to open a connection; **authorization is the staging DB user in the secret**.

### 4. GCS bucket (required)

```bash
gcloud storage buckets create gs://regi-app-v1-staging-documents \
  --project=regi-app-v1 \
  --location=us-central1 \
  --uniform-bucket-level-access

gcloud storage buckets add-iam-policy-binding gs://regi-app-v1-staging-documents \
  --member="serviceAccount:regi-admin@regi-app-v1.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

Never use `regi-app-v1-documents` for staging. Guard refuses it.

### 5. First Cloud Run service

Created automatically by the first successful **Deploy staging** run (`gcloud run deploy regi-staging`). No need to pre-create it.

Do **not** create a Cloud Scheduler job against staging unless you want reminder emails/pushes there (email is mock anyway).

### 6. Stripe

Leave sandbox / yellow. Do not block staging on Stripe keys.

## Priority 2 seeded demo applicant

`prisma/seed.ts` already seeds local demo users. Staging migrate **does not seed** (same as prod).

Hook for a later “real Firebase applicant” seed:

- Env: `STAGING_DEMO_APPLICANT_EMAIL` + `STAGING_DEMO_APPLICANT_FIREBASE_UID` (both required if either is set; UID from **`regi-app-staging`**, not `regi-app-v1`)
- Resolver: `src/lib/deploy/stagingDemoApplicant.ts`
- When those env vars are set, `npx prisma db seed` upserts that applicant on **whatever `DATABASE_URL` you exported**

Only run seed with the **staging** URL. Never export prod `DATABASE_URL` in the same shell.

## Safety rails

- `scripts/cloudbuild-target.mjs` refuses prod service + staging secrets and the reverse
- Non-prod cannot push `:latest`, purge Hosting, use prod DB secret, prod cron secret, prod bucket, or `app.regireg.com`
- Non-prod cannot use Firebase project `regi-app-v1`, prod web API key secret, prod `appId`, or prod `messagingSenderId`
- Migrate refuses database name `regi` unless the service is prod `regi`
- `deploy-staging.yml` concurrency is `deploy-staging-*`, not `deploy-main`

## Out of scope / later

- Approach B auto-deploy + teardown on each PR
- Dedicated Cloud SQL instance
- Staging custom domain
- Stripe sandbox checkout
- Staging Cloud Scheduler
