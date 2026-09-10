#!/usr/bin/env node
/**
 * generate-assets.mjs — builds every PNG the PWA needs (icons + iOS splash
 * screens) with zero image dependencies. Node's built-in zlib deflate is the
 * only external piece; everything else (pixel buffer, PNG chunking, CRC32) is
 * ~100 lines of plain JS so this repo never depends on a native image library
 * (sharp/canvas) that might not have a prebuilt binary on every machine.
 *
 * The mark is a simple three-candle uptick, drawn as rectangles — no font
 * rendering needed, and it reads as "trading" at every size down to a
 * favicon. Run with `npm run generate-assets`. Output is committed, so this
 * only needs to run again if the mark or palette changes.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICONS_DIR = join(root, "public", "icons");
const SPLASH_DIR = join(root, "public", "splash");
mkdirSync(ICONS_DIR, { recursive: true });
mkdirSync(SPLASH_DIR, { recursive: true });

/* ---------------------------------------------------------------------- */
/* Minimal PNG encoder                                                     */
/* ---------------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // colour type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = pngChunk("IHDR", ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = pngChunk("IDAT", deflateSync(raw, { level: 9 }));
  const iend = pngChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

/* ---------------------------------------------------------------------- */
/* Tiny raster canvas                                                      */
/* ---------------------------------------------------------------------- */

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4);
  }
  set(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    // Simple alpha-over so overlapping rounded shapes blend instead of
    // punching a hard edge against a differently-coloured background.
    if (a >= 255) {
      this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = 255;
    } else {
      const inv = 255 - a;
      this.data[i] = (r * a + this.data[i] * inv) / 255;
      this.data[i + 1] = (g * a + this.data[i + 1] * inv) / 255;
      this.data[i + 2] = (b * a + this.data[i + 2] * inv) / 255;
      this.data[i + 3] = 255;
    }
  }
  fillRect(x0, y0, w, h, [r, g, b, a = 255]) {
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(this.h, Math.round(y0 + h)); y++)
      for (let x = Math.max(0, Math.round(x0)); x < Math.min(this.w, Math.round(x0 + w)); x++)
        this.set(x, y, r, g, b, a);
  }
  fillRoundedRect(x0, y0, w, h, radius, color) {
    // Coverage-based rounding via a supersampled point-in-rounded-rect test —
    // cheap at icon resolutions and avoids visible stair-stepping on the mark.
    const r = Math.min(radius, w / 2, h / 2);
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, Math.ceil(y0 + h)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.w, Math.ceil(x0 + w)); x++) {
        const cx = x + 0.5, cy = y + 0.5;
        const dx = Math.max(x0 + r - cx, cx - (x0 + w - r), 0);
        const dy = Math.max(y0 + r - cy, cy - (y0 + h - r), 0);
        if (dx * dx + dy * dy <= r * r && cx >= x0 && cx <= x0 + w && cy >= y0 && cy <= y0 + h) {
          this.set(x, y, ...color);
        }
      }
    }
  }
  fillAll(color) {
    this.fillRect(0, 0, this.w, this.h, color);
  }
  toPNG() {
    return encodePNG(this.w, this.h, this.data);
  }
}

/* ---------------------------------------------------------------------- */
/* The mark: three ascending candlesticks                                  */
/* ---------------------------------------------------------------------- */

const BG = [8, 12, 20, 255]; // near --bg
const MARK = [45, 212, 160, 255]; // bright emerald, distinct from any P&L colour

function drawMark(canvas, contentScale) {
  const size = Math.min(canvas.w, canvas.h);
  const box = size * contentScale;
  const left = (canvas.w - box) / 2;
  const bottom = canvas.h / 2 + box / 2;

  const heights = [0.44, 0.72, 1.0];
  const n = heights.length;
  const gap = box * 0.16;
  const barW = (box - gap * (n - 1)) / n;
  const radius = barW * 0.22;

  heights.forEach((hFrac, i) => {
    const bodyH = box * hFrac * 0.58;
    const x = left + i * (barW + gap);
    const bodyTop = bottom - bodyH;

    // wick
    const wickW = Math.max(size * 0.012, barW * 0.16);
    const wickExtend = bodyH * 0.22;
    canvas.fillRoundedRect(
      x + barW / 2 - wickW / 2,
      bodyTop - wickExtend,
      wickW,
      bodyH + wickExtend * 2,
      wickW / 2,
      MARK,
    );
    // body
    canvas.fillRoundedRect(x, bodyTop, barW, bodyH, radius, MARK);
  });
}

