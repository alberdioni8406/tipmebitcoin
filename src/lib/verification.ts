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
  // Classic Bitcoin message signatures are typically ~65 bytes → ~88 base64 chars
  if (compact.length < 60 || compact.length > 200) {
    return {
      ok: false,
      error:
        "Invalid message signature length. Make sure your wallet used Sign Message, not Sign Transaction.",
    };
  }

  return { ok: true };
}

/**
 * Verify a classic Bitcoin Signed Message against a BCH CashAddr.
 * Converts CashAddr → legacy before verification when possible.
 */
export async function verifyMessageSignature(
  address: string,
  message: string,
  signature: string
): Promise<{ valid: boolean; error?: string }> {
  if (!address || !message || !signature) {
    return { valid: false, error: "Missing address, message or signature." };
  }

  const shape = classifySignatureInput(signature);
  if (!shape.ok) {
    return { valid: false, error: shape.error };
  }

  // Development-only bypass — impossible unless NODE_ENV is development
  if (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_SIGNATURE_BYPASS === "true" &&
    signature.trim() === "DEV_BYPASS_SIGNATURE"
  ) {
    console.warn("[DEV] Signature bypass used — disable before production");
    return { valid: true };
  }

  const bitcoinMessage = tryBitcoinJsMessage();
  if (!bitcoinMessage) {
    return {
      valid: false,
      error: "Signature verification is temporarily unavailable.",
    };
  }

  const cleanedSig = signature.trim().replace(/\s+/g, "");
  const legacy = cashAddrToLegacy(address);
  const candidates: string[] = [];
  if (legacy) candidates.push(legacy);
  candidates.push(address);
  const withoutPrefix = address.replace(/^bitcoincash:/i, "");
  if (withoutPrefix !== address) candidates.push(withoutPrefix);

  const errors: string[] = [];

  for (const addr of candidates) {
    try {
      const valid = bitcoinMessage.verify(
        message,
        addr,
        cleanedSig,
        undefined,
        true
      );
      if (valid) return { valid: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      // Map library length errors to clear UX copy
      if (/length|invalid/i.test(msg)) {
        return {
          valid: false,
          error:
            "Invalid message signature. Make sure your wallet used Sign Message, not Sign Transaction.",
        };
      }
    }
  }

  return {
    valid: false,
    error:
      "Invalid message signature. This signature does not match the BCH address and challenge message.",
  };
}
