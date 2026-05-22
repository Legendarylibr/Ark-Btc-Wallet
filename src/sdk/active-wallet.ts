"use client";

import type { SdkWalletHandle } from "@/sdk/bark/types";

/** WASM handle kept outside Zustand to reduce devtools / snapshot exposure. */
let active: SdkWalletHandle | null = null;

export function setActiveSdkWallet(wallet: SdkWalletHandle | null): void {
  if (active && active !== wallet) {
    try {
      active.close();
    } catch {
      /* ignore */
    }
  }
  active = wallet;
}

export function getActiveSdkWallet(): SdkWalletHandle | null {
  return active;
}

export function closeActiveSdkWallet(): void {
  if (active) {
    try {
      active.close();
    } catch {
      /* ignore */
    }
    active = null;
  }
}
