"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useCryptoStore } from "@/store/crypto";
import { Fingerprint, Usb } from "lucide-react";

interface RegisterHardwareProps {
  onComplete?: () => void;
}

export function RegisterHardware({ onComplete }: RegisterHardwareProps) {
  const registerHardware = useCryptoStore((s) => s.registerHardware);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!passphrase) {
      setError("Enter your wallet passphrase to authorize hardware registration");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerHardware(passphrase);
      setPassphrase("");
      await onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto">
      <Usb className="text-cash-green mb-4" size={40} />
      <h1 className="text-2xl font-bold mb-2">Add hardware security</h1>
      <p className="text-cash-muted text-sm mb-6 leading-relaxed">
        Register a <strong className="text-white">YubiKey</strong>,{" "}
        <strong className="text-white">Touch ID</strong>,{" "}
        <strong className="text-white">Windows Hello</strong>, or another
        passkey. Your passphrase proves you own this device&apos;s signing key
        before enrollment.
      </p>
      <label className="block mb-4">
        <span className="text-xs text-cash-muted uppercase">Passphrase</span>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="current-password"
          className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white focus:outline-none focus:ring-2 focus:ring-cash-green/50"
        />
      </label>
      <ul className="text-cash-muted text-xs space-y-2 mb-8">
        <li className="flex gap-2">
          <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
          Unlock requires passphrase + hardware
        </li>
        <li className="flex gap-2">
          <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
          Pay and Secure require a fresh hardware tap per action
        </li>
        <li className="flex gap-2">
          <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
          Auto-lock after 5 minutes idle
        </li>
        <li className="text-amber-200/80">
          Use http://localhost:3000 if Touch ID / passkey prompts fail on
          127.0.0.1
        </li>
      </ul>
      <ErrorBanner message={error} className="mb-4" />
      <Button className="w-full" disabled={loading} onClick={handleRegister}>
        {loading ? "Waiting for device…" : "Register security key / passkey"}
      </Button>
    </div>
  );
}
