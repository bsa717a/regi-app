import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const evidenceDir = path.join(repo, "docs/evidence/plates-65");
const artifactDir = "/opt/cursor/artifacts";
const configFile = path.join(root, "plates-evidence/vite.config.ts");

async function waitForImages(page) {
  await page.waitForFunction(() => {
    const images = [...document.images];
    return (
      images.length > 0 &&
      images.every((image) => image.complete && image.naturalWidth > 0)
    );
  });
}

async function writeShot(page, locator, filename) {
  const dest = path.join(evidenceDir, filename);
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
  server: { host: "127.0.0.1", port: 4177, strictPort: true },
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

  await page.goto("http://127.0.0.1:4177/", { waitUntil: "networkidle" });
  await page.getByText("Plate type", { exact: true }).first().waitFor();
  await waitForImages(page);

  await writeShot(page, null, "type_step_full_arches_skier_specialty.png");

  await writeShot(
    page,
    page.getByTestId("utah-plate-type-standard_life_elevated_arches"),
    "type_step_arches_preview.png",
  );
  await writeShot(
    page,
    page.getByTestId("utah-plate-type-standard_life_elevated_skier"),
    "type_step_skier_preview.png",
  );

  const igwt = page.getByTestId("utah-plate-type-in_god_we_trust");
  await igwt.click();
  await expectSelected(page, "utah-plate-type-in_god_we_trust");
  await writeShot(page, igwt, "type_step_specialty_igwt_selected.png");

  await page
    .getByTestId("utah-plate-type-special_group")
    .scrollIntoViewIfNeeded();
  await writeShot(
    page,
    page.getByTestId("utah-plate-type-special_group"),
    "type_step_specialty_special_group.png",
  );

  console.log(`Wrote evidence to ${evidenceDir}`);
} finally {
  await browser.close();
  await server.close();
}

async function expectSelected(page, testId) {
  const checked = await page
    .getByTestId(testId)
    .locator('input[name="utah-plate-type"]')
    .isChecked();
  if (!checked) {
    throw new Error(`${testId} was not selected after click`);
  }
}
