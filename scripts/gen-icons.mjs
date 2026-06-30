// One-off: render the app icon SVG to the PNGs the manifest references.
// Run from apps/web:  node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";

const pub = path.join(process.cwd(), "public");
const svg = readFileSync(path.join(pub, "icon.svg"));

const out = (size, name) =>
  sharp(svg, { density: 512 })
    .resize(size, size)
    .png()
    .toFile(path.join(pub, name));

await Promise.all([
  out(192, "icon-192.png"),
  out(512, "icon-512.png"),
  out(180, "apple-touch-icon.png"),
]);

console.log("icons generated");
