# SDK mode (browser wallet)

SDK mode runs **Bark WASM** in the tab. Keys and VTXO state live in the browser (IndexedDB + WASM datadir). **This is not equivalent to barkd mode** — see [SECURITY.md](../SECURITY.md).

Enable in `.env.local`:

```bash
NEXT_PUBLIC_WALLET_BACKEND=sdk
```

## Build WASM (one-time)

Requires **Rust**, **wasm-pack**, and **Git** (all platforms — see [platforms.md](platforms.md)):

```bash
npm run vendor:bark-wasm   # Node script — clones bindings (no Bash required)
npm run build:bark-wasm    # wasm-pack → packages/bark-wasm/pkg/
npm install
```

Without a built package, Next.js aliases `@secondts/bark-wasm` to a **stub** — the UI loads but cannot sync or send on chain.

Then:

```bash
npm run dev
```

No `barkd` process is required.

## Create a wallet

The app generates a **BIP39 mnemonic** and shows it **once**. Store it offline.

### Passkey path (recommended when PRF is supported)

Supported in Chrome, Safari, and Edge with Touch ID, Windows Hello, or YubiKey 5 (PRF).

1. Create wallet with passkey — PRF + HKDF derives the vault encryption key.
2. Set a **recovery passphrase** (required) — encrypts a backup vault in IndexedDB if the passkey is lost.
3. Unlock with passkey only.

**Pay**, **Secure**, and **rotate address** require a **fresh passkey tap** (PRF re-eval bound to the operation hash).

### Passphrase-only path (fallback)

If PRF is unavailable:

1. Passphrase encrypts the mnemonic in IndexedDB.
2. Register a hardware key for **confirm-on-pay** (client-side WebAuthn only — not server-verified).

## Recovery

| Situation | Action |
|-----------|--------|
| Lost passkey, have recovery passphrase | Unlock with recovery passphrase on the SDK unlock screen. |
| Lost passkey and recovery passphrase | Funds may be unrecoverable from this app — treat like any hot wallet without backup. |
| Upgrade passphrase → passkey | Use in-app upgrade after unlocking with passphrase. |

## Trust notice

The app shows an in-tab notice: keys are in the browser, not barkd. Malware or XSS while unlocked can act without another hardware tap beyond what the client enforces.

## Signet endpoints

The app connects to Ark signet over HTTPS (`ark.signet.2nd.dev`, `esplora.signet.2nd.dev`). CSP `connect-src` is widened only in SDK mode (`next.config.ts`).

## When to use SDK mode

- Demos, hackathons, or machines where installing barkd is impractical.
- Experimenting with Ark in the browser.

For day-to-day desktop use with stronger isolation, use **barkd mode** ([Getting started](getting-started.md)).
