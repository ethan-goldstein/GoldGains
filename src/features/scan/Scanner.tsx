import { useCallback, useEffect, useRef, useState } from 'react';
import { useUI } from '@/app/store';
import { normalizeGtin } from '@/domain/gtin';
import type { Food } from '@/domain/food';
import { useSettings } from '@/db/hooks';
import { updateSettings } from '@/db/repo';
import { db, MEAL_LABEL } from '@/db/schema';
import { decodeFrame, getDetector } from '@/scan/barcode';
import { backLenses, cameraErrorMessage, openCamera, setTorch, stopStream, torchSupported, type Lens } from '@/scan/camera';
import { OffError, lookupBarcode } from '@/sources/off';
import { Segmented } from '@/ui/controls';
import { IconBarcode, IconClose, IconLabel, IconTorch } from '@/ui/icons';
import { LabelReader } from './LabelReader';

/** Full-screen scanner overlay. Driven by app state — no URL change — so iOS keeps camera permission. */
export default function Scanner() {
  const scanner = useUI((s) => s.scanner)!;
  const close = useUI((s) => s.closeScanner);
  const [mode, setMode] = useState(scanner.mode);
  const [barcodeForLabel, setBarcodeForLabel] = useState<string | undefined>();

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Scanner">
      <div className="pt-safe absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 px-4 pt-3 pb-6">
          <button aria-label="Close scanner" onClick={close} className="grid size-10 place-items-center rounded-full bg-white/12 backdrop-blur">
            <IconClose size={20} />
          </button>
          <Segmented
            className="flex-1 border-white/10 bg-white/10 backdrop-blur"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: 'barcode',
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <IconBarcode size={16} /> Barcode
                  </span>
                ),
              },
              {
                value: 'label',
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <IconLabel size={16} /> Label
                  </span>
                ),
              },
            ]}
          />
          <div className="w-10 text-center text-[11px] text-white/60">{MEAL_LABEL[scanner.meal].slice(0, 5)}</div>
        </div>
      </div>
      {mode === 'barcode' ? (
        <BarcodeMode
          onNeedLabel={(code) => {
            setBarcodeForLabel(code);
            setMode('label');
          }}
        />
      ) : (
        <LabelReader barcode={barcodeForLabel} />
      )}
    </div>
  );
}

type Phase = { kind: 'starting' } | { kind: 'scanning' } | { kind: 'lookup'; code: string } | { kind: 'notFound'; code: string } | { kind: 'error'; message: string; code?: string };

