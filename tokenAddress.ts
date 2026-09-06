/**
 * Convert standard BCH CashAddr (q… / p…) → token-aware CashAddr (z… / r…).
 *
 * CashTokens CHIP address types:
 *   0 = P2PKH              → q…
 *   1 = P2SH               → p…
 *   2 = Token-Aware P2PKH  → z…
 *   3 = Token-Aware P2SH   → r…
 *
 * Same 20-byte hash; only type bits + checksum change.
 * Spec: https://cashtokens.org/docs/spec/chip
 *
 * Uses cashaddrjs for decode; custom encode for token types (cashaddrjs
 * only ships P2PKH/P2SH).
 */

function tryCashAddr() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("cashaddrjs") as typeof import("cashaddrjs");
  } catch {
    return null;
  }
}

function tryBigInt() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("big-integer") as typeof import("big-integer");
  } catch {
    return null;
  }
}

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function convertBits(
  data: Uint8Array | number[],
  fromBits: number,
  toBits: number,
  pad: boolean
): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) {
    ret.push((acc << (toBits - bits)) & maxv);
  }
  return ret;
}

/**
 * Encode hash with explicit CashAddr type bits (0–3).
 * typeBits: 0=P2PKH, 1=P2SH, 2=token-P2PKH, 3=token-P2SH
 */
function encodeWithTypeBits(
  prefix: string,
  typeBits: number,
  hash: Uint8Array
): string | null {
  const bigInt = tryBigInt();
  if (!bigInt) return null;

  // version byte = (typeBits << 3) | sizeBits ; sizeBits 0 = 20 bytes
  if (hash.length !== 20) return null;
  const versionByte = (typeBits << 3) | 0;

  const payload8 = new Uint8Array(1 + hash.length);
  payload8[0] = versionByte;
  payload8.set(hash, 1);
  const payload5 = convertBits(payload8, 8, 5, true);

  // prefix as uint5 + separator 0
  const prefixData: number[] = [];
  for (let i = 0; i < prefix.length; i++) {
    prefixData.push(prefix.charCodeAt(i) & 31);
  }
  prefixData.push(0);

  // polymod (same generators as cashaddrjs / cashaddr.md)
  const GENERATOR = [
    0x98f2bc8e61, 0x79b76d99e2, 0xf33e5fb3c4, 0xae2eabe2a8, 0x1e4f43e470,
  ];
  const checksumData = prefixData.concat(payload5).concat([0, 0, 0, 0, 0, 0, 0, 0]);
  let checksum = bigInt(1);
  for (let i = 0; i < checksumData.length; i++) {
    const value = checksumData[i];
    const topBits = checksum.shiftRight(35);
    checksum = checksum.and(0x07ffffffff).shiftLeft(5).xor(value);
    for (let j = 0; j < GENERATOR.length; j++) {
      if (topBits.shiftRight(j).and(1).equals(1)) {
        checksum = checksum.xor(GENERATOR[j]);
      }
    }
  }
  checksum = checksum.xor(1);

  const checksumArr: number[] = [];
  for (let i = 0; i < 8; i++) {
    checksumArr.push(checksum.shiftRight(5 * (7 - i)).and(31).toJSNumber());
  }

  let out = prefix + ":";
  for (const d of payload5.concat(checksumArr)) {
    out += CHARSET[d];
  }
  return out;
}

function normalizeInput(raw: string): string {
  let addr = raw.trim();
  if (!addr) return addr;
  const lower = addr.toLowerCase();
  if (
    !lower.startsWith("bitcoincash:") &&
    !lower.startsWith("bchtest:") &&
    !lower.startsWith("bchreg:")
  ) {
    if (/^[qpzr]/i.test(lower)) {
      addr = `bitcoincash:${lower}`;
    }
  }
  return addr;
}

/**
 * Convert q…/p… BCH address to z…/r… token-aware address.
 * If already token-aware, returns normalized form.
 */
export function toTokenAwareAddress(raw: string): string | null {
  const cashaddr = tryCashAddr();
  if (!cashaddr) return null;

  const addr = normalizeInput(raw);
  if (!addr) return null;

  try {
    // cashaddrjs only decodes q/p types successfully
    const decoded = cashaddr.decode(addr);
    const typeBits =
      decoded.type === "P2SH" || decoded.type === "p2sh" ? 3 : 2;
    return encodeWithTypeBits(decoded.prefix, typeBits, decoded.hash);
  } catch {
    // Maybe already token-aware (z/r) — cashaddrjs may reject.
    // Fall back: if starts with z or r, return as-is when shape is ok.
    const body = addr.includes(":")
      ? addr.split(":")[1]
      : addr.replace(/^bitcoincash:/i, "");
    if (body && (body.startsWith("z") || body.startsWith("r"))) {
      return addr.toLowerCase().startsWith("bitcoincash:") ||
        addr.toLowerCase().startsWith("bchtest:")
        ? addr.toLowerCase()
        : `bitcoincash:${body.toLowerCase()}`;
    }
    return null;
  }
}

export function isTokenAwareAddress(raw: string): boolean {
  const addr = normalizeInput(raw).toLowerCase();
  const body = addr.includes(":") ? addr.split(":")[1] : addr;
  return !!body && (body.startsWith("z") || body.startsWith("r"));
}
