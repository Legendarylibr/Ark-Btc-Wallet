export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const secret =
    process.env.SESSION_SECRET ?? process.env.WALLET_DATA_SECRET ?? "";
  if (secret.length < 16) {
    console.error(
      "[ark-wallet] FATAL: SESSION_SECRET (min 16 chars) is required in production.",
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

  if (!process.env.BARKD_AUTH_TOKEN) {
    console.error(
      "[ark-wallet] WARNING: BARKD_AUTH_TOKEN unset — any local process can call barkd directly. Configure barkd auth when supported.",
    );
  }
}
