export const metadata = { title: "Protocol" };

export default function ProtocolPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-2xl font-bold font-mono">PROTOCOL DIRECTION</h1>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
        Version 1 is a practical, hybrid service: a public handle registry with
        cryptographic ownership proofs. The long-term vision is a BCH-native
        identity and tipping protocol.
      </p>

      <div className="font-mono text-sm space-y-1 text-[var(--text-muted)]">
        <p>TIPB-STYLE SIMPLE URL</p>
        <p>↓</p>
        <p className="text-[var(--accent)]">TIPMEBITCOIN HANDLE</p>
        <p>↓</p>
        <p>CRYPTOGRAPHIC OWNERSHIP</p>
        <p>↓</p>
        <p>BCH-NATIVE IDENTITY</p>
        <p>↓</p>
        <p>OPEN TIPPING INFRASTRUCTURE</p>
      </div>

      <section>
        <h2 className="font-mono text-xs tracking-widest text-[var(--accent)] mb-2">
          SEPARATION OF CONCERNS
        </h2>
        <ol className="text-sm text-[var(--text-muted)] list-decimal pl-5 space-y-1">
          <li>Handle resolution</li>
          <li>Ownership verification</li>
          <li>Profile metadata</li>
          <li>Payment addresses</li>
          <li>Blockchain identity proofs</li>
        </ol>
      </section>

      <p className="text-sm text-[var(--text-muted)]">
        Future layers (Cash Accounts resolution, on-chain claims, CashToken
        identity, embeddable widgets) can be added without sacrificing the
        simplicity of the first version.
      </p>
    </div>
  );
}
