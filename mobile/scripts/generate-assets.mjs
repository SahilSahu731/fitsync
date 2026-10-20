import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "assets/images");
const source = await fs.readFile(path.join(root, "assets/brand/mark.svg"), "utf8");
const artwork = source.replace(/<svg[^>]*>/, "").replace("</svg>", "");
await fs.mkdir(output, { recursive: true });

function svg(size, { background = false, scale = 1, monochrome = false } = {}) {
  const mark = monochrome
    ? artwork.replace('fill="url(#energy)"', 'fill="#FFFFFF"').replace('fill="#F8F7F4"', 'fill="#FFFFFF"')
    : artwork;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    ${background ? '<rect width="512" height="512" fill="#101011"/>' : ""}
    <g transform="translate(256 256) scale(${scale}) translate(-244 -256)">${mark}</g>
  </svg>`;
}

// Adaptive artwork stays inside Android's central 66/108 safe circle.
const assets = [
  ["icon.png", 1024, { background: true, scale: 1.25 }],
  ["adaptive-foreground.png", 1024, { scale: 0.9 }],
  ["android-icon-monochrome.png", 1024, { scale: 0.9, monochrome: true }],
  ["splash-icon.png", 1024, { scale: 1.25 }],
  ["favicon.png", 64, { background: true, scale: 1.25 }]
];

for (const [name, size, options] of assets) {
  await sharp(Buffer.from(svg(size, options))).png().toFile(path.join(output, name));
}

console.log("Generated FitSync app, adaptive, monochrome, splash and favicon assets.");
