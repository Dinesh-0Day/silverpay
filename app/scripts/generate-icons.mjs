#!/usr/bin/env node
/**
 * Build square PWA icons from silverpaysplogo.png with safe padding so edges are not clipped.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..");

const sources = [
  path.join(repoRoot, "silverpaysplogo.png"),
  path.join(appRoot, "public/icons/silverpaysplogo.png"),
].filter((p) => fs.existsSync(p));

if (!sources.length) {
  console.error("silverpaysplogo.png not found at repo root or app/public/icons/");
  process.exit(1);
}

const source = sources[0];
const outDir = path.join(appRoot, "public/icons");
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(source, path.join(outDir, "silverpaysplogo.png"));

const BG = { r: 15, g: 23, b: 42, alpha: 1 };

async function buildSquare(size, padRatio, outName) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  const resized = await sharp(source).resize(inner, inner, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const w = meta.width ?? inner;
  const h = meta.height ?? inner;
  const left = Math.round((size - w) / 2);
  const top = Math.round((size - h) / 2);

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toFile(path.join(outDir, outName));

  console.log(`  ${outName} (${size}×${size}, pad ${Math.round(padRatio * 100)}%)`);
}

console.log(`Source: ${source}`);
await buildSquare(192, 0.14, "icon-192.png");
await buildSquare(512, 0.14, "icon-512.png");
await buildSquare(512, 0.22, "icon-maskable-512.png");
console.log("Done → app/public/icons/");
