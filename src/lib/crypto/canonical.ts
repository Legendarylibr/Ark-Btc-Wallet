import { sha256 } from "@noble/hashes/sha2.js";
import { base64ToBytes, bytesToBase64 } from "./ed25519";

export const CANONICAL_VERSION = "v2";

export function hashBody(body: string): string {
  return bytesToBase64(sha256(new TextEncoder().encode(body)));
}

/** Validates a `hashBody()` digest (32-byte SHA-256, standard base64). */
export function isValidBodyHash(value: string): boolean {
  if (typeof value !== "string" || value.length < 43 || value.length > 44) {
    return false;
  }
  try {
    return base64ToBytes(value).length === 32;
  } catch {
    return false;
  }
}

/** Path + sorted query string (e.g. /api/wallet/address?rotate=1) */
export function signingPath(pathname: string, search: string): string {
  if (!search || search === "?") return pathname;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(sorted).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Deterministic string signed for every API request */
export function canonicalRequest(parts: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}): Uint8Array {
  const payload = [
    CANONICAL_VERSION,
    parts.method.toUpperCase(),
    parts.path,
    parts.timestamp,
    parts.nonce,
    parts.bodyHash,
  ].join("\n");
  return new TextEncoder().encode(payload);
}

export const CRYPTO_HEADERS = {
  timestamp: "x-wallet-timestamp",
  nonce: "x-wallet-nonce",
  signature: "x-wallet-signature",
  bodyHash: "x-wallet-body-hash",
  publicKey: "x-wallet-public-key",
} as const;
