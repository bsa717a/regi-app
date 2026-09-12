#!/usr/bin/env node
/**
 * Cloud Build target helpers for REGI.
 *
 * Used by:
 * - `.github/workflows/deploy-staging.yml` to emit gcloud substitutions
 * - `cloudbuild.yaml` Guard / Migrate steps so a bad substitution cannot
 *   point a non-prod deploy at prod data or overwrite `app:latest`
 *
 * Production `deploy-main.yml` stays on the yaml defaults and only passes
 * `_COMMIT_SHA`. This file must refuse any mix that would cross the streams.
 */

import { pathToFileURL } from "node:url";

export const GCP_PROJECT_ID = "regi-app-v1";
export const GCP_REGION = "us-central1";
export const GCP_PROJECT_NUMBER = "90502049802";

export const PROD_SERVICE = "regi";
export const PROD_DATABASE_SECRET = "regi-database-url";
export const PROD_CRON_SECRET = "regi-cron-secret";
export const PROD_GCS_BUCKET = "regi-app-v1-documents";
export const PROD_STABLE_TAG = "latest";
export const PROD_APP_URL = "https://app.regireg.com";
export const PROD_SENTRY_ENVIRONMENT = "production";
export const PROD_EMAIL_PROVIDER = "resend";
export const PROD_MAX_INSTANCES = "5";
export const PROD_CLOUD_SQL_INSTANCE = "regi-app-v1:us-central1:regi-db";
export const PROD_DATABASE_NAME = "regi";

export const STAGING_SERVICE = "regi-staging";
export const STAGING_DATABASE_SECRET = "regi-staging-database-url";
export const STAGING_CRON_SECRET = "regi-staging-cron-secret";
export const STAGING_GCS_BUCKET = "regi-app-v1-staging-documents";
export const STAGING_STABLE_TAG = "staging";
export const STAGING_SENTRY_ENVIRONMENT = "staging";
export const STAGING_EMAIL_PROVIDER = "mock";
export const STAGING_MAX_INSTANCES = "1";
export const STAGING_DATABASE_NAME = "regi_staging";
export const STAGING_APP_URL = `https://${STAGING_SERVICE}-${GCP_PROJECT_NUMBER}.${GCP_REGION}.run.app`;

/** Secret names Cloud Build / Cloud Run may reuse across environments. */
export const SHARED_SECRET_GEMINI = "regi-gemini-api-key";
export const SHARED_SECRET_FIREBASE_WEB_API_KEY = "regi-firebase-web-api-key";
export const SHARED_SECRET_RESEND = "regi-resend-api-key";

const NON_PROD_SERVICE_RE = /^(regi-staging|regi-pr-[1-9][0-9]*)$/;
const IMAGE_TAG_PREFIX_RE = /^(staging|pr-[1-9][0-9]*)$/;
const NON_PROD_DB_NAME_RE = /(staging|preview|pr_)/i;

/**
 * @param {string} yamlText
 * @returns {Record<string, string>}
 */
