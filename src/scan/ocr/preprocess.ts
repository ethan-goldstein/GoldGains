export interface CropBox {
  /** fractions of the image, 0–1 */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Crop → scale so text is large enough for Tesseract but the canvas stays small enough
 * for iPhone memory → grayscale with an auto-levels contrast stretch.
 */
export function prepareForOcr(bitmap: ImageBitmap, crop: CropBox): HTMLCanvasElement {
  const sx = Math.round(crop.x * bitmap.width);
  const sy = Math.round(crop.y * bitmap.height);
  const sw = Math.max(1, Math.round(crop.w * bitmap.width));
  const sh = Math.max(1, Math.round(crop.h * bitmap.height));
  // aim for ~1600px on the long side; never above 2000
  const long = Math.max(sw, sh);
  const scale = Math.min(2000 / long, Math.max(1, 1600 / long));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.round(0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!);
    d[i] = l;
    hist[l]!++;
  }
  // stretch between the 2nd and 98th percentile
  const total = canvas.width * canvas.height;
  let lo = 0;
  let hi = 255;
  for (let acc = 0, v = 0; v < 256; v++) {
    acc += hist[v]!;
    if (acc > total * 0.02) {
      lo = v;
      break;
    }
  }
  for (let acc = 0, v = 255; v >= 0; v--) {
    acc += hist[v]!;
    if (acc > total * 0.02) {
      hi = v;
      break;
    }
  }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i]! - lo) * 255) / span));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function releaseCanvas(c: HTMLCanvasElement | null | undefined) {
  if (!c) return;
  c.width = 0;
  c.height = 0;
}
