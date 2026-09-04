import { PROJECT } from "@/config/project";
import { DonationQR } from "./DonationQR";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  const donation = PROJECT.PROJECT_DONATION_BCH_ADDRESS;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
      <section>
        <h1 className="text-2xl font-bold font-mono mb-4">ABOUT TIPMEBITCOIN</h1>
        <p className="text-[var(--text-muted)] leading-relaxed">
          TipMeBitcoin is a non-custodial Bitcoin Cash tipping identity layer.
          Anyone can claim a memorable handle that resolves to their own BCH
          and CashToken receiving addresses. No email, no password, no custody.
        </p>
      </section>

      <section>
        <h2 className="font-mono text-sm tracking-widest text-[var(--accent)] mb-3">
          WHY IT EXISTS
        </h2>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          Long addresses are hard to share. Memorable URLs are easy. Combining
          the simplicity of a tipping URL with cryptographic ownership proof
          creates useful infrastructure today while leaving the door open for a
          fully BCH-native identity protocol tomorrow.
        </p>
      </section>

      <section>
        <h2 className="font-mono text-sm tracking-widest text-[var(--accent)] mb-3">
          SECURITY MODEL
        </h2>
        <ul className="text-sm text-[var(--text-muted)] space-y-2 list-disc pl-5">
          <li>We never take custody of funds or private keys.</li>
          <li>
            Ownership is proven by signing a unique, expiring challenge with
            the claimed address.
          </li>
          <li>
            Your verified BCH address is the recovery authority. Keep control of
            your wallet.
          </li>
          <li>
            The “verified” badge means only cryptographic control of the
            address — nothing more.
          </li>
        </ul>
      </section>

      <section id="donate">
        <h2 className="font-mono text-sm tracking-widest text-[var(--accent)] mb-3">
          SUPPORT TIPMEBITCOIN
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          This is a project-level donation address, completely separate from
          user receiving addresses.
        </p>
        <div className="card">
          <p className="label">DONATE BCH</p>
          <code className="block text-xs break-all font-mono mb-4">
            {donation}
          </code>
          <DonationQR address={donation} />
        </div>
      </section>

      <section>
        <h2 className="font-mono text-sm tracking-widest text-[var(--accent)] mb-3">
          OPEN SOURCE
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Source is intended for GitHub. Architecture is deliberately modular so
          an on-chain identity protocol can later replace or augment the current
          registry without breaking the simple tipping UX.
        </p>
      </section>
    </div>
  );
}
