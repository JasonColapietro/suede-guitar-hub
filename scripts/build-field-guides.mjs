#!/usr/bin/env node
/**
 * Builds the free GuitarHub field guides into public/guides/*.pdf.
 *
 * Each guide is written here as printable HTML with inline SVG diagrams and
 * printed to PDF by headless Chromium. The book covers shown on the site are
 * separate illustrations (components/tone/BookCover.tsx); the PDFs have their
 * own plain title page.
 *
 *   node scripts/build-field-guides.mjs [--chrome /path/to/chrome]
 *
 * Chrome is found from --chrome, $CHROME_PATH, the Playwright cache at
 * /opt/pw-browsers, or common install paths.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "public", "guides");

function findChrome() {
  const flag = process.argv.indexOf("--chrome");
  const candidates = [flag > -1 ? process.argv[flag + 1] : null, process.env.CHROME_PATH];
  if (existsSync("/opt/pw-browsers")) {
    for (const dir of readdirSync("/opt/pw-browsers")) {
      if (dir.startsWith("chromium-")) candidates.push(join("/opt/pw-browsers", dir, "chrome-linux", "chrome"));
    }
  }
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  );
  const found = candidates.find(path => path && existsSync(path));
  if (!found) throw new Error("No Chrome or Chromium found. Pass --chrome /path/to/chrome.");
  return found;
}

/* ---------- shared look ---------- */

const CSS = `
@page { size: Letter; margin: 0.6in 0.65in 0.7in; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1c1233; font-size: 10.5pt; line-height: 1.45; margin: 0; }
h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; color: #251152; font-weight: 600; margin: 0; }
h2 { font-size: 20pt; margin: 0 0 6pt; }
h3 { font-size: 12.5pt; margin: 12pt 0 4pt; }
p { margin: 0 0 7pt; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.kicker { font-size: 8pt; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #6d28d9; margin-bottom: 4pt; }
.lede { font-size: 11.5pt; color: #3b2d5c; }
.title-page { height: 9.4in; display: flex; flex-direction: column; justify-content: space-between; border: 3pt solid #251152; border-radius: 14pt; padding: 0.6in; }
.title-page h1 { font-size: 40pt; line-height: 1.05; }
.title-page .sub { font-size: 15pt; color: #6d28d9; margin-top: 10pt; }
.title-page .contents li { margin: 3pt 0; }
.brand { font-weight: 800; letter-spacing: .2em; font-size: 9pt; color: #251152; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; font-size: 9.5pt; }
th { text-align: left; background: #251152; color: #f7f3ee; padding: 5pt 6pt; font-size: 8.5pt; letter-spacing: .04em; }
td { border-bottom: .6pt solid #d9d2e6; padding: 5pt 6pt; vertical-align: top; }
tr:nth-child(even) td { background: #f7f3ee; }
.box { border: 1pt solid #d9d2e6; border-radius: 8pt; padding: 9pt 11pt; margin: 8pt 0; background: #fbf9f6; }
.tip { border-left: 3pt solid #f5a25d; background: #fff6ec; padding: 7pt 10pt; margin: 8pt 0; border-radius: 0 6pt 6pt 0; }
ol.steps { counter-reset: s; list-style: none; padding: 0; margin: 6pt 0; }
ol.steps li { counter-increment: s; position: relative; padding: 0 0 7pt 26pt; }
ol.steps li::before { content: counter(s); position: absolute; left: 0; top: -1pt; width: 17pt; height: 17pt; border-radius: 50%; background: #251152; color: #fff; font-weight: 700; font-size: 9pt; display: flex; align-items: center; justify-content: center; }
ul.check { list-style: none; padding: 0; margin: 4pt 0; }
ul.check li { padding: 2.5pt 0 2.5pt 18pt; position: relative; }
ul.check li::before { content: ""; position: absolute; left: 0; top: 4pt; width: 10pt; height: 10pt; border: 1.2pt solid #251152; border-radius: 2pt; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt; }
.recipe { border: 1pt solid #d9d2e6; border-radius: 8pt; padding: 8pt 9pt; break-inside: avoid; }
.recipe h3 { margin-top: 0; }
.recipe .meta { font-size: 8.5pt; color: #5b4f75; margin: 2pt 0 4pt; }
.knobs { display: flex; gap: 2pt; justify-content: space-between; margin: 3pt 0; }
.small { font-size: 8.5pt; color: #5b4f75; }
.foot { margin-top: 10pt; font-size: 8pt; color: #8a80a0; border-top: .6pt solid #d9d2e6; padding-top: 5pt; }
figure { margin: 6pt 0; break-inside: avoid; }
figcaption { font-size: 8.5pt; color: #5b4f75; text-align: center; margin-top: 2pt; }
`;

const doc = (title, pages) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${pages.join("")}</body></html>`;

const titlePage = ({ volume, title, sub, contents, blurb }) => `
<section class="page"><div class="title-page">
  <div><div class="brand">GUITARHUB · FIELD GUIDE ${volume}</div></div>
  <div><h1>${title}</h1><p class="sub">${sub}</p><p class="lede" style="margin-top:18pt;max-width:5in">${blurb}</p></div>
  <div><div class="kicker">Inside</div><ol class="contents">${contents.map(c => `<li>${c}</li>`).join("")}</ol>
  <p class="small" style="margin-top:18pt">Free from guitarhub.org. Share it, print it, pin it above the amp. The interactive versions of these ideas live at guitarhub.org/tone.</p></div>
