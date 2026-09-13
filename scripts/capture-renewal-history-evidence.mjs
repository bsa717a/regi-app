import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const destDir = path.join(repo, "docs/evidence/renewal-history-receipts");
const artifactDir = "/opt/cursor/artifacts";
const configFile = path.join(root, "renewal-evidence/vite.config.ts");

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
  await page.goto("http://127.0.0.1:4178/", { waitUntil: "networkidle" });
  await page.getByTestId("renewal-history-list").waitFor();
  await page.getByTestId("renewal-receipt").waitFor();

  await writeShot(page, null, "history_and_receipt_full.png");
  await writeShot(
    page,
    page.getByTestId("evidence-history"),
    "renewal_history_list.png",
  );
  await writeShot(
    page,
    page.getByTestId("evidence-receipt"),
    "sticker_mailed_receipt.png",
  );
  await writeShot(
    page,
    page.getByTestId("renewal-receipt-facts"),
    "confirmation_facts.png",
  );
} finally {
  await browser.close();
  await server.close();
}
