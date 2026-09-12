import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROD_FIREBASE_APP_ID,
  PROD_FIREBASE_AUTH_DOMAIN,
  PROD_FIREBASE_MESSAGING_SENDER_ID,
  PROD_FIREBASE_PROJECT_ID,
  PROD_FIREBASE_STORAGE_BUCKET,
  PROD_SECRET_FIREBASE_WEB_API_KEY,
  STAGING_APP_URL,
  STAGING_CRON_SECRET,
  STAGING_DATABASE_SECRET,
  STAGING_FIREBASE_AUTH_DOMAIN,
  STAGING_FIREBASE_PROJECT_ID,
  STAGING_FIREBASE_STORAGE_BUCKET,
  STAGING_GCS_BUCKET,
  STAGING_SECRET_FIREBASE_WEB_API_KEY,
  STAGING_SERVICE,
  assertCloudBuildTarget,
  assertMigrateDatabaseName,
  buildNonProdSubstitutions,
  extractDatabaseName,
  formatGcloudSubstitutions,
  parseCliArgs,
  parseSubstitutionDefaults,
  prodSubstitutionDefaults,
  runCli,
} from "../../../scripts/cloudbuild-target.mjs";

const ROOT = join(__dirname, "../../..");

function prodGuardInput(
  overrides: Partial<Parameters<typeof assertCloudBuildTarget>[0]> = {},
) {
  return {
    service: "regi",
    databaseSecret: "regi-database-url",
    cronSecret: "regi-cron-secret",
    gcsBucket: "regi-app-v1-documents",
    stableTag: "latest",
    appUrl: "https://app.regireg.com",
    sentryEnvironment: "production",
    purgeHosting: "true",
    emailProvider: "resend",
    firebaseProjectId: PROD_FIREBASE_PROJECT_ID,
    firebaseAuthDomain: PROD_FIREBASE_AUTH_DOMAIN,
    firebaseStorageBucket: PROD_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: PROD_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: PROD_FIREBASE_APP_ID,
    firebaseApiKeySecret: PROD_SECRET_FIREBASE_WEB_API_KEY,
    ...overrides,
  };
}

function stagingGuardInput(
  overrides: Partial<Parameters<typeof assertCloudBuildTarget>[0]> = {},
) {
  return {
    service: STAGING_SERVICE,
    databaseSecret: STAGING_DATABASE_SECRET,
    cronSecret: STAGING_CRON_SECRET,
    gcsBucket: STAGING_GCS_BUCKET,
    stableTag: "staging",
    appUrl: STAGING_APP_URL,
    sentryEnvironment: "staging",
    purgeHosting: "false",
    emailProvider: "mock",
    firebaseProjectId: STAGING_FIREBASE_PROJECT_ID,
    firebaseAuthDomain: STAGING_FIREBASE_AUTH_DOMAIN,
    firebaseStorageBucket: STAGING_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: "111111111111",
    firebaseAppId: "1:111111111111:web:aaaaaaaaaaaaaaaaaaaa",
    firebaseApiKeySecret: STAGING_SECRET_FIREBASE_WEB_API_KEY,
    ...overrides,
  };
}

const STAGING_WEB_APP = {
  firebaseAppId: "1:111111111111:web:aaaaaaaaaaaaaaaaaaaa",
  firebaseMessagingSenderId: "111111111111",
} as const;

describe("parseSubstitutionDefaults", () => {
  it("matches prodSubstitutionDefaults in cloudbuild.yaml", () => {
    const yaml = readFileSync(join(ROOT, "cloudbuild.yaml"), "utf8");
    const parsed = parseSubstitutionDefaults(yaml);
    expect(parsed).toEqual(prodSubstitutionDefaults());
  });
});

describe("extractDatabaseName", () => {
  it("reads the name from Cloud SQL unix-socket URLs", () => {
    expect(
      extractDatabaseName(
        "postgresql://regi_staging:x@localhost/regi_staging?host=/cloudsql/regi-app-v1:us-central1:regi-db",
      ),
    ).toBe("regi_staging");
    expect(
      extractDatabaseName("postgresql://regi:x@127.0.0.1:5432/regi"),
    ).toBe("regi");
  });
});

