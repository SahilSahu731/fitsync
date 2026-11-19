import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const repo = path.resolve(root, "..");
const output = path.join(root, "assets/images");
const source = await fs.readFile(path.join(repo, "brand/mark.png"));
// Trim only empty padding; preserve the cutout's colour and alpha edges.
const artwork = await sharp(source).trim({ threshold: 10, lineArt: true }).png().toBuffer();
await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.join(root, "assets/brand"), { recursive: true });
await fs.mkdir(path.join(repo, "web/public/brand"), { recursive: true });

async function icon(size, { background = false, scale = 0.9, monochrome = false } = {}) {
  const edge = Math.round(size * scale);
  let mark = await sharp(artwork).resize(edge, edge, { fit: "inside" }).png().toBuffer();
  const { width, height } = await sharp(mark).metadata();
  if (monochrome) {
    // Android notification/themed icons use only an opaque white silhouette and alpha.
    const alpha = await sharp(mark).extractChannel("alpha").toBuffer();
    mark = await sharp({ create: { width, height, channels: 3, background: "#FFFFFF" } })
      .joinChannel(alpha)
      .png()
      .toBuffer();
  }
  let image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ? "#101011" : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([
    { input: mark, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) },
  ]);
  if (background) image = image.removeAlpha();
  return image.png({ compressionLevel: 9 }).toBuffer();
}

// One source for every app, splash, notification, website and home-screen icon.
// Adaptive marks fit within Android's central 66/108 safe circle.
for (const [name, size, options] of [
  ["icon.png", 1024, { background: true, scale: 0.82 }],
  ["adaptive-foreground.png", 1024, { scale: 0.52 }],
  ["android-icon-foreground.png", 1024, { scale: 0.52 }],
  ["android-icon-monochrome.png", 1024, { scale: 0.52, monochrome: true }],
  ["splash-icon.png", 1024, { scale: 0.9 }],
  ["favicon.png", 64, { background: true }],
  ["logo-glow.png", 512, { scale: 0.9 }],
]) {
  await fs.writeFile(path.join(output, name), await icon(size, options));
}
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#101011" } })
  .png()
  .toFile(path.join(output, "android-icon-background.png"));
await fs.copyFile(path.join(output, "icon.png"), path.join(repo, "web/public/logo.png"));
const brandMark = await icon(512, { scale: 0.96 });
await fs.writeFile(path.join(root, "assets/brand/mark.png"), brandMark);
await fs.writeFile(path.join(repo, "web/public/brand/mark.png"), brandMark);
await fs.writeFile(
  path.join(repo, "web/src/app/icon.png"),
  await icon(512, { background: true, scale: 0.82 }),
);
await fs.writeFile(
  path.join(repo, "web/src/app/apple-icon.png"),
  await icon(180, { background: true, scale: 0.82 }),
);
// ICO's 32-bit PNG payload must be RGBA, even with an opaque background.
const favicon = await sharp(await icon(48, { background: true }))
  .ensureAlpha()
  .png({ compressionLevel: 9, palette: false })
  .toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 48;
header[7] = 48;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14);
header.writeUInt32LE(22, 18);
await fs.writeFile(path.join(repo, "web/src/app/favicon.ico"), Buffer.concat([header, favicon]));
// Keep the optional Icon Composer artwork aligned with the same transparent source.
await fs.writeFile(path.join(root, "assets/expo.icon/Assets/fitsync-mark.png"), await icon(1024));
const composer = {
  fill: { "automatic-gradient": "extended-srgb:0.06275,0.06275,0.06667,1.00000" },
  groups: [{ layers: [{ "image-name": "fitsync-mark.png", name: "FitSync mark" }] }],
  "supported-platforms": { squares: "shared", circles: ["watchOS"] },
};
await fs.writeFile(
  path.join(root, "assets/expo.icon/icon.json"),
  JSON.stringify(composer, null, 2) + "\n",
);
console.log("Generated all FitSync icons from brand/mark.png.");
