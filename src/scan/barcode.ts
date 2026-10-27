// Barcode decoding with ZXing compiled to WebAssembly (Safari has no native BarcodeDetector).
// The .wasm ships with the app — Vite emits it as an asset — so nothing loads from a CDN.
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

let ready: Promise<BarcodeDetector> | null = null;

export function getDetector(): Promise<BarcodeDetector> {
  if (!ready) {
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? new URL(wasmUrl, location.href).href : prefix + path),
      },
    });
    ready = Promise.resolve(new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }));
  }
  return ready;
}

export interface Hit {
  value: string;
  format: string;
}

/** Decode the centre band of a video frame. Returns the first retail barcode found. */
export async function decodeFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<Hit | null> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  // centre crop: barcodes are wide; a smaller image decodes faster and ignores clutter
  const cw = Math.round(vw * 0.86);
  const ch = Math.round(vh * 0.5);
  const scale = Math.min(1, 1280 / cw);
  canvas.width = Math.round(cw * scale);
  canvas.height = Math.round(ch * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
  const det = await getDetector();
  const found = await det.detect(canvas);
  const hit = found[0];
  return hit ? { value: hit.rawValue, format: hit.format } : null;
}
