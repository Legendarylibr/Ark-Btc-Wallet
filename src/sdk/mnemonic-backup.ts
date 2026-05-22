"use client";

import { zeroize } from "@/lib/crypto/vault";

/** Mnemonic backup held outside Zustand to avoid devtools / snapshot leakage. */
let pendingBackup: string | null = null;

export function setPendingMnemonicBackup(mnemonic: string): void {
  clearPendingMnemonicBackup();
  pendingBackup = mnemonic;
}

export function getPendingMnemonicBackup(): string | null {
  return pendingBackup;
}

export function clearPendingMnemonicBackup(): void {
  if (pendingBackup) {
    const bytes = new TextEncoder().encode(pendingBackup);
    zeroize(bytes);
    pendingBackup = null;
  }
}
