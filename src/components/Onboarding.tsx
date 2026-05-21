"use client";

import { Button } from "@/components/ui/Button";
import { Zap, Shield, Wifi } from "lucide-react";

interface OnboardingProps {
  onReady: () => void;
}

export function Onboarding({ onReady }: OnboardingProps) {
  return (
    <div className="min-h-dvh flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto">
      <div className="h-16 w-16 rounded-2xl bg-cash-green flex items-center justify-center text-black font-black text-2xl mb-8">
        A
      </div>
      <h1 className="text-4xl font-bold leading-tight mb-3">Set up Ark Wallet</h1>
      <p className="text-cash-muted text-lg mb-6">
        barkd holds your bitcoin keys on this machine. Run both steps below, then
        continue.
      </p>
      <pre className="text-left text-xs bg-cash-gray-2 rounded-xl p-4 w-full overflow-x-auto text-cash-muted mb-8">
{`# 1. Create wallet (CLI only — no seed in browser)
bark create --signet \\
  --ark ark.signet.2nd.dev \\
  --esplora esplora.signet.2nd.dev

# 2. Start barkd (127.0.0.1 only — never 0.0.0.0)
barkd`}
      </pre>
      <ul className="space-y-4 mb-10">
        {[
          { icon: Shield, text: "Passphrase + hardware key (YubiKey / Touch ID)" },
          { icon: Zap, text: "Ed25519 signature on every API call" },
          { icon: Wifi, text: "Ark payments signed by barkd" },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm">
            <Icon className="text-cash-green shrink-0" size={20} />
            <span className="text-cash-muted">{text}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full" onClick={onReady}>
        I started barkd — continue
      </Button>
    </div>
  );
}