describe("assertCloudBuildTarget", () => {
  it("allows today's prod defaults", () => {
    expect(() => assertCloudBuildTarget(prodGuardInput())).not.toThrow();
  });

  it("allows isolated staging defaults", () => {
    expect(() => assertCloudBuildTarget(stagingGuardInput())).not.toThrow();
  });

  it("allows Approach B service names against staging secrets", () => {
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({
          service: "regi-pr-12",
          stableTag: "pr-12",
        }),
      ),
    ).not.toThrow();
  });

  it("refuses prod service with staging database secret", () => {
    expect(() =>
      assertCloudBuildTarget(
        prodGuardInput({ databaseSecret: STAGING_DATABASE_SECRET }),
      ),
    ).toThrow(/non-prod settings/);
  });

  it("refuses staging with prod database, bucket, latest tag, or Hosting purge", () => {
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({ databaseSecret: "regi-database-url" }),
      ),
    ).toThrow(/prod database secret/);
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({ gcsBucket: "regi-app-v1-documents" }),
      ),
    ).toThrow(/prod GCS bucket/);
    expect(() =>
      assertCloudBuildTarget(stagingGuardInput({ stableTag: "latest" })),
    ).toThrow(/latest/);
    expect(() =>
      assertCloudBuildTarget(stagingGuardInput({ purgeHosting: "true" })),
    ).toThrow(/Firebase Hosting/);
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({ appUrl: "https://app.regireg.com" }),
      ),
    ).toThrow(/production app URL/);
    expect(() =>
      assertCloudBuildTarget(stagingGuardInput({ emailProvider: "resend" })),
    ).toThrow(/resend/);
    expect(() =>
      assertCloudBuildTarget(stagingGuardInput({ cronSecret: "regi-cron-secret" })),
    ).toThrow(/prod cron secret/);
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({ firebaseProjectId: PROD_FIREBASE_PROJECT_ID }),
      ),
    ).toThrow(/separate Firebase project/);
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({
          firebaseApiKeySecret: PROD_SECRET_FIREBASE_WEB_API_KEY,
        }),
      ),
    ).toThrow(/prod Firebase web API key/);
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({ firebaseAppId: PROD_FIREBASE_APP_ID }),
      ),
    ).toThrow(/distinct Firebase web app id/);
    expect(() =>
      assertCloudBuildTarget(
        stagingGuardInput({
          firebaseMessagingSenderId: PROD_FIREBASE_MESSAGING_SENDER_ID,
        }),
      ),
    ).toThrow(/messagingSenderId/);
  });

  it("refuses unknown service names", () => {
    expect(() =>
      assertCloudBuildTarget(stagingGuardInput({ service: "regi-dev" })),
    ).toThrow(/regi-pr-<number>/);
  });
});

describe("assertMigrateDatabaseName", () => {
  it("refuses staging migrate against database name regi", () => {
    expect(() =>
      assertMigrateDatabaseName({
        service: "regi-staging",
        databaseUrl: "postgresql://regi:x@127.0.0.1:5432/regi",
      }),
    ).toThrow(/must not be "regi"/);
  });

  it("allows staging migrate against regi_staging", () => {
    expect(() =>
      assertMigrateDatabaseName({
        service: "regi-staging",
        databaseUrl:
          "postgresql://regi_staging:x@127.0.0.1:5432/regi_staging",
      }),
    ).not.toThrow();
  });

  it("refuses prod migrate against regi_staging", () => {
    expect(() =>
      assertMigrateDatabaseName({
        service: "regi",
        databaseUrl: "postgresql://x:x@127.0.0.1:5432/regi_staging",
      }),
    ).toThrow(/staging database name/);
  });
});

