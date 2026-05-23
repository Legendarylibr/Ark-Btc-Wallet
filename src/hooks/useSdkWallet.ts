"use client";

import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSdkWalletStore } from "@/store/sdk-wallet";

const SYNC_INTERVAL_MS = 15_000;

export function useSdkWallet() {
  const {
    ready,
    hasWallet,
    unlocked,
    unlockMode,
    hardwareRegistered,
    prfAvailable,
    hasRecoveryBackup,
    loading,
    error,
    balance,
    address,
    showMnemonicBackup,
  } = useSdkWalletStore(
    useShallow((s) => ({
      ready: s.ready,
      hasWallet: s.hasWallet,
      unlocked: s.unlocked,
      unlockMode: s.unlockMode,
      hardwareRegistered: s.hardwareRegistered,
      prfAvailable: s.prfAvailable,
      hasRecoveryBackup: s.hasRecoveryBackup,
      loading: s.loading,
      error: s.error,
      balance: s.balance,
      address: s.address,
      showMnemonicBackup: s.showMnemonicBackup,
    })),
  );

  const init = useSdkWalletStore((s) => s.init);
  const lock = useSdkWalletStore((s) => s.lock);
  const sync = useSdkWalletStore((s) => s.sync);
  const refreshAddress = useSdkWalletStore((s) => s.refreshAddress);
  const secure = useSdkWalletStore((s) => s.secure);
  const clearError = useSdkWalletStore((s) => s.clearError);
  const dismissBackup = useSdkWalletStore((s) => s.dismissBackup);
  const createWalletWithPasskey = useSdkWalletStore((s) => s.createWalletWithPasskey);
  const createWalletWithPassphrase = useSdkWalletStore(
    (s) => s.createWalletWithPassphrase,
  );
  const unlockWithPasskey = useSdkWalletStore((s) => s.unlockWithPasskey);
  const unlockWithPassphrase = useSdkWalletStore((s) => s.unlockWithPassphrase);
  const unlockWithRecoveryPassphrase = useSdkWalletStore(
    (s) => s.unlockWithRecoveryPassphrase,
  );
  const upgradeToPasskey = useSdkWalletStore((s) => s.upgradeToPasskey);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!ready || !hasWallet || !unlocked) return;
    if (unlockMode === "passphrase" && !hardwareRegistered) return;

    void sync({ background: true });
    const id = setInterval(() => {
      void useSdkWalletStore.getState().sync({ background: true });
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ready, hasWallet, unlocked, unlockMode, hardwareRegistered, sync]);

  const estimateSend = useCallback(
    (destination: string, amountSat: number) =>
      useSdkWalletStore.getState().estimateSend(destination, amountSat),
    [],
  );

  const send = useCallback(
    (destination: string, amountSat: number) =>
      useSdkWalletStore.getState().send(destination, amountSat),
    [],
  );

  return {
    ready,
    hasWallet,
    unlocked,
    unlockMode,
    hardwareRegistered,
    prfAvailable,
    hasRecoveryBackup,
    loading,
    error,
    balance,
    address,
    showMnemonicBackup,
    init,
    lock,
    sync,
    refreshAddress,
    secure,
    clearError,
    dismissBackup,
    createWalletWithPasskey,
    createWalletWithPassphrase,
    unlockWithPasskey,
    unlockWithPassphrase,
    unlockWithRecoveryPassphrase,
    upgradeToPasskey,
    estimateSend,
    send,
  };
}
