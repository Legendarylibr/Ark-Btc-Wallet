"use client";

import { isClientZeroRetention } from "@/lib/security/retention-policy-client";
import { clearStoredReceiveAddress } from "@/lib/storage";
import { clearSdkPendingOpsStorage } from "@/sdk/webauthn/pending-op";

/** Clear non-vault browser caches when zero-retention is enabled. */
export function clearClientEphemeralData(): void {
  if (!isClientZeroRetention()) return;
  clearStoredReceiveAddress();
  clearSdkPendingOpsStorage();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("sdk-wa:")) sessionStorage.removeItem(key);
    }
  } catch {
    /* private mode */
  }
}
