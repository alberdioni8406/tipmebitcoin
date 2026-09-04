"use client";

import { QRCode } from "@/components/QRCode";

export function DonationQR({ address }: { address: string }) {
  return (
    <div className="flex justify-center">
      <QRCode value={address} size={160} />
    </div>
  );
}