</div></section>`;

const page = (kicker, title, body) => `<section class="page"><div class="kicker">${kicker}</div><h2>${title}</h2>${body}<div class="foot">GuitarHub field guides · guitarhub.org/tone</div></section>`;

/* ---------- SVG helpers ---------- */

/** A knob at `value` on a 0 to 10 scale, labelled. */
function knob(label, value) {
  const angle = -135 + (value / 10) * 270;
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = ((-135 + i * 27) * Math.PI) / 180;
    return `<line x1="${20 + Math.sin(a) * 15}" y1="${20 - Math.cos(a) * 15}" x2="${20 + Math.sin(a) * 18}" y2="${20 - Math.cos(a) * 18}" stroke="#8a80a0" stroke-width="1"/>`;
  }).join("");
  return `<svg width="40" height="52" viewBox="0 0 40 52">${ticks}<circle cx="20" cy="20" r="12" fill="#efe9df" stroke="#251152" stroke-width="1.4"/><line x1="20" y1="20" x2="20" y2="9.5" stroke="#251152" stroke-width="2.4" stroke-linecap="round" transform="rotate(${angle} 20 20)"/><text x="20" y="44" text-anchor="middle" font-size="7" font-weight="700" fill="#251152" font-family="Helvetica">${label}</text><text x="20" y="51" text-anchor="middle" font-size="6.5" fill="#6d28d9" font-family="Helvetica">${value}</text></svg>`;
}

/** Fretboard diagram. `dots` are [stringIndexLowE0, fret, isRoot]. */
function neck({ from, to, dots, width = 250, labels = false, notes = null }) {
  const frets = to - from + 1, sx = 22, fw = (width - sx - 8) / frets, sh = 13, h = sh * 5 + 34;
  let svg = `<svg width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">`;
  for (let f = 0; f <= frets; f++) svg += `<line x1="${sx + f * fw}" y1="10" x2="${sx + f * fw}" y2="${10 + sh * 5}" stroke="${f === 0 && from <= 1 ? "#251152" : "#b9b0c9"}" stroke-width="${f === 0 && from <= 1 ? 3 : 1}"/>`;
  for (let s = 0; s < 6; s++) svg += `<line x1="${sx}" y1="${10 + s * sh}" x2="${sx + frets * fw}" y2="${10 + s * sh}" stroke="#5b4f75" stroke-width="${.6 + s * .18}"/>`;
  ["e", "B", "G", "D", "A", "E"].forEach((n, s) => { svg += `<text x="8" y="${13 + s * sh}" font-size="7.5" fill="#5b4f75" font-family="Helvetica">${n}</text>`; });
  for (let f = 0; f < frets; f++) { const num = from + f; svg += `<text x="${sx + (f + .5) * fw}" y="${h - 6}" text-anchor="middle" font-size="7" fill="${[3, 5, 7, 9, 12, 15, 17].includes(num) ? "#251152" : "#a79fb8"}" font-weight="${[3, 5, 7, 9, 12, 15].includes(num) ? 700 : 400}" font-family="Helvetica">${num}</text>`; }
  for (const [string, fret, root, text] of dots) {
    const y = 10 + (5 - string) * sh, x = fret === 0 ? sx - 7 : sx + (fret - from + .5) * fw;
    svg += fret === 0
      ? `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#251152" stroke-width="1.3"/>`
      : `<circle cx="${x}" cy="${y}" r="5.2" fill="${root ? "#f5a25d" : "#251152"}"/>`;
    if (labels && text) svg += `<text x="${x}" y="${y + 2.4}" text-anchor="middle" font-size="5.8" fill="#fff" font-weight="700" font-family="Helvetica">${text}</text>`;
  }
  if (notes) svg += notes;
  return svg + "</svg>";
}

const box = (x, y, w, label, fill = "#251152", text = "#fff") => `<rect x="${x}" y="${y}" width="${w}" height="34" rx="7" fill="${fill}"/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="9" font-weight="700" fill="${text}" font-family="Helvetica">${label}</text>`;
const arrow = (x1, y, x2) => `<line x1="${x1}" y1="${y}" x2="${x2 - 4}" y2="${y}" stroke="#6d28d9" stroke-width="1.6"/><path d="M${x2 - 5} ${y - 4} L${x2} ${y} L${x2 - 5} ${y + 4}" fill="#6d28d9"/>`;

/* ---------- Guide 1: Tone Field Manual ---------- */

