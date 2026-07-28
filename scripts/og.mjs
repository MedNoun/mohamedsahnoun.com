/**
 * Renders the social card to public/og.png.
 *
 * Run it by hand when the name, title or tagline changes:
 *
 *   node scripts/og.mjs
 *
 * The output is committed. This is not a build step: the card changes about
 * once a year and a build hook would cost every deploy for nothing.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The design tokens, copied from src/styles/global.css. No new colours.
const BG = '#0B0E14';
const SURFACE = '#131722';
const BORDER = '#232936';
const TEXT = '#E6E9EF';
const MUTED = '#9BA6B8';
const ACCENT = '#7FD1B9';

const MONO = 'DejaVu Sans Mono, monospace';

const W = 1200;
const H = 630;
const PORTRAIT_W = 430;
const PAD = 72;

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const layer = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <!-- Feathers the portrait into the background instead of a hard seam. -->
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BG}" stop-opacity="1" />
      <stop offset="0.55" stop-color="${BG}" stop-opacity="0.35" />
      <stop offset="1" stop-color="${BG}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <rect x="${W - PORTRAIT_W}" y="0" width="200" height="${H}" fill="url(#fade)" />
  <rect x="${W - PORTRAIT_W}" y="0" width="1" height="${H}" fill="${BORDER}" />

  <g font-family="${MONO}">
    <text x="${PAD}" y="118" font-size="21" fill="${ACCENT}">&gt;</text>
    <text x="${PAD + 30}" y="118" font-size="21" fill="${MUTED}">SELECT * FROM experience;</text>

    <text x="${PAD}" y="216" font-size="62" font-weight="bold" fill="${TEXT}">${escape('Mohamed Sahnoun')}</text>
    <text x="${PAD}" y="266" font-size="26" fill="${ACCENT}">Data Engineer</text>

    <text x="${PAD}" y="352" font-size="25" fill="${MUTED}">BigQuery lakehouses, dimensional</text>
    <text x="${PAD}" y="390" font-size="25" fill="${MUTED}">models, and the data quality testing</text>
    <text x="${PAD}" y="428" font-size="25" fill="${MUTED}">that makes them trustworthy.</text>

    <line x1="${PAD}" y1="486" x2="${PAD + 460}" y2="486" stroke="${BORDER}" stroke-width="1" />
    <text x="${PAD}" y="534" font-size="22" fill="${TEXT}">mohamedsahnoun.com</text>
    <text x="${PAD}" y="572" font-size="20" fill="${MUTED}">Tunisia, remote</text>
  </g>
</svg>`;

const portrait = await sharp(path.join(root, 'src/assets/portrait.jpg'))
  // Bias the crop upwards so the crop keeps the face, not the jacket.
  .resize({ width: PORTRAIT_W, height: H, fit: 'cover', position: 'top' })
  .toBuffer();

const info = await sharp({
  create: { width: W, height: H, channels: 3, background: SURFACE },
})
  .composite([
    { input: { create: { width: W, height: H, channels: 3, background: BG } }, top: 0, left: 0 },
    { input: portrait, top: 0, left: W - PORTRAIT_W },
    { input: Buffer.from(layer), top: 0, left: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, 'public/og.png'));

console.log(`public/og.png ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}kB`);
