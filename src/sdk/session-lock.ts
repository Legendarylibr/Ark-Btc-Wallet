"use client";

import {
  clearWalletThreatGuard,
  registerWalletThreatGuard,
  touchWalletActivity,
} from "@/lib/security/browser-threat-guard";

/** @deprecated Prefer global `SecuritySentinel`; kept for tests and explicit SDK wiring. */
export function registerSdkAutoLock(onLock: () => void): void {
  registerWalletThreatGuard({
    onLock,
    manageIdleTimeout: true,
  });
}

export const touchSdkActivity = touchWalletActivity;
export const clearSdkAutoLock = clearWalletThreatGuard;
