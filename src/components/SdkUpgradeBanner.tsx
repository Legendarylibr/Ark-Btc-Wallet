"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

type SdkUpgradeBannerProps = {
  loading: boolean;
  storeError: string | null;
  onUpgrade: (passphrase: string) => Promise<void>;
  onDismiss: () => void;
};

export function SdkUpgradeBanner({
  loading,
  storeError,
  onUpgrade,
  onDismiss,
}: SdkUpgradeBannerProps) {
  const [passphrase, setPassphrase] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="mx-5 mt-3 p-4 rounded-xl bg-cash-green/10 border border-cash-green/30">
      <p className="text-sm text-white font-semibold mb-1">
        Upgrade to passkey unlock
      </p>
      <p className="text-cash-muted text-xs mb-3">
        PRF lets your passkey derive the wallet key. Your passphrase stays as
        recovery backup.
      </p>
      <input
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        placeholder="Current passphrase"
        className="w-full h-10 px-3 rounded-lg bg-cash-gray-2 border border-white/5 text-white text-sm mb-2"
      />
      <ErrorBanner message={localError ?? storeError} className="mb-2" />
      <div className="flex gap-2">
        <Button
          className="flex-1 text-sm"
          disabled={loading || !passphrase}
          onClick={async () => {
            setLocalError(null);
            try {
              await onUpgrade(passphrase);
              setPassphrase("");
              onDismiss();
            } catch (err) {
              setLocalError(
                err instanceof Error ? err.message : "Passkey upgrade failed",
              );
            }
          }}
        >
          {loading ? "…" : "Upgrade"}
        </Button>
        <Button variant="secondary" className="text-sm" onClick={onDismiss}>
          Later
        </Button>
      </div>
    </div>
  );
}
