"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useCryptoStore } from "@/store/crypto";
import { Fingerprint, KeyRound } from "lucide-react";

export function UnlockGate() {
  const unlock = useCryptoStore((s) => s.unlock);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await unlock(passphrase);
      setPassphrase("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto">
      <KeyRound className="text-cash-green mb-4" size={40} />
      <h1 className="text-2xl font-bold mb-2">Unlock wallet</h1>
      <p className="text-cash-muted text-sm mb-8 leading-relaxed">
        Enter your passphrase, then tap your YubiKey or FIDO2 security key.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs text-cash-muted uppercase">Passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white focus:outline-none focus:ring-2 focus:ring-cash-green/50"
          />
        </label>
        <p className="text-cash-muted text-xs flex items-center gap-2">
          <Fingerprint size={14} className="text-cash-green" />
          Insert your YubiKey when prompted after tapping Unlock
        </p>
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Confirm on your device…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
