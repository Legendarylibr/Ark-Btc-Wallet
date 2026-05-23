"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { copyToClipboard, truncateAddress } from "@/lib/utils";
import { Copy, Check, RefreshCw } from "lucide-react";

interface ReceiveSheetProps {
  open: boolean;
  onClose: () => void;
  address: string | null;
  onLoadAddress: (rotate?: boolean) => Promise<void>;
}

export function ReceiveSheet({
  open,
  onClose,
  address,
  onLoadAddress,
}: ReceiveSheetProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (address) return;
    setLoading(true);
    onLoadAddress(false).finally(() => setLoading(false));
  }, [open, address, onLoadAddress]);

  const handleCopy = async () => {
    if (!address) return;
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRotate = async () => {
    setRotating(true);
    try {
      await onLoadAddress(true);
    } finally {
      setRotating(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Request">
      <div className="flex flex-col items-center py-4 space-y-6">
        <p className="text-cash-muted text-sm text-center max-w-xs">
          Share your Ark address to receive instant bitcoin payments
        </p>

        {loading && !address ? (
          <div className="h-52 w-52 rounded-2xl bg-cash-gray-2 animate-pulse" />
        ) : address ? (
          <>
            <div className="p-4 rounded-3xl bg-white">
              <QRCodeSVG
                value={address}
                size={200}
                level="M"
                bgColor="#ffffff"
                fgColor="#0a0a0a"
              />
            </div>
            <p className="font-mono text-sm text-center break-all px-2 text-cash-muted">
              {truncateAddress(address, 12, 12)}
            </p>
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check size={18} className="text-cash-green" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Ark address
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full gap-2 text-sm"
              disabled={rotating}
              onClick={handleRotate}
            >
              <RefreshCw size={16} className={rotating ? "animate-spin" : ""} />
              New address
            </Button>
          </>
        ) : (
          <ErrorBanner message="Could not load address" />
        )}

        <p className="text-xs text-cash-muted text-center max-w-sm leading-relaxed">
          Payments arrive instantly. Tap Secure in the header to refresh received
          funds in the next Ark round for stronger protection.
        </p>
      </div>
    </Sheet>
  );
}
