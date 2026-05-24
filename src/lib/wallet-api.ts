"use client";

import { signedFetch } from "@/lib/signed-fetch";
import { useCryptoStore } from "@/store/crypto";
import {
  createPendingOp,
  hardwareAuthHeaders,
} from "@/lib/webauthn/client";
import { hashBody } from "@/lib/crypto/canonical";
import {
  isReadProtectedPath,
  isReadCryptoPostPath,
  pendingOpTypeForPath,
  type PendingOpType,
} from "@/lib/webauthn/pending-op-paths";
import { readResponseJson } from "@/lib/safe-json";

export class WalletApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "WalletApiError";
  }
}

async function parse401(
  res: Response,
): Promise<{ error?: string; code?: string }> {
  try {
    return (await res.json()) as { error?: string; code?: string };
  } catch {
    return {};
  }
}

function getIdentity() {
  try {
    return useCryptoStore.getState().getIdentity();
  } catch {
    throw new WalletApiError("Wallet locked — unlock to continue", 401);
  }
}

/** Signed wallet API call; locks app on session expiry (not on read-hardware refresh). */
export async function walletApi(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const identity = getIdentity();
  const res = await signedFetch(identity, path, init);

  if (res.status === 401) {
    const body = await parse401(res);
    if (body.code === "HARDWARE_READ_REQUIRED") {
      return res;
    }
    await useCryptoStore.getState().lock();
    throw new WalletApiError(
      body.error ?? "Session expired — unlock again",
      401,
      body.code,
    );
  }

  return res;
}

async function startPendingOp(
  type: PendingOpType,
  bodyHash: string,
): Promise<string> {
  const identity = getIdentity();
  return createPendingOp(type, bodyHash, (p, i) => signedFetch(identity, p, i));
}

/** Refresh read-access window (balance / history / address). */
async function walletApiWithReadAccess(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const identity = getIdentity();
  const emptyHash = hashBody("");
  const opId = await startPendingOp("read-access", emptyHash);
  const hwHeaders = await hardwareAuthHeaders(opId, (p, i) =>
    signedFetch(identity, p, i),
  );
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(hwHeaders)) {
    headers.set(k, v);
  }
  const res = await walletApi(path, { ...init, headers });
  if (res.status === 401) {
    const body = await parse401(res);
    await useCryptoStore.getState().lock();
    throw new WalletApiError(
      body.error ?? "Session expired — unlock again",
      401,
      body.code,
    );
  }
  return res;
}

/** Pay / Secure / rotate / estimate — hardware + operation binding */
export async function walletApiWithHardware(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const identity = getIdentity();
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
  const opId = await startPendingOp(opType, bodyHash);
  const hwHeaders = await hardwareAuthHeaders(opId, (p, i) =>
    signedFetch(identity, p, i),
  );
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(hwHeaders)) {
    headers.set(k, v);
  }

  return walletApi(path, { ...init, headers });
}

async function walletApiForPath(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = new URL(path, window.location.origin);
  const sensitive = pendingOpTypeForPath(url.pathname, url.search);
  if (sensitive) {
    return walletApiWithHardware(path, init);
  }

  const method = (init.method ?? "GET").toUpperCase();
  const needsReadHardware =
    (method === "GET" && isReadProtectedPath(url.pathname)) ||
    (method === "POST" && isReadCryptoPostPath(url.pathname));

  if (needsReadHardware) {
    let res = await walletApi(path, init);
    if (res.status === 401) {
      const body = await parse401(res);
      if (body.code === "HARDWARE_READ_REQUIRED") {
        res = await walletApiWithReadAccess(path, init);
      }
    }
    return res;
  }

  return walletApi(path, init);
}

async function parseWalletApiJson<T>(res: Response): Promise<T> {
  const data = await readResponseJson<{ error?: string; code?: string } & T>(
    res,
  );
  if (!res.ok) {
    throw new WalletApiError(
      data?.error ?? "Request failed",
      res.status,
      data?.code,
    );
  }
  if (data == null) {
    throw new WalletApiError("Invalid response from server", res.status);
  }
  return data as T;
}

export async function walletApiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await walletApiForPath(path, init);
  return parseWalletApiJson<T>(res);
}

export async function walletApiJsonWithHardware<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await walletApiWithHardware(path, init);
  return parseWalletApiJson<T>(res);
}
