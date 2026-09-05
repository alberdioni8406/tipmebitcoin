/**
 * Ownership verification — message signature (primary).
 *
 * Most BCH wallets (Electron Cash, Bitcoin.com, etc.) use the classic
 * "Bitcoin Signed Message:\n" format. We verify against that.
 *
 * Preferred library: bitcoinjs-message (widely compatible).
 * Fallback: reject with clear error until installed.
 */

import { PROJECT } from "@/config/project";

export type ProofType = "message_signature" | "transaction";

export interface Challenge {
  id: string;
  action: "CLAIM" | "UPDATE" | "RECOVER";
  handle: string;
  address: string;
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

export function createChallenge(
  action: Challenge["action"],
  handle: string,
  address: string
): Challenge {
  const nonce = randomNonce(24);
  const timestamp = Math.floor(Date.now() / 1000);
  const expiration = timestamp + PROJECT.challenge.ttlSeconds;

  const text = [
    PROJECT.challenge.prefix,
    `ACTION: ${action}`,
    `HANDLE: ${handle}`,
    `ADDRESS: ${address}`,
    `NONCE: ${nonce}`,
    `TIMESTAMP: ${timestamp}`,
    `EXPIRATION: ${expiration}`,
  ].join("\n");

  return {
    id: nonce,
    action,
    handle,
    address,
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

/**
 * Verify a signed message against a CashAddr / legacy address.
 * Uses the standard Bitcoin message prefix that the majority of BCH wallets support.
 */
export async function verifyMessageSignature(
  address: string,
  message: string,
  signature: string
): Promise<{ valid: boolean; error?: string }> {
  if (!address || !message || !signature) {
    return { valid: false, error: "Missing address, message or signature." };
  }

  // Development-only bypass
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
      error:
        "Signature verification library missing. Run: npm install bitcoinjs-message",
    };
  }

  try {
    // Strip bitcoincash: prefix for legacy-style verification if needed
    // Many libraries accept CashAddr directly or the payload.
    const cleanAddress = address.replace(/^bitcoincash:/i, "");

    // Standard Bitcoin message format (compatible with Electron Cash etc.)
    const valid = bitcoinMessage.verify(
      message,
      cleanAddress.startsWith("q") || cleanAddress.startsWith("p")
        ? address // try full CashAddr first
        : cleanAddress,
      signature,
      undefined, // messagePrefix → default "Bitcoin Signed Message:\n"
      true // checkSegwitAlways / loose mode for broader compatibility
    );

    // If CashAddr form failed, try without prefix (some libs expect legacy-looking)
    if (!valid) {
      try {
        const valid2 = bitcoinMessage.verify(message, cleanAddress, signature);
        if (valid2) return { valid: true };
      } catch {
        /* ignore */
      }
    }

    return valid
      ? { valid: true }
      : { valid: false, error: "Invalid signature for this address and message." };
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Signature verification failed.",
    };
  }
}

export interface TransactionProofProvider {
  name: string;
  verify(proof: {
    txid: string;
    address: string;
    challenge: string;
  }): Promise<{ valid: boolean; error?: string }>;
}

export const pendingTransactionProofProvider: TransactionProofProvider = {
  name: "pending",
  async verify() {
    return {
      valid: false,
      error:
        "Transaction-based ownership proof is not implemented in v1. Use message signature.",
    };
  },
};