const EQ_ROWS = [
  ["80 to 120 Hz", "Boom", "Flubby, fights bass and kick", "Thin, no weight alone", "High-pass around 80 to 100 Hz in a band mix"],
  ["200 to 300 Hz", "Mud", "Cloudy, chords blur", "Cold, papery", "Cut here before adding treble"],
  ["400 to 600 Hz", "Boxy", "Hollow, cardboard", "Scooped, distant", "A small cut often cleans up cheap cabs"],
  ["700 to 1,000 Hz", "Honk", "Nasal, horn-like", "Lacks presence", "Where wah and cocked-wah tones live"],
  ["1.2 to 2 kHz", "Push", "Pokey, in your face", "Buried in the band", "The cut-through band. Rarely scoop it."],
  ["2.5 to 4 kHz", "Bite", "Harsh, ear fatigue", "Dull, no attack", "Find the harsh spot and cut 2 to 3 dB"],
  ["5 kHz and up", "Fizz", "Buzzy distortion, hiss", "Dark, blanketed", "Speakers and cab IRs roll most of this off"],
];

const TROUBLE = [
  ["Thin", "Bass too low, bridge pickup with tone at 10, pickups too far from strings", "Bass to noon, try the middle or neck pickup, raise pickup height a little"],
  ["Muddy", "Too much low-mid, too much gain, neck pickup into high gain", "Cut 200 to 300 Hz, lower gain, trim bass before the gain stage"],
  ["Harsh", "Treble or presence high, bright pickups, no speaker simulation", "Guitar tone knob to 7, cut 3 kHz, check the cab or IR is on"],
  ["Buried in the band", "Mids scooped, too much reverb, too much gain", "Mids up, reverb mix down, less gain than you use alone"],
  ["Fizzy distortion", "Gain too high, no cab sim, pedal tone too bright", "Gain down, cab on, pedal tone below noon"],
  ["No sustain", "Old strings, low gain, dead notes from setup", "New strings, a compressor or a little more gain, check the setup"],
  ["Lifeless, squashed", "Too much compression and gain stacked", "Remove one gain stage; compressor sustain down"],
];

const toneManual = doc("The Tone Field Manual", [
  titlePage({ volume: 1, title: "The Tone Field Manual", sub: "Dial in a great sound on any amp in five minutes",
    blurb: "A routine that works on unfamiliar amps, what every knob is actually doing, the guitar EQ map in players' words, and a troubleshooting table for the tones everyone fights.",
    contents: ["The five-minute dial-in", "What every amp knob does", "The guitar EQ map", "Tone troubleshooting", "Hands and guitar checklist"] }),
  page("Routine", "The five-minute dial-in", `
    <p class="lede">Use this on any amp, including the backline at a venue. It works because it changes one thing at a time and checks each change against the one before.</p>
    <ol class="steps">
      <li><b>Reset.</b> Every EQ knob to noon (5), gain low, master or volume at a sensible level for the room. Guitar volume and tone on 10.</li>
      <li><b>Set gain by playing.</b> Play the hardest part you will play tonight. Raise gain until it has the grit you want, then back it off a little. Most people use more gain than the song needs.</li>
      <li><b>Mids first.</b> Sweep the mid knob fully both ways and settle where chords sound most like a guitar and least like a radio. Mids decide whether you will be heard.</li>
      <li><b>Bass until tight.</b> Raise bass until palm mutes feel solid; stop before they boom or the low strings smear.</li>
      <li><b>Treble until clear.</b> Raise treble until the pick attack is defined; stop before single high notes sting.</li>
      <li><b>Presence and reverb last.</b> Small moves. If the amp sounds great alone with lots of reverb, halve it for the band.</li>
      <li><b>Check at the real volume.</b> Ears hear more bass and treble when loud. Re-check at performance volume and trim.</li>
    </ol>
    <div class="tip"><b>The one rule:</b> change one knob, play the same phrase, compare. Two changes at once teach you nothing.</div>
    <h3>Ten-second gain check</h3>
    <p>Play a big open chord and let it ring. If you can still hear each string, the gain is fine for chords. If it turns into one blurry roar, back off.</p>`),
  page("Controls", "What every amp knob does", `
    <table><tr><th style="width:18%">Knob</th><th>What it really controls</th><th style="width:32%">Start here</th></tr>
      <tr><td><b>Gain / Drive</b></td><td>How hard the preamp is pushed, so how much it distorts. Also adds compression and noise.</td><td>Low, then raise by ear.</td></tr>
      <tr><td><b>Master / Volume</b></td><td>Loudness after the preamp. On single-volume amps it also sets distortion.</td><td>As loud as the room allows.</td></tr>
      <tr><td><b>Bass</b></td><td>Low end and weight. On many amps it interacts with mid and treble.</td><td>Noon, then lower for high gain.</td></tr>
      <tr><td><b>Middle</b></td><td>Body and presence in a mix. The most important band in a band.</td><td>Noon or above.</td></tr>
      <tr><td><b>Treble</b></td><td>Clarity and pick attack in the preamp.</td><td>Noon, adjust by ear.</td></tr>
      <tr><td><b>Presence</b></td><td>Upper treble in the power section. Adds air or glass.</td><td>Below noon; raise slowly.</td></tr>
      <tr><td><b>Reverb</b></td><td>How far back in a room you sound.</td><td>Less than feels right alone.</td></tr>
      <tr><td><b>Bright switch</b></td><td>Treble boost that fades as volume rises.</td><td>On for dark guitars at low volume.</td></tr>
    </table>
    <div class="box"><b>Interactive tone stacks.</b> On many classic designs the three EQ knobs share one circuit, so turning mids down also changes how bass and treble behave, and all three at zero can mean almost silence. Treat them as a set, not three separate controls.</div>
    <h3>Guitar controls are amp controls</h3>
    <p>Rolling guitar volume from 10 to 7 cleans up a driven amp without touching it. The tone knob around 6 or 7 tames harsh bridge pickups. Learn to ride both while playing.</p>`),
  page("Frequency", "The guitar EQ map", `
    <p class="lede">Every region has a word players use when there is too much of it. Learn the words and any tone becomes fixable.</p>
    <table><tr><th>Range</th><th>Word</th><th>Too much</th><th>Too little</th><th>Notes</th></tr>
      ${EQ_ROWS.map(r => `<tr>${r.map((c, i) => `<td>${i === 1 ? `<b>${c}</b>` : c}</td>`).join("")}</tr>`).join("")}
    </table>
    <div class="tip"><b>Cut before you boost.</b> Boosting adds level and gain and changes everything downstream. Cutting removes only the problem.</div>
    <h3>Why a scooped tone disappears</h3>
    <p>Lots of bass and treble with the mids cut sounds huge alone. In a band the bass owns the lows and the cymbals own the highs, so a scooped guitar has nothing left. Put the mids back and it reappears.</p>
    <p class="small">Train these by ear with the free EQ Ear Trainer at guitarhub.org/eq-ear-trainer.</p>`),
  page("Fixes", "Tone troubleshooting", `
    <table><tr><th style="width:16%">Problem</th><th>Usual causes</th><th>Try first</th></tr>
      ${TROUBLE.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}
    </table>
    <h3>Hands and guitar checklist</h3>
    <div class="grid2"><ul class="check">
      <li>Strings less than a few months old</li><li>Intonation checked at the 12th fret</li><li>Pickup heights balanced neck to bridge</li><li>Action comfortable, no fret buzz</li>
    </ul><ul class="check">
      <li>Tried picking over the neck and near the bridge</li><li>Tried a thicker and a thinner pick</li><li>Guitar volume used as a gain control</li><li>Tone knob used, not left on 10</li>
    </ul></div>`),
]);