function BarcodeMode({ onNeedLabel }: { onNeedLabel: (code: string) => void }) {
  const { scanner, closeScanner, open } = useUI();
  const settings = useSettings();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' });
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [lensId, setLensId] = useState<string | undefined>(settings.lensDeviceId);
  const [torch, setTorchOn] = useState(false);
  const [canTorch, setCanTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [typed, setTyped] = useState('');
  const scanning = useRef(false);

  const finish = useCallback(
    (food: Food) => {
      const meal = scanner!.meal;
      closeScanner();
      open({ type: 'food', meal, food });
    },
    [scanner, closeScanner, open],
  );

  const lookup = useCallback(
    async (raw: string, format?: string) => {
      scanning.current = false;
      const code = normalizeGtin(raw, format);
      setPhase({ kind: 'lookup', code });
      stopStream(stream.current);
      const local = await db.foods.where('barcode').equals(code).first();
      if (local) return finish(local);
      if (settings.offlineOnly) return setPhase({ kind: 'notFound', code });
      try {
        const food = await lookupBarcode(code);
        if (food) finish(food);
        else setPhase({ kind: 'notFound', code });
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof OffError ? e.message : 'Lookup failed.', code });
      }
    },
    [finish, settings.offlineOnly],
  );

  const start = useCallback(async () => {
    stopStream(stream.current);
    setPhase({ kind: 'starting' });
    try {
      const s = await openCamera(lensId);
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => undefined);
      }
      setCanTorch(torchSupported(s));
      setTorchOn(false);
      void backLenses().then(setLenses);
      await getDetector();
      setPhase({ kind: 'scanning' });
      scanning.current = true;
      let last = '';
      let streak = 0;
      const tick = async () => {
        if (!scanning.current || !video.current || !canvas.current) return;
        try {
          const hit = await decodeFrame(video.current, canvas.current);
          if (hit && /^\d{8,14}$/.test(hit.value)) {
            // require two identical reads in a row to avoid misreads
            streak = hit.value === last ? streak + 1 : 1;
            last = hit.value;
            if (streak >= 2) return void lookup(hit.value, hit.format);
          }
        } catch {
          /* keep scanning */
        }
        if (scanning.current) setTimeout(() => void tick(), 110);
      };
      void tick();
    } catch (e) {
      setPhase({ kind: 'error', message: cameraErrorMessage(e) });
    }
  }, [lensId, lookup]);

  useEffect(() => {
    void start();
    const onVis = () => {
      if (document.hidden) {
        scanning.current = false;
        stopStream(stream.current);
      } else void start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      scanning.current = false;
      document.removeEventListener('visibilitychange', onVis);
      stopStream(stream.current);
      stream.current = null;
    };
  }, [start]);

  const cycleLens = () => {
    if (lenses.length < 2) return;
    const i = lenses.findIndex((l) => l.deviceId === lensId);
    const next = lenses[(i + 1) % lenses.length]!;
    setLensId(next.deviceId);
    void updateSettings({ lensDeviceId: next.deviceId });
  };

  const currentLens = lenses.find((l) => l.deviceId === lensId)?.label ?? 'Auto';
  const live = phase.kind === 'scanning' || phase.kind === 'starting';

  return (
    <div className="relative flex-1 overflow-hidden">
      <video ref={video} playsInline muted autoPlay className="absolute inset-0 size-full object-cover" />
      <canvas ref={canvas} hidden />
      {/* viewfinder */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[34%] max-h-[260px] w-[82%] max-w-[420px] rounded-3xl shadow-[0_0_0_200vmax_rgba(0,0,0,0.55)]">
          {(['top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl'] as const).map((c) => (
            <span key={c} className={`absolute size-10 border-gold ${c}`} />
          ))}
          {live ? <div className="animate-scan-line absolute inset-x-6 top-1/2 h-[2px] rounded-full bg-gold shadow-[0_0_16px_2px_rgba(242,193,78,0.7)]" /> : null}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/85 to-transparent px-5 pt-16" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
        {phase.kind === 'notFound' ? (
          <div className="animate-pop-in rounded-3xl border border-white/10 bg-[#141416] p-4">
            <p className="text-[16px] font-semibold">Not in the database yet</p>
            <p className="num mt-1 text-[13px] text-white/60">
              {phase.code} isn’t in {settings.offlineOnly ? 'your foods' : 'Open Food Facts'}. Snap the label and GoldGains will remember it for next time.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn btn-ghost border-white/10 bg-white/10" onClick={() => void start()}>
                Scan again
              </button>
              <button className="btn btn-gold" onClick={() => onNeedLabel(phase.code)}>
                <IconLabel size={18} /> Scan label
              </button>
            </div>
          </div>
        ) : phase.kind === 'error' ? (
          <div className="animate-pop-in rounded-3xl border border-white/10 bg-[#141416] p-4">
            <p className="text-[15px]">{phase.message}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn btn-ghost border-white/10 bg-white/10" onClick={() => (phase.code ? void lookup(phase.code) : void start())}>
                Try again
              </button>
              <button className="btn btn-gold" onClick={() => onNeedLabel(phase.code ?? '')}>
                Use a label photo
              </button>
            </div>
          </div>
        ) : manual ? (
          <form
            className="animate-pop-in flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const c = typed.replace(/\D/g, '');
              if (c.length >= 8) void lookup(c);
            }}
          >
            <input
              autoFocus
              inputMode="numeric"
              className="field flex-1 border-white/15 bg-white/10 text-white"
              placeholder="Type the barcode digits"
              value={typed}
              maxLength={14}
              onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))}
            />
            <button className="btn btn-gold" disabled={typed.length < 8}>
              Find
            </button>
          </form>
        ) : (
          <>
            <p className="text-center text-[15px] font-medium">
              {phase.kind === 'lookup' ? <span className="num">Looking up {phase.code}…</span> : phase.kind === 'starting' ? 'Starting camera…' : 'Line up the barcode inside the frame'}
            </p>
            <p className="mt-1 text-center text-[12px] text-white/55">Hold 6–8 inches away. Blurry? Switch lens or move back a little.</p>
          </>
        )}
        <div className="mt-4 flex items-center justify-center gap-3">
          {canTorch ? (
            <RoundBtn
              label={torch ? 'Torch off' : 'Torch on'}
              active={torch}
              onClick={async () => {
                const ok = await setTorch(stream.current, !torch);
                if (ok) setTorchOn(!torch);
              }}
            >
              <IconTorch size={20} />
            </RoundBtn>
          ) : null}
          {lenses.length > 1 ? (
            <button onClick={cycleLens} className="h-11 rounded-full bg-white/12 px-4 text-[13px] font-semibold backdrop-blur">
              Lens: {currentLens}
            </button>
          ) : null}
          <button
            onClick={() => {
              setManual((m) => !m);
              if (phase.kind !== 'scanning') void start();
            }}
            className="h-11 rounded-full bg-white/12 px-4 text-[13px] font-semibold backdrop-blur"
          >
            {manual ? 'Use camera' : 'Type it in'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoundBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button aria-label={label} onClick={onClick} className={`grid size-11 place-items-center rounded-full backdrop-blur ${active ? 'bg-gold text-black' : 'bg-white/12'}`}>
      {children}
    </button>
  );
}

