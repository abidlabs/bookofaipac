export function barcodeStripeRects(width, height, fill) {
  const cutHeights = [7, 3, 5, 2, 8, 4, 3, 6, 5, 4, 2, 7, 6, 3, 5];
  const gapHeights = [5, 6, 4, 7, 3, 6, 5, 4, 6, 5, 8, 4, 5, 6, 4];
  const rects = [];
  let y = 0;
  let i = 0;
  while (y < height) {
    const ch = cutHeights[i % cutHeights.length];
    const g = gapHeights[i % gapHeights.length];
    rects.push(`<rect x="0" y="${y}" width="${width}" height="${ch}" fill="${fill}"/>`);
    y += ch + g;
    i += 1;
  }
  return rects;
}