function makeIcon(size, { maskable = false } = {}) {
  const canvas = new Canvas(size, size);
  canvas.fillAll(BG);
  // Maskable icons get extra margin so the mark survives an aggressive OS mask.
  drawMark(canvas, maskable ? 0.46 : 0.6);
  return canvas.toPNG();
}

function makeSplash(width, height) {
  const canvas = new Canvas(width, height);
  canvas.fillAll(BG);
  const markSize = Math.min(width, height) * 0.28;
  const sub = new Canvas(markSize, markSize);
  sub.fillAll(BG);
  drawMark(sub, 0.62);
  // Blit the sub-canvas centered onto the splash canvas.
  const ox = Math.round((width - markSize) / 2);
  const oy = Math.round((height - markSize) / 2);
  for (let y = 0; y < sub.h; y++) {
    for (let x = 0; x < sub.w; x++) {
      const i = (y * sub.w + x) * 4;
      const [r, g, b, a] = [sub.data[i], sub.data[i + 1], sub.data[i + 2], sub.data[i + 3]];
      canvas.set(ox + x, oy + y, r, g, b, a);
    }
  }
  return canvas.toPNG();
}

/* ---------------------------------------------------------------------- */
/* Write everything                                                        */
/* ---------------------------------------------------------------------- */

const ICONS = [
  ["icon-32.png", 32, {}],
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-512-maskable.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
];

for (const [name, size, opts] of ICONS) {
  writeFileSync(join(ICONS_DIR, name), makeIcon(size, opts));
  console.log("wrote", join("public/icons", name));
}

// Portrait: [cssWidth, cssHeight, ratio, label]. Physical px = css * ratio.
const SPLASH_PORTRAIT = [
  [375, 667, 2, "iphone-se"],
  [390, 844, 3, "iphone-standard"],
  [393, 852, 3, "iphone-pro"],
  [428, 926, 3, "iphone-plus"],
  [430, 932, 3, "iphone-pro-max"],
  [744, 1133, 2, "ipad-mini"],
  [810, 1080, 2, "ipad-10-2"],
  [820, 1180, 2, "ipad-air"],
  [834, 1194, 2, "ipad-pro-11"],
  [1024, 1366, 2, "ipad-pro-12-9"],
];

// Landscape matters for iPad, which this app is expected to run on rotated.
const SPLASH_LANDSCAPE = [
  [1133, 744, 2, "ipad-mini"],
  [1080, 810, 2, "ipad-10-2"],
  [1180, 820, 2, "ipad-air"],
  [1194, 834, 2, "ipad-pro-11"],
  [1366, 1024, 2, "ipad-pro-12-9"],
];

const manifestLines = [];

for (const [cw, ch, ratio, label] of SPLASH_PORTRAIT) {
  const w = cw * ratio, h = ch * ratio;
  const name = `${label}-${cw}x${ch}-portrait.png`;
  writeFileSync(join(SPLASH_DIR, name), makeSplash(w, h));
  manifestLines.push(
    `<link rel="apple-touch-startup-image" href="/splash/${name}" media="screen and (device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)">`,
  );
}
for (const [lw, lh, ratio, label] of SPLASH_LANDSCAPE) {
  // The raster is the true landscape pixel size (width > height). The media
  // query, per Apple's own splash tooling, keeps device-width/device-height
  // as the device's PORTRAIT identity regardless of orientation — only
  // `orientation: landscape` changes. Swapping the numbers here is the classic
  // mistake that makes iOS silently ignore the whole rule.
  const portraitMatch = SPLASH_PORTRAIT.find((p) => p[3] === label);
  const [cw, ch] = portraitMatch;
  const name = `${label}-${lw}x${lh}-landscape.png`;
  writeFileSync(join(SPLASH_DIR, name), makeSplash(lw * ratio, lh * ratio));
  manifestLines.push(
    `<link rel="apple-touch-startup-image" href="/splash/${name}" media="screen and (device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: landscape)">`,
  );
}

console.log(`wrote ${SPLASH_PORTRAIT.length + SPLASH_LANDSCAPE.length} splash images to public/splash/`);
console.log("\nLink tags (already present in index.html — regenerate only if sizes change):\n");
console.log(manifestLines.join("\n"));
