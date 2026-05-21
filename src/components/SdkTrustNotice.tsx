"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  BARKD_TRUST_ONE_LINER,
  SDK_TRUST_BULLETS,
  SDK_TRUST_SUMMARY,
} from "@/sdk/trust-model";

const DISMISS_KEY = "ark-sdk-trust-notice-dismissed";

interface SdkTrustNoticeProps {
  variant?: "full" | "compact";
}

export function SdkTrustNotice({ variant = "full" }: SdkTrustNoticeProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined" || variant === "full") return false;
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  if (dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (variant === "compact") {
    return (
      <div className="mx-5 mt-2 flex gap-2 items-start rounded-xl bg-sky-500/10 border border-sky-500/25 px-3 py-2.5 text-xs text-sky-100/90">
        <AlertTriangle
          size={14}
          className="shrink-0 mt-0.5 text-sky-300"
          aria-hidden
        />
        <p className="flex-1 leading-relaxed">
          <span className="font-semibold text-sky-50">Browser wallet — </span>
          not barkd mode. {SDK_TRUST_SUMMARY}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-sky-300/80 hover:text-sky-50"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl bg-sky-500/10 border border-sky-500/30 px-4 py-3">
      <div className="flex gap-2 items-start mb-2">
        <AlertTriangle size={18} className="shrink-0 text-sky-300 mt-0.5" />
        <p className="text-sm font-semibold text-sky-50">
          Different trust model — not a drop-in for barkd
        </p>
      </div>
      <p className="text-cash-muted text-sm mb-3 leading-relaxed">
        {SDK_TRUST_SUMMARY} For stronger isolation, use barkd mode (
        {BARKD_TRUST_ONE_LINER})
      </p>
      <ul className="text-cash-muted text-xs space-y-1.5 list-disc pl-4">
        {SDK_TRUST_BULLETS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
