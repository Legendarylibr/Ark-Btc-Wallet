"use client";

function bufferToBase64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(b64url: string): ArrayBuffer {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

type PrfExtensionResults = {
  enabled?: boolean;
  results?: {
    first?: ArrayBuffer;
    second?: ArrayBuffer;
  };
};

export async function isPrfSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    const caps = PublicKeyCredential.getClientCapabilities?.();
    if (!caps) return true;
    const resolved =
      typeof (caps as Promise<{ extensions?: string[] }>).then === "function"
        ? await (caps as Promise<{ extensions?: string[] }>)
        : (caps as { extensions?: string[] });
    if (resolved.extensions) {
      return resolved.extensions.includes("prf");
    }
  } catch {
    return false;
  }
  return true;
}

export function generatePrfSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function extractPrfFirst(
  credential: PublicKeyCredential,
): ArrayBuffer | null {
  const prf = credential.getClientExtensionResults()
    ?.prf as PrfExtensionResults | undefined;
  return prf?.results?.first ?? null;
}

export function prfEvalExtension(salt: Uint8Array): AuthenticationExtensionsClientInputs {
  return {
    prf: {
      eval: {
        first: salt,
      },
    },
  } as AuthenticationExtensionsClientInputs;
}

export function prfEvalOnCreateExtension(
  salt: Uint8Array,
): AuthenticationExtensionsClientInputs {
  return {
    prf: {
      eval: { first: salt },
    },
  } as AuthenticationExtensionsClientInputs;
}

export function bytesToBase64url(bytes: Uint8Array): string {
  return bufferToBase64url(bytes);
}

export { bufferToBase64url, base64urlToBuffer };
