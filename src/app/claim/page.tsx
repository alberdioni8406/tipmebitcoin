"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "tipmebitcoin_claim_v1";

type ClaimStored = {
  handle: string;
  bchAddress: string;
  tokenAddress: string;
  challengeId: string;
  challengeText: string;
  expiration: number;
};

function loadStored(): ClaimStored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ClaimStored;
    if (!data.challengeId || !data.challengeText || !data.expiration) return null;
    if (Math.floor(Date.now() / 1000) > data.expiration) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveStored(data: ClaimStored) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function clearStored() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function formatRemaining(expiration: number): string {
  const left = Math.max(0, expiration - Math.floor(Date.now() / 1000));
  const m = Math.floor(left / 60);
  const s = left % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
    expiration: number;
  } | null>(null);
  const [signature, setSignature] = useState("");
  const [step, setStep] = useState<"form" | "sign" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState("");
  const [restored, setRestored] = useState(false);

  // Restore claim session after refresh / app switch
  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setHandle(stored.handle);
      setBchAddress(stored.bchAddress);
      setTokenAddress(stored.tokenAddress);
      setChallenge({
        id: stored.challengeId,
        text: stored.challengeText,
        expiration: stored.expiration,
      });
      setStep("sign");
      setRestored(true);
    }
  }, []);

  // Countdown while on sign step
  useEffect(() => {
    if (!challenge || step !== "sign") return;
    function tick() {
      if (!challenge) return;
      const left = challenge.expiration - Math.floor(Date.now() / 1000);
      if (left <= 0) {
        setRemaining("0:00");
        setError("This claim request expired. Generate a new one.");
        clearStored();
        return;
      }
      setRemaining(formatRemaining(challenge.expiration));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [challenge, step]);

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
      const ch = {
        text: data.challenge.text as string,
        id: data.challenge.id as string,
        expiration: data.challenge.expiration as number,
      };
      setChallenge(ch);
      saveStored({
        handle: handle.toLowerCase(),
        bchAddress,
        tokenAddress,
        challengeId: ch.id,
        challengeText: ch.text,
        expiration: ch.expiration,
      });
      setStep("sign");
      setRestored(false);
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
      // Do not send tokenAddress on verify — server uses persisted challenge only
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      clearStored();
      setStep("done");
      const h = (data.handle as string) || handle.toLowerCase();
      setTimeout(() => router.push(`/${h}`), 1200);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function resetChallenge() {
    clearStored();
    setChallenge(null);
    setSignature("");
    setError("");
    setStep("form");
    setRestored(false);
  }

  function copyChallenge() {
    if (!challenge) return;
    navigator.clipboard.writeText(challenge.text).catch(() => {});
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold font-mono tracking-tight mb-2">
        CLAIM YOUR BCH IDENTITY
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        No email. No password. Prove control of your BCH address with Sign
        Message. We never ask for seed phrases or private keys.
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
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
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
            <p className="text-xs text-[var(--text-muted)] mt-1">
              If set, it is bound into the signed challenge and cannot be
              changed after signing.
            </p>
          </div>

          <p className="text-xs text-[var(--text-muted)] border border-[var(--border)] p-3">
            Your verified BCH address is your recovery authority. Keep control
            of your wallet. We never ask for your recovery phrase.
          </p>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Processing…" : "CONTINUE TO SIGN MESSAGE"}
          </button>
        </form>
      )}

      {step === "sign" && challenge && (
        <form onSubmit={submitSignature} className="space-y-5">
          {restored && (
            <p className="text-xs text-[var(--accent)] border border-[var(--border)] p-2">
              Claim session restored after refresh or app switch.
            </p>
          )}

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--text-muted)]">
              @{handle.toUpperCase()}
            </span>
            <span
              className={
                remaining === "0:00"
                  ? "text-[var(--danger)]"
                  : "text-[var(--accent)]"
              }
            >
              Expires in {remaining || "…"}
            </span>
          </div>

          <p className="text-sm">
            Sign this <strong>exact</strong> message with the wallet that
            controls the BCH address. Use <strong>Sign Message</strong> — not
            Sign Transaction.
          </p>

          <pre className="card font-mono text-xs whitespace-pre-wrap break-all overflow-x-auto max-h-64">
            {challenge.text}
          </pre>

          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={copyChallenge}
          >
            COPY MESSAGE
          </button>

          <div>
            <label className="label">SIGNATURE (Base64)</label>
            <textarea
              className="input-field min-h-[100px]"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Paste the Base64 message signature from your wallet…"
              required
              spellCheck={false}
            />
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Compatible: Electron Cash desktop (Tools → Sign/Verify Message),
            Bitcoin.com wallet message signing, and other wallets that support
            classic Bitcoin message signatures. Mobile Electron Cash often lacks
            Sign Message — use a wallet that supports it, or a desktop wallet.
          </p>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || remaining === "0:00"}
          >
            {loading ? "Verifying…" : "VERIFY & CLAIM"}
          </button>

          <button
            type="button"
            className="btn-ghost w-full text-xs"
            onClick={resetChallenge}
          >
            {remaining === "0:00"
              ? "GENERATE NEW CHALLENGE"
              : "Cancel and start over"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="text-center space-y-4">
          <p className="text-[var(--accent)] font-mono text-lg">
            HANDLE CLAIMED
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Redirecting to your profile…
          </p>
        </div>
      )}
    </div>
  );
}
