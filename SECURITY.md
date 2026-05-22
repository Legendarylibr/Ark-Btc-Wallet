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
| `SESSION_SECRET` | ≥32 random characters |
| `npm run dev` / `start` | Binds **127.0.0.1** |
| barkd | Listen on loopback — never `0.0.0.0:3535` |

**Never enable:** `ALLOW_REMOTE_HOST=true` in production (startup aborts). Do not expose ports **3000** or **3535** to the LAN/internet.

## In-app controls (barkd)

- Ed25519 + UUID v4 nonces on `/api/wallet/*` (nonces persisted across restart)
- Middleware rejects malformed session cookies / nonces before handlers run
- Server WebAuthn on unlock, pay, fee estimate, secure, rotate (pending-op body binding + credential ID match)
- Loopback Host/Origin, `x-ark-client`, block `Sec-Fetch-Site: cross-site` and `Sec-Fetch-Dest: document` on API POSTs
- Production mutations require `Sec-Fetch-Site: same-origin` (override with `RELAX_FETCH_SITE=true`)
- Balance / history / receive address require **recent WebAuthn** (same window as auto-lock)
- Persisted pending ops, WebAuthn challenges, and rate limits across restarts
- Session binding (IP + User-Agent); **destroy session** on binding mismatch
- Server session **8h max** + **30 min idle** (re-unlock required)
- API body cap **64 KiB**; `TRACE`/`TRACK` blocked
- Production `SESSION_SECRET` min **32** chars; rejects known placeholders
- Client auto-lock after 5 minutes idle
- Pubkey pin per barkd fingerprint; setup token anti-squat for WebAuthn register

Hardware gates the **web UI**, not barkd itself — **`BARKD_AUTH_TOKEN` is required in production** (barkd mode) unless `ALLOW_INSECURE_BARKD=true` for signet-only dev.

## barkd bypass (out of scope for this app)

Any local process can call `http://127.0.0.1:3535` while barkd runs. Mitigate with loopback-only barkd, `npm run lockdown:local`, and stopping barkd when idle. For recovery, use `bark` / barkd CLI directly.

## Data on disk

`.ark-wallet-data/` (mode `700`): encrypted `sessions`, `nonces`, `unlock-limits`, `pubkey-pins`, `webauthn`.

## Incident response

- **Stolen session cookie** — Lock wallet; remove `sessions.enc.json`; unlock again.
- **Wrong device paired** — Use original device or reset `.ark-wallet-data` intentionally.
- **Suspected malware** — Stop barkd; move funds via `bark` on a clean machine.
