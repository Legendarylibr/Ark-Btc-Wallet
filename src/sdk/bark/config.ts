/** Signet defaults — same as @secondts/bark-react-native docs */

const DEFAULT_ARK_SERVER = "https://ark.signet.2nd.dev";
const DEFAULT_ESPLORA_URL = "https://esplora.signet.2nd.dev";

function publicHttpsUrl(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return fallback;
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export const BARK_SIGNET = {
  serverAddress: publicHttpsUrl(
    "NEXT_PUBLIC_ARK_SERVER",
    DEFAULT_ARK_SERVER,
  ),
  esploraAddress: publicHttpsUrl(
    "NEXT_PUBLIC_ESPLORA_URL",
    DEFAULT_ESPLORA_URL,
  ),
} as const;

/** Logical data directory for browser IndexedDB storage adaptor */
export const BARK_BROWSER_DATADIR = "ark-wallet-browser";
