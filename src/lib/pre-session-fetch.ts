"use client";

import type { UnlockedIdentity } from "@/lib/crypto/vault";
import { signedFetch } from "@/lib/signed-fetch";
import type { PendingOpType } from "@/lib/webauthn/pending-op";
import { readResponseJson } from "@/lib/safe-json";

export async function preSessionSignedJson<T>(
  identity: UnlockedIdentity,
  path: string,
  body: { type: PendingOpType; bodyHash: string },
): Promise<T> {
  const bodyText = JSON.stringify(body);
  const res = await signedFetch(identity, path, {
    method: "POST",
    body: bodyText,
  });
  const data = await readResponseJson<{ error?: string } & T>(res);
  if (!res.ok) {
    throw new Error(data?.error ?? "Pre-session request failed");
  }
  if (data == null) {
    throw new Error("Invalid response from server");
  }
  return data as T;
}
