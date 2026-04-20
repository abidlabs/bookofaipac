import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const W = 1200;
const H = 500;
const TEXT = "ScanAIPAC";
const FONT =
  "Helvetica Neue, Helvetica, Arial, ui-sans-serif, system-ui, sans-serif";
const FONT_SIZE = 182;
const TEXT_Y = 322;
const BG = "#0c0c0e";
const BARCODE_CUT_HEIGHT = 3;
const BARCODE_STRIDE = 7;

const barcodeCuts = [];
for (let y = 0; y < H; y += BARCODE_STRIDE) {
  barcodeCuts.push(
    `<rect x="0" y="${y}" width="${W}" height="${BARCODE_CUT_HEIGHT}" fill="${BG}"/>`
  );
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <defs>
    <clipPath id="wordClip">
      <text x="${W / 2}" y="${TEXT_Y}" text-anchor="middle" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#ffffff">${TEXT}</text>
    </clipPath>
  </defs>
  <text x="${W / 2}" y="${TEXT_Y}" text-anchor="middle" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#ffffff">${TEXT}</text>
  <g clip-path="url(#wordClip)">
    ${barcodeCuts.join("\n    ")}
  </g>
</svg>`;

const svgPath = path.join(root, "assets", "wordmark-barcode.svg");
const pngPath = path.join(root, "assets", "scan-aipac-wordmark-hero.png");

fs.writeFileSync(svgPath, svg, "utf8");

const pngBuffer = await sharp(Buffer.from(svg))
  .png()
  .resize(W * 2, H * 2)
  .toBuffer();

fs.writeFileSync(pngPath, pngBuffer);
console.log("Wrote", svgPath);
console.log("Wrote", pngPath, `(${pngBuffer.length} bytes)`);
