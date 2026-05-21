/** Identifies legitimate Ark Wallet browser traffic to the API */
export const ARK_CLIENT_HEADER = "x-ark-client";
export const ARK_CLIENT_VALUE = "ark-wallet/1";

export function arkClientHeaders(): Record<string, string> {
  return { [ARK_CLIENT_HEADER]: ARK_CLIENT_VALUE };
}
