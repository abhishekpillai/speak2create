import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          color: "white",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          speak2create
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 48,
            fontFamily: "sans-serif",
            fontWeight: 400,
          }}
        >
          Create and edit images with your voice
        </div>
      </div>
    ),
    size
  );
}
