"use client";

import type { EncryptedVault } from "@/lib/crypto/vault";
import type { PrfEncryptedVault } from "@/sdk/crypto/prf-vault";

const DB_NAME = "ark-wallet";
const STORE = "vault";
const KEY = "primary";
const SDK_MNEMONIC_KEY = "sdk-mnemonic";
const SDK_MNEMONIC_BACKUP_KEY = "sdk-mnemonic-backup";
const SDK_PASSKEY_KEY = "sdk-passkey-wallet";
const SDK_HARDWARE_KEY = "sdk-hardware";
const LEGACY_LS_KEY = "ark-wallet-vault";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGet(): Promise<EncryptedVault | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve((req.result as EncryptedVault | undefined) ?? null);
    };
  });
}

async function idbSet(vault: EncryptedVault): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(vault, KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

async function idbDelete(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

function loadLegacyLocalStorage(): EncryptedVault | null {
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EncryptedVault;
  } catch {
    return null;
  }
}

/** Migrate localStorage vault → IndexedDB once, then remove legacy copy */
export async function migrateVaultStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  const legacy = loadLegacyLocalStorage();
  if (!legacy) return;
  const existing = await idbGet();
  if (!existing) {
    await idbSet(legacy);
  }
  localStorage.removeItem(LEGACY_LS_KEY);
}

export async function loadVaultFromStorage(): Promise<EncryptedVault | null> {
  if (typeof window === "undefined") return null;
  await migrateVaultStorage();
  return idbGet();
}

export async function saveVaultToStorage(vault: EncryptedVault): Promise<void> {
  await idbSet(vault);
  localStorage.removeItem(LEGACY_LS_KEY);
}

export async function clearVaultFromStorage(): Promise<void> {
  await idbDelete();
  localStorage.removeItem(LEGACY_LS_KEY);
}

export async function vaultExists(): Promise<boolean> {
  return (await loadVaultFromStorage()) != null;
}

export async function saveSdkMnemonicVault(vault: EncryptedVault): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(vault, SDK_MNEMONIC_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSdkMnemonicVault(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(SDK_MNEMONIC_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSdkMnemonicVault(): Promise<EncryptedVault | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(SDK_MNEMONIC_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve((req.result as EncryptedVault | undefined) ?? null);
    };
  });
}

export async function sdkMnemonicVaultExists(): Promise<boolean> {
  return (await loadSdkMnemonicVault()) != null;
}

export async function saveSdkMnemonicBackupVault(
  vault: EncryptedVault,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(vault, SDK_MNEMONIC_BACKUP_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSdkMnemonicBackupVault(): Promise<EncryptedVault | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(SDK_MNEMONIC_BACKUP_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve((req.result as EncryptedVault | undefined) ?? null);
    };
  });
}

export interface SdkPasskeyWalletRecord {
  v: 1;
  walletId: string;
  prfSalt: string;
  credentialId: string;
  vault: PrfEncryptedVault;
}

export async function saveSdkPasskeyWallet(
  record: SdkPasskeyWalletRecord,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, SDK_PASSKEY_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSdkPasskeyWallet(): Promise<SdkPasskeyWalletRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(SDK_PASSKEY_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve((req.result as SdkPasskeyWalletRecord | undefined) ?? null);
    };
  });
}

export async function sdkPasskeyWalletExists(): Promise<boolean> {
  return (await loadSdkPasskeyWallet()) != null;
}

export async function clearSdkPasskeyWallet(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(SDK_PASSKEY_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface SdkHardwareCredentialRecord {
  walletId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
}

export async function saveSdkHardwareCredential(
  record: SdkHardwareCredentialRecord,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record, SDK_HARDWARE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSdkHardwareCredential(): Promise<SdkHardwareCredentialRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(SDK_HARDWARE_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve(
        (req.result as SdkHardwareCredentialRecord | undefined) ?? null,
      );
    };
  });
}

export async function clearSdkHardwareCredential(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(SDK_HARDWARE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
