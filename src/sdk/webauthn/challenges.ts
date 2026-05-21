"use client";

const challenges = new Map<string, number>();
const TTL_MS = 3 * 60 * 1000;

/** Base64url — must match bufferToBase64url in client/passkey-wallet */
export function challengeBytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function storeSdkChallenge(scope: string, challenge: Uint8Array): void {
  const b64 = challengeBytesToB64Url(challenge);
  challenges.set(scope, Date.now() + TTL_MS);
  sessionStorage.setItem(`sdk-wa:${scope}`, b64);
}

export function consumeSdkChallenge(scope: string, challengeB64: string): boolean {
  const exp = challenges.get(scope);
  const stored = sessionStorage.getItem(`sdk-wa:${scope}`);
  challenges.delete(scope);
  sessionStorage.removeItem(`sdk-wa:${scope}`);
  if (!exp || Date.now() > exp || stored !== challengeB64) return false;
  return true;
}
