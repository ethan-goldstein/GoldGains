// The GoldGains mark: two concentric "G" rings sharing one crossbar. It reads as the GG monogram
// and as a pair of progress rings. Shared by the in-app <Mark> and scripts/make-icons.ts, so the
// home-screen icon always matches the app. Coordinates are in a 100 × 100 box.

const C = 50;
/** Both G terminals sit on the same ray from the centre. */
const GAP_DEG = -45;

export const MARK = { outer: 38, inner: 22, stroke: 6, center: C } as const;

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${+(C + r * Math.cos(a)).toFixed(2)} ${+(C + r * Math.sin(a)).toFixed(2)}`;
};
const arc = (r: number) => `M${pt(r, GAP_DEG)} A${r} ${r} 0 1 0 ${pt(r, 0)}`;

/** `outer` runs round the big G and straight on into the crossbar, so it draws as one pen stroke. */
export const MARK_PATHS = {
  outer: `${arc(MARK.outer)} H${C}`,
  inner: arc(MARK.inner),
} as const;

/** Gold ramp, light top-left to deep bottom-right (matches the --color-gold-* tokens). */
export const MARK_GOLD = [
  [0, '#ffe7a3'],
  [0.45, '#f2c14e'],
  [1, '#b07f22'],
] as const;
