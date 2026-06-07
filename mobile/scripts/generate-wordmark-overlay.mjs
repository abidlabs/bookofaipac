import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { barcodeStripeRects } from "./barcodeStripes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const W = 400;
const H = 38;
const TEXT = "ScanAIPAC";
const FONT =
  "Helvetica Neue, Helvetica, Arial, ui-sans-serif, system-ui, sans-serif";
const FONT_SIZE = 34;
const TEXT_Y = 30;
const STRIPE = "#0c0c0e";

const barcodeCuts = barcodeStripeRects(W, H, STRIPE);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
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

const pngPath = path.join(root, "assets", "wordmark-overlay.png");

const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
fs.writeFileSync(pngPath, pngBuffer);
console.log("Wrote", pngPath, `(${pngBuffer.length} bytes)`);
