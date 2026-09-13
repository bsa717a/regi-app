import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const destDir = path.join(repo, "docs/evidence/dashboard-days-until");
const artifactDir = "/opt/cursor/artifacts";
const configFile = path.join(root, "dashboard-days-evidence/vite.config.ts");

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
  server: { host: "127.0.0.1", port: 4178, strictPort: true },
});
await server.listen();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 1100 },
  deviceScaleFactor: 2,
});

try {
  await mkdir(destDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true }).catch(() => {});
  await page.goto("http://127.0.0.1:4178/", { waitUntil: "networkidle" });
  await page.getByTestId("dashboard-days-until").first().waitFor();

  await writeShot(
    page,
    page.getByTestId("dashboard-before-attention"),
    "dashboard_before_no_days_in_summary.png",
  );
  await writeShot(
    page,
    page.getByTestId("dashboard-after-attention"),
    "dashboard_after_days_until.png",
  );
  await writeShot(
    page,
    page.getByTestId("dashboard-before-current"),
    "dashboard_before_current_vague.png",
  );
  await writeShot(
    page,
    page.getByTestId("dashboard-after-current"),
    "dashboard_after_current_days.png",
  );
  await writeShot(
    page,
    page.getByTestId("dashboard-after-expired"),
    "dashboard_after_expired_days.png",
  );
  await writeShot(
    page,
    page.getByTestId("dashboard-after-attention-dark"),
    "dashboard_after_days_until_dark.png",
  );

  await page.setViewportSize({ width: 1024, height: 900 });
  await writeShot(
    page,
    page.getByTestId("dashboard-after-attention"),
    "dashboard_after_days_until_desktop.png",
  );
} finally {
  await browser.close();
  await server.close();
}
