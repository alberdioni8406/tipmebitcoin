/**
 * Central project configuration for TipMeBitcoin.
 * All environment-specific and project-level constants live here.
 * Never hardcode donation address or domain elsewhere.
 */

export const PROJECT = {
  name: "TipMeBitcoin",
  domain: "tipmebitcoin.cash",
  tagline: "YOUR HANDLE. YOUR ADDRESS. YOUR MONEY.",
  description:
    "Non-custodial Bitcoin Cash tipping identity. Create a memorable handle that resolves to your BCH and CashToken addresses. No email. No password. No custody.",
  // Project donation address (set by owner). Change only here.
  PROJECT_DONATION_BCH_ADDRESS: process.env.NEXT_PUBLIC_PROJECT_DONATION_BCH_ADDRESS || "bitcoincash:qrtv37u522gz8a5lezfqk5vukly93cu7gc8tn09040",
  network: "mainnet" as const, // or "testnet"
  supportedAddressPrefixes: ["bitcoincash:"] as const,
  handle: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/,
  },
  challenge: {
    ttlSeconds: 15 * 60, // 15 minutes
    prefix: "TIPMEBITCOIN.CASH",
  },
  features: {
    messageSigning: true,
    transactionProof: false, // pending safe non-custodial implementation
    cashAccounts: false, // future
    onChainIdentity: false, // future
  },
} as const;

export type ProjectConfig = typeof PROJECT;
