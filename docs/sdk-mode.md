# SDK mode (barkd-free browser wallet)

SDK mode runs Bark directly in the browser through Second's `@secondts/bark` WASM package. It removes the need for a local `barkd` daemon, so the browser owns the wallet lifecycle: mnemonic generation, encrypted storage, sync, balance, address rotation, send, and VTXO refresh.

This is a **barkd-free** mode, not an offline mode. The browser still connects to the configured Ark server and chain source over HTTPS.

| Local component | barkd mode | SDK mode |
|-----------------|------------|----------|
| `barkd` process | Required | Not used |
| Bark CLI wallet datadir | `~/.bark` | Not used by this app |
| Wallet secret storage | barkd | Browser IndexedDB |
| Signing runtime | barkd process | WASM in the tab |
| App wallet API routes | Used | Not used for wallet ops |
| Hosted signet services | Ark server + esplora | Ark server + esplora |

**This is not equivalent to barkd mode** — see [SECURITY.md](../SECURITY.md).

## Quick start

Create `.env.local`:

```bash
NEXT_PUBLIC_WALLET_BACKEND=sdk
```

Install and run:

```bash
npm install
npm run dev
```

This installs Second's `@secondts/bark` package, which ships the browser WASM build. No local Rust or `wasm-pack` build is required for normal app development.

Open:

```bash
http://127.0.0.1:3000
```

Use one origin consistently (`127.0.0.1` or `localhost`) because WebAuthn passkeys are bound to the relying-party ID.

## What still runs locally

SDK mode still uses the Next.js app as the UI shell, security sentinel, CSP boundary, and static asset server. It does **not** use the Next.js `/api/wallet/*` routes for balance, sync, send, or address creation; those operations happen in the browser through the SDK.

You still run:

```bash
npm run dev
```

You do **not** run:

```bash
barkd
```

## Network endpoints

The default SDK config targets Second signet:

| Endpoint | Purpose |
|----------|---------|
| `https://ark.signet.2nd.dev` | Ark server |
| `https://esplora.signet.2nd.dev` | Bitcoin signet chain source |

You can point SDK mode at trusted or self-hosted HTTPS endpoints:

```bash
NEXT_PUBLIC_ARK_SERVER=https://your-ark.example
NEXT_PUBLIC_ESPLORA_URL=https://your-esplora.example
```

These values are public client-build settings. They are not secrets. Page CSP widens `connect-src` to the configured SDK endpoint origins only when `NEXT_PUBLIC_WALLET_BACKEND=sdk`, so barkd mode keeps the narrower default policy.

## Create a wallet

The app generates a **BIP39 mnemonic** in the browser and shows it **once**. Store it offline before funding the wallet. This mnemonic is the recovery material for SDK mode.

The SDK wallet state lives in browser storage. Clearing site data, changing browser profiles, or moving to another device can make the in-browser wallet unavailable unless you have the mnemonic or recovery passphrase path described below.

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

## User flow

1. Open the app in SDK mode.
2. Create or unlock the browser wallet.
3. Back up the mnemonic when shown.
4. Tap **Request** to create an `ark1...` address.
5. Fund it from the signet faucet.
6. Tap **Pay** to send Ark payments.
7. Tap **Secure** after receiving funds to refresh received VTXOs.
8. Tap **Lock** when done.

## Recovery

| Situation | Action |
|-----------|--------|
| Lost passkey, have recovery passphrase | Unlock with recovery passphrase on the SDK unlock screen. |
| Lost passkey and recovery passphrase | Funds may be unrecoverable from this app — treat like any hot wallet without backup. |
| Upgrade passphrase → passkey | Use in-app upgrade after unlocking with passphrase. |
| Cleared browser data, have mnemonic | Recreate/import through the SDK recovery flow when available; otherwise use the mnemonic with compatible Bark tooling. |

## Production flag

SDK mode is blocked in `NODE_ENV=production` unless you explicitly opt in:

```bash
NEXT_PUBLIC_WALLET_BACKEND=sdk
ALLOW_SDK_IN_PRODUCTION=true
```

This guard exists because production SDK mode stores wallet material in the browser. Only enable it for deployments where that is the intended product model.

## Trust notice

The app shows an in-tab notice: keys are in the browser, not barkd. Malware or XSS while unlocked can act without another hardware tap beyond what the client enforces.

Practical implications:

- There is no local `:3535` daemon for other local processes to call.
- Browser compromise while the wallet is unlocked is higher impact than in barkd mode.
- Client-side WebAuthn is a local UX/security gate, not a server-verified authorization layer.
- Browser extensions, injected scripts, and compromised profiles are in scope for the SDK threat model.
- Use a dedicated browser profile for serious testing.

## Privacy controls

SDK mode can reduce public-chain linkage because Ark-to-Ark payments do not create a fresh Bitcoin transaction for every transfer. It does **not** make payments invisible. Boarding, exiting, refresh timing, amount patterns, and server-side metadata can still leak information.

This app includes two practical privacy controls:

| Control | What it helps with | Limit |
|---------|--------------------|-------|
| Screen privacy toggle | Hides balances and activity amounts from shoulder-surfing, streaming, and screenshots. | Does not change network or chain privacy. |
| Configurable SDK endpoints | Lets you use trusted/self-hosted Ark and esplora endpoints instead of the default signet services. | The selected Ark server and chain source can still observe protocol/network metadata. |

For better Ark privacy hygiene:

- Avoid address reuse.
- Use a dedicated browser profile for SDK wallets.
- Prefer trusted or self-hosted infrastructure where possible.
- Avoid combining unrelated activity in one wallet profile.
- Treat board and exit transactions as public Bitcoin activity.
- Do not assume amount splitting or timing alone provides anonymity.

## When to use SDK mode

- Demos, hackathons, or machines where installing barkd is impractical.
- Experimenting with Ark in the browser.
- Browser-first product prototypes where a local daemon is unacceptable.
- Test environments where the risk of browser-held signet funds is acceptable.

For day-to-day desktop use with stronger isolation, use **barkd mode** ([Getting started](getting-started.md)).

## Troubleshooting

| Symptom | Check |
|---------|-------|
| App still asks to start barkd | Confirm `.env.local` has `NEXT_PUBLIC_WALLET_BACKEND=sdk`, then restart `npm run dev`. |
| SDK fails to load | Run `npm install`; confirm `@secondts/bark` exists in `node_modules`. |
| WebAuthn or passkey fails | Use one origin consistently (`http://127.0.0.1:3000` recommended) and try Chrome, Safari, or Edge. |
| No balance after funding | Tap sync/refresh, then wait for the Ark server and signet chain source to catch up. |
| Production process exits | Set `ALLOW_SDK_IN_PRODUCTION=true` intentionally, or run barkd mode. |
