import { useRef, useState } from 'react';

export interface Point {
  x: number; // ms timestamp
  y: number;
  label: string;
}

/** Weight-style line: 2px stroke, ≥8px markers, optional dashed goal line, crosshair + tooltip on touch. */
export function LineChart({ points, goal, height = 160, unit = '', color = 'var(--color-gold)' }: { points: Point[]; goal?: number; height?: number; unit?: string; color?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 340;
  const H = height;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 20;
  if (points.length === 0) return null;
  const ys = points.map((p) => p.y).concat(goal !== undefined ? [goal] : []);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  const span = Math.max(2, hi - lo);
  lo -= span * 0.15;
  hi += span * 0.15;
  const x0 = points[0]!.x;
  const x1 = points.at(-1)!.x;
  const sx = (x: number) => padL + (x1 === x0 ? (W - padL - padR) / 2 : ((x - x0) / (x1 - x0)) * (W - padL - padR));
  const sy = (y: number) => padT + (1 - (y - lo) / (hi - lo)) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];

  const onMove = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((clientX - r.left) / r.width) * W;
    let best = 0;
    let d = Infinity;
    points.forEach((p, i) => {
      const dd = Math.abs(sx(p.x) - x);
      if (dd < d) {
        d = dd;
        best = i;
      }
    });
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : undefined;

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y"
        style={{ height }}
        preserveAspectRatio="none"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Trend from ${points[0]!.label} to ${points.at(-1)!.label}: ${points[0]!.y.toFixed(1)} to ${points.at(-1)!.y.toFixed(1)}${unit}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={padL - 6} y={sy(t) + 3} textAnchor="end" fontSize="9.5" fill="var(--color-faint)" className="num">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {goal !== undefined ? (
          <>
            <line x1={padL} x2={W - padR} y1={sy(goal)} y2={sy(goal)} stroke="var(--color-good)" strokeDasharray="4 4" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <text x={W - padR} y={sy(goal) - 4} textAnchor="end" fontSize="9.5" fill="var(--color-good)">
              goal
            </text>
          </>
        ) : null}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hp ? <line x1={sx(hp.x)} x2={sx(hp.x)} y1={padT} y2={H - padB} stroke="var(--color-line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" /> : null}
        <text x={padL} y={H - 4} fontSize="9.5" fill="var(--color-faint)">
          {points[0]!.label}
        </text>
        <text x={W - padR} y={H - 4} fontSize="9.5" fill="var(--color-faint)" textAnchor="end">
          {points.at(-1)!.label}
        </text>
      </svg>
      {/* markers drawn in HTML so they stay round under the stretched viewBox */}
      <div className="pointer-events-none absolute inset-0">
        {points.map((p, i) => (
          <span
            key={i}
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
            style={{ left: `${(sx(p.x) / W) * 100}%`, top: `${(sy(p.y) / H) * 100}%`, background: color, transform: `translate(-50%,-50%) scale(${hover === i ? 1.5 : 1})` }}
          />
        ))}
      </div>
      {hp ? (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-xl border border-line-strong bg-surface-3 px-3 py-1.5 text-[12px] whitespace-nowrap shadow-xl">
          <span className="text-muted">{hp.label}</span> · <span className="num font-semibold">{hp.y.toFixed(1)}</span>
          {unit}
        </div>
      ) : null}
    </div>
  );
}
