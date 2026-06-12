/** One-off: blur the Mini's licence plate in IMG-006 and regenerate derivatives. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "..", "PXL_20260606_130718097.MP.jpg");
const OUT = path.join(ROOT, "public", "img");

// plate region in original 3072x4080 pixels (with margin)
const region = { left: 1020, top: 2570, width: 730, height: 240 };

const base = sharp(SRC).rotate();
const blurred = await base.clone().extract(region).blur(30).toBuffer();
const edited = await base
  .composite([{ input: blurred, left: region.left, top: region.top }])
  .toBuffer();

const SIZES = [
  { suffix: "tile", width: 640, quality: 72 },
  { suffix: "page", width: 1100, quality: 74 },
  { suffix: "hero", width: 1680, quality: 70 },
];
for (const { suffix, width, quality } of SIZES) {
  await sharp(edited).resize({ width }).webp({ quality })
    .toFile(path.join(OUT, `IMG-006-${suffix}.webp`));
}
const lqipPath = path.join(ROOT, "src", "data", "lqip.json");
const lqip = JSON.parse(await readFile(lqipPath, "utf8"));
const buf = await sharp(edited).resize({ width: 24 }).webp({ quality: 20 }).toBuffer();
lqip["IMG-006"] = `data:image/webp;base64,${buf.toString("base64")}`;
await writeFile(lqipPath, JSON.stringify(lqip));
console.log("IMG-006 plate blurred + derivatives regenerated");
