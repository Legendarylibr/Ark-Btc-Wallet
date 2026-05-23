"use client";

import { TRUSTED_TYPES_POLICY_NAME } from "@/lib/security/csp";
import { trustedScriptUrlAllowed } from "@/lib/security/trusted-script-url";

/** Block DOM XSS sinks unless they use an explicit (still restrictive) policy. */
export function installTrustedTypesPolicy(): void {
  if (typeof window === "undefined") return;
  const tt = window.trustedTypes;
  if (!tt?.createPolicy) return;
  if (tt.getPolicy(TRUSTED_TYPES_POLICY_NAME)) return;

  const origin = window.location.origin;

  tt.createPolicy(TRUSTED_TYPES_POLICY_NAME, {
    createHTML: () => {
      throw new Error("HTML injection blocked by Ark Wallet");
    },
    createScript: () => {
      throw new Error("Script injection blocked by Ark Wallet");
    },
    createScriptURL: (input) => {
      const url = String(input);
      if (trustedScriptUrlAllowed(origin, url)) return url;
      throw new Error("Untrusted script URL blocked by Ark Wallet");
    },
  });
}
