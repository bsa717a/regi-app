# Staging Playwright E2E

Real browser tests against **durable staging** — not an empty `--pass-with-no-tests` stub, and not API-mocked fake e2e (that story lived on draft [#58](https://github.com/bsa717a/regi-app/pull/58) and is superseded).

## Target

| | Value |
| --- | --- |
| Default `PLAYWRIGHT_BASE_URL` | `https://regi-staging-90502049802.us-central1.run.app` |
| Staging Firebase | `regi-app-staging` (never `regi-app-v1`) |
| Demo applicant email | `demo.applicant+staging@regireg.com` (already verified) |
| Demo password secret | GCP Secret Manager `regi-staging-demo-applicant` (project `regi-app-v1`) |

**Production is refused.** `src/lib/e2e/stagingTarget.ts` throws if `PLAYWRIGHT_BASE_URL` is `app.regireg.com`, the prod Cloud Run host `regi-90502049802.us-central1.run.app`, or `regi-app-v1.web.app`.

Stripe stays yellow / parked. Tests assert the “no payment required” copy and never open a Stripe checkout.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `PLAYWRIGHT_BASE_URL` | no | Defaults to staging. Localhost is allowed for a local Next server. |
| `REGI_STAGING_DEMO_EMAIL` | no | Defaults to `demo.applicant+staging@regireg.com`. Aliases: `PLAYWRIGHT_EMAIL`, `E2E_TEST_EMAIL`. |
| `REGI_STAGING_DEMO_PASSWORD` | **yes for authenticated specs** | Value of `regi-staging-demo-applicant`. Aliases: `PLAYWRIGHT_PASSWORD`, `E2E_TEST_PASSWORD`. **Never commit.** |
| `REGI_STAGING_ALLOW_SIGNUP` | no | Set to `1` only if login fails and you intentionally want `/signup` fallback. Prefer login — the demo account is already verified. Staging email is mock, so a new signup will not receive a verification email. |

Public specs (`e2e/specs/public-staging.spec.ts`) run without a password. Authenticated specs skip when the password env is missing (exit 0 for those tests).

## Run locally against staging

```bash
# 1. Fetch the password locally — do not print it into chat/logs if you can avoid it
gcloud secrets versions access latest \
  --secret=regi-staging-demo-applicant \
  --project=regi-app-v1 \
  > /tmp/regi-staging-demo-applicant
export REGI_STAGING_DEMO_PASSWORD="$(tr -d '\n' < /tmp/regi-staging-demo-applicant)"
rm /tmp/regi-staging-demo-applicant

# 2. Browsers (once)
npx playwright install chromium

# 3. Default base URL is staging
npm run test:e2e
```

Optional overrides:

```bash
PLAYWRIGHT_BASE_URL=https://regi-staging-90502049802.us-central1.run.app \
REGI_STAGING_DEMO_EMAIL=demo.applicant+staging@regireg.com \
npm run test:e2e
```

Headed / debug:

```bash
npx playwright test --headed
npx playwright test e2e/specs/public-staging.spec.ts
npx playwright test --debug
```

## Run against local Next (optional)

Only if you have Firebase + DB pointed at **staging or a local stack** — still never prod:

```bash
npm run dev
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test:e2e
```

`playwright.config.ts` starts `npm run dev` only when the base host is localhost.

## CI

`.github/workflows/test.yml` job **Playwright staging**:

- Does **not** run on Deploy main.
- Does **not** fail the Vitest job.
- If `secrets.REGI_STAGING_DEMO_PASSWORD` is empty, the job skips Playwright install/run and still succeeds.
- When the secret is present, Hub/CI injects `REGI_STAGING_DEMO_PASSWORD` and runs the full suite against staging.

GitHub: Settings → Secrets and variables → Actions → repository secret `REGI_STAGING_DEMO_PASSWORD` = value of Secret Manager `regi-staging-demo-applicant`.

## Coverage

1. **Public smoke** — health is `regi-staging` / `regi-app-staging`; login form + #58 testids; production host guard.
2. **Applicant funnel** — real Firebase login; Settings applicant fields; add-registration VIN / type picker (does **not** save a new vehicle); document preview when a vault/card doc exists; renewal submit button + disabled-Submit reasons; Stripe skipped.
3. **Plates** — `/garage/plates` type picker + previews (#65) and first-choice slice.

## What this is not

- Not mocked `page.route("**/api/**")` e2e.
- Not a production smoke test.
- Not a Stripe checkout test.
