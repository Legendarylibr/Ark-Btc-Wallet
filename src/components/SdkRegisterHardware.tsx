"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSdkWalletStore } from "@/store/sdk-wallet";
import { SdkTrustNotice } from "@/components/SdkTrustNotice";
import { Fingerprint, Usb } from "lucide-react";

interface SdkRegisterHardwareProps {
  onComplete?: () => void;
}

export function SdkRegisterHardware({ onComplete }: SdkRegisterHardwareProps) {
  const registerHardware = useSdkWalletStore((s) => s.registerHardware);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!passphrase) {
      setError("Enter your passphrase to authorize hardware registration");
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
      <SdkTrustNotice variant="compact" />
      <p className="text-cash-muted text-sm mb-6 leading-relaxed">
        Register a <strong className="text-white">YubiKey</strong>,{" "}
        <strong className="text-white">Touch ID</strong>, or{" "}
        <strong className="text-white">Windows Hello</strong> passkey. This
        confirms sensitive actions in the tab only — it does not move keys out
        of the browser like barkd mode.
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
          Pay and Secure require device confirmation
        </li>
      </ul>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <Button
        className="w-full"
        onClick={() => void handleRegister()}
        disabled={loading}
      >
        {loading ? "Waiting for device…" : "Register hardware"}
      </Button>
    </div>
  );
}
