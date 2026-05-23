"use client";

import { useEffect } from "react";
import { registerWalletThreatGuard } from "@/lib/security/browser-threat-guard";
import { installTrustedTypesPolicy } from "@/lib/security/trusted-types";
import { isSdkMode } from "@/sdk/mode";
import { useCryptoStore } from "@/store/crypto";
import { useSdkWalletStore } from "@/store/sdk-wallet";
import { clearSdkAutoLock } from "@/sdk/session-lock";

/**
 * Global XSS / malware mitigations: Trusted Types, iframe rejection,
 * lock on tab blur/hide, and user-activity refresh for auto-lock timers.
 */
export function SecuritySentinel() {
  useEffect(() => {
    installTrustedTypesPolicy();

    if (isSdkMode()) {
      registerWalletThreatGuard({
        onLock: () => useSdkWalletStore.getState().lock(),
        manageIdleTimeout: true,
      });
      return () => clearSdkAutoLock();
    }

    registerWalletThreatGuard({
      onLock: () => void useCryptoStore.getState().lock(),
      onActivity: () => {
        if (useCryptoStore.getState().identity) {
          useCryptoStore.getState().touchActivity();
        }
      },
    });
  }, []);

  return null;
}
