import type { ReactNode } from 'react';

interface Props {
  /** 0–1+ share of the ring to fill; above 1 the overflow wraps in the "over" color */
  progress: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  color?: 'gold' | string;
  label?: string;
}

/** The hero calorie ring: gold gradient arc, with overflow past 100% drawn in the over color. */
export function Ring({ progress, size = 220, stroke = 16, children, color = 'gold', label }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, progress);
  const main = Math.min(1, p);
  const over = p > 1 ? Math.min(1, p - 1) : 0;
  const id = `ring-${size}-${stroke}`;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-bright)" />
            <stop offset="60%" stopColor="var(--color-gold)" />
            <stop offset="100%" stopColor="var(--color-gold-deep)" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        {main > 0 && color === 'gold' ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeDasharray={`${c * main} ${c}`}
            opacity={0.35}
            filter={`url(#${id}-glow)`}
          />
        ) : null}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color === 'gold' ? `url(#${id})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * main} ${c}`}
          style={{ transition: 'stroke-dasharray 700ms var(--ease-out-soft)' }}
          opacity={main > 0 ? 1 : 0}
        />
        {over > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-over)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * over} ${c}`}
            style={{ transition: 'stroke-dasharray 700ms var(--ease-out-soft)' }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** Small progress ring for week strips and tiles */
export function MiniRing({ progress, size = 30, stroke = 3.5, over }: { progress: number; size?: number; stroke?: number; over?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
      {p > 0 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'var(--color-over)' : 'var(--color-gold)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
        />
      ) : null}
    </svg>
  );
}
