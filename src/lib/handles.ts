import { PROJECT } from "@/config/project";
import { isReservedHandle } from "@/config/reserved-handles";

/**
 * Handle normalization and validation.
 * Rules: 3–30 chars, lowercase letters, numbers, hyphens.
 * No leading/trailing hyphen. No spaces or special chars.
 * Prevent Unicode confusables in v1 by restricting to ASCII.
 */

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidHandleFormat(handle: string): boolean {
  if (handle.length < PROJECT.handle.minLength || handle.length > PROJECT.handle.maxLength) {
    return false;
  }
  // ASCII only, letters numbers hyphens, no leading/trailing hyphen
  return PROJECT.handle.pattern.test(handle);
}

export function validateHandle(raw: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const normalized = normalizeHandle(raw);

  if (!normalized) {
    return { ok: false, error: "Handle is required." };
  }

  if (!isValidHandleFormat(normalized)) {
    return {
      ok: false,
      error: `Handle must be ${PROJECT.handle.minLength}–${PROJECT.handle.maxLength} characters, lowercase letters, numbers, and hyphens only. No leading or trailing hyphen.`,
    };
  }

  if (isReservedHandle(normalized)) {
    return { ok: false, error: "This handle is reserved." };
  }

  // Basic confusable protection: reject any non-ASCII
  if (!/^[\x00-\x7F]*$/.test(normalized)) {
    return { ok: false, error: "Only ASCII characters are allowed." };
  }

  return { ok: true, normalized };
}

export function formatHandleDisplay(handle: string): string {
  return `@${handle.toUpperCase()}`;
}
