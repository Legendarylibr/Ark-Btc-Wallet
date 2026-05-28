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
          Register a <strong className="text-white">YubiKey</strong> or other
          FIDO2 security key (USB / NFC). Touch ID and Windows Hello are not
          supported. Your passphrase proves you own this device&apos;s signing key
          before enrollment.
        </>
      }
      bullets={
        <>
          <li className="flex gap-2">
            <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
            Unlock requires passphrase + YubiKey tap
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
            Use http://localhost:3000 if your YubiKey prompt fails on 127.0.0.1
          </li>
        </>
      }
      emptyPassphraseMessage="Enter your wallet passphrase to authorize hardware registration"
      submitLabel="Register YubiKey / security key"
      onRegister={registerHardware}
      onComplete={onComplete}
    />
  );
}
