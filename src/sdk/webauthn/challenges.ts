"use client";

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToBase64url } from "./prf";

const challenges = new Map<string, number>();
const TTL_MS = 3 * 60 * 1000;
const CHALLENGE_KEY = (scope: string) => `sdk-wa:${scope}`;
const EXPIRY_KEY = (scope: string) => `sdk-wa-exp:${scope}`;

/** Deterministic WebAuthn challenge bytes for passkey sensitive ops. */
export function sdkPasskeyOpChallenge(
  walletId: string,
  opId: string,
  bodyHash: string,
): Uint8Array {
  const payload = ["sdk-passkey-op", "v1", walletId, opId, bodyHash].join("\n");
  return sha256(new TextEncoder().encode(payload));
}

function readExpiry(scope: string): number | undefined {
  const mem = challenges.get(scope);
  if (mem != null) return mem;
  if (typeof sessionStorage === "undefined") return undefined;
  const raw = sessionStorage.getItem(EXPIRY_KEY(scope));
  if (!raw) return undefined;
  const exp = Number(raw);
  return Number.isFinite(exp) ? exp : undefined;
}

export function storeSdkChallenge(scope: string, challenge: Uint8Array): void {
  const b64 = bytesToBase64url(challenge);
  const exp = Date.now() + TTL_MS;
  challenges.set(scope, exp);
  sessionStorage.setItem(CHALLENGE_KEY(scope), b64);
  sessionStorage.setItem(EXPIRY_KEY(scope), String(exp));
}

export function consumeSdkChallenge(scope: string, challengeB64: string): boolean {
  const exp = readExpiry(scope);
  const stored =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(CHALLENGE_KEY(scope))
      : null;
  challenges.delete(scope);
  sessionStorage.removeItem(CHALLENGE_KEY(scope));
  sessionStorage.removeItem(EXPIRY_KEY(scope));
  if (!exp || Date.now() > exp || stored !== challengeB64) return false;
  return true;
}
