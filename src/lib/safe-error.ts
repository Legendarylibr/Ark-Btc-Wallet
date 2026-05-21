import { BarkdError } from "@/lib/barkd";

/** Only expose client-safe barkd messages for expected user errors */
const CLIENT_SAFE_STATUSES = new Set([400, 404]);

export function safeBarkdMessage(error: BarkdError): string {
  if (CLIENT_SAFE_STATUSES.has(error.status)) {
    const msg = error.message.trim();
    if (msg.length > 0 && msg.length <= 120 && !msg.includes("\n")) {
      return msg;
    }
  }
  return "Wallet daemon error — check barkd logs";
}

export function safeApiError(
  error: unknown,
  fallback = "Request failed",
): string {
  if (error instanceof BarkdError) {
    return safeBarkdMessage(error);
  }
  return fallback;
}
