"use client";

import { signedFetch } from "@/lib/signed-fetch";
import { useCryptoStore } from "@/store/crypto";
import { createPendingOp, hardwareAuthHeaders } from "@/lib/webauthn/client";
import { hashBody } from "@/lib/crypto/canonical";
import { pendingOpTypeForPath } from "@/lib/webauthn/pending-op";

export class WalletApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "WalletApiError";
  }
}

/** Signed wallet API call; locks app on 401 */
export async function walletApi(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let identity;
  try {
    identity = useCryptoStore.getState().getIdentity();
  } catch {
    throw new WalletApiError("Wallet locked — unlock to continue", 401);
  }

  const res = await signedFetch(identity, path, init);

  if (res.status === 401) {
    await useCryptoStore.getState().lock();
    let msg = "Session expired — unlock again";
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new WalletApiError(msg, 401);
  }

  return res;
}

/** Pay / Secure / rotate address — hardware + operation binding */
export async function walletApiWithHardware(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = new URL(path, window.location.origin);
  const opType = pendingOpTypeForPath(url.pathname, url.search);
  if (!opType) {
    throw new WalletApiError("Operation requires hardware confirmation", 400);
  }

  const bodyText =
    typeof init.body === "string"
      ? init.body
      : init.body != null
        ? String(init.body)
        : "";

  const bodyHash = hashBody(bodyText);

  let identity;
  try {
    identity = useCryptoStore.getState().getIdentity();
  } catch {
    throw new WalletApiError("Wallet locked — unlock to continue", 401);
  }

  let opId: string;
  try {
    opId = await createPendingOp(opType, bodyHash, (p, i) =>
      signedFetch(identity, p, i),
    );
  } catch (e) {
    throw new WalletApiError(
      e instanceof Error ? e.message : "Could not start secured operation",
      400,
    );
  }

  let hwHeaders: Record<string, string>;
  try {
    hwHeaders = await hardwareAuthHeaders(opId);
  } catch (e) {
    throw new WalletApiError(
      e instanceof Error
        ? e.message
        : "Device confirmation failed — try again",
      401,
    );
  }
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(hwHeaders)) {
    headers.set(k, v);
  }

  return walletApi(path, { ...init, headers });
}

export async function walletApiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = new URL(path, window.location.origin);
  const needsHardware =
    pendingOpTypeForPath(url.pathname, url.search) != null;

  const res = needsHardware
    ? await walletApiWithHardware(path, init)
    : await walletApi(path, init);

  const data = await res.json();
  if (!res.ok) {
    throw new WalletApiError(
      (data as { error?: string }).error ?? "Request failed",
      res.status,
    );
  }
  return data as T;
}

export async function walletApiJsonWithHardware<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await walletApiWithHardware(path, init);
  const data = await res.json();
  if (!res.ok) {
    throw new WalletApiError(
      (data as { error?: string }).error ?? "Request failed",
      res.status,
    );
  }
  return data as T;
}
