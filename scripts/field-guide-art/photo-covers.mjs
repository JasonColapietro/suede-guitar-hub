// Photographic covers for the Field Guide series, built from the photographs
// already shipped in public/: the photo in full colour, a dark fade top and
// bottom, and a magazine title.
//
// Each guide names a photo and a crop (x, y, zoom) so fifteen covers can
// come from eight photographs without two looking the same.

import sharp from "sharp";
import { join } from "node:path";

const W = 900;
const H = 1200;
const INK = "#141414";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pad = (n) => String(n).padStart(2, "0");

/** [photo, focus x 0-1, focus y 0-1, zoom] per guide slug. */
export const PHOTO_CROPS = {
  "the-method": ["hero-studio", 0.45, 0.5, 1],
  "practice-effectively": ["mentor-1", 0.45, 0.5, 1],
  "the-plateau": ["mentor-2", 0.55, 0.5, 1],
  "deliberate-practice": ["mentor-2", 0.78, 0.45, 1.5],
  "30-day-challenge": ["insight-1", 0.5, 0.55, 1],
  "intermediate-routine": ["mentor-3", 0.5, 0.5, 1],
  "how-long-each-day": ["insight-2", 0.35, 0.55, 1],
  "practice-schedule": ["hero-studio", 0.72, 0.4, 1.35],
  "play-it-fast": ["mentor-1", 0.7, 0.4, 1.6],
  "memorize-a-song": ["insight-2", 0.7, 0.45, 1.3],
  metronome: ["hero-studio", 0.18, 0.72, 1.7],
  "clean-tone": ["amp-glow", 0.5, 0.5, 1],
  "hallelujah-tone": ["mentor-3", 0.5, 0.72, 1.4],
  "room-sound": ["insight-1", 0.72, 0.45, 1.5],
  "open-tone": ["mentor-4", 0.5, 0.5, 1],
};

export async function photoDataUrl(root, slug) {
  const [photo, fx, fy, zoom] = PHOTO_CROPS[slug];
  const img = sharp(join(root, "public", `${photo}.jpg`));
  const { width, height } = await img.metadata();
  // The largest 3:4 window at this zoom, centred on the focus point.
  let cw = Math.min(width, (height * 3) / 4) / zoom;
  let ch = (cw * 4) / 3;
  if (ch > height) {
    ch = height;
    cw = (ch * 3) / 4;
  }
  const left = Math.round(Math.min(width - cw, Math.max(0, fx * width - cw / 2)));
  const top = Math.round(Math.min(height - ch, Math.max(0, fy * height - ch / 2)));
  const buf = await sharp(join(root, "public", `${photo}.jpg`))
    .extract({ left, top, width: Math.round(cw), height: Math.round(ch) })
    .resize(W, H)
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function titleLines(title, max) {
  const words = title.toUpperCase().split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

export function coverSvg(guide, photo) {
  const { accent } = guide;
  const lines = titleLines(guide.coverTitle, 12);
  const size = Math.min(160, Math.floor(800 / (Math.max(...lines.map((l) => l.length)) * 0.47)));
  const gap = size * 0.9;
  const base = 1010;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.72"/>
      <stop offset="0.22" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <image href="${photo}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <text x="56" y="112" font-family="Anton" font-size="62" letter-spacing="12" fill="#ffffff">GUITARHUB</text>
  <rect x="56" y="132" width="330" height="6" fill="${accent}"/>
  <text x="844" y="84" text-anchor="end" font-family="Anton" font-size="26" letter-spacing="4" fill="#ffffff">FIELD GUIDE</text>
  <text x="844" y="150" text-anchor="end" font-family="Anton" font-size="72" fill="${accent}">No. ${pad(guide.issue)}</text>
  ${lines.map((l, i) => `<text x="56" y="${base - (lines.length - 1 - i) * gap}" font-family="Anton" font-size="${size}" fill="#ffffff">${esc(l)}</text>`).join("")}
  <text x="58" y="${base + 64}" font-family="Comic Neue" font-weight="700" font-size="38" fill="${accent}">${esc(guide.shout)}</text>
  <rect x="56" y="1108" width="200" height="50" fill="${accent}"/>
  <text x="156" y="1143" text-anchor="middle" font-family="Anton" font-size="28" letter-spacing="3" fill="${INK}">FREE PDF</text>
  <text x="844" y="1143" text-anchor="end" font-family="Anton" font-size="22" letter-spacing="4" fill="#d9d9d9">GUITARHUB.ORG</text>
</svg>`;
}
