import { MAX_API_BODY_BYTES } from "@/lib/security/constants";

/** Parse JSON from a fetch Response; returns null when the body is not JSON. */
export async function readResponseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function parseJsonBody<T extends object>(
  bodyText: string,
): { ok: true; data: T } | { ok: false; error: string } {
  if (bodyText.length > MAX_API_BODY_BYTES) {
    return { ok: false, error: "Request body too large" };
  }
  if (!bodyText.trim()) {
    return { ok: false, error: "Request body required" };
  }
  try {
    const data = JSON.parse(bodyText) as T;
    if (data === null || typeof data !== "object") {
      return { ok: false, error: "Invalid JSON body" };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}
