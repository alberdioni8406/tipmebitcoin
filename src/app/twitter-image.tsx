import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TipMeBitcoin — Non-custodial BCH tipping identity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#0a0a0a",
          padding: "72px 80px",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#00ff9c",
            fontSize: 28,
            letterSpacing: 8,
            marginBottom: 24,
          }}
        >
          TIPMEBITCOIN
        </div>
        <div
          style={{
            display: "flex",
            color: "#f5f5f5",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Non-custodial BCH tipping identity
        </div>
        <div
          style={{
            display: "flex",
            color: "#888888",
            fontSize: 26,
            marginTop: 28,
            maxWidth: 900,
          }}
        >
          Claim a handle. Prove your address. No email. No password. No custody.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            color: "#00ff9c",
            fontSize: 22,
          }}
        >
          tipmebitcoin.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
