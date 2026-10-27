import { useEffect, useRef, useState } from 'react';
import { useUI } from '@/app/store';
import { recognize } from '@/scan/ocr/ocr';
import { parseLabel } from '@/scan/ocr/parseLabel';
import { prepareForOcr, releaseCanvas, type CropBox } from '@/scan/ocr/preprocess';
import { validateLabel } from '@/scan/ocr/validate';
import { IconCamera, IconImage, IconLabel } from '@/ui/icons';

type Step = { kind: 'pick' } | { kind: 'crop'; bitmap: ImageBitmap; url: string } | { kind: 'reading'; stage: string; progress: number } | { kind: 'failed'; message: string };

const STAGE: Record<string, string> = {
  'loading tesseract core': 'Loading the label reader…',
  'initializing tesseract': 'Warming up…',
  'loading language traineddata': 'Loading the English model (first time only)…',
  'initializing api': 'Getting ready…',
  'recognizing text': 'Reading the label…',
};

/**
 * Label mode: the native camera (full-res photo, macro lens, no permission prompt) or a photo
 * from the library → crop to the Nutrition Facts box → on-device OCR → prefilled food form.
 */
export function LabelReader({ barcode }: { barcode?: string }) {
  const { scanner, closeScanner, open } = useUI();
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const camInput = useRef<HTMLInputElement>(null);
  const libInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (step.kind === 'crop') {
        step.bitmap.close();
        URL.revokeObjectURL(step.url);
      }
    },
    [step],
  );

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setStep({ kind: 'failed', message: 'That isn’t an image.' });
    try {
      const bitmap = await createImageBitmap(f);
      setStep({ kind: 'crop', bitmap, url: URL.createObjectURL(f) });
    } catch {
      setStep({ kind: 'failed', message: 'Couldn’t open that photo. Try taking it again.' });
    }
  };

  const read = async (bitmap: ImageBitmap, crop: CropBox) => {
    const canvas = prepareForOcr(bitmap, crop);
    setStep({ kind: 'reading', stage: 'Preparing…', progress: 0 });
    try {
      const res = await recognize(canvas, (stage, p) => setStep({ kind: 'reading', stage: STAGE[stage] ?? 'Working…', progress: stage === 'recognizing text' ? p : 0 }));
      const low = new Set(res.words.filter((w) => w.confidence < 80).map((w) => w.text.toLowerCase().replace(/[^a-z0-9.]/g, '')));
      const parsed = validateLabel(parseLabel(res.text, low));
      if (parsed.found === 0) {
        setStep({ kind: 'failed', message: 'No nutrition facts found. Crop tightly around the Nutrition Facts box and make sure it’s in focus.' });
        return;
      }
      const meal = scanner!.meal;
      closeScanner();
      open({
        type: 'createFood',
        meal,
        draft: {
          nutrients: parsed.nutrients,
          ...(parsed.serving ? { serving: parsed.serving } : {}),
          ...(barcode ? { barcode } : {}),
          flagged: parsed.flagged,
          warnings: parsed.warnings,
        },
      });
    } catch {
      setStep({ kind: 'failed', message: 'The label reader couldn’t start. Check your connection the first time you use it, then try again.' });
    } finally {
      releaseCanvas(canvas);
    }
  };

  return (
    <div className="pt-safe flex flex-1 flex-col overflow-hidden pt-[76px]">
      <input ref={camInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      <input ref={libInput} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0]).finally(() => (e.target.value = ''))} />

      {step.kind === 'pick' || step.kind === 'failed' ? (
        <div className="flex flex-1 flex-col px-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="grid size-24 place-items-center rounded-[28px] border border-gold/30 bg-gold/10 text-gold">
              <IconLabel size={44} />
            </div>
            <h2 className="mt-6 text-[24px] font-bold tracking-tight">Snap the Nutrition Facts</h2>
            {barcode ? <p className="num mt-1 text-[13px] text-gold">Will be saved to barcode {barcode}</p> : null}
            <ul className="mt-4 space-y-1.5 text-left text-[14px] text-white/65">
              <li>• Fill the frame with just the facts box</li>
              <li>• Flatten curved packages; avoid glare</li>
              <li>• You’ll check every number before it saves</li>
            </ul>
            {step.kind === 'failed' ? <p className="mt-5 rounded-2xl bg-over/15 px-4 py-3 text-[14px] text-over">{step.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <button className="btn btn-gold text-[16px]" onClick={() => camInput.current?.click()}>
              <IconCamera size={20} /> Take photo
            </button>
            <button className="btn btn-ghost border-white/10 bg-white/10 text-white" onClick={() => libInput.current?.click()}>
              <IconImage size={20} /> Choose from library
            </button>
          </div>
        </div>
      ) : step.kind === 'crop' ? (
        <Cropper url={step.url} aspect={step.bitmap.width / step.bitmap.height} onCancel={() => setStep({ kind: 'pick' })} onDone={(c) => void read(step.bitmap, c)} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
          <div className="relative size-20">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/10 border-t-gold" />
          </div>
          <p className="mt-6 text-[16px] font-semibold">{step.stage}</p>
          <div className="mt-4 h-1.5 w-full max-w-[260px] overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${Math.round(step.progress * 100)}%` }} />
          </div>
          <p className="mt-3 text-[12px] text-white/50">Runs entirely on your phone.</p>
        </div>
      )}
    </div>
  );
}

