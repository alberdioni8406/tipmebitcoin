/**
 * Ownership verification — classic Bitcoin message signatures (BCH-compatible).
 *
 * Challenge text cryptographically binds handle, BCH address, and optional
 * CashToken address. Verification must use the persisted challenge text only.
 */

import { PROJECT } from "@/config/project";

export type ProofType = "message_signature" | "transaction";

export interface Challenge {
  id: string;
  action: "CLAIM" | "UPDATE" | "RECOVER";
  handle: string;
  address: string;
  /** Normalized token address or null when absent (bound as TOKEN_ADDRESS: NONE). */
  tokenAddress: string | null;
  nonce: string;
  timestamp: number;
  expiration: number;
  text: string;
}

function randomNonce(len = 24): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let out = "";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * Build a claim challenge.
 * tokenAddress must already be normalized or null.
 * Absence is always represented as TOKEN_ADDRESS: NONE (never empty/undefined).
 */
export function createChallenge(
  action: Challenge["action"],
  handle: string,
  address: string,
  tokenAddress: string | null = null
): Challenge {
  const nonce = randomNonce(24);
  const timestamp = Math.floor(Date.now() / 1000);
  const expiration = timestamp + PROJECT.challenge.ttlSeconds;
  const tokenLine = tokenAddress ? tokenAddress : "NONE";

  const text = [
    PROJECT.challenge.prefix,
    `ACTION: ${action}`,
    `HANDLE: ${handle}`,
    `ADDRESS: ${address}`,
    `TOKEN_ADDRESS: ${tokenLine}`,
    `NONCE: ${nonce}`,
    `TIMESTAMP: ${timestamp}`,
    `EXPIRATION: ${expiration}`,
  ].join("\n");

  return {
    id: nonce,
    action,
    handle,
    address,
    tokenAddress,
    nonce,
    timestamp,
    expiration,
    text,
  };
}

export function isChallengeExpired(challenge: Challenge): boolean {
  return Math.floor(Date.now() / 1000) > challenge.expiration;
}

function tryBitcoinJsMessage() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("bitcoinjs-message") as typeof import("bitcoinjs-message");
  } catch {
    return null;
  }
}

function tryBchAddr() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("bchaddrjs") as typeof import("bchaddrjs");
  } catch {
    return null;
  }
}

/** Convert CashAddr to legacy base58check for bitcoinjs-message. */
export function cashAddrToLegacy(address: string): string | null {
  const bchaddr = tryBchAddr();
  if (!bchaddr) return null;
  try {
    if (!bchaddr.isValidAddress(address)) return null;
    return bchaddr.toLegacyAddress(address);
  } catch {
    return null;
  }
}

/**
 * Detect common non-signature pastes (tx hex, PSBT, etc.).
 */
export function classifySignatureInput(raw: string): {
  ok: boolean;
  error?: string;
} {
  const s = raw.trim();
  if (!s) {
    return { ok: false, error: "Signature is required." };
  }

  // Pure hex of significant length → almost certainly a transaction, not a message sig
  if (/^[0-9a-fA-F]+$/.test(s) && s.length >= 100) {
    return {
      ok: false,
      error:
        "Invalid message signature. This looks like transaction hex. Use Sign Message, not Sign Transaction.",
    };
  }

  // PSBT marker
  if (s.startsWith("cHNidP") || s.toLowerCase().startsWith("psbt")) {
    return {
      ok: false,
      error:
        "Invalid message signature. PSBT/transaction data was pasted. Use Sign Message instead.",
    };
  }

  // Base64-ish: allow standard message signature alphabet
  if (!/^[A-Za-z0-9+/=\s]+$/.test(s)) {
    return {
      ok: false,
      error:
        "The signature format is invalid. TipMeBitcoin expects a Base64 message signature, not a transaction.",
    };
  }

  const compact = s.replace(/\s+/g, "");
 
... 
