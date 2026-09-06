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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("bchaddrjs") as typeof import("bchaddrjs");
  } catch {
    return null;
  }
}

/** Ensure bitcoincash: prefix and lowercase (no validation). */
export function normalizeCashAddrInput(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (!s) return s;
  if (
    !s.startsWith("bitcoincash:") &&
    !s.startsWith("bchtest:") &&
    !s.startsWith("bchreg:")
  ) {
    if (s.startsWith("q") || s.startsWith("p")) {
      s = `bitcoincash:${s}`;
    }
  }
  return s;
}

function basicCashAddrShape(addr: string): boolean {
  const cleaned = addr.trim().toLowerCase();
  const body = cleaned.startsWith("bitcoincash:")
    ? cleaned.slice("bitcoincash:".length)
    : cleaned.startsWith("bchtest:")
      ? cleaned.slice("bchtest:".length)
      : cleaned.startsWith("bchreg:")
        ? cleaned.slice("bchreg:".length)
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
  const trimmed = normalizeCashAddrInput(raw);
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
          error: "This address belongs to the wrong Bitcoin Cash network.",
        };
      }
      const normalized = bchaddr.toCashAddress(trimmed);
      return {
        ok: true,
        address: { original: raw.trim(), normalized, kind: "bch" },
      };
    } catch {
      return { ok: false, error: "Invalid Bitcoin Cash address." };
    }
  }

  if (!basicCashAddrShape(trimmed)) {
    return {
      ok: false,
      error:
        "Invalid CashAddr format. Expected bitcoincash:q... or bitcoincash:p...",
    };
  }

  if (
    PROJECT.network === "mainnet" &&
    (trimmed.startsWith("bchtest:") || trimmed.startsWith("bchreg:"))
  ) {
    return {
      ok: false,
      error: "This address belongs to the wrong Bitcoin Cash network.",
    };
  }

  return {
    ok: true,
    address: { original: raw.trim(), normalized: trimmed, kind: "bch" },
  };
}

/**
 * Optional token address. Empty / whitespace = not provided (ok to skip).
 * Same format rules as BCH CashAddr (token-capable addresses use the same encoding).
 */
export function validateTokenAddress(
  raw: string
): { ok: true; address: ValidatedAddress } | { ok: false; error: string } {
  if (!raw || !String(raw).trim()) {
    return { ok: false, error: "Token address is required when provided." };
  }
  const result = validateBchAddress(raw);
  if (!result.ok) {
    return {
      ok: false,
      error: "The CashToken address is invalid.",
    };
  }
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
