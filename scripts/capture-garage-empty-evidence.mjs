import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const evidenceDir = path.join(repo, "docs/evidence/garage-empty-state");
const artifactDir = "/opt/cursor/artifacts";
const configFile = path.join(root, "garage-empty-evidence/vite.config.ts");

async function writeShot(page, locator, destDir, filename) {
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
  viewport: { width: 430, height: 920 },
  deviceScaleFactor: 2,
});

try {
  await mkdir(evidenceDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true }).catch(() => {});

  await page.goto("http://127.0.0.1:4178/", { waitUntil: "networkidle" });
  await page.getByTestId("garage-empty-state").first().waitFor();
  await page.getByTestId("add-first-registration-button").first().waitFor();
  await page.waitForFunction(() => {
    const images = [...document.images];
    return (
      images.length > 0 &&
      images.every((image) => image.complete && image.naturalWidth > 0)
    );
  });

  const light = page.locator("#garage-empty-light");
  const dark = page.locator("#garage-empty-dark");

  await writeShot(page, light, evidenceDir, "empty_garage_light.png");
  await writeShot(
    page,
    light.getByTestId("garage-empty-illustration"),
    evidenceDir,
    "empty_garage_illustration_light.png",
  );
  await writeShot(
    page,
    light.getByTestId("add-first-registration-button"),
    evidenceDir,
    "empty_garage_cta_light.png",
  );

  await writeShot(page, dark, evidenceDir, "empty_garage_dark.png");
  await writeShot(
    page,
    dark.getByTestId("garage-empty-illustration"),
    evidenceDir,
    "empty_garage_illustration_dark.png",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await writeShot(page, light, evidenceDir, "empty_garage_light_mobile.png");

  await page.setViewportSize({ width: 1024, height: 768 });
  await writeShot(page, light, evidenceDir, "empty_garage_light_desktop.png");

  console.log(`Wrote evidence to ${evidenceDir}`);
} finally {
  await browser.close();
  await server.close();
}
