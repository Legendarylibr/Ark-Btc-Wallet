"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  clearPendingMnemonicBackup,
  getPendingMnemonicBackup,
} from "@/sdk/mnemonic-backup";

interface MnemonicBackupBannerProps {
  onDismiss: () => void;
}

export function MnemonicBackupBanner({ onDismiss }: MnemonicBackupBannerProps) {
  const [phrase, setPhrase] = useState<string | null>(null);

  useEffect(() => {
    setPhrase(getPendingMnemonicBackup());
    return () => setPhrase(null);
  }, []);

  if (!phrase) return null;

  return (
    <div className="mx-5 mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
      <p className="text-amber-100 text-xs font-semibold mb-2">
        Back up this recovery phrase now
      </p>
      <p className="font-mono text-xs break-all text-white mb-3">{phrase}</p>
      <Button
        variant="secondary"
        className="w-full text-sm"
        onClick={() => {
          clearPendingMnemonicBackup();
          onDismiss();
        }}
      >
        I saved it
      </Button>
    </div>
  );
}
