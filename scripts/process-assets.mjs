/**
 * TWO ISLANDS — asset pipeline
 * Reads original PXL_*.jpg/mp4 from the parent photos folder, emits web-ready
 * derivatives into public/img and public/video, plus an LQIP map for blur-up.
 *
 * All EXIF (incl. GPS) is stripped: sharp drops metadata unless .withMetadata()
 * is called, and .rotate() bakes the EXIF orientation in first.
 *
 * Usage: node scripts/process-assets.mjs [--force]
 */
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, ".."); // the photos folder
const IMG_OUT = path.join(ROOT, "public", "img");
const VID_OUT = path.join(ROOT, "public", "video");
const FORCE = process.argv.includes("--force");

const manifest = JSON.parse(
  await readFile(path.join(__dirname, "manifest.json"), "utf8")
);

const SIZES = [
  { suffix: "tile", width: 880, quality: 70 },
  { suffix: "page", width: 1100, quality: 74 },
  { suffix: "hero", width: 1680, quality: 70 },
];

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

await mkdir(IMG_OUT, { recursive: true });
await mkdir(VID_OUT, { recursive: true });

const lqip = {};
const entries = Object.entries(manifest.images);
let done = 0;

// modest concurrency pool so we don't blow memory on 12MP sources
const POOL = 4;
async function processImage([id, file]) {
  const src = path.join(SRC, file);
  if (!(await exists(src))) {
    console.warn(`!! missing source: ${file}`);
    return;
  }
  const base = sharp(src).rotate(); // bake EXIF orientation, strip metadata

  for (const { suffix, width, quality } of SIZES) {
    const out = path.join(IMG_OUT, `${id}-${suffix}.webp`);
    if (!FORCE && (await exists(out))) continue;
    await base.clone().resize({ width, withoutEnlargement: true })
      .webp({ quality }).toFile(out);
  }

  // LQIP: tiny blurred placeholder, inlined as base64
  const buf = await base.clone().resize({ width: 24 })
    .webp({ quality: 20 }).toBuffer();
  lqip[id] = `data:image/webp;base64,${buf.toString("base64")}`;

  done++;
  process.stdout.write(`\rimages ${done}/${entries.length}`);
}

const queue = [...entries];
await Promise.all(
  Array.from({ length: POOL }, async () => {
    while (queue.length) await processImage(queue.shift());
  })
);
console.log("");

await mkdir(path.join(ROOT, "src", "data"), { recursive: true });
await writeFile(
  path.join(ROOT, "src", "data", "lqip.json"),
  JSON.stringify(lqip)
);
console.log(`lqip.json written (${Object.keys(lqip).length} entries)`);

// ---- videos -----------------------------------------------------------
for (const [id, file] of Object.entries(manifest.videos)) {
  const src = path.join(SRC, file);
  if (!(await exists(src))) {
    console.warn(`!! missing video: ${file}`);
    continue;
  }
  const loop = path.join(VID_OUT, `${id}-loop.mp4`);
  const page = path.join(VID_OUT, `${id}-page.mp4`);
  const posterJpg = path.join(VID_OUT, `${id}-poster.jpg`);
  const posterWebp = path.join(IMG_OUT, `${id}-tile.webp`);

  // small muted loop used as the gallery card texture (portrait ~360x640)
  if (FORCE || !(await exists(loop))) {
    await exec(ffmpegPath, [
      "-y", "-i", src, "-t", "14",
      "-vf", "scale=480:-2",
      "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", loop,
    ]);
    console.log(`video loop: ${id}`);
  }
  // larger version for the moment page
  if (FORCE || !(await exists(page))) {
    await exec(ffmpegPath, [
      "-y", "-i", src,
      "-vf", "scale=820:-2",
      "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", page,
    ]);
    console.log(`video page: ${id}`);
  }
  // poster frame -> jpg -> webp tile for preloads/fallback. Seek 1s in so it
  // works for short clips too (an 8s seek yields no frame on a <8s video).
  if (FORCE || !(await exists(posterWebp))) {
    await exec(ffmpegPath, ["-y", "-ss", "1", "-i", src, "-frames:v", "1", posterJpg]);
    await sharp(posterJpg).resize({ width: 640 }).webp({ quality: 72 }).toFile(posterWebp);
    const buf = await sharp(posterJpg).resize({ width: 24 }).webp({ quality: 20 }).toBuffer();
    lqip[id] = `data:image/webp;base64,${buf.toString("base64")}`;
    await writeFile(path.join(ROOT, "src", "data", "lqip.json"), JSON.stringify(lqip));
    console.log(`poster: ${id}`);
  }
}
console.log("done.");
