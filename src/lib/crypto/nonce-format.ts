/** UUID v4 nonces for replay protection (session + pre-session + register). */
export const NONCE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidNonceUuid(nonce: string): boolean {
  return NONCE_UUID_RE.test(nonce);
}
