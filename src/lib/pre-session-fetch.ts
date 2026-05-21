"use client";

import type { UnlockedIdentity } from "@/lib/crypto/vault";
import { signedFetch } from "@/lib/signed-fetch";
import type { PendingOpType } from "@/lib/webauthn/pending-op";

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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? "Pre-session request failed",
    );
  }
  return data as T;
}
