export function safeParseJson<T>(
  text: string,
  fallback: T,
): T {
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function parseJsonBody<T extends object>(
  bodyText: string,
): { ok: true; data: T } | { ok: false; error: string } {
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
