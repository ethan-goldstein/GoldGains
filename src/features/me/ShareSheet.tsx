import { useMemo } from 'react';
import { encode } from 'uqr';
import { useUI } from '@/app/store';
import { Mark } from '@/ui/Brand';
import { IconCopy, IconShare } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

/**
 * The public install link. Always the hosted site, never the address this copy runs on
 * (localhost in dev), so a shared link works for anyone on any network.
 */
export const APP_URL = 'https://ethan-goldstein.github.io/GoldGains/';
const SHARE_TEXT = 'GoldGains: my calorie, macro and workout tracker. Open the link in Safari, then tap Share → Add to Home Screen.';

async function copyLink() {
  try {
    await navigator.clipboard.writeText(APP_URL);
    toast('Link copied');
  } catch {
    toast('Couldn’t copy. Press and hold the link to copy it.', { tone: 'error' });
  }
}

async function shareLink() {
  if (typeof navigator.share !== 'function') return copyLink();
  try {
    await navigator.share({ title: 'GoldGains', text: SHARE_TEXT, url: APP_URL });
  } catch (e) {
    // closing the share sheet rejects with AbortError; anything else falls back to copying
    if ((e as DOMException).name !== 'AbortError') await copyLink();
  }
}

export function ShareSheet() {
  const back = useUI((s) => s.back);
  return (
    <Sheet
      title="Share GoldGains"
      onClose={back}
      footer={
        <button className="btn btn-gold w-full text-[16px]" onClick={() => void shareLink()}>
          <IconShare size={20} /> Share link
        </button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="rounded-[28px] bg-white p-[18px] shadow-[0_0_80px_-10px_rgba(242,193,78,0.35)]">
          <QrCode text={APP_URL} size={196} />
        </div>
        <p className="mt-3 text-[13px] text-muted">Friends can scan this with their phone’s camera.</p>
        <div className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 py-1.5 pr-1.5 pl-4 text-left">
          {/* a real link, so press-and-hold offers Copy Link when the clipboard API is unavailable */}
          <a
            href={APP_URL}
            onClick={(e) => {
              e.preventDefault();
              void copyLink();
            }}
            className="min-w-0 flex-1 truncate text-[13px]"
          >
            {APP_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}
          </a>
          <button onClick={() => void copyLink()} className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-[13px] font-semibold text-gold active:bg-surface-3">
            <IconCopy size={16} /> Copy
          </button>
        </div>
      </div>

      <div className="eyebrow mt-6 mb-2">How they install it</div>
      <ol className="card divide-y divide-line/70 overflow-hidden">
        <Step n={1} title="iPhone" detail="Open the link in Safari, tap Share, then Add to Home Screen." />
        <Step n={2} title="Android" detail="Open the link in Chrome, tap ⋮, then Install app." />
      </ol>
      <p className="mt-3 text-[12px] leading-relaxed text-faint">
        Free, no account, and it works on any Wi-Fi or cellular connection — no VPN needed. Everyone’s logs stay on their own phone; nobody sees anyone else’s data.
      </p>
    </Sheet>
  );
}

function Step({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-[13px] font-bold text-gold">{n}</span>
      <div>
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="text-[13px] text-muted">{detail}</div>
      </div>
    </li>
  );
}

/**
 * QR code with rounded finder eyes and the GG mark in the middle. High error correction (H, 30%)
 * covers the modules hidden under the logo, so it still scans.
 */
function QrCode({ text, size }: { text: string; size: number }) {
  const { n, d, logo } = useMemo(() => {
    const qr = encode(text, { ecc: 'H', border: 0 });
    const n = qr.size;
    const logo = Math.round(n * 0.26) | 1; // odd, so it centres on a module
    const lo = (n - logo) / 2;
    const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    const hidden = (x: number, y: number) => finder(x, y) || (x >= lo && x < lo + logo && y >= lo && y < lo + logo);
    // one path segment per horizontal run of dark modules
    let d = '';
    qr.data.forEach((row, y) => {
      for (let x = 0; x < n; x++) {
        if (!row[x] || hidden(x, y)) continue;
        let len = 1;
        while (x + len < n && row[x + len] && !hidden(x + len, y)) len++;
        d += `M${x} ${y}h${len}v1h-${len}z`;
        x += len - 1;
      }
    });
    return { n, d, logo: { lo, size: logo } };
  }, [text]);

  const eyes = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ];
  const pad = 0.9;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} role="img" aria-label="QR code for the GoldGains link">
      <path d={d} fill="#000" shapeRendering="crispEdges" />
      {eyes.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x! + 0.5} y={y! + 0.5} width={6} height={6} rx={1.8} fill="none" stroke="#000" strokeWidth={1} />
          <rect x={x! + 2} y={y! + 2} width={3} height={3} rx={0.9} fill="#000" />
        </g>
      ))}
      <rect x={logo.lo + 0.4} y={logo.lo + 0.4} width={logo.size - 0.8} height={logo.size - 0.8} rx={logo.size * 0.24} fill="#0b0b0c" />
      <g transform={`translate(${logo.lo + pad} ${logo.lo + pad})`}>
        <Mark size={logo.size - pad * 2} />
      </g>
    </svg>
  );
}