/* ---------- Guide 2: Pedalboard Blueprint ---------- */

const orderDiagram = (() => {
  const names = [["Tuner", "#5b4f75"], ["Wah / filter", "#2f6f8f"], ["Compressor", "#2f6f8f"], ["Fuzz", "#b4462b"], ["Overdrive", "#3f8f4a"], ["Modulation", "#4a64c4"], ["Delay", "#7a3fb4"], ["Reverb", "#a0578a"]];
  let svg = `<svg width="660" height="120" viewBox="0 0 660 120">`;
  names.forEach(([n, c], i) => { const row = Math.floor(i / 4), col = i % 4, x = 10 + col * 165, y = 14 + row * 56; svg += box(x, y, 130, `${i + 1}. ${n}`, c); if (col < 3) svg += arrow(x + 132, y + 17, x + 163); });
  svg += `<path d="M 600 48 C 640 55, 640 60, 600 64 L 80 64 C 30 66, 30 68, 75 70" stroke="#6d28d9" stroke-width="1.6" fill="none" stroke-dasharray="3 3"/>`;
  return svg + "</svg>";
})();

const loopDiagram = `<svg width="660" height="130" viewBox="0 0 660 130">
  ${box(10, 20, 80, "Guitar", "#5b4f75")}${arrow(92, 37, 118)}${box(120, 20, 150, "Drives in front", "#3f8f4a")}${arrow(272, 37, 298)}
  <rect x="300" y="8" width="350" height="112" rx="12" fill="none" stroke="#251152" stroke-width="1.5"/><text x="475" y="118" text-anchor="middle" font-size="8.5" fill="#251152" font-family="Helvetica" font-weight="700">THE AMP</text>
  ${box(310, 20, 110, "Preamp", "#251152")}${arrow(422, 37, 530)}${box(532, 20, 108, "Power amp", "#251152")}
  <path d="M 440 37 L 440 70" stroke="#6d28d9" stroke-width="1.6"/><text x="446" y="58" font-size="7.5" fill="#6d28d9" font-family="Helvetica">send</text>
  ${box(400, 70, 140, "Delay, reverb, mod", "#7a3fb4")}
  <path d="M 520 70 L 520 37" stroke="#6d28d9" stroke-width="1.6"/><text x="490" y="62" font-size="7.5" fill="#6d28d9" font-family="Helvetica">return</text>
</svg>`;

