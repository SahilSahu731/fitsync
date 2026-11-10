import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const repo = path.resolve(root, "..");
const output = path.join(root, "assets/images");
const source = await fs.readFile(path.join(repo, "brand/mark.svg"), "utf8");
const artwork = source.replace(/<svg[^>]*>/, "").replace("</svg>", "");
await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.join(repo, "web/public/brand"), { recursive: true });

function svg(size, { background = false, scale = 0.9, monochrome = false } = {}) {
  const mark = monochrome ? artwork.replaceAll("#C5F460", "#FFFFFF") : artwork;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    ${background ? '<rect width="32" height="32" fill="#101011"/>' : ""}
    <g transform="translate(16 16) scale(${scale}) translate(-16 -16)">${mark}</g>
  </svg>`;
}

// One source for every app, splash, notification, website and home-screen icon.
// Adaptive marks fit within Android's central 66/108 safe circle.
for (const [name, size, options] of [
  ["icon.png", 1024, { background: true }],
  ["adaptive-foreground.png", 1024, { scale: 0.72 }],
  ["android-icon-foreground.png", 1024, { scale: 0.72 }],
  ["android-icon-monochrome.png", 1024, { scale: 0.72, monochrome: true }],
  ["splash-icon.png", 1024, { scale: 0.9 }],
  ["favicon.png", 64, { background: true, scale: 1 }],
  ["logo-glow.png", 512, { scale: 0.9 }],
]) await sharp(Buffer.from(svg(size, options))).png().toFile(path.join(output, name));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#101011" } }).png().toFile(path.join(output, "android-icon-background.png"));
await fs.copyFile(path.join(output, "icon.png"), path.join(repo, "web/public/logo.png"));
await fs.writeFile(path.join(root, "assets/brand/mark.svg"), source);
await fs.writeFile(path.join(repo, "web/public/brand/mark.svg"), source);
await sharp(Buffer.from(svg(512, { background: true }))).png().toFile(path.join(repo, "web/src/app/icon.png"));
await sharp(Buffer.from(svg(180, { background: true }))).png().toFile(path.join(repo, "web/src/app/apple-icon.png"));
const favicon = await sharp(Buffer.from(svg(48, { background: true, scale: 1 }))).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 48; header[7] = 48;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14); header.writeUInt32LE(22, 18);
await fs.writeFile(path.join(repo, "web/src/app/favicon.ico"), Buffer.concat([header, favicon]));
// Replace the unused starter Icon Composer artwork as well.
await fs.writeFile(path.join(root, "assets/expo.icon/Assets/expo-symbol 2.svg"), svg(1024));
const composer = { fill: { "automatic-gradient": "extended-srgb:0.06275,0.06275,0.06667,1.00000" }, groups: [{ layers: [{ "image-name": "expo-symbol 2.svg", name: "FitSync mark" }] }], "supported-platforms": { squares: "shared", circles: ["watchOS"] } };
await fs.writeFile(path.join(root, "assets/expo.icon/icon.json"), JSON.stringify(composer, null, 2) + "\n");
console.log("Generated all FitSync icons from brand/mark.svg.");
