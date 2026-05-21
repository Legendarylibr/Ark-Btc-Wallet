"use client";

import { decryptSecret, encryptSecret } from "@/lib/crypto/vault";
import {
  loadSdkMnemonicBackupVault,
  loadSdkMnemonicVault,
  saveSdkMnemonicVault,
  sdkMnemonicVaultExists,
  sdkPasskeyWalletExists,
} from "@/lib/vault-storage";
import { zeroize } from "@/lib/crypto/vault";

export async function hasSdkMnemonicVault(): Promise<boolean> {
  return sdkMnemonicVaultExists();
}

export async function hasSdkWalletVault(): Promise<boolean> {
  return sdkPasskeyWalletExists() || sdkMnemonicVaultExists();
}

export async function loadSdkMnemonicBackup(
  passphrase: string,
): Promise<string> {
  const vault = await loadSdkMnemonicBackupVault();
  if (!vault) throw new Error("No recovery passphrase vault");

  const bytes = await decryptSecret(passphrase, vault);
  try {
    const mnemonic = new TextDecoder().decode(bytes);
    if (!mnemonic.includes(" ")) {
      throw new Error("Invalid recovery passphrase");
    }
    return mnemonic;
  } finally {
    zeroize(bytes);
  }
}

export async function saveSdkMnemonic(
  passphrase: string,
  mnemonic: string,
): Promise<void> {
  const bytes = new TextEncoder().encode(mnemonic);
  try {
    const vault = await encryptSecret(passphrase, bytes);
    await saveSdkMnemonicVault(vault);
  } finally {
    zeroize(bytes);
  }
}

export async function loadSdkMnemonic(passphrase: string): Promise<string> {
  const vault = await loadSdkMnemonicVault();
  if (!vault) throw new Error("No wallet — create one first");

  const bytes = await decryptSecret(passphrase, vault);
  try {
    const mnemonic = new TextDecoder().decode(bytes);
    if (!mnemonic.includes(" ")) {
      throw new Error("Invalid passphrase");
    }
    return mnemonic;
  } finally {
    zeroize(bytes);
  }
}
