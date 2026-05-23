"use client";

import { assertSecureBrowserContext } from "@/lib/security/execution-context";
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

/** Only the SDK store module should call into the active WASM handle. */
export function requireActiveSdkWallet(): SdkWalletHandle {
  assertSecureBrowserContext();
  if (!active) throw new Error("Wallet locked");
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
