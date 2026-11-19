// Renders the PNG app icons from public/favicon.svg. Run with: bun run icons
// The PNGs are committed, so builds and CI never run this script.
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../public/favicon.svg", import.meta.url));

const outputs: Array<[file: string, size: number]> = [
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [file, size] of outputs) {
  const out = new URL(`../public/${file}`, import.meta.url);
  await sharp(source, { density: 300 })
    .resize(size, size)
    .flatten({ background: "#C2410C" })
    .png()
    .toFile(out.pathname);
  console.log(`wrote public/${file} (${size}x${size})`);
}
