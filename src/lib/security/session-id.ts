import { NONCE_UUID_RE } from "@/lib/crypto/nonce-format";

/** Session cookies use crypto.randomUUID() — reject malformed IDs early */
export function isValidSessionId(id: string): boolean {
  return NONCE_UUID_RE.test(id);
}
