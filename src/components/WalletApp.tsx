"use client";

import { useCallback, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useCryptoStore } from "@/store/crypto";
import { BalanceHero } from "@/components/BalanceHero";
import { ActionButtons } from "@/components/ActionButtons";
import { ActivityFeed } from "@/components/ActivityFeed";
import { SendSheet } from "@/components/SendSheet";
import { ReceiveSheet } from "@/components/ReceiveSheet";
import { Onboarding } from "@/components/Onboarding";
import { SetupCrypto } from "@/components/SetupCrypto";
import { UnlockGate } from "@/components/UnlockGate";
import { RegisterHardware } from "@/components/RegisterHardware";
import { SecurityBanner } from "@/components/SecurityBanner";
import {
  Shield,
  Check,
  Loader2,
  AlertCircle,
  LogOut,
  RefreshCw,
} from "lucide-react";

export function WalletApp() {
  const {
    onboarded,
    connected,
    balance,
    history,
    receiveAddress,
    sheet,
    loading,
    error,
    secureStatus,
    cryptoReady,
    setSheet,
    fetchHealth,
    fetchAddress,
    refreshAll,
    secureFunds,
  } = useWallet();

  const hasVault = useCryptoStore((s) => s.hasVault);
  const hardwareRegistered = useCryptoStore((s) => s.hardwareRegistered);
  const vaultReady = useCryptoStore((s) => s.vaultReady);
  const identity = useCryptoStore((s) => s.identity);
  const sessionRegistered = useCryptoStore((s) => s.sessionRegistered);
  const pairingNotice = useCryptoStore((s) => s.pairingNotice);
  const initCrypto = useCryptoStore((s) => s.init);
  const lock = useCryptoStore((s) => s.lock);
  const clearPairingNotice = useCryptoStore((s) => s.clearPairingNotice);

  useEffect(() => {
    void initCrypto();
  }, [initCrypto]);

  const handleRefresh = useCallback(async () => {
    await fetchHealth();
    if (useCryptoStore.getState().identity) {
      await refreshAll().catch(() => {});
    }
  }, [fetchHealth, refreshAll]);

  useEffect(() => {
    if (cryptoReady && onboarded) {
      refreshAll().catch(() => {});
    }
  }, [cryptoReady, onboarded, refreshAll]);

  if (loading || !vaultReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-cash-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!onboarded) {
    return <Onboarding onReady={fetchHealth} />;
  }

  if (!hasVault) {
    return <SetupCrypto onComplete={() => void initCrypto()} />;
  }

  if (!hardwareRegistered) {
    return <RegisterHardware onComplete={() => void initCrypto()} />;
  }

  if (!identity || !sessionRegistered) {
    return <UnlockGate />;
  }

  const secureLabel =
    secureStatus === "loading"
      ? "Securing…"
      : secureStatus === "success"
        ? "Secured"
        : secureStatus === "error"
          ? "Failed"
          : "Secure";

  return (
    <div className="min-h-dvh max-w-lg mx-auto flex flex-col">
      <header className="flex items-center justify-between px-5 pt-4">
        <span className="font-bold text-lg tracking-tight">Ark</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Refresh balance and activity"
            onClick={() => handleRefresh()}
            className="h-9 w-9 rounded-full bg-cash-gray-2 flex items-center justify-center text-cash-muted hover:text-white"
            aria-label="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            title="Lock wallet"
            onClick={() => lock()}
            className="h-9 w-9 rounded-full bg-cash-gray-2 flex items-center justify-center text-cash-muted hover:text-white"
            aria-label="Lock wallet"
          >
            <LogOut size={16} />
          </button>
          <button
            type="button"
            title="Refresh received VTXOs in the next Ark round"
            disabled={secureStatus === "loading" || !connected}
            onClick={() => secureFunds()}
            className="h-9 px-3 rounded-full bg-cash-gray-2 text-xs font-medium text-cash-muted hover:text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            {secureStatus === "loading" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : secureStatus === "success" ? (
              <Check size={14} className="text-cash-green" />
            ) : secureStatus === "error" ? (
              <AlertCircle size={14} className="text-red-400" />
            ) : (
              <Shield size={14} />
            )}
            {secureLabel}
          </button>
        </div>
      </header>

      <SecurityBanner />

      {pairingNotice && (
        <div
          role="status"
          className="mx-5 mt-2 px-3 py-2 rounded-xl bg-cash-green/10 text-cash-green text-xs text-center flex justify-between items-center gap-2"
        >
          <span>{pairingNotice}</span>
          <button
            type="button"
            className="text-cash-muted hover:text-white shrink-0"
            onClick={() => clearPairingNotice()}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-5 mt-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs text-center"
        >
          {error}
        </div>
      )}

      <BalanceHero balance={balance} connected={connected} />
      <ActionButtons
        onSend={() => setSheet("send")}
        onReceive={() => setSheet("receive")}
        sendDisabled={!connected || (balance?.spendable_sat ?? 0) === 0}
        receiveDisabled={!connected}
      />

      <div className="flex-1 border-t border-white/5 mt-2">
        <ActivityFeed movements={history} />
      </div>

      <SendSheet
        open={sheet === "send"}
        onClose={() => setSheet(null)}
        maxSats={balance?.spendable_sat ?? 0}
        onSuccess={() => refreshAll()}
      />
      <ReceiveSheet
        open={sheet === "receive"}
        onClose={() => setSheet(null)}
        address={receiveAddress}
        onLoadAddress={fetchAddress}
      />
    </div>
  );
}
