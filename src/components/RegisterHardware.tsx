"use client";

import { HardwareRegistrationForm } from "@/components/HardwareRegistrationForm";
import { useCryptoStore } from "@/store/crypto";
import { Fingerprint } from "lucide-react";

interface RegisterHardwareProps {
  onComplete?: () => void;
}

export function RegisterHardware({ onComplete }: RegisterHardwareProps) {
  const registerHardware = useCryptoStore((s) => s.registerHardware);

  return (
    <HardwareRegistrationForm
      description={
        <>
          Register a <strong className="text-white">YubiKey</strong>,{" "}
          <strong className="text-white">Touch ID</strong>,{" "}
          <strong className="text-white">Windows Hello</strong>, or another
          passkey. Your passphrase proves you own this device&apos;s signing key
          before enrollment.
        </>
      }
      bullets={
        <>
          <li className="flex gap-2">
            <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
            Unlock requires passphrase + hardware
          </li>
          <li className="flex gap-2">
            <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
            Pay and Secure ask once per action (fee preview does not)
          </li>
          <li className="flex gap-2">
            <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
            Auto-lock after 5 minutes idle
          </li>
          <li className="text-amber-200/80">
            Use http://localhost:3000 if Touch ID / passkey prompts fail on
            127.0.0.1
          </li>
        </>
      }
      emptyPassphraseMessage="Enter your wallet passphrase to authorize hardware registration"
      submitLabel="Register security key / passkey"
      onRegister={registerHardware}
      onComplete={onComplete}
    />
  );
}
