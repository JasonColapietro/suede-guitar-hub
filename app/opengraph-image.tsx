import { ImageResponse } from "next/og";
import { OG_COLORS, OG_CONTENT_TYPE, OG_SIZE, OgFrame, OgMasthead } from "@/lib/og";

export const alt = "GuitarHub: prove one guitar breakthrough in 30 days.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/* The home card. The palette, the masthead and the reason no custom font is
   loaded all live in lib/og.tsx, shared with every per-page card, so the home
   card and the page cards cannot drift apart. */
export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            padding: "62px 80px 60px",
          }}
        >
          <OgMasthead />

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
                  backgroundColor: OG_COLORS.peach,
                }}
              >
                30 days
              </div>
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
