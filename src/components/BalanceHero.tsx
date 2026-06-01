"use client";

import { motion } from "framer-motion";
import { satsToBtcDisplay } from "@/lib/barkd";
import type { Balance } from "@/lib/barkd";

interface BalanceHeroProps {
  balance: Balance | null;
  connected: boolean;
  privacyMode?: boolean;
}

export function BalanceHero({
  balance,
  connected,
  privacyMode = false,
}: BalanceHeroProps) {
  const sats = balance?.spendable_sat ?? 0;
  const pending =
    (balance?.pending_in_round_sat ?? 0) +
    (balance?.pending_board_sat ?? 0);

  return (
    <div className="text-center pt-8 pb-6">
      <p className="text-cash-muted text-sm font-medium tracking-wide uppercase mb-1">
        Ark Balance
      </p>
      <motion.div
        key={sats}
        initial={{ opacity: 0.6, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-baseline justify-center gap-1"
      >
        <span className="text-5xl font-bold tracking-tight tabular-nums">
          {privacyMode ? "••••••••" : satsToBtcDisplay(sats)}
        </span>
        <span className="text-2xl font-semibold text-cash-muted mb-1">BTC</span>
      </motion.div>
      <p className="text-cash-muted text-sm mt-2 tabular-nums">
        {privacyMode ? "hidden" : `${sats.toLocaleString()} sats`}
      </p>
      {pending > 0 && (
        <p className="text-amber-400/90 text-xs mt-2">
          {privacyMode ? "Pending amount hidden" : `+${pending.toLocaleString()} sats pending`}
        </p>
      )}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-cash-green pulse-ring" : "bg-red-500"}`}
        />
        <span className="text-xs text-cash-muted">
          {connected ? "Connected to Ark" : "Reconnecting…"}
        </span>
      </div>
    </div>
  );
}
