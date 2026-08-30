import { ImageResponse } from "next/og";

export const alt = "GuitarHub — prove one guitar breakthrough in 30 days.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Palette copied verbatim from the @theme block in app/globals.css.
   next/og renders through Satori, which never sees Tailwind, so the tokens
   cannot be referenced as classes here and have to be repeated as literals.
   If those tokens change in globals.css, change them here too. */
const CREAM = "#f7f3ee"; // --color-cream
const INDIGO_DEEP = "#251152"; // --color-indigo-deep
const PEACH = "#f5e2cf"; // --color-peach
const STRING = "rgba(109, 40, 217, 0.45)"; // --color-violet, as in .strings-divider

/* Low E through high E: the gauge thins as it climbs, the same idea as the
   .strings-divider rule. Rendered as real divs rather than a repeating
   gradient because Satori's repeating-linear-gradient support is not
   something this route should depend on. */
const STRING_GAUGES = [5, 4, 3, 3, 2, 2];

/* No `fonts` option is passed on purpose. next/og bundles Noto Sans and
   registers it as the default family; passing `fonts` REPLACES that default
   rather than extending it (see render() in @vercel/og), and Satori cannot
   read woff2, which is the only format next/font/google caches for Fraunces.
   Fetching a font over the network at build time would put the whole route
   one failed request away from breaking, so hierarchy here is carried by
   size, color and spacing instead of by weight or a serif face. */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: CREAM,
          color: INDIGO_DEEP,
        }}
      >
        {/* Masthead rule. Doubles as a hard top edge so a cream card does not
            dissolve into the white background of Slack, iMessage or X. */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 16,
            backgroundColor: INDIGO_DEEP,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            padding: "62px 80px 60px",
          }}
        >
          {/* Masthead block: wordmark over the string rule, the same pairing
              the site uses when .strings-divider sits under a heading. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 44, letterSpacing: 8 }}>
              GUITARHUB
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 320,
                marginTop: 24,
              }}
            >
              {STRING_GAUGES.map((gauge, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    width: "100%",
                    height: gauge,
                    marginTop: i === 0 ? 0 : 9,
                    backgroundColor: STRING,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Line breaks are hardcoded as separate rows so the composition is
              deterministic and never depends on where Satori decides to wrap. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 92,
              lineHeight: 1.1,
            }}
          >
            <div style={{ display: "flex" }}>Prove one</div>
            <div style={{ display: "flex" }}>guitar breakthrough</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
              <div style={{ display: "flex" }}>in</div>
              <div
                style={{
                  display: "flex",
                  marginLeft: 26,
                  padding: "6px 38px",
                  borderRadius: 999,
                  backgroundColor: PEACH,
                }}
              >
                30 days
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
