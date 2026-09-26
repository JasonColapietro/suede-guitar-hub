import type { ToneArtKey } from "@/lib/tone/course";

/**
 * Illustrations for the Tone course. Drawn in SVG so they stay sharp, weigh a
 * few kilobytes, and need no image licence. Decorative: the lesson title
 * beside them carries the meaning, so each is hidden from assistive tech.
 */

const PEACH = "#f5e2cf", VIOLET = "#a78bfa", ORANGE = "#f5a25d", CREAM = "#f7f3ee";

function Scene({ art }: { art: ToneArtKey }) {
  switch (art) {
    case "hands":
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M0 ${150 + i * 26} Q 400 ${150 + i * 26 + (i === 2 ? 26 : 0)} 800 ${150 + i * 26}`} stroke={CREAM} strokeOpacity=".75" strokeWidth={3.2 - i * .35} fill="none" />)}
          <path d="M 400 190 Q 470 214 520 270" stroke={ORANGE} strokeWidth="3" fill="none" strokeDasharray="6 8" />
          <g transform="translate(360 150) rotate(-20)">
            <path d="M0 0 C 30 -10, 70 -10, 90 10 C 80 50, 50 85, 45 95 C 30 80, 5 45, 0 0 Z" fill={ORANGE} />
            <path d="M12 10 C 35 4, 60 4, 76 14" stroke="#fff" strokeOpacity=".5" strokeWidth="3" fill="none" />
          </g>
          {[0, 1, 2].map(i => <circle key={i} cx="430" cy="203" r={30 + i * 26} fill="none" stroke={VIOLET} strokeWidth="2" opacity={.7 - i * .2} />)}
          <text x="60" y="400" fill={PEACH} fontSize="22" fontFamily="system-ui" fontWeight="700" letterSpacing="6" opacity=".7">BRIDGE · · · MIDDLE · · · NECK</text>
        </g>
      );
    case "pickups":
      return (
        <g>
          <rect x="120" y="90" width="560" height="280" rx="40" fill="#1b0f38" stroke={VIOLET} strokeOpacity=".4" strokeWidth="3" />
          {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1="120" y1={140 + i * 36} x2="680" y2={140 + i * 36} stroke={CREAM} strokeOpacity=".7" strokeWidth={2.6 - i * .25} />)}
          <g><rect x="190" y="118" width="46" height="224" rx="22" fill="#f1ede4" />{[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx="213" cy={140 + i * 36} r="7" fill="#9a9a9a" />)}</g>
          <g><rect x="360" y="118" width="96" height="224" rx="10" fill="#111" stroke="#c9a54d" strokeWidth="4" />{[0, 1, 2, 3, 4, 5].map(i => <g key={i}><circle cx="386" cy={140 + i * 36} r="7" fill="#c9a54d" /><circle cx="430" cy={140 + i * 36} r="7" fill="#9a9a9a" /></g>)}</g>
          <g><rect x="560" y="118" width="70" height="224" rx="8" fill={CREAM} />{[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx="595" cy={140 + i * 36} r="7" fill="#9a9a9a" />)}</g>
          {[213, 408, 595].map((x, i) => <path key={i} d={`M ${x - 30} 395 q 15 -20 30 0 t 30 0`} stroke={[VIOLET, ORANGE, PEACH][i]} strokeWidth="4" fill="none" />)}
        </g>
      );
    case "amp":
      return (
        <g>
          <ellipse cx="400" cy="250" rx="330" ry="180" fill={ORANGE} opacity=".1" />
          <rect x="190" y="70" width="420" height="320" rx="22" fill="#1b130d" stroke="#7a5e3c" strokeWidth="6" />
          <rect x="210" y="90" width="380" height="64" rx="8" fill="#e9d8b4" />
          {[0, 1, 2, 3, 4, 5, 6].map(i => <g key={i}><circle cx={245 + i * 52} cy="122" r="16" fill="#1c1233" /><line x1={245 + i * 52} y1="122" x2={245 + i * 52 + 8} y2="110" stroke="#e9d8b4" strokeWidth="3" /></g>)}
          <rect x="210" y="170" width="380" height="200" rx="10" fill="#2b2118" />
          {Array.from({ length: 24 }, (_, i) => <line key={i} x1={210 + i * 16} y1="170" x2={210 + i * 16 + 60} y2="370" stroke="#5b4a37" strokeWidth="3" />)}
          {[0, 1, 2, 3].map(i => <circle key={i} cx="400" cy="270" r={40 + i * 26} fill="none" stroke={ORANGE} strokeWidth="3" opacity={.8 - i * .18} />)}
          <circle cx="572" cy="112" r="7" fill="#ff4d3a"><animate attributeName="opacity" values="1;.5;1" dur="2s" repeatCount="indefinite" /></circle>
        </g>
      );
    case "pedals":
      return (
        <g>
          {[["#3e8f5a", "DRIVE"], ["#d24a2c", "FUZZ"], ["#4a64c4", "CHORUS"], ["#7a3fb4", "DELAY"]].map(([color, name], i) => (
            <g key={name} transform={`translate(${70 + i * 172} ${120 + (i % 2) * 30}) rotate(${(i - 1.5) * 4})`}>
              <rect width="140" height="210" rx="16" fill={color} />
              <rect x="0" y="0" width="140" height="210" rx="16" fill="url(#pedalSheen)" />
              <circle cx="38" cy="44" r="16" fill="#f2f2f2" /><circle cx="102" cy="44" r="16" fill="#f2f2f2" />
              <circle cx="70" cy="92" r="6" fill="#ff3b30" />
              <text x="70" y="140" textAnchor="middle" fill="#fff" fontFamily="system-ui" fontWeight="800" fontSize="18" letterSpacing="2">{name}</text>
              <circle cx="70" cy="178" r="20" fill="#cfcfcf" stroke="#777" strokeWidth="3" />
            </g>
          ))}
        </g>
      );
    case "chain":
      return (
        <g>
          <path d="M 40 230 C 140 120, 200 340, 300 230 S 460 120, 520 230 S 680 340, 760 230" stroke={VIOLET} strokeWidth="6" fill="none" strokeLinecap="round" />
          {[["TUNER", 110], ["COMP", 230], ["DRIVE", 350], ["MOD", 470], ["DELAY", 590], ["VERB", 700]].map(([name, x], i) => (
            <g key={String(name)} transform={`translate(${x} 230)`}>
              <circle r="44" fill={i === 2 ? ORANGE : "#1b0f38"} stroke={PEACH} strokeWidth="3" />
              <text y="6" textAnchor="middle" fill={i === 2 ? "#1c1233" : PEACH} fontFamily="system-ui" fontWeight="800" fontSize="15" letterSpacing="1">{name}</text>
              <text y="78" textAnchor="middle" fill={PEACH} opacity=".6" fontFamily="system-ui" fontWeight="700" fontSize="16">{i + 1}</text>
            </g>
          ))}
        </g>
      );
    case "power":
      return (
        <g>
          <rect x="250" y="140" width="300" height="140" rx="18" fill="#101010" stroke="#444" strokeWidth="4" />
          {Array.from({ length: 8 }, (_, i) => <g key={i}><circle cx={290 + i * 32} cy="250" r="9" fill="#333" stroke="#777" strokeWidth="2" /><circle cx={290 + i * 32} cy="250" r="3" fill="#aaa" /></g>)}
          <text x="400" y="200" textAnchor="middle" fill={ORANGE} fontFamily="system-ui" fontWeight="800" fontSize="30" letterSpacing="4">9V · ISOLATED</text>
          {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M ${290 + i * 32} 259 C ${290 + i * 32} 330, ${60 + i * 95} 330, ${60 + i * 95} 410`} stroke={i === 5 ? "#ff4d3a" : VIOLET} strokeWidth="3" fill="none" opacity=".85" />)}
          <path d="M 590 110 l -22 44 h 22 l -22 44" stroke={ORANGE} strokeWidth="6" fill="none" strokeLinejoin="round" />
          <path d="M 620 330 q 20 -30 40 0 t 40 0 t 40 0" stroke="#ff4d3a" strokeWidth="3" fill="none" opacity=".8" />
          <line x1="610" y1="300" x2="760" y2="370" stroke="#ff4d3a" strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case "eq":
      return (
        <g>
          {[0, 1, 2, 3, 4].map(i => <line key={i} x1="60" y1={100 + i * 60} x2="740" y2={100 + i * 60} stroke={CREAM} strokeOpacity=".08" />)}
          <path d="M 60 300 C 150 300, 170 170, 260 250 S 380 330, 430 280 S 520 120, 580 180 S 690 320, 740 330" stroke={ORANGE} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M 60 300 C 150 300, 170 170, 260 250 S 380 330, 430 280 S 520 120, 580 180 S 690 320, 740 330 L 740 380 L 60 380 Z" fill={ORANGE} opacity=".12" />
          {[["BOOM", 110], ["MUD", 210], ["BOXY", 310], ["HONK", 410], ["PUSH", 510], ["BITE", 600], ["FIZZ", 690]].map(([word, x]) => <text key={String(word)} x={Number(x)} y="420" textAnchor="middle" fill={PEACH} fontFamily="system-ui" fontWeight="800" fontSize="17" letterSpacing="2" opacity=".8">{word}</text>)}
          <circle cx="552" cy="150" r="14" fill={VIOLET} />
        </g>
      );
    case "recording":
      return (
        <g>
          <circle cx="330" cy="240" r="170" fill="#1b130d" stroke="#5b4a37" strokeWidth="8" />
          {[0, 1, 2, 3].map(i => <circle key={i} cx="330" cy="240" r={150 - i * 30} fill="none" stroke="#3b2e21" strokeWidth="6" />)}
          <circle cx="330" cy="240" r="50" fill="#2b2118" stroke="#6b5236" strokeWidth="4" />
          <g transform="translate(560 200) rotate(-8)">
            <rect x="-30" y="-40" width="60" height="120" rx="26" fill="#2a2a2a" stroke="#666" strokeWidth="3" />
            <rect x="-30" y="-40" width="60" height="44" rx="22" fill="url(#mesh)" />
            <rect x="-8" y="80" width="16" height="130" fill="#444" />
          </g>
          <path d="M 530 190 L 380 240" stroke={ORANGE} strokeWidth="3" strokeDasharray="8 8" />
          <circle cx="380" cy="240" r="8" fill={ORANGE} />
          <g transform="translate(640 70)"><circle r="12" fill="#ff3b30"><animate attributeName="opacity" values="1;.3;1" dur="1.2s" repeatCount="indefinite" /></circle><text x="22" y="7" fill={PEACH} fontFamily="system-ui" fontWeight="800" fontSize="22">REC</text></g>
        </g>
      );
    case "recipes":
      return (
        <g>
          {[[170, 170, -90, "GAIN"], [330, 170, 20, "BASS"], [490, 170, 60, "MID"], [650, 170, -20, "TREBLE"], [250, 330, 100, "DRIVE"], [410, 330, -60, "DELAY"], [570, 330, 0, "VERB"]].map(([x, y, turn, name]) => (
            <g key={String(name)} transform={`translate(${x} ${y})`}>
              {Array.from({ length: 11 }, (_, t) => { const a = (-135 + t * 27) * Math.PI / 180; return <line key={t} x1={Math.sin(a) * 54} y1={-Math.cos(a) * 54} x2={Math.sin(a) * 62} y2={-Math.cos(a) * 62} stroke={PEACH} strokeOpacity=".6" strokeWidth="3" />; })}
              <circle r="44" fill="url(#knob)" />
              <line x1="0" y1="0" x2="0" y2="-38" stroke="#1c1233" strokeWidth="6" strokeLinecap="round" transform={`rotate(${turn})`} />
              <text y="86" textAnchor="middle" fill={PEACH} fontFamily="system-ui" fontWeight="800" fontSize="15" letterSpacing="2">{name}</text>
            </g>
          ))}
        </g>
      );
  }
}

export default function ToneArt({ art, className = "" }: { art: ToneArtKey; className?: string }) {
  return (
    <svg viewBox="0 0 800 450" className={className} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`bg-${art}`} cx=".75" cy=".1" r="1.1"><stop offset="0" stopColor="#4a2a9a" /><stop offset=".55" stopColor="#251152" /><stop offset="1" stopColor="#120828" /></radialGradient>
        <linearGradient id="pedalSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient>
        <radialGradient id="knob" cx=".35" cy=".3"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#c9c9c9" /><stop offset="1" stopColor="#7a7a7a" /></radialGradient>
        <pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#555" /><circle cx="3" cy="3" r="1.4" fill="#222" /></pattern>
      </defs>
      <rect width="800" height="450" fill={`url(#bg-${art})`} />
      <Scene art={art} />
    </svg>
  );
}
