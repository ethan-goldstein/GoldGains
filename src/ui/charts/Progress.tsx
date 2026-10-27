/** Horizontal progress toward a target. `limit` bars turn "over" color past 100%; `min` bars are goals to reach. */
export function ProgressBar({
  value,
  target,
  color = 'var(--color-gold)',
  kind = 'target',
  height = 6,
}: {
  value: number;
  target: number;
  color?: string;
  kind?: 'target' | 'limit' | 'min';
  height?: number;
}) {
  const p = target > 0 ? value / target : 0;
  const over = kind === 'limit' && p > 1;
  const w = Math.min(1, Math.max(0, p));
  return (
    <div className="relative w-full overflow-hidden rounded-full bg-surface-3" style={{ height }} aria-hidden="true">
      <div
        className="h-full rounded-full"
        style={{
          width: `${w * 100}%`,
          background: over ? 'var(--color-over)' : color,
          transition: 'width 600ms var(--ease-out-soft)',
        }}
      />
    </div>
  );
}
