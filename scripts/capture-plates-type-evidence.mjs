import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const plates65Dir = path.join(repo, "docs/evidence/plates-65");
const specialGroupDir = path.join(repo, "docs/evidence/plates-special-group");
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
  server: { host: "127.0.0.1", port: 4177, strictPort: true },
});
await server.listen();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 920 },
  deviceScaleFactor: 2,
});

try {
  await mkdir(plates65Dir, { recursive: true });
  await mkdir(specialGroupDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true }).catch(() => {});

  await page.goto("http://127.0.0.1:4177/", { waitUntil: "networkidle" });
  await page.getByText("Plate type", { exact: true }).first().waitFor();
  await waitForImages(page);

  await writeShot(page, null, plates65Dir, "type_step_full_arches_skier_specialty.png");

  await writeShot(
    page,
    page.getByTestId("utah-plate-type-standard_life_elevated_arches"),
    plates65Dir,
    "type_step_arches_preview.png",
  );
  await writeShot(
    page,
    page.getByTestId("utah-plate-type-standard_life_elevated_skier"),
    plates65Dir,
    "type_step_skier_preview.png",
  );

  const igwt = page.getByTestId("utah-plate-type-in_god_we_trust");
  await igwt.click();
  await expectSelected(page, "utah-plate-type-in_god_we_trust");
  await writeShot(page, igwt, plates65Dir, "type_step_specialty_igwt_selected.png");

  const elk = page.getByTestId("utah-plate-type-special_group_wildlife_elk");
  const jazz = page.getByTestId("utah-plate-type-special_group_utah_jazz");
  const historic = page.getByTestId("utah-plate-type-special_group_historic_bw");

  await elk.scrollIntoViewIfNeeded();
  await writeShot(
    page,
    null,
    specialGroupDir,
    "special_group_cards_before_selection.png",
  );

  await elk.click();
  await expectSelected(page, "utah-plate-type-special_group_wildlife_elk");
  await writeShot(
    page,
    elk,
    specialGroupDir,
    "special_group_wildlife_elk_selected.png",
  );

  await jazz.click();
  await expectSelected(page, "utah-plate-type-special_group_utah_jazz");
  await writeShot(
    page,
    jazz,
    specialGroupDir,
    "special_group_utah_jazz_selected.png",
  );

  await historic.click();
  await expectSelected(page, "utah-plate-type-special_group_historic_bw");
  await writeShot(
    page,
    historic,
    specialGroupDir,
    "special_group_historic_bw_selected.png",
  );

  await page.getByTestId("plates-continue").click();
  await page.getByText(/Historic B&W allows up to 7 characters/i).waitFor();
  await writeShot(
    page,
    null,
    specialGroupDir,
    "historic_bw_combos_7_character_limit.png",
  );

  await page.getByLabel("First choice (required)").fill("HISTOR1");
  await page.getByTestId("plates-continue").click();
  await page.getByLabel(/What does this combination mean/i).fill("Family nickname");
  await page.getByTestId("plates-continue").click();
  await page.getByText("Soft content check").waitFor();
  await page.getByTestId("plates-continue").click();
  await page.getByText("Fee estimate").waitFor();
  await writeShot(page, null, specialGroupDir, "historic_bw_fees_special_group.png");
  await page.getByTestId("plates-continue").click();
  await page.getByTestId("utah-mvp-copy-text").waitFor();
  await writeShot(page, null, specialGroupDir, "historic_bw_mvp_copy_design_id.png");

  console.log(`Wrote evidence to ${plates65Dir} and ${specialGroupDir}`);
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
