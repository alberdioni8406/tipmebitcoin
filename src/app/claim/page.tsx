"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [bchAddress, setBchAddress] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<{
    text: string;
    id: string;
  } | null>(null);
  const [signature, setSignature] = useState("");
  const [step, setStep] = useState<"form" | "sign" | "done">("form");
  const [loading, setLoading] = useState(false);

  async function checkAvailability() {
    setStatus("checking");
    setError("");
    try {
      const res = await fetch(
        `/api/handles?handle=${encodeURIComponent(handle)}`
      );
      const data = await res.json();
      if (data.available) {
        setStatus("available");
      } else {
        setStatus("taken");
        setError(data.error || "Handle not available");
      }
    } catch {
      setStatus("error");
      setError("Network error");
    }
  }

  async function startClaim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          bchAddress,
          tokenAddress,
          action: "start",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Claim failed");
        return;
      }
      setChallenge({ text: data.challenge.text, id: data.challenge.id });
      setStep("sign");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function submitSignature(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          bchAddress,
          tokenAddress,
          action: "verify",
          challengeId: challenge?.id,
          signature,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      setStep("done");
      setTimeout(() => router.push(`/${handle.toLowerCase()}`), 1200);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold font-mono tracking-tight mb-2">
        CLAIM YOUR BCH IDENTITY
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        No email. No password. Prove control of your BCH address.
      </p>

      {step === "form" && (
        <form onSubmit={startClaim} className="space-y-5">
          <div>
            <label className="label">HANDLE</label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[var(--text-muted)]">@</span>
              <input
                className="input-field flex-1"
                value={handle}
                onChange={(e) => {
                  setHandle(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                  );
                  setStatus("idle");
                }}
                placeholder="yourname"
                maxLength={30}
                required
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              onClick={checkAvailability}
              className="btn-ghost mt-2 text-xs"
              disabled={handle.length < 3 || status === "checking"}
            >
              {status === "checking" ? "Checking…" : "Check availability"}
            </button>
            {status === "available" && (
              <p className="text-xs text-[var(--accent)] mt-1">Available</p>
            )}
            {status === "taken" && (
              <p className="text-xs text-[var(--danger)] mt-1">{error}</p>
            )}
          </div>

          <div>
            <label className="label">BCH RECEIVING ADDRESS</label>
            <input
              className="input-field"
              value={bchAddress}
              onChange={(e) => setBchAddress(e.target.value)}
              placeholder="bitcoincash:q..."
              required
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="label">
              CASHTOKEN RECEIVING ADDRESS (optional)
            </label>
            <input
              className="input-field"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="bitcoincash:q... (token-capable)"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <p className="text-xs text-[var(--text-muted)] border border-[var(--border)] p-3">
            Your verified BCH address is your recovery authority. Keep control
            of your wallet and recovery phrase. We never ask for it.
          </p>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Processing…" : "CONTINUE"}
          </button>
        </form>
      )}

      {step === "sign" && challenge && (
        <form onSubmit={submitSignature} className="space-y-5">
          <p className="text-sm">
            Sign this exact message with the wallet that controls the BCH
            address above.
          </p>
          <pre className="card font-mono text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-64">
            {challenge.text}
          </pre>
          <div>
            <label className="label">SIGNATURE (base64)</label>
            <textarea
              className="input-field min-h-[100px]"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Paste the signature from your wallet…"
              required
              spellCheck={false}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Compatible wallets: Electron Cash (Tools → Sign/Verify Message),
            Bitcoin.com wallet, and others supporting Bitcoin message signing.
          </p>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Verifying…" : "VERIFY & CLAIM"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="text-center space-y-4">
          <p className="text-[var(--accent)] font-mono text-lg">
            ● HANDLE CLAIMED
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Redirecting to your profile…
          </p>
        </div>
      )}
    </div>
  );
}
