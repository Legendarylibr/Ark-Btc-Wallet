"use client";

import { useEffect, useCallback } from "react";
import { useWalletStore } from "@/store/wallet";
import { useCryptoStore } from "@/store/crypto";

const SYNC_INTERVAL_MS = 15_000;
const HEALTH_POLL_MS = 5_000;

export function useWallet() {
  const store = useWalletStore();
  const onboarded = store.onboarded;
  const cryptoReady = useCryptoStore(
    (s) => s.identity != null && s.sessionRegistered,
  );

  useEffect(() => {
    useWalletStore.getState().fetchHealth();
  }, []);

  useEffect(() => {
    if (onboarded) return;
    const id = setInterval(() => {
      useWalletStore.getState().fetchHealth();
    }, HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [onboarded]);

  useEffect(() => {
    if (!onboarded || !cryptoReady) return;
    const s = useWalletStore.getState();
    void s.fetchBalance();
    void s.fetchHistory();

    const id = setInterval(() => {
      void useWalletStore.getState().refreshAll();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(id);
  }, [onboarded, cryptoReady]);

  const fetchAddress = useCallback(
    (rotate?: boolean) => useWalletStore.getState().fetchAddress(rotate),
    [],
  );

  const refreshAll = useCallback(
    () => useWalletStore.getState().refreshAll(),
    [],
  );

  const secureFunds = useCallback(
    () => useWalletStore.getState().secureFunds(),
    [],
  );

  return { ...store, fetchAddress, refreshAll, secureFunds, cryptoReady };
}
