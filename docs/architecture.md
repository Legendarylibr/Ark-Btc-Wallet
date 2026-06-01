# Architecture

## Overview

Ark BTC Wallet is a **Next.js 15** app with two entry UIs (`src/app/page.tsx`):

| Mode | UI | Chain access |
|------|-----|----------------|
| `barkd` (default) | `WalletApp` | Next.js API → barkd REST → Ark signet |
| `sdk` | `SdkWalletApp` | `@secondts/bark` WASM in browser → Ark signet HTTPS |

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

Encrypted with `SESSION_SECRET` (AES-256-GCM). Reads and writes go through `src/lib/encrypted-file.ts`, which wraps each mutation in **`withFileLockSync`** (`src/lib/file-lock.ts`) so concurrent Node workers on the **same machine** sharing one data directory do not corrupt JSON stores.

- `sessions.enc.json` — API sessions (pubkey, bark fingerprint, client binding)
- `nonces.enc.json` — replay protection (survives restart)
- `unlock-limits.enc.json` — unlock rate limits per IP
- `pubkey-pins.enc.json` — one Ed25519 pubkey per barkd fingerprint
- `webauthn.enc.json` — FIDO credentials per fingerprint
- `pending-ops.enc.json` — single-use WebAuthn pending operations

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

## SDK mode — barkd-free request path

```
Browser tab
  SdkWalletApp → useSdkWalletStore
  IndexedDB: mnemonic vault (passphrase or PRF+HKDF) + optional passkey record
  @secondts/bark WASM wallet handle (sync, balance, send, refresh)
       │
       └── HTTPS → ark.signet.2nd.dev / esplora.signet.2nd.dev
```

No Next.js wallet API in SDK mode; WebAuthn and pending-op checks are **client-only**.

### What "no barkd" means

SDK mode removes the local `barkd` process and the `127.0.0.1:3535` HTTP trust boundary. The Next.js app still serves the React UI, applies CSP and middleware, and hosts non-wallet routes, but wallet operations are performed by the browser SDK.

It does **not** remove the need for networked Ark infrastructure. The browser still reaches the Ark server and esplora over HTTPS. In the default signet config those endpoints are `ark.signet.2nd.dev` and `esplora.signet.2nd.dev`.

### SDK storage model

| Data | Location |
|------|----------|
| Mnemonic vault | Browser IndexedDB |
| Passkey PRF record | Browser IndexedDB |
| Recovery passphrase backup | Browser IndexedDB |
| Active wallet handle | In-memory module state, outside Zustand |
| Server `.ark-wallet-data` wallet auth | Not used for SDK wallet operations |

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

| Rule | Why |
|------|-----|
| **One machine, one `WALLET_DATA_DIR`** | Sessions, nonces, and pins are local files — not safe on shared NFS/SMB across hosts. |
| **Multiple Node workers OK on that host** | `withFileLockSync` serializes encrypted-file updates; see `tests/unit/multi-worker-stores.test.ts`. |
| **No replicated fleet sharing one dir** | File locks do not coordinate across machines. |
| **Loopback only** | See [SECURITY.md](../SECURITY.md) — do not expose `:3000` or barkd `:3535`. |

Prefer a **single** Next.js process for simplicity; if you use PM2 cluster mode, point every worker at the same `.ark-wallet-data/` path on local disk only.
