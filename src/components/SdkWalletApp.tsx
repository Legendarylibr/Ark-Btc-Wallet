"use client";

import { useEffect, useState } from "react";
import { useSdkWalletStore } from "@/store/sdk-wallet";
import { Button } from "@/components/ui/Button";
import { validatePassphrase } from "@/lib/passphrase";
import { BARK_WASM_BUILD_HINT } from "@/sdk/bark/load";
import { BalanceHero } from "@/components/BalanceHero";
import { ActionButtons } from "@/components/ActionButtons";
import { SendSheet } from "@/components/SendSheet";
import { ReceiveSheet } from "@/components/ReceiveSheet";
import { SdkRegisterHardware } from "@/components/SdkRegisterHardware";
import { SdkTrustNotice } from "@/components/SdkTrustNotice";
import { SDK_MODE_LABEL } from "@/sdk/trust-model";
import { registerSdkAutoLock } from "@/sdk/session-lock";
import { Fingerprint, LogOut, RefreshCw, Shield } from "lucide-react";
import type { Balance } from "@/lib/barkd";

function toDisplayBalance(b: {
  spendableSats: number;
  pendingLightningSendSats: number;
  claimableLightningReceiveSats: number;
} | null): Balance | null {
  if (!b) return null;
  return {
    spendable_sat: b.spendableSats,
    pending_lightning_send_sat: b.pendingLightningSendSats,
    claimable_lightning_receive_sat: b.claimableLightningReceiveSats,
    pending_in_round_sat: 0,
    pending_board_sat: 0,
    pending_exit_sat: null,
  };
}