const blueprint = doc("Pedalboard Blueprint", [
  titlePage({ volume: 2, title: "Pedalboard Blueprint", sub: "Order, power and cabling without the hum",
    blurb: "The pedal order most boards settle on and the reason for every position, the famous exceptions, how an effects loop changes things, and the power and noise checklists that fix most hum.",
    contents: ["The conventional order", "Exceptions worth breaking it for", "The effects loop", "Power supply worksheet", "The noise hunt"] }),
  page("Order", "The conventional order", `
    <p class="lede">Shape the raw signal, then distort it, then decorate the distorted sound with movement and space.</p>
    <figure>${orderDiagram}<figcaption>Guitar to amp, left to right, top row then bottom row.</figcaption></figure>
    <table><tr><th style="width:20%">Position</th><th>Why it goes there</th></tr>
      <tr><td><b>Tuner</b></td><td>Sees the cleanest signal, and many can mute the whole board while you tune.</td></tr>
      <tr><td><b>Wah and filters</b></td><td>Sweeping before gain makes the distortion itself sweep, which sounds vocal.</td></tr>
      <tr><td><b>Compressor</b></td><td>Shapes your pick attack. After gain it mostly raises noise.</td></tr>
      <tr><td><b>Fuzz</b></td><td>Many vintage fuzz circuits expect to see the guitar pickup directly and sound thin behind a buffer.</td></tr>
      <tr><td><b>Overdrive, distortion</b></td><td>The core sound. Stack low gain into higher gain for focus.</td></tr>
      <tr><td><b>Modulation</b></td><td>After gain, the movement stays clear instead of being squashed.</td></tr>
      <tr><td><b>Delay, then reverb</b></td><td>Repeats that land in a room, rather than a room that echoes.</td></tr>
    </table>`),
  page("Exceptions", "When to break the rules", `
    <table><tr><th style="width:30%">Move</th><th>What you get</th></tr>
      <tr><td>Reverb before drive</td><td>A distorted wash where the tail is as loud as the note. Shoegaze and noise rock.</td></tr>
      <tr><td>Delay before drive</td><td>Repeats that grind into each other. Vintage tape-echo-into-amp sounds.</td></tr>
      <tr><td>Wah after drive</td><td>A sharper, more synth-like filter sweep.</td></tr>
      <tr><td>Phaser before drive</td><td>A subtler, throatier swirl. Common on classic hard rock.</td></tr>
      <tr><td>Compressor after drive</td><td>Evens out level between clean and driven sounds; mostly used as a final leveller.</td></tr>
      <tr><td>Swap two drives</td><td>Always try both orders. There is no correct answer, only the one you like.</td></tr>
    </table>
    <h3>The effects loop</h3>
    <p>Amps with preamp distortion often have a send and return between preamp and power amp. Time and modulation effects there sit after the amp's own distortion, which keeps them clean. Drives still go in front.</p>
    <figure>${loopDiagram}<figcaption>A four-cable setup: drives in front, time effects in the loop.</figcaption></figure>
    <p class="small">If your amp is clean and pedals make the distortion, you do not need the loop.</p>`),
  page("Power", "Power supply worksheet", `
    <p class="lede">Read every pedal's label. Most want 9 volts DC, center negative, but not all. The wrong voltage or polarity can damage a pedal.</p>
    <table><tr><th>Pedal</th><th style="width:12%">Volts</th><th style="width:15%">Polarity</th><th style="width:14%">Draw (mA)</th><th style="width:16%">Supply output</th><th style="width:12%">Output max (mA)</th></tr>
      ${Array.from({ length: 12 }, () => "<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>").join("")}
      <tr><td><b>Total</b></td><td></td><td></td><td></td><td></td><td></td></tr>
    </table>
    <div class="grid2">
      <div class="box"><b>Isolated vs daisy chain.</b> A daisy chain shares one ground and one supply, so digital pedals can leak whine into analog ones. Isolated outputs are separate circuits and solve most power noise.</div>
      <div class="box"><b>Headroom.</b> Give every pedal an output rated above its draw. Digital delays and reverbs usually draw far more than analog drives. Some pedals list a higher start-up draw; plan for it.</div>
    </div>`),
  page("Noise", "The noise hunt", `
    <p class="lede">Work from the amp outward and change one thing at a time, so you know which change fixed it.</p>
    <ol class="steps">
      <li>Guitar straight into the amp. If it hums, rotate yourself and the guitar; single-coils pick up hum from lights, screens and transformers.</li>
      <li>Add pedals back one at a time, all bypassed, then all on.</li>
      <li>When the noise appears, move that pedal to its own isolated output.</li>
      <li>Wiggle each patch cable while listening. Crackle means replace it.</li>
      <li>Separate power and audio cables. Where they must cross, cross at right angles.</li>
      <li>Check total cable length. A long true-bypass chain loses treble; one good buffer early in the chain restores it. Keep vintage fuzz before the buffer.</li>
      <li>High-gain hiss is not a fault. A noise gate after the drives, or less gain, is the fix.</li>
    </ol>
    <h3>Board-day checklist</h3>
    <div class="grid2"><ul class="check"><li>Spare patch cable</li><li>Spare instrument cable</li><li>Spare power cable and adapter</li><li>9V battery for emergencies</li></ul><ul class="check"><li>Tuner calibrated to A440</li><li>Velcro and zip ties</li><li>Every pedal tested on and off</li><li>Master volume levels matched</li></ul></div>`),
]);

/* ---------- Guide 3: Amp Recipes ---------- */

