/**
 * Central project configuration for TipMeBitcoin V1.
 * Single source of truth for app URL, donation address, and feature flags.
 *
 * V1 production URL: https://tipmebitcoin.vercel.app
 * Future custom domain (e.g. tipmebitcoin.cash) is an env change only.
 */

function resolveAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  // Never use VERCEL_URL for public/canonical URLs (it is deployment-specific).
  if (process.env.NODE_ENV === "production") {
    return "https://tipmebitcoin.vercel.app";
  }
  return "http://localhost:3000";
}
export const PROJECT = {
  name: "TipMeBitcoin",
  /** Canonical V1 application origin (no trailing slash). */
  appUrl: resolveAppUrl(),
  tagline: "YOUR HANDLE. YOUR ADDRESS. YOUR MONEY.",
  description:
    "Non-custodial Bitcoin Cash tipping identity. Create a memorable handle that resolves to your BCH and CashToken addresses. No email. No password. No custody.",
  // Project donation address — never change casually; single source of truth.
  PROJECT_DONATION_BCH_ADDRESS:
    process.env.NEXT_PUBLIC_PROJECT_DONATION_BCH_ADDRESS ||
    "bitcoincash:qrtv37u522gz8a5lezfqk5vukly93cu7gc8tn09040",
  network: "mainnet" as const,
  supportedAddressPrefixes: ["bitcoincash:"] as const,
  handle: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/,
  },
  challenge: {
    ttlSeconds: 15 * 60, // 15 minutes
    /** Challenge message brand prefix (not a live domain dependency). */
    prefix: "TIPMEBITCOIN",
  },
  features: {
    messageSigning: true,
    transactionProof: false,
    cashAccounts: false,
    onChainIdentity: false,
  },
} as const;

export type ProjectConfig = typeof PROJECT;
