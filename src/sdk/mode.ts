/**
 * barkd = keys in local daemon (recommended).
 * sdk = keys in browser WASM — separate trust model, not a drop-in replacement.
 */
export type WalletBackendMode = "barkd" | "sdk";

export function getWalletBackendMode(): WalletBackendMode {
  const mode =
    process.env.NEXT_PUBLIC_WALLET_BACKEND ??
    process.env.WALLET_BACKEND ??
    "barkd";
  return mode === "sdk" ? "sdk" : "barkd";
}

export function isSdkMode(): boolean {
  return getWalletBackendMode() === "sdk";
}
