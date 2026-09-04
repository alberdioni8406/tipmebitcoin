/**
 * BCH and CashToken address validation.
 * Prefer bchaddrjs when installed. Falls back to shape checks otherwise.
 */

import { PROJECT } from "@/config/project";

export type AddressKind = "bch" | "token";

export interface ValidatedAddress {
  original: string;
  normalized: string;
  kind: AddressKind;
}

function tryBchAddr() {
  try {
    // Dynamic require so the app still builds if the package is not yet installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("bchaddrjs") as typeof import("bchaddrjs");
  } catch {
    return null;
  }
}

function basicCashAddrShape(addr: string): boolean {
  const cleaned = addr.trim().toLowerCase();
  const body = cleaned.startsWith("bitcoincash:")
    ? cleaned.slice("bitcoincash:".length)
    : cleaned;
  return (
    /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/.test(body) &&
    body.length >= 20 &&
    body.length <= 100
  );
}

export function validateBchAddress(
  raw: string
): { ok: true; address: ValidatedAddress } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "BCH address is required." };
  }

  const bchaddr = tryBchAddr();
  if (bchaddr) {
    try {
      if (!bchaddr.isValidAddress(trimmed)) {
        return {
          ok: false,
          error: "Invalid Bitcoin Cash address (checksum or format).",
        };
      }
      const network = bchaddr.detectAddressNetwork(trimmed);
      if (PROJECT.network === "mainnet" && network !== "mainnet") {
        return {
          ok: false,
          error: "Testnet/regtest addresses are not accepted on mainnet.",
        };
      }
      const normalized = bchaddr.toCashAddress(trimmed);
      return {
        ok: true,
        address: { original: trimmed, normalized, kind: "bch" },
      };
    } catch {
      return { ok: false, error: "Invalid Bitcoin Cash address." };
    }
  }

  // Fallback shape check
  if (!basicCashAddrShape(trimmed)) {
    return {
      ok: false,
      error:
        "Invalid CashAddr format. Expected bitcoincash:q... or bitcoincash:p...",
    };
  }

  let normalized = trimmed.toLowerCase();
  if (!normalized.startsWith("bitcoincash:")) {
    normalized = `bitcoincash:${normalized}`;
  }
  if (
    PROJECT.network === "mainnet" &&
    (normalized.startsWith("bchtest:") || normalized.startsWith("bchreg:"))
  ) {
    return {
      ok: false,
      error: "Testnet/regtest addresses are not accepted on mainnet.",
    };
  }

  return {
    ok: true,
    address: { original: trimmed, normalized, kind: "bch" },
  };
}

export function validateTokenAddress(
  raw: string
): { ok: true; address: ValidatedAddress } | { ok: false; error: string } {
  if (!raw.trim()) {
    return { ok: false, error: "Token address is required when provided." };
  }
  const result = validateBchAddress(raw);
  if (!result.ok) return result;
  return {
    ok: true,
    address: { ...result.address, kind: "token" },
  };
}

export function buildBchPaymentUri(
  address: string,
  amount?: string | number,
  message?: string
): string {
  const params = new URLSearchParams();
  if (amount !== undefined && amount !== "") {
    params.set("amount", String(amount));
  }
  if (message) {
    params.set("message", message.slice(0, 200));
  }
  const query = params.toString();
  return query ? `${address}?${query}` : address;
}
