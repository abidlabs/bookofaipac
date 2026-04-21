import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { barcodeStripeRects } from "./barcodeStripes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const SIZE = 1024;
const BG = "#0c0c0e";
const ACCENT = "#7da0ff";
const FONT =
  "Helvetica Neue, Helvetica, Arial, ui-sans-serif, system-ui, sans-serif";
const FONT_SIZE = 268;
const LINE_1 = "Scan";
const LINE_2 = "AIPAC";
const BASELINE_GAP = FONT_SIZE;
const VERTICAL_CENTER_ADJUST = FONT_SIZE * 0.275;
const midBaseline = SIZE / 2 + VERTICAL_CENTER_ADJUST;
const BASELINE_1 = Math.round(midBaseline - BASELINE_GAP / 2);
const BASELINE_2 = Math.round(midBaseline + BASELINE_GAP / 2);

const CORNER_INSET = 40;
const CORNER_ARM = 68;
const CORNER_STROKE = 9;

const W = SIZE;
const H = SIZE;

const barcodeCuts = barcodeStripeRects(W, H, BG);

const i = CORNER_INSET;
const a = CORNER_ARM;
const s = CORNER_STROKE;
const corners = `
  <path d="M ${i + a} ${i} L ${i} ${i} L ${i} ${i + a}" fill="none" stroke="${ACCENT}" stroke-width="${s}" stroke-linecap="square" stroke-linejoin="miter"/>
  <path d="M ${W - i - a} ${i} L ${W - i} ${i} L ${W - i} ${i + a}" fill="none" stroke="${ACCENT}" stroke-width="${s}" stroke-linecap="square" stroke-linejoin="miter"/>
  <path d="M ${i} ${H - i - a} L ${i} ${H - i} L ${i + a} ${H - i}" fill="none" stroke="${ACCENT}" stroke-width="${s}" stroke-linecap="square" stroke-linejoin="miter"/>
  <path d="M ${W - i} ${H - i - a} L ${W - i} ${H - i} L ${W - i - a} ${H - i}" fill="none" stroke="${ACCENT}" stroke-width="${s}" stroke-linecap="square" stroke-linejoin="miter"/>
`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <defs>
    <clipPath id="iconWordClip">
      <text x="${W / 2}" y="${BASELINE_1}" text-anchor="middle" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#ffffff">${LINE_1}</text>
      <text x="${W / 2}" y="${BASELINE_2}" text-anchor="middle" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#ffffff">${LINE_2}</text>
    </clipPath>
  </defs>
  <text x="${W / 2}" y="${BASELINE_1}" text-anchor="middle" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#ffffff">${LINE_1}</text>
  <text x="${W / 2}" y="${BASELINE_2}" text-anchor="middle" font-family="${FONT}" font-size="${FONT_SIZE}" font-weight="700" fill="#ffffff">${LINE_2}</text>
  <g clip-path="url(#iconWordClip)">
    ${barcodeCuts.join("\n    ")}
  </g>
  ${corners}
</svg>`;

const svgPath = path.join(root, "assets", "app-icon.svg");
const pngPath = path.join(root, "assets", "icon.png");

fs.writeFileSync(svgPath, svg, "utf8");

const pngBuffer = await sharp(Buffer.from(svg))
  .flatten({ background: BG })
  .png()
  .resize(SIZE, SIZE)
  .toBuffer();

fs.writeFileSync(pngPath, pngBuffer);
console.log("Wrote", svgPath);
console.log("Wrote", pngPath, `(${pngBuffer.length} bytes)`);
