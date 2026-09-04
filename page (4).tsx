import Link from "next/link";
import { PROJECT } from "@/config/project";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20">
      <section className="text-center space-y-6">
        <p className="font-mono text-xs tracking-[0.3em] text-[var(--accent)] uppercase">
          Bitcoin Cash Infrastructure
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight crt-subtle">
          TIP ME BITCOIN CASH
        </h1>
        <p className="text-xl sm:text-2xl font-mono text-[var(--text-muted)]">
          YOUR HANDLE.
          <br />
          YOUR ADDRESS.
          <br />
          YOUR MONEY.
        </p>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          Create a public BCH tipping identity.
          <br />
          <span className="font-mono text-[var(--text)]">
            tipmebitcoin.cash/yourname
          </span>
        </p>
        <div className="pt-4">
          <Link href="/claim" className="btn-primary text-base">
            CLAIM YOUR HANDLE
          </Link>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="card">
          <p className="font-mono text-xs text-[var(--accent)] mb-2">NO EMAIL</p>
          <p className="text-sm text-[var(--text-muted)]">No account. No inbox.</p>
        </div>
        <div className="card">
          <p className="font-mono text-xs text-[var(--accent)] mb-2">NO PASSWORD</p>
          <p className="text-sm text-[var(--text-muted)]">Your wallet is the key.</p>
        </div>
        <div className="card">
          <p className="font-mono text-xs text-[var(--accent)] mb-2">NO CUSTODY</p>
          <p className="text-sm text-[var(--text-muted)]">We never hold your BCH.</p>
        </div>
      </section>

      <section className="mt-16 card">
        <p className="font-mono text-xs text-[var(--text-muted)] mb-4">DEMO</p>
        <p className="text-sm mb-2">
          Example profile:{" "}
          <Link href="/demo" className="text-[var(--accent)] font-mono hover:underline">
            tipmebitcoin.cash/demo
          </Link>
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          (Claim a real handle to create your own permanent identity.)
        </p>
      </section>

      <section className="mt-12 text-center text-sm text-[var(--text-muted)]">
        <p>
          Cryptographic ownership · Hybrid architecture · Ready for BCH-native identity
        </p>
      </section>
    </div>
  );
}
