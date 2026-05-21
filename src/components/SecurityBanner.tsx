"use client";

import { ShieldAlert } from "lucide-react";

export function SecurityBanner() {
  return (
    <div
      role="note"
      className="mx-5 mt-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs leading-relaxed"
    >
      <div className="flex gap-2">
        <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-400" />
        <p>
          <strong className="text-amber-100">Local trust model:</strong> barkd on
          127.0.0.1 holds your bitcoin keys. Any program on this computer can
          spend if barkd is running. This app only signs API access — keep barkd
          and port 3535 off the network.
        </p>
      </div>
    </div>
  );
}
