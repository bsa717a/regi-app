import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const destDir = path.join(repo, "docs/evidence/admin-loading-skeletons");
const artifactDir = "/opt/cursor/artifacts";
const configFile = path.join(root, "admin-skeleton-evidence/vite.config.ts");

async function writeShot(page, locator, filename) {
  const dest = path.join(destDir, filename);
  const target = locator ?? page;
  await target.screenshot({
    path: dest,
    ...(locator ? {} : { fullPage: true }),
  });
  try {
    await copyFile(dest, path.join(artifactDir, filename));
  } catch {
    // Artifact dir is optional outside the Cloud Agent VM.
  }
  return dest;
}

const server = await createServer({
  configFile,
  server: { host: "127.0.0.1", port: 4179, strictPort: true },
});
await server.listen();

const browser = await chromium.launch();

try {
  await mkdir(destDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true }).catch(() => {});

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 920 },
    deviceScaleFactor: 2,
  });
  await mobile.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
  await mobile.getByTestId("admin-queue-skeleton").waitFor();
  await mobile.getByTestId("admin-users-skeleton").waitFor();

  await writeShot(
    mobile,
    mobile.locator("#admin-queue-skeleton"),
    "admin_queue_skeleton_mobile.png",
  );
  await writeShot(
    mobile,
    mobile.locator("#admin-users-skeleton"),
    "admin_users_skeleton_mobile.png",
  );
  await mobile.close();

  const desktop = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  await desktop.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
  await desktop.getByTestId("admin-queue-skeleton").waitFor();
  await desktop.getByTestId("admin-users-skeleton").waitFor();

  await writeShot(
    desktop,
    desktop.locator("#admin-queue-skeleton"),
    "admin_queue_skeleton.png",
  );
  await writeShot(
    desktop,
    desktop.locator("#admin-users-skeleton"),
    "admin_users_skeleton.png",
  );
  await desktop.close();
} finally {
  await browser.close();
  await server.close();
}
