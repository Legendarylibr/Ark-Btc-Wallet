"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCryptoStore } from "@/store/crypto";
import { validatePassphrase } from "@/lib/passphrase";
import { Lock } from "lucide-react";

interface SetupCryptoProps {
  onComplete?: () => void;
}

export function SetupCrypto({ onComplete }: SetupCryptoProps) {
  const setupVault = useCryptoStore((s) => s.setupVault);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ack) {
      setError("Confirm you understand the local trust model");
      return;
    }
    const validation = validatePassphrase(passphrase);
    if (validation) {
      setError(validation);
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await setupVault(passphrase);
      setPassphrase("");
      setConfirm("");
      setAck(false);
      await onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto">
      <Lock className="text-cash-green mb-4" size={40} />
      <h1 className="text-2xl font-bold mb-2">Secure this device</h1>
      <p className="text-cash-muted text-sm mb-6 leading-relaxed">
        Create a passphrase (12+ chars, letters and numbers) for your Ed25519
        signing key in IndexedDB. Next you will register a security key or
        passkey — barkd still holds bitcoin keys on this machine.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs text-cash-muted uppercase">Passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="new-password"
            className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white focus:outline-none focus:ring-2 focus:ring-cash-green/50"
          />
        </label>
        <label className="block">
          <span className="text-xs text-cash-muted uppercase">Confirm</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white focus:outline-none focus:ring-2 focus:ring-cash-green/50"
          />
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-1 rounded border-white/20"
          />
          <span className="text-cash-muted text-xs leading-relaxed">
            I understand barkd on 127.0.0.1 holds my funds and any local program
            can spend while barkd runs. This app only authorizes the web UI.
          </span>
        </label>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !ack}
        >
          {loading ? "Creating keys…" : "Create signing identity"}
        </Button>
      </form>
    </div>
  );
}
