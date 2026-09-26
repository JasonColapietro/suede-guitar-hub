import type { CoverArt, FieldGuide } from "@/lib/tone/field-guides";
import styles from "./Book.module.css";

/**
 * A graphic book cover for a free PDF guide. Illustration only: the art sets
 * a mood and is not a picture of the guide's pages.
 */

function Art({ art, accent }: { art: CoverArt; accent: string }) {
  switch (art) {
    case "amp":
      return (
        <g>
          <circle cx="200" cy="250" r="150" fill={accent} opacity=".18" />
          <rect x="70" y="150" width="260" height="190" rx="18" fill="#1b130d" stroke="#6b5236" strokeWidth="6" />
          <rect x="84" y="164" width="232" height="44" rx="6" fill="#e9d8b4" />
          {[0, 1, 2, 3, 4, 5].map(i => <g key={i}><circle cx={108 + i * 37} cy="186" r="11" fill="#1c1233" /><line x1={108 + i * 37} y1="186" x2={108 + i * 37 + 6} y2="178" stroke="#e9d8b4" strokeWidth="2.5" /></g>)}
          <rect x="84" y="220" width="232" height="108" rx="8" fill="url(#grille)" />
          {[0, 1, 2].map(i => <circle key={i} cx="200" cy="274" r={30 + i * 14} fill="none" stroke={accent} strokeWidth="2" opacity={.55 - i * .15} />)}
          <circle cx="302" cy="176" r="5" fill={accent}><animate attributeName="opacity" values="1;.4;1" dur="2.4s" repeatCount="indefinite" /></circle>
        </g>
      );
    case "pedalboard":
      return (
        <g>
          <rect x="50" y="170" width="300" height="170" rx="14" fill="#0b0f10" stroke="#2c3a3a" strokeWidth="4" />
          {[["#d24a2c", 66, 190], ["#e8b923", 158, 190], ["#3e8f5a", 250, 190], ["#4a64c4", 66, 268], ["#7a3fb4", 158, 268], ["#a0578a", 250, 268]].map(([color, x, y], i) => (
            <g key={i}>
              <rect x={Number(x)} y={Number(y)} width="84" height="62" rx="8" fill={String(color)} />
              <circle cx={Number(x) + 22} cy={Number(y) + 18} r="7" fill="#f2f2f2" />
              <circle cx={Number(x) + 62} cy={Number(y) + 18} r="7" fill="#f2f2f2" />
              <circle cx={Number(x) + 42} cy={Number(y) + 46} r="9" fill="#cfcfcf" stroke="#777" strokeWidth="2" />
            </g>
          ))}
          <path d="M150 221 C 154 200, 154 200, 158 221 M242 221 C 246 200, 246 200, 250 221 M334 221 C 370 250, 20 240, 66 299" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M40 120 L 360 120" stroke={accent} strokeWidth="2" strokeDasharray="4 10" opacity=".6" />
        </g>
      );
    case "knobs":
      return (
        <g>
          <circle cx="200" cy="255" r="160" fill={accent} opacity=".12" />
          {[[120, 200, -60], [280, 200, 30], [120, 320, 90], [280, 320, -10]].map(([x, y, turn], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {Array.from({ length: 11 }, (_, t) => { const a = (-135 + t * 27) * Math.PI / 180; return <line key={t} x1={Math.sin(a) * 50} y1={-Math.cos(a) * 50} x2={Math.sin(a) * 58} y2={-Math.cos(a) * 58} stroke={accent} strokeWidth="3" />; })}
              <circle r="40" fill="url(#chrome)" stroke="#000" strokeOpacity=".4" />
              <line x1="0" y1="0" x2="0" y2="-34" stroke="#1c1233" strokeWidth="5" strokeLinecap="round" transform={`rotate(${turn})`} />
            </g>
          ))}
        </g>
      );
    case "neck":
      return (
        <g transform="rotate(-18 200 260)">
          <rect x="-40" y="190" width="480" height="140" fill="#3a2415" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <rect key={i} x={-20 + i * 62} y="190" width="4" height="140" fill="#cfcfcf" />)}
          {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1="-40" y1={202 + i * 23} x2="440" y2={202 + i * 23} stroke="#e6dcc8" strokeWidth={1 + (5 - i) * .4} />)}
          {[[73, 202], [135, 225], [135, 294], [197, 248], [197, 271], [259, 202], [259, 317], [321, 248], [383, 225]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="10" fill={i % 3 === 0 ? "#f5e2cf" : accent} />)}
        </g>
      );
  }
}

export default function BookCover({ guide, size = "md", tilt = true }: { guide: FieldGuide; size?: "sm" | "md" | "lg"; tilt?: boolean }) {
  const [top, bottom, accent] = guide.palette;
  const id = `cover-${guide.slug}`;
  return (
    <div className={styles.book} data-size={size} data-tilt={tilt} style={{ ["--spine" as string]: bottom, ["--accent" as string]: accent }}>
      <svg viewBox="0 0 400 600" className={styles.cover} role="img" aria-label={`Cover art for ${guide.title}, GuitarHub field guide volume ${guide.volume}`}>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient>
          <pattern id="grille" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#2b2118" /><rect width="3" height="8" fill="#5b4a37" /></pattern>
          <radialGradient id="chrome" cx=".35" cy=".3"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#c4c4c4" /><stop offset="1" stopColor="#7a7a7a" /></radialGradient>
          <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset=".12" stopColor="#fff" stopOpacity="0" /></linearGradient>
        </defs>
        <rect width="400" height="600" fill={`url(#${id}-bg)`} />
        <text x="32" y="58" fill={accent} fontFamily="system-ui, sans-serif" fontSize="15" fontWeight="800" letterSpacing="4">GUITARHUB · VOL. {guide.volume}</text>
        <line x1="32" y1="74" x2="368" y2="74" stroke={accent} strokeOpacity=".5" />
        <Art art={guide.art} accent={accent} />
        <foreignObject x="28" y="410" width="344" height="160">
          <div className={styles.coverText}>
            <p className={styles.coverTitle}>{guide.title}</p>
            <p className={styles.coverSub} style={{ color: accent }}>{guide.subtitle}</p>
          </div>
        </foreignObject>
        <rect width="400" height="600" fill={`url(#${id}-sheen)`} />
      </svg>
    </div>
  );
}
