"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Usb } from "lucide-react";

export interface HardwareRegistrationFormProps {
  description: ReactNode;
  bullets: ReactNode;
  trustNotice?: ReactNode;
  emptyPassphraseMessage: string;
  submitLabel: string;
  loadingLabel?: string;
  onRegister: (passphrase: string) => Promise<void>;
  onComplete?: () => void;
}

export function HardwareRegistrationForm({
  description,
  bullets,
  trustNotice,
  emptyPassphraseMessage,
  submitLabel,
  loadingLabel = "Waiting for device…",
  onRegister,
  onComplete,
}: HardwareRegistrationFormProps) {
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) {
      setError(emptyPassphraseMessage);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onRegister(passphrase);
      setPassphrase("");
      await onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto">
      <Usb className="text-cash-green mb-4" size={40} />
      <h1 className="text-2xl font-bold mb-2">Add hardware security</h1>
      {trustNotice}
      <p className="text-cash-muted text-sm mb-6 leading-relaxed">{description}</p>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <label className="block mb-4">
          <span className="text-xs text-cash-muted uppercase">Passphrase</span>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
            className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white focus:outline-none focus:ring-2 focus:ring-cash-green/50 disabled:opacity-50"
          />
        </label>
        <ul className="text-cash-muted text-xs space-y-2 mb-8">{bullets}</ul>
        <ErrorBanner message={error} className="mb-4" />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? loadingLabel : submitLabel}
        </Button>
      </form>
    </div>
  );
}
