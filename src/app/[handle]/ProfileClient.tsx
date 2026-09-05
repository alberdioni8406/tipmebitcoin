"use client";

import { useState } from "react";
import { buildBchPaymentUri } from "@/lib/addresses";
import { QRCode } from "@/components/QRCode";

interface Props {
  handle: string;
  displayName: string | null;
  bio: string | null;
  bchAddress: string;
  tokenAddress: string | null;
  verified: boolean;
  appUrl: string;
}

export function ProfileClient({
  handle,
  displayName,
  bio,
  bchAddress,
  tokenAddress,
  verified,
  appUrl,
}: Props) {
  const [mode, setMode] = useState<"profile" | "bch" | "token">("profile");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const host = appUrl.replace(/^https?:\/\//, "");
  const profileUrl = `\( {appUrl}/ \){handle}`;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  if (mode === "bch") {
    const uri = buildBchPaymentUri(bchAddress, amount || undefined);
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <button
          onClick={() => setMode("profile")}
          className="text-sm text-[var(--text-muted)] mb-6 hover:text-[var(--text)]"
        >
          ← Back
        </button>
        <h2 className="font-mono text-lg mb-1">SEND BCH</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          to @{handle.toUpperCase()}
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">Amount (BCH, optional)</label>
            <input
              className="input-field"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="0.01"
            />
          </div>

          <div className="card text-center">
            <p className="text-xs text-[var(--text-muted)] mb-3 font-mono">
              Scan with wallet
            </p>
            <div className="flex justify-center">
              <QRCode value={uri} size={200} />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <div className="flex gap-2">
              <code className="input-field flex-1 text-xs break-all">
                {bchAddress}
              </code>
              <button
                className="btn-ghost text-xs shrink-0"
                onClick={() => copy(bchAddress, "addr")}
              >
                {copied === "addr" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Payment URI generated. Compatibility depends on the receiving
            wallet.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "token") {
    const addr = tokenAddress || bchAddress;
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <button
          onClick={() => setMode("profile")}
          className="text-sm text-[var(--text-muted)] mb-6 hover:text-[var(--text)]"
        >
          ← Back
        </button>
        <h2 className="font-mono text-lg mb-1">SEND CASHTOKENS</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          to @{handle.toUpperCase()}
        </p>

        <div className="card text-center mb-4">
          <p className="text-xs text-[var(--text-muted)] mb-3 font-mono">
            Scan address
          </p>
          <div className="flex justify-center">
            <QRCode value={addr} size={200} />
          </div>
        </div>

        <div>
          <label className="label">CashToken receiving address</label>
          <div className="flex gap-2">
            <code className="input-field flex-1 text-xs break-all">{addr}</code>
            <button
              className="btn-ghost text-xs shrink-0"
              onClick={() => copy(addr, "token")}
            >
              {copied === "token" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          Address sharing only. Wallet-specific CashToken transaction
          construction can be added later.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="font-mono text-2xl tracking-tight crt-subtle">
          @{handle.toUpperCase()}
        </h1>
        {verified && (
          <p className="mt-2 text-xs font-mono text-[var(--accent)]">
            ● BCH ADDRESS VERIFIED
          </p>
        )}
        {displayName && <p className="mt-3 text-lg">{displayName}</p>}
        {bio && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{bio}</p>
        )}
      </div>

      <div className="space-y-3">
        <button className="btn-primary w-full" onClick={() => setMode("bch")}>
          SEND BCH
        </button>
        <button className="btn-ghost w-full" onClick={() => setMode("token")}>
          SEND CASHTOKENS
        </button>
        <button
          className="btn-ghost w-full text-sm"
          onClick={() => copy(profileUrl, "link")}
        >
          {copied === "link" ? "Link copied" : "COPY LINK"}
        </button>
      </div>

      <p className="mt-10 text-center text-xs font-mono text-[var(--text-muted)]">
        {host}/{handle}
      </p>
    </div>
  );
}
