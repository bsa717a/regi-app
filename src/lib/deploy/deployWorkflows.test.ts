import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../..");

function readWorkflow(name: string): string {
  return readFileSync(join(ROOT, ".github/workflows", name), "utf8");
}

describe("deploy-main.yml stays the prod path", () => {
  const yaml = readWorkflow("deploy-main.yml");

  it("keeps concurrency group deploy-main and only substitutes _COMMIT_SHA", () => {
    expect(yaml).toMatch(/^name: Deploy main/m);
    expect(yaml).toContain("group: deploy-main");
    expect(yaml).toContain("cancel-in-progress: false");
    expect(yaml).toContain("--config=cloudbuild.yaml");
    expect(yaml).toContain('--substitutions="_COMMIT_SHA=${SHORT_SHA}"');
    expect(yaml).not.toContain("regi-staging");
    expect(yaml).not.toContain("deploy-staging");
    expect(yaml).not.toContain("cloudbuild-target");
    expect(yaml).not.toContain("regi-staging-database-url");
  });

  it("still triggers only on main and workflow_dispatch", () => {
    expect(yaml).toContain("- main");
    expect(yaml).toContain("workflow_dispatch:");
    expect(yaml).not.toContain("- staging");
  });
});

describe("deploy-staging.yml is isolated from prod", () => {
  const yaml = readWorkflow("deploy-staging.yml");

  it("uses a different concurrency group and the isolation script", () => {
    expect(yaml).toMatch(/^name: Deploy staging/m);
    expect(yaml).toContain("group: deploy-staging-");
    expect(yaml).not.toContain("group: deploy-main");
    expect(yaml).toContain("scripts/cloudbuild-target.mjs");
    expect(yaml).toContain("regi-staging");
    expect(yaml).toContain("--config=cloudbuild.yaml");
    expect(yaml).toContain("service_name");
    expect(yaml).toContain("image_tag_prefix");
    expect(yaml).toContain("regi-pr-");
    expect(yaml).toContain("STAGING_FIREBASE_APP_ID");
    expect(yaml).toContain("STAGING_FIREBASE_MESSAGING_SENDER_ID");
  });

  it("does not hardcode prod database secret or :latest", () => {
    expect(yaml).not.toContain("regi-database-url");
    expect(yaml).not.toContain("_STABLE_TAG=latest");
    expect(yaml).not.toContain("_SERVICE=regi,");
    expect(yaml).not.toContain('_SERVICE=regi"');
  });
});

describe("cloudbuild.yaml keeps prod deploy flags", () => {
  const yaml = readFileSync(join(ROOT, "cloudbuild.yaml"), "utf8");

  it("still deploys service regi with prod secrets by default", () => {
    expect(yaml).toContain("  _SERVICE: regi");
    expect(yaml).toContain("  _FIREBASE_PROJECT_ID: regi-app-v1");
    expect(yaml).toContain("  _SECRET_DATABASE_URL: regi-database-url");
    expect(yaml).toContain("FIREBASE_PROJECT_ID=${_FIREBASE_PROJECT_ID}");
    expect(yaml).toContain("  _GCS_BUCKET: regi-app-v1-documents");
    expect(yaml).toContain("  _STABLE_TAG: latest");
    expect(yaml).toContain("  _PURGE_HOSTING: \"true\"");
    expect(yaml).toContain("scripts/cloudbuild-target.mjs guard");
    expect(yaml).toContain("scripts/cloudbuild-target.mjs migrate-guard");
    expect(yaml).toContain("DATABASE_URL=${_SECRET_DATABASE_URL}:latest");
    expect(yaml).toContain("GCS_BUCKET=${_GCS_BUCKET}");
  });
});
