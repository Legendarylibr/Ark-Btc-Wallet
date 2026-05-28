/** Identifies Ark Wallet browser traffic (not a secret — loopback + signing + WebAuthn enforce access). */
export const ARK_CLIENT_HEADER = "x-ark-client";
export const ARK_CLIENT_VALUE = "ark-wallet/1";

export function arkClientHeaders(): Record<string, string> {
  return { [ARK_CLIENT_HEADER]: ARK_CLIENT_VALUE };
}