export function SdkWalletApp() {
  const store = useSdkWalletStore();
  const init = useSdkWalletStore((s) => s.init);
  const [sheet, setSheet] = useState<"send" | "receive" | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recoveryPassphrase, setRecoveryPassphrase] = useState("");
  const [showRecoveryUnlock, setShowRecoveryUnlock] = useState(false);
  const [usePassphraseCreate, setUsePassphraseCreate] = useState(false);
  const [dismissUpgrade, setDismissUpgrade] = useState(false);
  const [upgradePassphrase, setUpgradePassphrase] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const lock = useSdkWalletStore((s) => s.lock);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    registerSdkAutoLock(() => lock());
  }, [lock]);

  if (!store.ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-cash-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!store.hasWallet) {
    const passkeyCreate = store.prfAvailable && !usePassphraseCreate;
    return (
      <div className="min-h-dvh flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">{SDK_MODE_LABEL}</h1>
        <SdkTrustNotice />
        <p className="text-cash-muted text-sm mb-4 leading-relaxed">
          {passkeyCreate
            ? "Passkey (PRF) encrypts your recovery phrase — unlock with Touch ID / YubiKey / Windows Hello."
            : "PRF not available here — wallet uses passphrase encryption (legacy SDK path)."}
        </p>
        {passkeyCreate ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLocalError(null);
                const v = validatePassphrase(recoveryPassphrase);
              if (v) {
                setLocalError(v);
                return;
              }
              try {
                await store.createWalletWithPasskey(recoveryPassphrase);
                setRecoveryPassphrase("");
              } catch (err) {
                setLocalError(
                  err instanceof Error ? err.message : BARK_WASM_BUILD_HINT,
                );
              }
            }}
          >
            <label className="block">
              <span className="text-xs text-cash-muted uppercase">
                Recovery passphrase (required)
              </span>
              <input
                type="password"
                value={recoveryPassphrase}
                onChange={(e) => setRecoveryPassphrase(e.target.value)}
                placeholder="If you lose this passkey"
                required
                className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white"
              />
            </label>
            {(localError || store.error) && (
              <p className="text-red-400 text-sm">{localError ?? store.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={store.loading}>
              {store.loading ? "Creating passkey…" : "Create wallet with passkey"}
            </Button>
            <button
              type="button"
              className="text-cash-muted text-xs w-full text-center underline"
              onClick={() => setUsePassphraseCreate(true)}
            >
              Use passphrase-only instead
            </button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLocalError(null);
              const v = validatePassphrase(passphrase);
              if (v) {
                setLocalError(v);
                return;
              }
              if (passphrase !== confirm) {
                setLocalError("Passphrases do not match");
                return;
              }
              try {
                await store.createWalletWithPassphrase(passphrase);
                setPassphrase("");
                setConfirm("");
              } catch (err) {
                setLocalError(
                  err instanceof Error ? err.message : BARK_WASM_BUILD_HINT,
                );
              }
            }}
          >
            <label className="block">
              <span className="text-xs text-cash-muted uppercase">Passphrase</span>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs text-cash-muted uppercase">Confirm</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white"
              />
            </label>
            {(localError || store.error) && (
              <p className="text-red-400 text-sm">{localError ?? store.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={store.loading}>
              {store.loading ? "Creating…" : "Create wallet"}
            </Button>
            {store.prfAvailable && (
              <button
                type="button"
                className="text-cash-muted text-xs w-full text-center underline"
                onClick={() => setUsePassphraseCreate(false)}
              >
                Use passkey instead
              </button>
            )}
          </form>
        )}
      </div>
    );
  }

  if (!store.unlocked) {
    const passkeyUnlock = store.unlockMode === "passkey";
    return (
      <div className="min-h-dvh flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Unlock wallet</h1>
        <SdkTrustNotice variant="compact" />
        {passkeyUnlock && !showRecoveryUnlock ? (
          <div className="space-y-4 mt-4">
            <Button
              className="w-full"
              disabled={store.loading}
              onClick={async () => {
                setLocalError(null);
                try {
                  await store.unlockWithPasskey();
                } catch (err) {
                  setLocalError(
                    err instanceof Error ? err.message : "Unlock failed",
                  );
                }
              }}
            >
              <Fingerprint size={18} className="mr-2 inline" />
              {store.loading ? "Waiting for passkey…" : "Unlock with passkey"}
            </Button>
            {store.hasRecoveryBackup && (
              <button
                type="button"
                className="text-cash-muted text-xs w-full text-center underline"
                onClick={() => setShowRecoveryUnlock(true)}
              >
                Use recovery passphrase
              </button>
            )}
          </div>
        ) : (
          <form
            className="space-y-4 mt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLocalError(null);
              try {
                if (passkeyUnlock && showRecoveryUnlock) {
                  await store.unlockWithRecoveryPassphrase(passphrase);
                } else {
                  await store.unlockWithPassphrase(passphrase);
                }
                setPassphrase("");
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : "Unlock failed");
              }
            }}
          >
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={
                passkeyUnlock ? "Recovery passphrase" : "Passphrase"
              }
              className="w-full h-12 px-4 rounded-xl bg-cash-gray-2 border border-white/5 text-white"
            />
            {(localError || store.error) && (
              <p className="text-red-400 text-sm">{localError ?? store.error}</p>
            )}
            <Button type="submit" className="w-full" disabled={store.loading}>
              {store.loading ? "Opening…" : "Unlock"}
            </Button>
            {passkeyUnlock && (
              <button
                type="button"
                className="text-cash-muted text-xs w-full text-center underline"
                onClick={() => setShowRecoveryUnlock(false)}
              >
                Back to passkey unlock
              </button>
            )}
          </form>
        )}
      </div>
    );
  }

  if (store.unlockMode === "passphrase" && !store.hardwareRegistered) {
    return <SdkRegisterHardware />;
  }

  const balance = toDisplayBalance(store.balance);

  return (
    <div className="min-h-dvh max-w-lg mx-auto flex flex-col">
      {store.mnemonicBackup && (
        <div className="mx-5 mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-amber-100 text-xs font-semibold mb-2">
            Back up this recovery phrase now
          </p>
          <p className="font-mono text-xs break-all text-white mb-3">
            {store.mnemonicBackup}
          </p>
          <Button
            variant="secondary"
            className="w-full text-sm"
            onClick={() => store.dismissBackup()}
          >
            I saved it
          </Button>
        </div>
      )}

      <SdkTrustNotice variant="compact" />

      {store.unlockMode === "passphrase" &&
        store.prfAvailable &&
        !dismissUpgrade && (
          <div className="mx-5 mt-3 p-4 rounded-xl bg-cash-green/10 border border-cash-green/30">
            <p className="text-sm text-white font-semibold mb-1">
              Upgrade to passkey unlock
            </p>
            <p className="text-cash-muted text-xs mb-3">
              PRF lets your passkey derive the wallet key. Your passphrase stays
              as recovery backup.
            </p>
            <input
              type="password"
              value={upgradePassphrase}
              onChange={(e) => setUpgradePassphrase(e.target.value)}
              placeholder="Current passphrase"
              className="w-full h-10 px-3 rounded-lg bg-cash-gray-2 border border-white/5 text-white text-sm mb-2"
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 text-sm"
                disabled={store.loading || !upgradePassphrase}
                onClick={async () => {
                  try {
                    await store.upgradeToPasskey(upgradePassphrase);
                    setUpgradePassphrase("");
                    setDismissUpgrade(true);
                  } catch {
                    /* store.error */
                  }
                }}
              >
                {store.loading ? "…" : "Upgrade"}
              </Button>
              <Button
                variant="secondary"
                className="text-sm"
                onClick={() => setDismissUpgrade(true)}
              >
                Later
              </Button>
            </div>
          </div>
        )}

      <header className="flex items-center justify-between px-5 pt-4">
        <span
          className="font-bold text-lg"
          title={
            store.unlockMode === "passkey"
              ? "Passkey-unlocked browser wallet"
              : "Browser SDK — not barkd mode"
          }
        >
          Ark · {store.unlockMode === "passkey" ? "Passkey" : "Browser"}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            title="Sync"
            onClick={() => void store.sync()}
            className="h-9 w-9 rounded-full bg-cash-gray-2 flex items-center justify-center text-cash-muted"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            title="Secure"
            onClick={() => void store.secure()}
            className="h-9 w-9 rounded-full bg-cash-gray-2 flex items-center justify-center text-cash-muted"
          >
            <Shield size={16} />
          </button>
          <button
            type="button"
            title="Lock"
            onClick={() => store.lock()}
            className="h-9 w-9 rounded-full bg-cash-gray-2 flex items-center justify-center text-cash-muted"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {store.error && (
        <p className="mx-5 mt-2 text-red-400 text-xs text-center">{store.error}</p>
      )}

      <BalanceHero balance={balance} connected />
      <ActionButtons
        onSend={() => setSheet("send")}
        onReceive={() => setSheet("receive")}
        sendDisabled={(balance?.spendable_sat ?? 0) === 0}
        receiveDisabled={false}
      />

      <SendSheet
        open={sheet === "send"}
        onClose={() => setSheet(null)}
        maxSats={balance?.spendable_sat ?? 0}
        onSuccess={() => void store.sync()}
        sdkEstimate={async (destination, amountSat) =>
          store.estimateSend(destination, amountSat)
        }
        sdkSend={async (destination, amountSat) => {
          await store.send(destination, amountSat);
        }}
      />
      <ReceiveSheet
        open={sheet === "receive"}
        onClose={() => setSheet(null)}
        address={store.address}
        onLoadAddress={async (rotate) => {
          if (rotate) await store.refreshAddress();
        }}
      />
    </div>
  );
}