/** Drag the corners to frame just the Nutrition Facts box. */
function Cropper({ url, aspect, onCancel, onDone }: { url: string; aspect: number; onCancel: () => void; onDone: (c: CropBox) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [c, setC] = useState<CropBox>({ x: 0.02, y: 0.02, w: 0.96, h: 0.96 });
  const drag = useRef<{ corner: string; sx: number; sy: number; start: CropBox } | null>(null);

  const onDown = (corner: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { corner, sx: e.clientX, sy: e.clientY, start: c };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const r = box.current?.getBoundingClientRect();
    if (!d || !r) return;
    const dx = (e.clientX - d.sx) / r.width;
    const dy = (e.clientY - d.sy) / r.height;
    const s = d.start;
    const MIN = 0.12;
    let { x, y, w, h } = s;
    if (d.corner === 'move') {
      x = Math.min(1 - w, Math.max(0, s.x + dx));
      y = Math.min(1 - h, Math.max(0, s.y + dy));
    } else {
      if (d.corner.includes('l')) {
        x = Math.min(s.x + s.w - MIN, Math.max(0, s.x + dx));
        w = s.w + (s.x - x);
      }
      if (d.corner.includes('r')) w = Math.min(1 - s.x, Math.max(MIN, s.w + dx));
      if (d.corner.includes('t')) {
        y = Math.min(s.y + s.h - MIN, Math.max(0, s.y + dy));
        h = s.h + (s.y - y);
      }
      if (d.corner.includes('b')) h = Math.min(1 - s.y, Math.max(MIN, s.h + dy));
    }
    setC({ x, y, w, h });
  };
  const onUp = () => (drag.current = null);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <div ref={box} className="relative max-h-full touch-none" style={{ aspectRatio: aspect, width: aspect > 0.75 ? '100%' : undefined, height: aspect <= 0.75 ? '100%' : undefined }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <img src={url} alt="Your label photo" className="size-full rounded-xl object-contain select-none" draggable={false} />
          <div
            className="absolute cursor-move border-2 border-gold shadow-[0_0_0_200vmax_rgba(0,0,0,0.55)]"
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` }}
            onPointerDown={onDown('move')}
          >
            {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
              <span
                key={k}
                onPointerDown={onDown(k)}
                className="absolute size-9 touch-none"
                style={{ left: k.includes('l') ? -18 : undefined, right: k.includes('r') ? -18 : undefined, top: k.includes('t') ? -18 : undefined, bottom: k.includes('b') ? -18 : undefined }}
              >
                <span className="absolute inset-[10px] rounded-full border-2 border-black bg-gold" />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-2 px-5 pt-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
        <button className="btn btn-ghost border-white/10 bg-white/10 text-white" onClick={onCancel}>
          Retake
        </button>
        <button className="btn btn-gold" onClick={() => onDone(c)}>
          Read label
        </button>
      </div>
    </div>
  );
}
