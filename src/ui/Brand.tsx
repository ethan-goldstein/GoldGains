import { useId, type ReactNode } from 'react';
import { MARK, MARK_GOLD, MARK_PATHS } from './markGeometry';

/**
 * The GG ring mark. `track` adds the dark ring tracks behind the gold; `draw` animates the
 * strokes in like a progress ring filling.
 */
export function Mark({ size = 28, track = false, draw = false, label, className = '' }: { size?: number; track?: boolean; draw?: boolean; label?: string; className?: string }) {
  // per-instance gradient id: a shared id breaks when the first copy sits in a hidden sheet
  const id = `gg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { center: c, outer, inner, stroke } = MARK;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="12" y1="12" x2="88" y2="88">
          {MARK_GOLD.map(([o, col]) => (
            <stop key={o} offset={o} stopColor={col} />
          ))}
        </linearGradient>
      </defs>
      {track ? (
        <g fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke}>
          <circle cx={c} cy={c} r={outer} />
          <circle cx={c} cy={c} r={inner} />
        </g>
      ) : null}
      <g fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d={MARK_PATHS.outer} pathLength={1} className={draw ? 'animate-mark-draw' : undefined} />
        <path d={MARK_PATHS.inner} pathLength={1} className={draw ? 'animate-mark-draw [animation-delay:520ms]' : undefined} />
      </g>
    </svg>
  );
}

/** "GoldGains" set in the brand face: Gold in gold, Gains in white. */
export function Wordmark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`font-brand leading-none tracking-[-0.01em] whitespace-nowrap ${className}`} style={{ fontSize: size }}>
      <span className="gold-text">Gold</span>
      <span className="text-text">Gains</span>
    </span>
  );
}

/** Mark + wordmark side by side. */
export function Lockup({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5" role="img" aria-label="GoldGains">
      <Mark size={size} />
      <Wordmark size={Math.round(size * 0.56)} />
    </div>
  );
}

/** Tab-screen header: the mark, then the screen title in the brand face. */
export function ScreenHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
      <Mark size={28} label="GoldGains" />
      <h1 className="flex-1 font-brand text-[19px] tracking-[-0.01em]">{title}</h1>
      {children}
    </header>
  );
}
