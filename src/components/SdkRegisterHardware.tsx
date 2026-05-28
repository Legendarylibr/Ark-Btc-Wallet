"use client";

import { HardwareRegistrationForm } from "@/components/HardwareRegistrationForm";
import { SdkTrustNotice } from "@/components/SdkTrustNotice";
import { useSdkWalletStore } from "@/store/sdk-wallet";
import { Fingerprint } from "lucide-react";

interface SdkRegisterHardwareProps {
  onComplete?: () => void;
}

export function SdkRegisterHardware({ onComplete }: SdkRegisterHardwareProps) {
  const registerHardware = useSdkWalletStore((s) => s.registerHardware);

  return (
    <HardwareRegistrationForm
      trustNotice={<SdkTrustNotice variant="compact" />}
      description={
        <>
          Register a <strong className="text-white">YubiKey</strong> or other
          FIDO2 security key. Touch ID and Windows Hello are not supported. This
          confirms sensitive actions in the tab only — it does not move keys out
          of the browser like barkd mode.
        </>
      }
      bullets={
        <li className="flex gap-2">
          <Fingerprint size={14} className="shrink-0 mt-0.5 text-cash-green" />
          Pay and Secure require device confirmation
        </li>
      }
      emptyPassphraseMessage="Enter your passphrase to authorize hardware registration"
      submitLabel="Register hardware"
      onRegister={registerHardware}
      onComplete={onComplete}
    />
  );
}