const RECIPES = [
  ["Glassy clean", "Neck or middle single-coil", { Gain: 2, Bass: 4, Mid: 5, Treble: 7, Vol: 5 }, "Light compressor, subtle chorus, room reverb", "Keep gain low enough that hard strums stay clean."],
  ["Warm jazz", "Neck humbucker, tone at 5", { Gain: 2, Bass: 6, Mid: 5, Treble: 3, Vol: 5 }, "None, or a touch of room reverb", "Pick with the thumb or a heavy pick for a round attack."],
  ["Funk rhythm", "Middle or neck and middle", { Gain: 1, Bass: 4, Mid: 6, Treble: 6, Vol: 5 }, "Compressor with fast attack, optional envelope filter", "Mute hard with the fretting hand; the compressor evens the scratches."],
  ["Country snap", "Bridge single-coil", { Gain: 2, Bass: 4, Mid: 4, Treble: 7, Vol: 6 }, "Compressor, short slapback delay near 120 ms", "Hybrid picking and the bridge pickup do most of the work."],
  ["Edge of breakup", "Any, volume at 10", { Gain: 4.5, Bass: 5, Mid: 6, Treble: 6, Vol: 6 }, "Low-gain overdrive, level up, drive low", "Guitar volume at 7 for rhythm, 10 for the solo."],
  ["Texas blues lead", "Neck single-coil", { Gain: 5, Bass: 5, Mid: 7, Treble: 5, Vol: 6 }, "Mid-hump overdrive, spring reverb", "Heavier strings and a hard attack fatten it."],
  ["Classic rock crunch", "Bridge humbucker", { Gain: 6, Bass: 5, Mid: 7, Treble: 6, Vol: 6 }, "Optional overdrive to push the amp", "Mids are what make the chords sit in a band."],
  ["Hard rock lead", "Bridge humbucker", { Gain: 7.5, Bass: 5, Mid: 6, Treble: 6, Vol: 6 }, "Overdrive in front, delay around 400 ms low in the mix", "Add delay, not gain, when a lead needs to be bigger."],
  ["Tight high gain", "Bridge humbucker", { Gain: 8, Bass: 4, Mid: 5, Treble: 6, Vol: 5 }, "Overdrive with drive near zero and level up, noise gate", "The boost trims low end before the amp so mutes stay tight."],
  ["Wall of fuzz", "Bridge or neck, fuzz first", { Gain: 3, Bass: 6, Mid: 4, Treble: 5, Vol: 6 }, "Fuzz straight from the guitar, short reverb", "Roll guitar volume back and many fuzzes clean up."],
  ["Indie jangle", "Bridge and middle, or a 12-string", { Gain: 2.5, Bass: 4, Mid: 5, Treble: 7, Vol: 6 }, "Compressor, bright chorus", "Open chord voicings with ringing strings sell it."],
  ["Ambient swells", "Neck pickup, volume at 0", { Gain: 4, Bass: 4, Mid: 6, Treble: 5, Vol: 6 }, "Compressor, mild drive, delay 450 to 600 ms with many repeats, long reverb", "Fade each note in with the volume knob or a volume pedal."],
];

const recipeCard = ([name, guitar, amp, pedals, tip]) => `<div class="recipe"><h3>${name}</h3><p class="meta"><b>Guitar:</b> ${guitar}</p><div class="knobs">${Object.entries(amp).map(([k, v]) => knob(k, v)).join("")}</div><p class="meta"><b>Pedals:</b> ${pedals}</p><p class="meta" style="color:#1c1233">${tip}</p></div>`;

const recipes = doc("Amp Recipes", [
  titlePage({ volume: 3, title: "Amp Recipes", sub: "Twelve starting settings for the sounds you already love",
    blurb: "Guitar, pedal and amp settings for twelve classic sounds, drawn as knob positions on a 0 to 10 scale. Treat each as a starting point for your own amp, room and hands.",
    contents: ["How to use a recipe", "Clean sounds", "Driven sounds", "High gain, fuzz and ambient"] }),
  page("Method", "How to use a recipe", `
    <p class="lede">Every amp is voiced differently, so noon on one amp is not noon on another. A recipe tells you the shape of a sound. Your ears finish it.</p>
    <ol class="steps"><li>Set the knobs as drawn, at the volume you will actually play.</li><li>Play the kind of part the sound is for, not a random riff.</li><li>Adjust gain first, then mids, then bass and treble. One knob at a time.</li><li>Write down where you ended up for your amp. That is your recipe now.</li></ol>
    <div class="tip">Knobs are drawn on a 0 to 10 scale. If your amp's EQ runs 1 to 10 or has no numbers, match the pointer position instead.</div>
    <h3>Which knob matters most</h3>
    <table><tr><th>Sound family</th><th>The knob to get right first</th></tr>
      <tr><td>Cleans</td><td>Gain. Low enough that the hardest strum stays clean.</td></tr>
      <tr><td>Edge of breakup</td><td>Your guitar volume. It is the gain control while playing.</td></tr>
      <tr><td>Crunch and rock</td><td>Mids. They decide whether you are heard.</td></tr>
      <tr><td>High gain</td><td>Bass. Too much and palm mutes turn to mush.</td></tr>
      <tr><td>Ambient</td><td>Delay mix. Keep repeats just under the note.</td></tr>
    </table>`),
  page("Recipes 1 to 4", "Clean sounds", `<div class="grid2">${RECIPES.slice(0, 4).map(recipeCard).join("")}</div>`),
  page("Recipes 5 to 8", "Driven sounds", `<div class="grid2">${RECIPES.slice(4, 8).map(recipeCard).join("")}</div>`),
  page("Recipes 9 to 12", "High gain, fuzz and ambient", `<div class="grid2">${RECIPES.slice(8).map(recipeCard).join("")}</div><p class="small" style="margin-top:8pt">Hear six of these in the free Pedal Lab: guitarhub.org/pedal-lab.</p>`),
]);

