import { MIN_SESSION_SECRET_LENGTH } from "@/lib/security/constants";

export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const secret =
    process.env.SESSION_SECRET ?? process.env.WALLET_DATA_SECRET ?? "";
  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    console.error(
      `[ark-wallet] FATAL: SESSION_SECRET (min ${MIN_SESSION_SECRET_LENGTH} chars) is required in production.`,
    );
    process.exit(1);
  }

  const weak = new Set([
    "change-me-to-a-long-random-string",
    "change-me",
    "password",
    "session_secret",
  ]);
  if (weak.has(secret.toLowerCase())) {
    console.error(
      "[ark-wallet] FATAL: SESSION_SECRET is a known placeholder — use a random value.",
    );
    process.exit(1);
  }

  if (process.env.ALLOW_REMOTE_HOST === "true") {
    console.error(
      "[ark-wallet] FATAL: ALLOW_REMOTE_HOST=true is unsafe in production.",
    );
    process.exit(1);
  }

  if (process.env.NEXT_PUBLIC_WALLET_BACKEND === "sdk") {
    console.error(
      "[ark-wallet] WARNING: SDK browser-wallet mode — different trust model than barkd; see SECURITY.md.",
    );
  }

  const backend =
    process.env.NEXT_PUBLIC_WALLET_BACKEND ??
    process.env.WALLET_BACKEND ??
    "barkd";
  if (backend !== "sdk" && !process.env.BARKD_AUTH_TOKEN) {
    console.error(
      "[ark-wallet] WARNING: BARKD_AUTH_TOKEN unset — any local process can call barkd directly. Configure barkd auth when supported.",
    );
  }
}
