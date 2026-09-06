import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Simple monochrome “T” mark for favicon / apple icon */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#00ff9c",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "monospace",
        }}
      >
        T
      </div>
    ),
    { ...size }
  );
}
