"use client";

import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import type { Movement } from "@/lib/barkd";
import { movementLabel, statusBadge } from "@/lib/movements";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ActivityFeedProps {
  movements: Movement[];
  privacyMode?: boolean;
}

export function ActivityFeed({
  movements,
  privacyMode = false,
}: ActivityFeedProps) {
  if (movements.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-cash-muted text-sm">No activity yet</p>
        <p className="text-cash-muted/70 text-xs mt-1">
          Ark payments settle instantly
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-32">
      <h3 className="text-sm font-semibold text-cash-muted px-2 mb-3">
        Activity
      </h3>
      <ul className="space-y-1">
        {movements.slice(0, 50).map((m) => {
          const { title, subtitle, incoming, showAmount } = movementLabel(m);
          const amt = Math.abs(m.effective_balance_sat);
          const badge = statusBadge(m.status);
          const Icon = incoming
            ? ArrowDownLeft
            : m.subsystem.kind.toLowerCase().includes("refresh")
              ? RefreshCw
              : ArrowUpRight;

          return (
            <li
              key={m.id}
              className="flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-white/5 transition-colors"
            >
              <span
                className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                  incoming
                    ? "bg-cash-green/15 text-cash-green"
                    : "bg-cash-gray-2 text-white"
                }`}
              >
                <Icon size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px]">{title}</p>
                <p className="text-cash-muted text-sm truncate">{subtitle}</p>
                {badge && (
                  <p className={`text-xs mt-0.5 ${badge.className}`}>
                    {badge.label}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {showAmount ? (
                  <p
                    className={`font-semibold tabular-nums ${
                      incoming ? "text-cash-green" : "text-white"
                    }`}
                  >
                    {privacyMode
                      ? "••••"
                      : `${incoming ? "+" : "−"}${amt.toLocaleString()}`}
                  </p>
                ) : (
                  <p className="text-cash-muted text-sm">—</p>
                )}
                <p className="text-cash-muted text-xs">
                  {formatTime(m.time.completed_at ?? m.time.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