export function parseSubstitutionDefaults(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const start = lines.findIndex((line) => line === "substitutions:");
  if (start < 0) {
    throw new Error("cloudbuild.yaml is missing a substitutions: block");
  }
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("  ")) break;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = line.match(/^  (_[A-Z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

/**
 * Defaults that `deploy-main.yml` relies on (it only passes `_COMMIT_SHA`).
 * Keep in lockstep with `cloudbuild.yaml`.
 * @returns {Record<string, string>}
 */
export function prodSubstitutionDefaults() {
  return {
    _REGION: GCP_REGION,
    _AR_REPO: "regi",
    _IMAGE: "app",
    _PROJECT_ID: GCP_PROJECT_ID,
    _SERVICE: PROD_SERVICE,
    _CLOUD_SQL_INSTANCE: PROD_CLOUD_SQL_INSTANCE,
    _RUNTIME_SA: "regi-admin@regi-app-v1.iam.gserviceaccount.com",
    _COMMIT_SHA: "latest",
    _NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "regi-app-v1.firebaseapp.com",
    _NEXT_PUBLIC_FIREBASE_PROJECT_ID: GCP_PROJECT_ID,
    _NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "regi-app-v1.firebasestorage.app",
    _NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: GCP_PROJECT_NUMBER,
    _NEXT_PUBLIC_FIREBASE_APP_ID: "1:90502049802:web:aab2f43102d0658a516ff3",
    _NEXT_PUBLIC_FIREBASE_VAPID_KEY: "",
    _NEXT_PUBLIC_APP_URL: PROD_APP_URL,
    _NEXT_PUBLIC_SENTRY_DSN: "",
    _NEXT_PUBLIC_SENTRY_ENVIRONMENT: PROD_SENTRY_ENVIRONMENT,
    _STABLE_TAG: PROD_STABLE_TAG,
    _PURGE_HOSTING: "true",
    _SECRET_DATABASE_URL: PROD_DATABASE_SECRET,
    _SECRET_CRON: PROD_CRON_SECRET,
    _SECRET_GEMINI: SHARED_SECRET_GEMINI,
    _SECRET_FIREBASE_WEB_API_KEY: SHARED_SECRET_FIREBASE_WEB_API_KEY,
    _SECRET_RESEND: SHARED_SECRET_RESEND,
    _GCS_BUCKET: PROD_GCS_BUCKET,
    _NOTIFICATION_EMAIL_PROVIDER: PROD_EMAIL_PROVIDER,
    _MAX_INSTANCES: PROD_MAX_INSTANCES,
  };
}

/**
 * @param {string} databaseUrl
 * @returns {string}
 */
export function extractDatabaseName(databaseUrl) {
  const raw = String(databaseUrl || "").trim();
  if (!raw) return "";
  const withoutQuery = raw.split("?")[0];
  const slash = withoutQuery.lastIndexOf("/");
  if (slash < 0) return "";
  try {
    return decodeURIComponent(withoutQuery.slice(slash + 1));
  } catch {
    return withoutQuery.slice(slash + 1);
  }
}

/**
 * @param {string} service
 * @returns {boolean}
 */
export function isNonProdService(service) {
  return NON_PROD_SERVICE_RE.test(service);
}

/**
 * @param {{
 *   service: string,
 *   databaseSecret: string,
 *   cronSecret: string,
 *   gcsBucket: string,
 *   stableTag: string,
 *   appUrl: string,
 *   sentryEnvironment: string,
 *   purgeHosting: string,
 *   emailProvider: string,
 * }} input
 */
export function assertCloudBuildTarget(input) {
  const service = String(input.service || "").trim();
  const databaseSecret = String(input.databaseSecret || "").trim();
  const cronSecret = String(input.cronSecret || "").trim();
  const gcsBucket = String(input.gcsBucket || "").trim();
  const stableTag = String(input.stableTag || "").trim();
  const appUrl = String(input.appUrl || "").trim().replace(/\/$/, "");
  const sentryEnvironment = String(input.sentryEnvironment || "").trim();
  const purgeHosting = String(input.purgeHosting || "").trim();
  const emailProvider = String(input.emailProvider || "").trim();

  if (service === PROD_SERVICE) {
    const mismatches = [];
    if (databaseSecret !== PROD_DATABASE_SECRET) {
      mismatches.push(`database secret ${databaseSecret}`);
    }
    if (cronSecret !== PROD_CRON_SECRET) {
      mismatches.push(`cron secret ${cronSecret}`);
    }
    if (gcsBucket !== PROD_GCS_BUCKET) {
      mismatches.push(`GCS bucket ${gcsBucket}`);
    }
    if (stableTag !== PROD_STABLE_TAG) {
      mismatches.push(`stable tag ${stableTag}`);
    }
    if (appUrl !== PROD_APP_URL) {
      mismatches.push(`app URL ${appUrl}`);
    }
    if (sentryEnvironment !== PROD_SENTRY_ENVIRONMENT) {
      mismatches.push(`Sentry env ${sentryEnvironment}`);
    }
    if (purgeHosting !== "true") {
      mismatches.push(`purge hosting ${purgeHosting}`);
    }
    if (emailProvider !== PROD_EMAIL_PROVIDER) {
      mismatches.push(`email provider ${emailProvider}`);
    }
    if (mismatches.length) {
      throw new Error(
        `Refusing to deploy Cloud Run service "${PROD_SERVICE}" with non-prod settings: ${mismatches.join(", ")}`,
      );
    }
    return;
  }

  if (!isNonProdService(service)) {
    throw new Error(
      `Refusing service "${service}". Use "${PROD_SERVICE}", "${STAGING_SERVICE}", or "regi-pr-<number>" (Approach B hook).`,
    );
  }

  if (databaseSecret === PROD_DATABASE_SECRET) {
    throw new Error(
      `Refusing non-prod service "${service}" with prod database secret ${PROD_DATABASE_SECRET}`,
    );
  }
  if (databaseSecret !== STAGING_DATABASE_SECRET) {
    throw new Error(
      `Non-prod deploys must use Secret Manager ${STAGING_DATABASE_SECRET} (got ${databaseSecret || "(empty)"})`,
    );
  }
  if (cronSecret === PROD_CRON_SECRET) {
    throw new Error(
      `Refusing non-prod service "${service}" with prod cron secret ${PROD_CRON_SECRET}`,
    );
  }
  if (gcsBucket === PROD_GCS_BUCKET) {
    throw new Error(
      `Refusing non-prod service "${service}" with prod GCS bucket ${PROD_GCS_BUCKET}`,
    );
  }
  if (gcsBucket !== STAGING_GCS_BUCKET) {
    throw new Error(
      `Non-prod deploys must use GCS bucket ${STAGING_GCS_BUCKET} (got ${gcsBucket || "(empty)"})`,
    );
  }
  if (stableTag === PROD_STABLE_TAG || stableTag === "latest") {
    throw new Error(
      `Refusing non-prod service "${service}" that would push image tag :${PROD_STABLE_TAG}`,
    );
  }
  if (!appUrl || appUrl === PROD_APP_URL || /app\.regireg\.com$/i.test(new URL(appUrl).hostname)) {
    throw new Error(
      `Refusing non-prod service "${service}" with production app URL ${appUrl || "(empty)"}`,
    );
  }
  if (sentryEnvironment !== STAGING_SENTRY_ENVIRONMENT) {
    throw new Error(
      `Non-prod deploys must set Sentry environment to ${STAGING_SENTRY_ENVIRONMENT}`,
    );
  }
  if (purgeHosting === "true") {
    throw new Error(
      `Refusing non-prod service "${service}" that would purge production Firebase Hosting`,
    );
  }
  if (emailProvider === PROD_EMAIL_PROVIDER) {
    throw new Error(
      `Non-prod deploys must not send via ${PROD_EMAIL_PROVIDER}; use ${STAGING_EMAIL_PROVIDER} (Stripe/email can stay yellow)`,
    );
  }
}

/**
 * Last-line check after the unix-socket URL is rewritten for the Cloud SQL proxy.
 * @param {{ service: string, databaseUrl: string }} input
 */
export function assertMigrateDatabaseName(input) {
  const service = String(input.service || "").trim();
  const databaseName = extractDatabaseName(input.databaseUrl);
  if (service === PROD_SERVICE) {
    if (databaseName === STAGING_DATABASE_NAME) {
      throw new Error(
        `Refusing prod migrate against staging database name "${STAGING_DATABASE_NAME}"`,
      );
    }
    return;
  }
  if (!isNonProdService(service)) {
    throw new Error(`Refusing migrate for unknown service "${service}"`);
  }
  if (!databaseName || databaseName === PROD_DATABASE_NAME) {
    throw new Error(
      `Refusing non-prod migrate: DATABASE_URL database name is "${databaseName || "(empty)"}" (must not be "${PROD_DATABASE_NAME}")`,
    );
  }
  if (!NON_PROD_DB_NAME_RE.test(databaseName)) {
    throw new Error(
      `Refusing non-prod migrate: database name "${databaseName}" must include staging, preview, or pr_`,
    );
  }
}

/**
 * @param {{
 *   service?: string,
 *   imageTagPrefix?: string,
 *   commitSha: string,
 *   appUrl?: string,
 * }} input
 */
export function buildNonProdSubstitutions(input) {
  const service = (input.service || STAGING_SERVICE).trim();
  const imageTagPrefix = (input.imageTagPrefix || STAGING_STABLE_TAG).trim();
  const commitSha = String(input.commitSha || "").trim();
  if (!commitSha) {
    throw new Error("commitSha is required");
  }
  if (!IMAGE_TAG_PREFIX_RE.test(imageTagPrefix)) {
    throw new Error(
      `imageTagPrefix must be "staging" or "pr-<number>" (got ${imageTagPrefix})`,
    );
  }
  if (service === STAGING_SERVICE && imageTagPrefix !== STAGING_STABLE_TAG) {
    throw new Error(
      `Service ${STAGING_SERVICE} must use image tag prefix "${STAGING_STABLE_TAG}"`,
    );
  }
  if (service.startsWith("regi-pr-")) {
    const pr = service.slice("regi-pr-".length);
    if (imageTagPrefix !== `pr-${pr}`) {
      throw new Error(
        `Service ${service} must use image tag prefix "pr-${pr}" (Approach B hook)`,
      );
    }
  }

  const shortSha = commitSha.replace(/[^a-fA-F0-9]/g, "").slice(0, 7);
  if (shortSha.length < 7) {
    throw new Error(`commitSha must include at least 7 hex chars (got ${commitSha})`);
  }

  const appUrl = (input.appUrl || STAGING_APP_URL).trim().replace(/\/$/, "");
  const map = {
    _SERVICE: service,
    _COMMIT_SHA: `${imageTagPrefix}-${shortSha}`,
    _STABLE_TAG: imageTagPrefix,
    _PURGE_HOSTING: "false",
    _SECRET_DATABASE_URL: STAGING_DATABASE_SECRET,
    _SECRET_CRON: STAGING_CRON_SECRET,
    _SECRET_GEMINI: SHARED_SECRET_GEMINI,
    _SECRET_FIREBASE_WEB_API_KEY: SHARED_SECRET_FIREBASE_WEB_API_KEY,
    _SECRET_RESEND: SHARED_SECRET_RESEND,
    _GCS_BUCKET: STAGING_GCS_BUCKET,
    _NOTIFICATION_EMAIL_PROVIDER: STAGING_EMAIL_PROVIDER,
    _NEXT_PUBLIC_APP_URL: appUrl,
    _NEXT_PUBLIC_SENTRY_ENVIRONMENT: STAGING_SENTRY_ENVIRONMENT,
    _MAX_INSTANCES: STAGING_MAX_INSTANCES,
  };

  assertCloudBuildTarget({
    service: map._SERVICE,
    databaseSecret: map._SECRET_DATABASE_URL,
    cronSecret: map._SECRET_CRON,
    gcsBucket: map._GCS_BUCKET,
    stableTag: map._STABLE_TAG,
    appUrl: map._NEXT_PUBLIC_APP_URL,
    sentryEnvironment: map._NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    purgeHosting: map._PURGE_HOSTING,
    emailProvider: map._NOTIFICATION_EMAIL_PROVIDER,
  });

  return map;
}

/**
 * @param {Record<string, string>} map
 * @returns {string}
 */
export function formatGcloudSubstitutions(map) {
  const keys = Object.keys(map).sort();
  for (const key of keys) {
    const value = map[key];
    if (value.includes(",") || value.includes("=")) {
      throw new Error(
        `Substitution ${key} cannot contain comma or equals (gcloud --substitutions limitation)`,
      );
    }
  }
  return keys.map((key) => `${key}=${map[key]}`).join(",");
}

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
export function parseCliArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const cut = arg.indexOf("=");
    if (cut < 0) {
      out[arg.slice(2)] = "true";
      continue;
    }
    out[arg.slice(2, cut)] = arg.slice(cut + 1);
  }
  return out;
}

/**
 * @param {string[]} argv
 * @param {{ stdout?: { write: (chunk: string) => void }, stderr?: { write: (chunk: string) => void } }} [io]
 * @returns {number}
 */
export function runCli(argv, io = process) {
  const args = parseCliArgs(argv);
  const command = argv.find((item) => !item.startsWith("--")) || "substitutions";

  try {
    if (command === "guard") {
      assertCloudBuildTarget({
        service: args.service,
        databaseSecret: args["database-secret"],
        cronSecret: args["cron-secret"],
        gcsBucket: args["gcs-bucket"],
        stableTag: args["stable-tag"],
        appUrl: args["app-url"],
        sentryEnvironment: args["sentry-environment"],
        purgeHosting: args["purge-hosting"],
        emailProvider: args["email-provider"],
      });
      io.stdout?.write(`Cloud Build target OK for ${args.service}\n`);
      return 0;
    }

    if (command === "migrate-guard") {
      assertMigrateDatabaseName({
        service: args.service,
        databaseUrl: args["database-url"],
      });
      io.stdout?.write(
        `Migrate target OK for ${args.service} database ${extractDatabaseName(args["database-url"])}\n`,
      );
      return 0;
    }

    if (command === "substitutions") {
      const map = buildNonProdSubstitutions({
        service: args.service,
        imageTagPrefix: args["image-tag-prefix"],
        commitSha: args["commit-sha"],
        appUrl: args["app-url"],
      });
      const encoded = formatGcloudSubstitutions(map);
      if (args["github-output"] === "true") {
        io.stdout?.write(`substitutions=${encoded}\n`);
      } else if (args.json === "true") {
        io.stdout?.write(`${JSON.stringify(map, null, 2)}\n`);
      } else {
        io.stdout?.write(`${encoded}\n`);
      }
      return 0;
    }

    throw new Error(`Unknown command "${command}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr?.write(`${message}\n`);
    return 1;
  }
}

const invokedDirectly =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  process.exitCode = runCli(process.argv.slice(2));
}
