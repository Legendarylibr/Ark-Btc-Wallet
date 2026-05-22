# Zero trust and zero data retention

Ark Wallet is a **local signet wallet**. It cannot be zero-trust against the OS or barkd, but the app can **verify every API call** and **retain only what is strictly necessary**.

## Zero trust (in-app)

Every `/api/wallet/*` request is treated as untrusted until verified:

1. **Network** — loopback Host/Origin, `x-ark-client`, Sec-Fetch rules (production).
2. **Session** — httpOnly cookie + Ed25519 signature + UUID nonce (persisted anti-replay).
3. **Binding** — session tied to client fingerprint at register; mismatch destroys session.
4. **Sensitivity** — pay / secure / rotate need server WebAuthn + pending-op body hash.
5. **Reads** — balance / history / address / sync need recent WebAuthn (or same-request read-access).
6. **barkd** — server only calls loopback barkd; production requires `BARKD_AUTH_TOKEN`.

**Not zero-trust:** any local process on `127.0.0.1:3535` while barkd runs. **SDK mode** verifies WebAuthn in the browser only — see [SECURITY.md](../SECURITY.md).

## Zero data retention (ephemeral)

### What we do **not** keep

- No request/response logging of bodies, passphrases, mnemonics, or signatures.
- No analytics or third-party telemetry.
- Server **ephemeral** files are TTL-bound and purged on startup and logout.

### What we **must** keep (until you delete it)

| Data | Why |
|------|-----|
| Encrypted Ed25519 vault (IndexedDB) | Unlock UI without storing passphrase |
| `pubkey-pins` / `webauthn` (server disk) | Device pairing and hardware gate |
| barkd datadir (`~/.bark`) | Chain keys — outside this app |
| SDK mnemonic / passkey vaults (IDB) | SDK mode only |

### Ephemeral server files (auto-pruned)

`sessions`, `nonces`, `rate-limits`, `unlock-limits`, `unlock-attempt-tokens`, `unlock-token-bindings`, register/setup challenges, pending ops, setup tokens.

### Aggressive mode

Set in `.env.local`:

```bash
ARK_ZERO_RETENTION=true
NEXT_PUBLIC_ARK_ZERO_RETENTION=true
```

Effects:

- Shorter server session idle (5 min), session max (2 h), nonce TTL (3 min), unlock window (10 min).
- **Purge** all expired ephemeral server state on process start and on **logout**.
- Browser clears receive-address cache and SDK `sessionStorage` pending ops / WebAuthn challenges on **lock** (when `NEXT_PUBLIC_ARK_ZERO_RETENTION=true`).

Pins and WebAuthn credentials are **not** deleted automatically — reset `.ark-wallet-data` intentionally if re-pairing.

## Operator checklist

1. `SESSION_SECRET` ≥ 32 random bytes; never commit `.env.local` or `.ark-wallet-data/`.
2. barkd on loopback only; stop when idle.
3. Enable `ARK_ZERO_RETENTION` for shared or high-risk machines.
4. Lock the wallet when stepping away (client auto-lock 5 min).

See also [configuration.md](configuration.md) and [SECURITY.md](../SECURITY.md).
