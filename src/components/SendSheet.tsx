"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { isArkAddress } from "@/lib/utils";
import {
  walletApiJson,
  walletApiWithHardware,
} from "@/lib/wallet-api";
import { Check, Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

interface SendEstimate {
  amount_sat: number;
  fee_sat: number;
  total_sat: number;
  affordable: boolean;
  spendable_sat: number;
  note?: string;
}

interface SendSheetProps {
  open: boolean;
  onClose: () => void;
  maxSats: number;
  onSuccess: () => void;
  /** Browser SDK mode — send via Bark WASM instead of barkd API */
  sdkSend?: (destination: string, amountSat: number) => Promise<void>;
  sdkEstimate?: (
    destination: string,
    amountSat: number,
  ) => Promise<SendEstimate>;
}

export function SendSheet({
  open,
  onClose,
  maxSats,
  onSuccess,
  sdkSend,
  sdkEstimate,
}: SendSheetProps) {
  const [step, setStep] = useState<"amount" | "address" | "confirm" | "done">("amount");
  const [amountStr, setAmountStr] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimate, setEstimate] = useState<SendEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountSat = parseInt(amountStr || "0", 10);

  const reset = () => {
    setStep("amount");
    setAmountStr("");
    setAddress("");
    setError(null);
    setEstimate(null);
    setLoading(false);
    setEstimateLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pressKey = (k: string) => {
    if (k === "del") {
      setAmountStr((s) => s.slice(0, -1));
      return;
    }
    if (!k) return;
    if (amountStr.length >= 10) return;
    setAmountStr((s) => s + k);
  };

  useEffect(() => {
    if (step !== "confirm" || !isArkAddress(address) || amountSat < 1) {
      setEstimate(null);
      return;
    }

    if (sdkSend && sdkEstimate) {
      let cancelled = false;
      setEstimateLoading(true);
      setError(null);
      sdkEstimate(address.trim(), amountSat)
        .then((data) => {
          if (!cancelled) setEstimate(data);
        })
        .catch((e) => {
          if (!cancelled) {
            setEstimate(null);
            setError(e instanceof Error ? e.message : "Estimate failed");
          }
        })
        .finally(() => {
          if (!cancelled) setEstimateLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    setEstimateLoading(true);
    setError(null);

    walletApiJson<SendEstimate>("/api/wallet/send/estimate", {
      method: "POST",
      body: JSON.stringify({
        destination: address.trim(),
        amount_sat: amountSat,
      }),
    })
      .then((data) => {
        if (!cancelled) setEstimate(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setEstimate(null);
          setError(e instanceof Error ? e.message : "Estimate failed");
        }
      })
      .finally(() => {
        if (!cancelled) setEstimateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, address, amountSat, maxSats, sdkSend, sdkEstimate]);

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      if (sdkSend) {
        await sdkSend(address.trim(), amountSat);
      } else {
        const res = await walletApiWithHardware("/api/wallet/send", {
          method: "POST",
          body: JSON.stringify({
            destination: address.trim(),
            amount_sat: amountSat,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Payment failed");
      }
      setStep("done");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={
        step === "amount"
          ? "Pay"
          : step === "address"
            ? "To"
            : step === "confirm"
              ? "Confirm"
              : "Sent!"
      }
    >
      {step === "amount" && (
        <div className="space-y-6">
          <div className="text-center py-4">
            <p className="text-cash-muted text-sm mb-2">Amount (sats)</p>
            <p className="text-4xl font-bold tabular-nums min-h-[3rem]">
              {amountStr ? parseInt(amountStr, 10).toLocaleString() : "0"}
            </p>
            {maxSats > 0 && (
              <button
                type="button"
                className="text-cash-green text-sm mt-2 font-medium"
                onClick={() => setAmountStr(String(maxSats))}
              >
                Send max · {maxSats.toLocaleString()} sats
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k, i) =>
              k === "" ? (
                <div key={i} />
              ) : (
                <button
                  key={k}
                  type="button"
                  onClick={() => pressKey(k)}
                  aria-label={k === "del" ? "Delete digit" : `Digit ${k}`}
                  className="h-14 rounded-2xl bg-cash-gray-2 text-xl font-semibold active:bg-cash-gray-3 flex items-center justify-center"
                >
                  {k === "del" ? <Delete size={22} /> : k}
                </button>
              ),
            )}
          </div>
          <Button
            className="w-full"
            disabled={amountSat < 1 || amountSat > maxSats}
            onClick={() => setStep("address")}
          >
            Next
          </Button>
        </div>
      )}

      {step === "address" && (
        <div className="space-y-4">
          <p className="text-cash-muted text-sm">
            Paying{" "}
            <span className="text-white font-semibold">
              {amountSat.toLocaleString()} sats
            </span>
          </p>
          <label className="block">
            <span className="text-xs text-cash-muted uppercase tracking-wide">
              Ark address
            </span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ark1…"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white placeholder:text-cash-muted/50 focus:outline-none focus:ring-2 focus:ring-cash-green/50 font-mono text-sm"
            />
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("amount")}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!isArkAddress(address)}
              onClick={() => {
                setError(null);
                setStep("confirm");
              }}
            >
              Review
            </Button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-cash-gray-2 p-5 space-y-4">
            <div>
              <p className="text-cash-muted text-xs uppercase">Amount</p>
              <p className="text-2xl font-bold tabular-nums">
                {amountSat.toLocaleString()} sats
              </p>
            </div>
            <div>
              <p className="text-cash-muted text-xs uppercase">To</p>
              <p className="font-mono text-sm break-all">{address}</p>
            </div>
            {estimateLoading && (
              <p className="text-cash-muted text-sm">Checking balance…</p>
            )}
            {estimate && !estimateLoading && (
              <>
                <div>
                  <p className="text-cash-muted text-xs uppercase">Fee</p>
                  <p className="text-sm tabular-nums">
                    {estimate.fee_sat.toLocaleString()} sats
                  </p>
                </div>
                <div>
                  <p className="text-cash-muted text-xs uppercase">Total</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {estimate.total_sat.toLocaleString()} sats
                  </p>
                </div>
                {!estimate.affordable && (
                  <p className="text-red-400 text-sm">
                    Insufficient balance ({estimate.spendable_sat.toLocaleString()}{" "}
                    spendable)
                  </p>
                )}
              </>
            )}
          </div>
          {estimate?.note && (
            <p className="text-cash-muted text-xs text-center">{estimate.note}</p>
          )}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <p className="text-cash-muted text-xs text-center leading-relaxed px-2">
            You will confirm on your security key or passkey:{" "}
            <span className="text-white font-medium tabular-nums">
              {amountSat.toLocaleString()} sats
            </span>{" "}
            to{" "}
            <span className="font-mono text-white break-all">
              {address.trim().length > 24
                ? `${address.trim().slice(0, 20)}…`
                : address.trim()}
            </span>
          </p>
          <Button
            className="w-full"
            disabled={
              loading ||
              estimateLoading ||
              (estimate != null && !estimate.affordable)
            }
            onClick={handleSend}
          >
            {loading ? "Confirm on device…" : "Confirm & Pay"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep("address")}>
            Edit
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="text-center py-8 space-y-4">
          <span className="inline-flex h-20 w-20 rounded-full bg-cash-green/20 items-center justify-center text-cash-green">
            <Check size={40} strokeWidth={2.5} />
          </span>
          <p className="text-xl font-bold">Payment sent</p>
          <p className="text-cash-muted text-sm">
            {amountSat.toLocaleString()} sats via Ark
          </p>
          <Button className="w-full mt-4" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </Sheet>
  );
}
