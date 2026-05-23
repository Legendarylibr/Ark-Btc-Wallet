"use client";

import { useCallback, useEffect } from "react";
import { useSdkWalletStore } from "@/store/sdk-wallet";

const SYNC_INTERVAL_MS = 15_000;

export function useSdkWallet() {
  const store = useSdkWalletStore();
  const {
    ready,
    hasWallet,
    unlocked,
    unlockMode,
    hardwareRegistered,
    init,
    lock,
    sync,
    refreshAddress,
    secure,
    clearError,
  } = store;

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
    ...store,
    lock,
    sync,
    refreshAddress,
    secure,
    clearError,
    estimateSend,
    send,
  };
}
