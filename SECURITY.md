# Security

Operator setup and env vars: [docs/configuration.md](docs/configuration.md). User-facing flows: [docs/getting-started.md](docs/getting-started.md).

## Trust boundaries

### barkd mode (recommended)

1. **barkd** (`127.0.0.1:3535`) — holds bitcoin / Ark keys. Any local process can call its HTTP API while it runs.
2. **This app** — Ed25519-signed proxy to barkd. Passphrase encrypts the **UI signing key** in IndexedDB.
3. **Your OS** — root of trust.

### SDK mode

Enable with `NEXT_PUBLIC_WALLET_BACKEND=sdk`. **Do not assume barkd-mode guarantees apply.**

| Topic | barkd | SDK |
|-------|-------|-----|
| Keys | barkd process | Browser (WASM + IndexedDB) |
| Mnemonic in UI | No | Yes |
| WebAuthn | Server-verified | Client-only |
| Typical bypass | Direct `:3535` HTTP | XSS / malware while unlocked |

Passkey (PRF) mode requires a **recovery passphrase** at create. Pay / Secure / rotate need a fresh passkey tap. Legacy passphrase path uses confirm-on-pay WebAuthn only.

## Production requirements

| Setting | Requirement |
|---------|-------------|
| `BARKD_URL` | Loopback only (`127.0.0.1` / `localhost`) |
| `SESSION_SECRET` | ≥16 characters |
| `npm run dev` / `start` | Binds **127.0.0.1** |
| barkd | Listen on loopback — never `0.0.0.0:3535` |

**Never enable:** `ALLOW_REMOTE_HOST=true` in production (startup aborts). Do not expose ports **3000** or **3535** to the LAN/internet.

## In-app controls (barkd)

- Ed25519 + UUID v4 nonces on `/api/wallet/*` (nonces persisted across restart)
- Server WebAuthn on unlock, pay, secure, rotate (pending-op body binding)
- Loopback Host/Origin, `x-ark-client`, block `Sec-Fetch-Site: cross-site` POSTs
- Session binding (IP + User-Agent at register)
- Auto-lock after 5 minutes idle
- Pubkey pin per barkd fingerprint; setup token anti-squat for WebAuthn register

Hardware gates the **web UI**, not barkd itself — set `BARKD_AUTH_TOKEN` when barkd supports it.

## barkd bypass (out of scope for this app)

Any local process can call `http://127.0.0.1:3535` while barkd runs. Mitigate with loopback-only barkd, `scripts/lockdown-local.sh`, and stopping barkd when idle. For recovery, use `bark` / barkd CLI directly.

## Data on disk

`.ark-wallet-data/` (mode `700`): encrypted `sessions`, `nonces`, `unlock-limits`, `pubkey-pins`, `webauthn`.

## Incident response

- **Stolen session cookie** — Lock wallet; remove `sessions.enc.json`; unlock again.
- **Wrong device paired** — Use original device or reset `.ark-wallet-data` intentionally.
- **Suspected malware** — Stop barkd; move funds via `bark` on a clean machine.
