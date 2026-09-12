import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const plates65Dir = path.join(repo, "docs/evidence/plates-65");
const specialGroupDir = path.join(repo, "docs/evidence/plates-special-group");
const selectableDir = path.join(repo, "docs/evidence/plates-selectable-designs");
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

async function selectCard(page, optionId) {
  const card = page.getByTestId(`utah-plate-type-${optionId}`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expectSelected(page, `utah-plate-type-${optionId}`);
  return card;
}

async function resetToTypeStep(page) {
  while (await page.getByRole("button", { name: /^Back$/i }).count()) {
    await page.getByRole("button", { name: /^Back$/i }).click();
  }
  await page.getByText("Plate type", { exact: true }).first().waitFor();
}

async function walkToMvp(page, { combo, meaning }) {
  await page.getByTestId("plates-continue").click();
  await page.getByLabel("First choice (required)").waitFor();
  await page.getByLabel("First choice (required)").fill(combo);
  await page.getByTestId("plates-continue").click();
  await page.getByLabel(/What does this combination mean/i).fill(meaning);
  await page.getByTestId("plates-continue").click();
  await page.getByText("Soft content check").waitFor();
  await page.getByTestId("plates-continue").click();
  await page.getByText("Fee estimate").waitFor();
  await page.getByTestId("plates-continue").click();
  await page.getByTestId("utah-mvp-copy-text").waitFor();
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
  await mkdir(selectableDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true }).catch(() => {});

  await page.goto("http://127.0.0.1:4177/", { waitUntil: "networkidle" });
  await page.getByText("Plate type", { exact: true }).first().waitFor();
  await waitForImages(page);

  await writeShot(page, null, plates65Dir, "type_step_full_arches_skier_specialty.png");
  await writeShot(page, null, selectableDir, "type_step_all_selectable_cards.png");

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

  const igwt = await selectCard(page, "in_god_we_trust");
  await writeShot(page, igwt, plates65Dir, "type_step_specialty_igwt_selected.png");

  const elk = await selectCard(page, "special_group_wildlife_elk");
  await writeShot(page, elk, specialGroupDir, "special_group_wildlife_elk_selected.png");

  const jazz = await selectCard(page, "special_group_utah_jazz");
  await writeShot(page, jazz, specialGroupDir, "special_group_utah_jazz_selected.png");

  const historic = await selectCard(page, "special_group_historic_bw");
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

  await resetToTypeStep(page);

  const motoCards = [
    ["motorcycle_life_elevated_arches", "motorcycle_life_elevated_arches_selected.png"],
    ["motorcycle_life_elevated_skier", "motorcycle_life_elevated_skier_selected.png"],
    ["motorcycle_in_god_we_trust", "motorcycle_in_god_we_trust_selected.png"],
    [
      "motorcycle_special_group_wildlife_elk",
      "motorcycle_wildlife_elk_selected.png",
    ],
    ["radio_amateur", "radio_amateur_selected.png"],
    ["radio_search_rescue", "radio_search_rescue_selected.png"],
  ];

  for (const [optionId, filename] of motoCards) {
    const card = await selectCard(page, optionId);
    await writeShot(page, card, selectableDir, filename);
  }

  await selectCard(page, "motorcycle_life_elevated_skier");
  await page.getByTestId("plates-continue").click();
  await page.getByText(/Motorcycle Life Elevated Skier allows up to 5 characters/i).waitFor();
  await writeShot(
    page,
    null,
    selectableDir,
    "motorcycle_skier_combos_5_character_limit.png",
  );
  await walkToMvp(page, { combo: "RIDE1", meaning: "Family nickname" });
  await writeShot(
    page,
    null,
    selectableDir,
    "motorcycle_skier_mvp_copy_design_id.png",
  );

  await resetToTypeStep(page);
  await selectCard(page, "motorcycle_in_god_we_trust");
  await page.getByTestId("plates-continue").click();
  await page.getByText(/Motorcycle In God We Trust allows up to 4 characters/i).waitFor();
  await writeShot(
    page,
    null,
    selectableDir,
    "motorcycle_igwt_combos_4_character_limit.png",
  );
  await page.getByLabel("First choice (required)").fill("RIDE");
  await page.getByTestId("plates-continue").click();
  await page.getByLabel(/What does this combination mean/i).fill("Faith plate");
  await page.getByTestId("plates-continue").click();
  await page.getByText("Soft content check").waitFor();
  await page.getByTestId("plates-continue").click();
  await page.getByText("Fee estimate").waitFor();
  await writeShot(
    page,
    null,
    selectableDir,
    "motorcycle_igwt_fees_special_group.png",
  );
  await page.getByTestId("plates-continue").click();
  await page.getByTestId("utah-mvp-copy-text").waitFor();
  await writeShot(
    page,
    null,
    selectableDir,
    "motorcycle_igwt_mvp_copy_design_id.png",
  );

  await resetToTypeStep(page);
  await selectCard(page, "radio_amateur");
  await page.getByTestId("plates-continue").click();
  await page.getByText(/Amateur Radio allows up to 6 characters/i).waitFor();
  await writeShot(page, null, selectableDir, "radio_amateur_combos_6_character_limit.png");
  await walkToMvp(page, { combo: "K7ABC", meaning: "Call sign" });
  await writeShot(page, null, selectableDir, "radio_amateur_mvp_copy_design_id.png");

  console.log(
    `Wrote evidence to ${plates65Dir}, ${specialGroupDir}, and ${selectableDir}`,
  );
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
