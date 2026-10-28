import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

const base = process.env.BASE_PATH ?? '/';

// Content-Security-Policy for production builds only (dev needs inline scripts for HMR).
// The only outside hosts are Open Food Facts' API and its product images.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "connect-src 'self' https://world.openfoodfacts.org",
  "img-src 'self' data: blob: https://images.openfoodfacts.org",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = (): Plugin => ({
  name: 'goldgains-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    VitePWA({
      // prompt, not autoUpdate: a silent reload could throw away a half-entered food
      registerType: 'prompt',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        id: base,
        name: 'GoldGains',
        short_name: 'GoldGains',
        description: 'Calories, macros and workouts. All data stays on your device.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // app shell + barcode wasm are precached; OCR engine (~7 MB) is cached on first label scan
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,wasm,woff2}'],
        globIgnores: ['**/ocr/**'],
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/ocr\/.*\.(js|gz)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'gg-ocr', expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 180 } },
          },
          {
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\//,
            handler: 'CacheFirst',
            options: { cacheName: 'gg-off-images', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
