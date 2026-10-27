// Renders the GoldGains app icons from one SVG: black tile, gold ring, GG monogram.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(out, { recursive: true });

/** `pad` shrinks the mark toward the centre (maskable icons need an 80% safe zone). */
function svg(size: number, { rounded, pad = 0 }: { rounded: boolean; pad?: number }) {
  const s = 512;
  const c = s / 2;
  const scale = 1 - pad;
  const r = 168 * scale;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.78;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe08a"/>
      <stop offset="0.55" stop-color="#f2c14e"/>
      <stop offset="1" stop-color="#b8862a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="#2a2110"/>
      <stop offset="1" stop-color="#000"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="url(#glow)"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#1f1f24" stroke-width="${30 * scale}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#g)" stroke-width="${30 * scale}" stroke-linecap="round"
    stroke-dasharray="${arc} ${circ}" transform="rotate(-90 ${c} ${c})"/>
  <text x="${c}" y="${c + 52 * scale}" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="900"
    font-size="${152 * scale}" letter-spacing="${-10 * scale}" fill="url(#g)">GG</text>
</svg>`;
}

const jobs: [string, number, { rounded: boolean; pad?: number }][] = [
  ['icon-192.png', 192, { rounded: false }],
  ['icon-512.png', 512, { rounded: false }],
  ['icon-maskable-512.png', 512, { rounded: false, pad: 0.18 }],
  ['apple-touch-icon.png', 180, { rounded: false }],
];

for (const [name, size, opts] of jobs) {
  await sharp(Buffer.from(svg(size, opts))).png().toFile(join(out, name));
}
writeFileSync(join(out, 'icon.svg'), svg(64, { rounded: true }));
console.log('icons written to public/icons');
