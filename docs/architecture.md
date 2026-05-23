# Architecture

## Overview

Ark BTC Wallet is a **Next.js 15** app with two entry UIs (`src/app/page.tsx`):

| Mode | UI | Chain access |
|------|-----|----------------|
| `barkd` (default) | `WalletApp` | Next.js API → barkd REST → Ark signet |
| `sdk` | `SdkWalletApp` | Bark WASM in browser → Ark signet HTTPS |

Both support Ark-only addresses (`ark1…`), signet, Pay / Request / activity feed.

## barkd mode — request path

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                         │
│  React components ──► Zustand (crypto + wallet stores)          │
│  IndexedDB: Ed25519 vault (passphrase + scrypt/AES-GCM v2)      │
│  WebAuthn: unlock / pay / secure / rotate                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ signed fetch (Ed25519 headers + cookie)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js middleware + /api/*                                     │
│  Loopback Host/Origin, x-ark-client, session + sig headers      │
│  verifySignedRequest → withCryptoGuard / withSensitiveCryptoGuard│
│  assertHardwareAuth (WebAuthn + pending-op body hash)           │
└────────────────────────────┬────────────────────────────────────┘
                             │ http://127.0.0.1:3535
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ barkd — bitcoin / Ark keys, VTXOs, send, sync                   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
                      Ark server (signet)
```

### Two signing layers (barkd)

| Layer | Keys | Purpose |
|-------|------|---------|
| **App (this repo)** | Ed25519 in encrypted vault | Authenticate every `/api/wallet/*` call; bind WebAuthn to JSON body hashes |
| **barkd** | Protocol / bitcoin keys | Actual Ark payments, balance, VTXO refresh |

A stolen session cookie **cannot** spend without the Ed25519 private key (passphrase) and WebAuthn for sensitive routes.

### Server-side state (`.ark-wallet-data/`)

Encrypted with `SESSION_SECRET` (AES-256-GCM):

- `sessions.enc.json` — API sessions (pubkey, bark fingerprint, client binding)
- `nonces.enc.json` — replay protection (survives restart)
- `unlock-limits.enc.json` — unlock rate limits per IP
- `pubkey-pins.enc.json` — one Ed25519 pubkey per barkd fingerprint
- `webauthn.enc.json` — FIDO credentials per fingerprint

### Canonical API signing (v2)

Every wallet request signs:

```
v2
METHOD
/path?sorted_query
timestamp
uuid-v4-nonce
sha256(body) base64
```

Headers: `x-wallet-signature`, `x-wallet-public-key`, `x-wallet-timestamp`, `x-wallet-nonce`, `x-wallet-body-hash`.

## SDK mode — request path

```
Browser tab
  SdkWalletApp → useSdkWalletStore
  IndexedDB: mnemonic vault (passphrase or PRF+HKDF) + optional passkey record
  Bark WASM wallet handle (sync, balance, send, refresh)
       │
       └── HTTPS → ark.signet.2nd.dev / esplora.signet.2nd.dev
```

No Next.js wallet API in SDK mode; WebAuthn and pending-op checks are **client-only**.

## Key source files

| Area | Path |
|------|------|
| API routes | `src/app/api/wallet/*`, `src/app/api/auth/*` |
| Crypto / sessions | `src/lib/crypto/*` |
| WebAuthn (server) | `src/lib/webauthn/*` |
| barkd client | `src/lib/barkd.ts` |
| Middleware | `src/middleware.ts` |
| barkd UI | `src/components/WalletApp.tsx`, `src/store/crypto.ts`, `src/store/wallet.ts` |
| SDK UI | `src/components/SdkWalletApp.tsx`, `src/store/sdk-wallet.ts`, `src/sdk/*` |
| Tests | `tests/unit/*` |

## Auto-lock

Both modes lock after **5 minutes** idle (`WALLET_LOCK_TIMEOUT_MS`). SDK mode also locks when the tab is hidden.

## Deployment assumptions

Run **one** Next.js process per machine for barkd mode. Encrypted server state (sessions, nonces, rate limits) is stored in `.ark-wallet-data/` without cross-process locking; multiple workers or replicas can race on the same data directory.
