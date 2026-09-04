"use client";

import { QRCodeSVG } from "qrcode.react";

interface Props {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Internal QR generation — no external service.
 * Requires: npm install qrcode.react
 */
export function QRCode({ value, size = 200, className }: Props) {
  if (!value) return null;

  return (
    <div className={`qr-container ${className || ""}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={false}
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
}
