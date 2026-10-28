// Renders the GoldGains app icons from the same mark geometry the app uses (src/ui/markGeometry.ts):
// graphite tile, soft gold glow, hairline ring tracks, gold double-G.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { MARK, MARK_GOLD, MARK_PATHS } from '../src/ui/markGeometry';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

/** `scale` is the mark's share of the tile (maskable icons keep it inside the 80% safe zone). */
function svg(size: number, { rounded, scale = 0.64 }: { rounded: boolean; scale?: number }) {
  const s = 512;
  const m = s * scale;
  const o = (s - m) / 2;
  const { center: c, outer, inner, stroke } = MARK;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" gradientUnits="userSpaceOnUse" x1="12" y1="12" x2="88" y2="88">
      ${MARK_GOLD.map(([off, col]) => `<stop offset="${off}" stop-color="${col}"/>`).join('')}
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c1b19"/>
      <stop offset="1" stop-color="#030303"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.42">
      <stop offset="0" stop-color="#f2c14e" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#f2c14e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="url(#tile)"/>
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="url(#glow)"/>
  <svg x="${o}" y="${o}" width="${m}" height="${m}" viewBox="0 0 100 100">
    <g fill="none" stroke="#2a261e" stroke-width="${stroke}">
      <circle cx="${c}" cy="${c}" r="${outer}"/><circle cx="${c}" cy="${c}" r="${inner}"/>
    </g>
    <g fill="none" stroke="url(#g)" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      <path d="${MARK_PATHS.outer}"/><path d="${MARK_PATHS.inner}"/>
    </g>
  </svg>
</svg>`;
}

const jobs: [string, number, { rounded: boolean; scale?: number }][] = [
  ['icon-192.png', 192, { rounded: false }],
  ['icon-512.png', 512, { rounded: false }],
  ['icon-maskable-512.png', 512, { rounded: false, scale: 0.56 }],
  ['apple-touch-icon.png', 180, { rounded: false }],
];

for (const [name, size, opts] of jobs) {
  await sharp(Buffer.from(svg(size, opts))).png().toFile(join(out, name));
}
writeFileSync(join(out, 'icon.svg'), svg(64, { rounded: true, scale: 0.78 }));
console.log('icons written to public/icons');