describe("buildNonProdSubstitutions", () => {
  it("emits isolated staging substitutions that pass the guard", () => {
    const map = buildNonProdSubstitutions({
      commitSha: "abcdef1234567",
      ...STAGING_WEB_APP,
    });
    expect(map._SERVICE).toBe("regi-staging");
    expect(map._COMMIT_SHA).toBe("staging-abcdef1");
    expect(map._STABLE_TAG).toBe("staging");
    expect(map._SECRET_DATABASE_URL).toBe(STAGING_DATABASE_SECRET);
    expect(map._GCS_BUCKET).toBe(STAGING_GCS_BUCKET);
    expect(map._PURGE_HOSTING).toBe("false");
    expect(map._NEXT_PUBLIC_APP_URL).toBe(STAGING_APP_URL);
    expect(map._NOTIFICATION_EMAIL_PROVIDER).toBe("mock");
    expect(map._FIREBASE_PROJECT_ID).toBe(STAGING_FIREBASE_PROJECT_ID);
    expect(map._SECRET_FIREBASE_WEB_API_KEY).toBe(
      STAGING_SECRET_FIREBASE_WEB_API_KEY,
    );
    expect(map._NEXT_PUBLIC_FIREBASE_APP_ID).toBe(STAGING_WEB_APP.firebaseAppId);
    expect(formatGcloudSubstitutions(map)).not.toContain("regi-database-url");
    expect(formatGcloudSubstitutions(map)).not.toContain(
      "regi-firebase-web-api-key",
    );
    expect(formatGcloudSubstitutions(map)).not.toMatch(
      /_FIREBASE_PROJECT_ID=regi-app-v1/,
    );
    expect(formatGcloudSubstitutions(map)).not.toMatch(/_STABLE_TAG=latest/);
  });

  it("parameterizes Approach B preview service + tag", () => {
    const map = buildNonProdSubstitutions({
      service: "regi-pr-7",
      imageTagPrefix: "pr-7",
      commitSha: "aaabbbc",
      ...STAGING_WEB_APP,
    });
    expect(map._SERVICE).toBe("regi-pr-7");
    expect(map._COMMIT_SHA).toBe("pr-7-aaabbbc");
    expect(map._STABLE_TAG).toBe("pr-7");
    expect(map._SECRET_DATABASE_URL).toBe(STAGING_DATABASE_SECRET);
  });

  it("rejects prod service, mismatched B tags, and short SHAs", () => {
    expect(() =>
      buildNonProdSubstitutions({
        service: "regi",
        commitSha: "abcdef1",
        ...STAGING_WEB_APP,
      }),
    ).toThrow(/regi-staging/);
    expect(() =>
      buildNonProdSubstitutions({
        service: "regi-pr-7",
        imageTagPrefix: "staging",
        commitSha: "abcdef1",
        ...STAGING_WEB_APP,
      }),
    ).toThrow(/pr-7/);
    expect(() =>
      buildNonProdSubstitutions({ commitSha: "abc", ...STAGING_WEB_APP }),
    ).toThrow(/7 hex/);
    expect(() =>
      buildNonProdSubstitutions({ commitSha: "abcdef1" }),
    ).toThrow(/STAGING_FIREBASE_APP_ID/);
  });
});

describe("runCli", () => {
  it("writes github-output substitutions and fails closed on prod mix", () => {
    const chunks: string[] = [];
    const err: string[] = [];
    const code = runCli(
      [
        "substitutions",
        "--service=regi-staging",
        "--image-tag-prefix=staging",
        "--commit-sha=deadbee",
        "--firebase-app-id=1:111111111111:web:aaaaaaaaaaaaaaaaaaaa",
        "--firebase-messaging-sender-id=111111111111",
        "--github-output=true",
      ],
      {
        stdout: { write: (chunk) => void chunks.push(chunk) },
        stderr: { write: (chunk) => void err.push(chunk) },
      },
    );
    expect(code).toBe(0);
    expect(chunks.join("")).toMatch(/^substitutions=_/);
    expect(chunks.join("")).toContain("_SERVICE=regi-staging");
    expect(chunks.join("")).toContain("_FIREBASE_PROJECT_ID=regi-app-staging");
    expect(chunks.join("")).not.toMatch(/_FIREBASE_PROJECT_ID=regi-app-v1/);

    const fail = runCli(
      [
        "guard",
        "--service=regi-staging",
        "--database-secret=regi-database-url",
        "--cron-secret=regi-staging-cron-secret",
        "--gcs-bucket=regi-app-v1-staging-documents",
        "--stable-tag=staging",
        "--app-url=https://regi-staging-90502049802.us-central1.run.app",
        "--sentry-environment=staging",
        "--purge-hosting=false",
        "--email-provider=mock",
      ],
      {
        stdout: { write: () => undefined },
        stderr: { write: (chunk) => void err.push(chunk) },
      },
    );
    expect(fail).toBe(1);
    expect(err.join("")).toMatch(/prod database secret/);
  });

  it("parses CLI flags", () => {
    expect(parseCliArgs(["--service=regi-staging", "--purge-hosting=false"])).toEqual({
      service: "regi-staging",
      "purge-hosting": "false",
    });
  });
});
