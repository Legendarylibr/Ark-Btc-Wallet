"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

interface ActionButtonsProps {
  onSend: () => void;
  onReceive: () => void;
  sendDisabled?: boolean;
  receiveDisabled?: boolean;
}

export function ActionButtons({
  onSend,
  onReceive,
  sendDisabled,
  receiveDisabled,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4 justify-center px-6 py-4">
      <button
        type="button"
        onClick={onSend}
        disabled={sendDisabled}
        aria-label="Pay"
        className="flex flex-col items-center gap-2 group disabled:opacity-40"
      >
        <span className="h-16 w-16 rounded-full bg-cash-green flex items-center justify-center text-black shadow-lg shadow-cash-green/25 group-active:scale-95 transition-transform">
          <ArrowUp size={28} strokeWidth={2.5} />
        </span>
        <span className="text-sm font-semibold">Pay</span>
      </button>
      <button
        type="button"
        onClick={onReceive}
        disabled={receiveDisabled}
        aria-label="Request"
        className="flex flex-col items-center gap-2 group disabled:opacity-40"
      >
        <span className="h-16 w-16 rounded-full bg-cash-gray-2 flex items-center justify-center text-white border border-white/10 group-active:scale-95 transition-transform">
          <ArrowDown size={28} strokeWidth={2.5} />
        </span>
        <span className="text-sm font-semibold">Request</span>
      </button>
    </div>
  );
}
