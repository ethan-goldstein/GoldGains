// On-device text recognition with Tesseract (WebAssembly). Engine files are served from our
// own origin (see scripts/copy-ocr-assets.ts); the language model is cached in IndexedDB
// after the first scan. One worker, terminated after a minute idle to free memory.
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';
import { OCR_DIR } from './assets.gen';

let worker: Promise<Worker> | null = null;
let idle: ReturnType<typeof setTimeout> | undefined;
let progressCb: ((stage: string, p: number) => void) | null = null;

const abs = (p: string) => new URL(`${import.meta.env.BASE_URL}${p}`, location.href).href;

function getWorker(): Promise<Worker> {
  if (!worker) {
    const dir = abs(OCR_DIR);
    worker = createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: `${dir}worker.min.js`,
      corePath: dir,
      langPath: dir.replace(/\/$/, ''),
      workerBlobURL: false,
      gzip: true,
      logger: (m: { status: string; progress: number }) => progressCb?.(m.status, m.progress),
    }).then(async (w) => {
      await w.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
      });
      return w;
    });
    worker.catch(() => {
      worker = null;
    });
  }
  return worker;
}

export interface OcrWord {
  text: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  words: OcrWord[];
  confidence: number;
}

export async function recognize(image: HTMLCanvasElement, onProgress?: (stage: string, p: number) => void): Promise<OcrResult> {
  clearTimeout(idle);
  progressCb = onProgress ?? null;
  try {
    const w = await getWorker();
    const { data } = await w.recognize(image, {}, { text: true, blocks: true });
    const words: OcrWord[] = [];
    for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const wd of l.words) words.push({ text: wd.text, confidence: wd.confidence });
    return { text: data.text, words, confidence: data.confidence };
  } finally {
    progressCb = null;
    idle = setTimeout(() => void shutdown(), 60_000);
  }
}

export async function shutdown() {
  const w = worker;
  worker = null;
  if (w) await (await w).terminate().catch(() => undefined);
}
