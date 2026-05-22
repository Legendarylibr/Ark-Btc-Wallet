/** Client-safe challenge message builders (no server disk I/O). */

export function challengeMessage(challenge: string): Uint8Array {
  return new TextEncoder().encode(`wallet-register\n${challenge}`);
}

export function webauthnSetupMessage(challenge: string): Uint8Array {
  return new TextEncoder().encode(`wallet-webauthn-setup\n${challenge}`);
}