/* ---------- Guide 4: Fretboard Atlas ---------- */

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const OPEN = [4, 9, 2, 7, 11, 4]; // E A D G B E as pitch classes, low to high

const noteChart = (() => {
  const w = 660, sx = 30, fw = (w - sx - 10) / 13, sh = 22, h = sh * 5 + 50;
  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  for (let f = 0; f <= 13; f++) svg += `<line x1="${sx + f * fw}" y1="14" x2="${sx + f * fw}" y2="${14 + sh * 5}" stroke="${f === 1 ? "#251152" : "#b9b0c9"}" stroke-width="${f === 1 ? 3 : 1}"/>`;
  for (let s = 0; s < 6; s++) svg += `<line x1="${sx}" y1="${14 + s * sh}" x2="${sx + 13 * fw}" y2="${14 + s * sh}" stroke="#5b4f75" stroke-width="${.6 + s * .2}"/>`;
  for (let s = 0; s < 6; s++) for (let f = 0; f <= 12; f++) {
    const pc = (OPEN[5 - s] + f) % 12, natural = !NAMES[pc].includes("#"), x = sx + (f + .5) * fw, y = 14 + s * sh;
    svg += `<circle cx="${x}" cy="${y}" r="9" fill="${pc === 4 || pc === 9 ? "#f5a25d" : natural ? "#251152" : "#e8e2f2"}"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${natural || pc === 4 || pc === 9 ? "#fff" : "#5b4f75"}" font-family="Helvetica">${NAMES[pc]}</text>`;
  }
  for (let f = 0; f <= 12; f++) svg += `<text x="${sx + (f + .5) * fw}" y="${h - 14}" text-anchor="middle" font-size="8" font-weight="${[3, 5, 7, 9, 12].includes(f) ? 800 : 400}" fill="#251152" font-family="Helvetica">${f === 0 ? "open" : f}</text>`;
  ["e", "B", "G", "D", "A", "E"].forEach((n, s) => { svg += `<text x="10" y="${17 + s * sh}" font-size="9" font-weight="700" fill="#251152" font-family="Helvetica">${n}</text>`; });
  return svg + "</svg>";
})();

const PENT = [
  { name: "Shape 1", from: 5, to: 8, frets: [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]] },
  { name: "Shape 2", from: 7, to: 10, frets: [[8, 10], [7, 10], [7, 10], [7, 9], [8, 10], [8, 10]] },
  { name: "Shape 3", from: 9, to: 13, frets: [[10, 12], [10, 12], [10, 12], [9, 12], [10, 13], [10, 12]] },
  { name: "Shape 4", from: 12, to: 15, frets: [[12, 15], [12, 15], [12, 14], [12, 14], [13, 15], [12, 15]] },
  { name: "Shape 5", from: 1, to: 5, frets: [[3, 5], [3, 5], [2, 5], [2, 5], [3, 5], [3, 5]] },
];
const A_MINOR_PENT = new Set([9, 0, 2, 4, 7]);
const pentDiagram = shape => {
  const dots = [];
  shape.frets.forEach((pair, s) => pair.forEach(f => { const pc = (OPEN[s] + f) % 12; if (!A_MINOR_PENT.has(pc)) throw new Error(`${shape.name} has a wrong note`); dots.push([s, f, pc === 9, NAMES[pc]]); }));
  return neck({ from: shape.from, to: shape.to, dots, width: 200, labels: true });
};

// C major chord in five CAGED shapes: frets per string low E to high e, null = muted.
const CAGED = [
  { name: "C shape", from: 1, to: 4, frets: [null, 3, 2, 0, 1, 0] },
  { name: "A shape", from: 2, to: 6, frets: [null, 3, 5, 5, 5, 3] },
  { name: "G shape", from: 5, to: 8, frets: [8, 7, 5, 5, 5, 8] },
  { name: "E shape", from: 7, to: 11, frets: [8, 10, 10, 9, 8, 8] },
  { name: "D shape", from: 9, to: 13, frets: [null, null, 10, 12, 13, 12] },
];
const C_MAJOR = new Set([0, 4, 7]);
const cagedDiagram = shape => {
  const dots = [];
  shape.frets.forEach((f, s) => { if (f === null) return; const pc = (OPEN[s] + f) % 12; if (!C_MAJOR.has(pc)) throw new Error(`${shape.name} has a wrong note`); dots.push([s, f, pc === 0, pc === 0 ? "R" : pc === 4 ? "3" : "5"]); });
  const muted = shape.frets.map((f, s) => f === null ? `<text x="14" y="${13 + (5 - s) * 13}" font-size="8" fill="#b33a2b" font-family="Helvetica">x</text>` : "").join("");
  return neck({ from: shape.from, to: shape.to, dots, width: 200, labels: true, notes: muted });
};

