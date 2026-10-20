
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const output = path.resolve("assets/images");
await fs.mkdir(output, { recursive: true });

const symbol = `
  <g fill="#FF7838">
    <rect x="70" y="207" width="20" height="98" rx="4"/>
    <rect x="96" y="173" width="38" height="166" rx="10"/>
    <rect x="142" y="203" width="24" height="106" rx="5"/>

    <rect x="346" y="203" width="24" height="106" rx="5"/>
    <rect x="378" y="173" width="38" height="166" rx="10"/>
    <rect x="422" y="207" width="20" height="98" rx="4"/>

    <path d="
      M314 55
      L171 256
      H247
      L194 453
      L366 235
      H285
      Z
    "/>
  </g>
`;

function svg(size, background = false) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg"
       width="${size}" height="${size}"
       viewBox="0 0 512 512">
    ${background
      ? '<rect width="512" height="512" fill="#101011"/>'
      : ""}
    ${symbol}
  </svg>`;
}

await sharp(Buffer.from(svg(1024, true)))
  .png()
  .toFile(path.join(output, "icon.png"));

await sharp(Buffer.from(svg(1024, false)))
  .png()
  .toFile(path.join(output, "adaptive-foreground.png"));

await sharp(Buffer.from(svg(1024, false)))
  .png()
  .toFile(path.join(output, "splash-icon.png"));

console.log("FitSync branding assets generated successfully.");
