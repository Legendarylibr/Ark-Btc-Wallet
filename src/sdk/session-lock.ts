"use client";

import { WALLET_LOCK_TIMEOUT_MS } from "@/lib/security/constants";

let lockTimer: ReturnType<typeof setTimeout> | null = null;
let lockHandler: (() => void) | null = null;
let listenersInstalled = false;

export function registerSdkAutoLock(onLock: () => void): void {
  lockHandler = onLock;
  if (typeof document === "undefined" || listenersInstalled) return;
  listenersInstalled = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      lockHandler?.();
    }
  });

  window.addEventListener("pagehide", () => {
    lockHandler?.();
  });
}

export function touchSdkActivity(): void {
  if (!lockHandler) return;
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(() => {
    lockHandler?.();
  }, WALLET_LOCK_TIMEOUT_MS);
}

export function clearSdkAutoLock(): void {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = null;
}
