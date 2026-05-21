import { bech32m } from "@scure/base";

const ARK_HRP = "ark";

/** Full bech32m checksum validation for ark1… addresses */
export function isValidArkAddress(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  if (!a.startsWith("ark1")) return false;
  try {
    const { prefix, words } = bech32m.decode(a, false);
    if (prefix !== ARK_HRP) return false;
    if (words.length < 14 || words.length > 65) return false;
    return true;
  } catch {
    return false;
  }
}