const atlas = doc("Fretboard Atlas", [
  titlePage({ volume: 4, title: "Fretboard Atlas", sub: "Every note, five pentatonic shapes, and the CAGED map",
    blurb: "The neck on paper: a full note chart to the 12th fret, the five minor pentatonic shapes in A, the five CAGED shapes of a C major chord, and a two-week plan to make them stick.",
    contents: ["Every note, frets 0 to 12", "Landmarks that make it easy", "Five minor pentatonic shapes", "Five CAGED shapes", "A two-week memorization plan"] }),
  page("Notes", "Every note on the neck", `
    <figure>${noteChart}<figcaption>Standard tuning. Dark dots are natural notes; light dots are sharps (also called flats: C# is D♭). E and A are highlighted as landmarks.</figcaption></figure>
    <h3>Landmarks that make it easy</h3>
    <div class="grid2"><ul>
      <li>The 12th fret repeats the open strings an octave up. Learn frets 0 to 11 and you know the whole neck.</li>
      <li>The low and high E strings have the same notes.</li>
      <li>There is no sharp between B and C or between E and F.</li>
    </ul><ul>
      <li>Octave shape: from the low E or A string, go two strings up and two frets up.</li>
      <li>From the D or G string, go two strings up and three frets up (the B string shifts it).</li>
      <li>Fret 5 on each string matches the next open string, except the G string, where it is fret 4.</li>
    </ul></div>`),
  page("Scales", "Five minor pentatonic shapes (A minor)", `
    <p class="lede">A minor pentatonic is A, C, D, E, G. The same five notes, in five overlapping boxes up the neck. Orange dots are the root, A.</p>
    <div class="grid3">${PENT.map(shape => `<figure>${pentDiagram(shape)}<figcaption>${shape.name}${shape.name === "Shape 5" ? " (also at frets 15 to 17)" : ""}</figcaption></figure>`).join("")}
    <div class="box"><b>Move the key</b> by sliding every shape. Shape 1 starts on the root on the low E string: at fret 5 it is A minor, at fret 3 G minor, at fret 8 C minor. The same notes are also C major pentatonic.</div></div>`),
  page("Chords", "The CAGED map (C major)", `
    <p class="lede">Every major chord can be played in five shapes named after the open chords C, A, G, E and D. Here is one C major chord, five ways, climbing the neck. R is the root, 3 the third, 5 the fifth.</p>
    <div class="grid3">${CAGED.map(shape => `<figure>${cagedDiagram(shape)}<figcaption>${shape.name}</figcaption></figure>`).join("")}
    <div class="box"><b>The order repeats:</b> C, A, G, E, D, then C again twelve frets higher. Each shape shares its top notes with the next one's bottom notes, so the neck becomes one connected map.</div></div>`),
  page("Plan", "A two-week memorization plan", `
    <p class="lede">Ten minutes a day beats two hours on a Sunday. Say every note out loud as you play it.</p>
    <table><tr><th style="width:14%">Days</th><th>Do this</th></tr>
      <tr><td>1 to 2</td><td>Natural notes on the low E string, frets 0 to 12. Play them in order, then randomly as someone calls them.</td></tr>
      <tr><td>3 to 4</td><td>Same on the A string. Then find each note on both strings.</td></tr>
      <tr><td>5 to 6</td><td>Octave shapes from the E and A strings onto the D and G strings.</td></tr>
      <tr><td>7</td><td>Rest, or a quiz: find every C on the neck in 30 seconds. Then every G.</td></tr>
      <tr><td>8 to 9</td><td>Pentatonic shapes 1 and 2, naming each note as you play.</td></tr>
      <tr><td>10 to 11</td><td>Shapes 3 to 5, then connect all five from the 3rd to the 17th fret.</td></tr>
      <tr><td>12 to 13</td><td>CAGED shapes of C, then move them to G and D.</td></tr>
      <tr><td>14</td><td>Improvise over a backing track and aim every phrase at a root or a chord tone.</td></tr>
    </table>
    <h3>Tracker</h3>
    <div class="grid2"><ul class="check">${Array.from({ length: 7 }, (_, i) => `<li>Day ${i + 1}</li>`).join("")}</ul><ul class="check">${Array.from({ length: 7 }, (_, i) => `<li>Day ${i + 8}</li>`).join("")}</ul></div>
    <p class="small">Quiz yourself on the free Fretboard Explorer: guitarhub.org/fretboard.</p>`),
]);

/* ---------- build ---------- */

const GUIDES = [
  ["guitarhub-tone-field-manual.pdf", toneManual],
  ["guitarhub-pedalboard-blueprint.pdf", blueprint],
  ["guitarhub-amp-recipes.pdf", recipes],
  ["guitarhub-fretboard-atlas.pdf", atlas],
];

const chrome = findChrome();
mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "guides-"));
try {
  for (const [file, html] of GUIDES) {
    const source = join(work, file.replace(/\.pdf$/, ".html"));
    writeFileSync(source, html);
    execFileSync(chrome, [
      "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
      `--print-to-pdf=${join(OUT, file)}`, `file://${source}`,
    ], { stdio: "pipe" });
    console.log(`built public/guides/${file}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
