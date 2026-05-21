const RECEIVE_ADDRESS_KEY = "ark-wallet-receive-address";

export function getStoredReceiveAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(RECEIVE_ADDRESS_KEY);
  } catch {
    return null;
  }
}

export function setStoredReceiveAddress(address: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECEIVE_ADDRESS_KEY, address);
  } catch {
    /* private mode / quota */
  }
}

export function clearStoredReceiveAddress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECEIVE_ADDRESS_KEY);
  } catch {
    /* ignore */
  }
}
