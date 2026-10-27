/**
 * Builds the neutral body-type WebP fallbacks.
 * SVG here is only an input to the encoder. The app serves the WebP files.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "public/images/vehicles/generic");

const wheel = (cx, cy, r = 28) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#2c333b"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="#d5dbe3"/>
  <circle cx="${cx}" cy="${cy}" r="5" fill="#2c333b"/>
`;

const shapes = {
  sedan: `
    <path d="M78 214 h150 l36-62 h168 l48 62 h132 v46 h-534 z" fill="#5c6774"/>
    <path d="M250 158 h150 l28 50 h-214 z" fill="#c5ced8"/>
    ${wheel(196, 262)} ${wheel(470, 262)}
  `,
  pickup: `
    <path d="M70 168 h210 v46 h250 v48 h-460 z" fill="#5c6774"/>
    <path d="M86 176 h150 v32 h-150 z" fill="#c5ced8"/>
    <path d="M300 196 h200 v18 h-200 z" fill="#4a5560"/>
    ${wheel(180, 264)} ${wheel(470, 264)}
  `,
  suv: `
    <path d="M86 214 h120 l28-70 h210 l36 70 h110 v52 h-504 z" fill="#5c6774"/>
    <path d="M196 152 h200 l22 56 h-246 z" fill="#c5ced8"/>
    ${wheel(190, 268)} ${wheel(478, 268)}
  `,
  van: `
    <path d="M78 132 h360 l70 40 v96 h-430 z" fill="#5c6774"/>
    <path d="M110 146 h150 v48 h-150 z" fill="#c5ced8"/>
    <path d="M280 146 h90 v48 h-90 z" fill="#c5ced8"/>
    ${wheel(190, 270)} ${wheel(470, 270)}
  `,
  coupe: `
    <path d="M90 220 h120 l70-64 h150 l80 64 h90 v42 h-510 z" fill="#5c6774"/>
    <path d="M250 162 h130 l40 52 h-214 z" fill="#c5ced8"/>
    ${wheel(200, 264)} ${wheel(468, 264)}
  `,
  motorcycle: `
    <circle cx="150" cy="230" r="46" fill="none" stroke="#2c333b" stroke-width="16"/>
    <circle cx="470" cy="230" r="46" fill="none" stroke="#2c333b" stroke-width="16"/>
    <path d="M188 220 h150 l40-70 h70 l-24 70 h-40" fill="#5c6774"/>
    <path d="M300 150 l36-36 h28 l-16 36 z" fill="#5c6774"/>
  `,
  motorhome: `
    <path d="M70 150 h300 l20 30 h170 v78 h-490 z" fill="#5c6774"/>
    <path d="M96 166 h70 v40 h-70 z" fill="#c5ced8"/>
    <path d="M180 166 h70 v40 h-70 z" fill="#c5ced8"/>
    ${wheel(190, 260)} ${wheel(470, 260)}
  `,
  trailer: `
    <path d="M120 150 h300 v100 h-300 z" fill="#5c6774"/>
    <path d="M420 190 h90 l40 40 v20 h-130 z" fill="#5c6774"/>
    ${wheel(200, 262, 24)} ${wheel(330, 262, 24)}
  `,
  ohv: `
    <circle cx="150" cy="236" r="40" fill="none" stroke="#2c333b" stroke-width="14"/>
    <circle cx="490" cy="236" r="40" fill="none" stroke="#2c333b" stroke-width="14"/>
    <path d="M190 220 h130 l50-64 h70 l20 40-40 36 h-150 z" fill="#5c6774"/>
  `,
  snowmobile: `
    <path d="M80 230 c20-18 70-28 140-28 h230 c40 0 90 10 120 28 l-20 22 h-450 z" fill="#5c6774"/>
    <path d="M210 160 h160 l50 42 h-250 z" fill="#5c6774"/>
    <path d="M90 248 h470 c0 16-20 28-70 28 h-340 c-40 0-60-12-60-28 z" fill="#3d4650"/>
  `,
  boat: `
    <path d="M90 210 c30 46 120 70 230 70 s200-24 230-70 z" fill="#5c6774"/>
    <path d="M250 120 h16 v90 h-16 z" fill="#3d4650"/>
    <path d="M266 126 l150 70 h-150 z" fill="#c5ced8"/>
  `,
  default: `
    <path d="M100 210 h120 l40-48 h160 l50 48 h90 v44 h-460 z" fill="#8b95a1"/>
    <path d="M246 168 h140 l28 40 h-190 z" fill="#d5dbe3"/>
    ${wheel(210, 256, 22)} ${wheel(450, 256, 22)}
  `,
};

await mkdir(outDir, { recursive: true });

for (const [name, body] of Object.entries(shapes)) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#e4e7ee"/>
  ${body}
</svg>`;
  const target = path.join(outDir, `${name}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality: 86 }).toFile(target);
  console.log(target);
}
