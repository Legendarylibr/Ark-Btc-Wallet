"use client";

import {
  loadSdkMnemonicVault,
  loadSdkPasskeyWallet,
} from "@/lib/vault-storage";

/** Stable id for legacy hardware pending-ops (passphrase vault or passkey record) */
export async function getSdkWalletId(): Promise<string | null> {
  const passkey = await loadSdkPasskeyWallet();
  if (passkey) return passkey.walletId;
  const vault = await loadSdkMnemonicVault();
  return vault?.publicKey ?? null;
}
