# Troubleshooting

## barkd connection

### “barkd wallet required” / balance unavailable

- Confirm barkd is running: `curl http://127.0.0.1:3535/api/v1/wallet`
- Create a wallet if missing: `bark create --signet --ark ark.signet.2nd.dev --esplora esplora.signet.2nd.dev`
- Check `BARKD_URL` in `.env.local` is `http://127.0.0.1:3535` (not a remote host).

### `BARKD_URL must point to loopback`

The app blocks non-loopback barkd URLs to prevent SSRF. Use `127.0.0.1` or `localhost` only.

## App unlock & pairing

### “This barkd wallet is already paired with a different signing key”

The first Ed25519 key that registered with this barkd fingerprint is pinned. Options:

- Use the **original browser/profile** where you set up the wallet, or
- Intentionally reset: stop the app, delete `.ark-wallet-data/pubkey-pins.enc.json` and `webauthn.enc.json`, set up passphrase + hardware again.

**Warning:** Resetting server files does not move funds; it only breaks UI pairing.

### “Session binding mismatch — unlock again”

Session is tied to User-Agent (and IP when `TRUST_PROXY=true`). Unlock again after changing browser, VPN, or proxy settings.

### “Replay detected”

Normal if you retry an old request. Refresh the page and perform the action again (new nonce).

### WebAuthn / hardware errors

- Use **https** or **localhost** / **127.0.0.1** — some browsers restrict WebAuthn on plain HTTP except loopback.
- Cancelled tap: try **Unlock** again, then Pay / Secure.
- Registration: complete **passphrase setup proof** before enrolling hardware (anti-squat flow).

## Payments

### “Only valid Ark addresses (ark1…) are supported”

This wallet does not send to Lightning invoices or `bc1` on-chain addresses in the UI.

### “Insufficient spendable balance”

Balance must cover amount + estimated Ark fees. Tap **Secure** after receives; sync may lag a few seconds.

## SDK mode

### SDK package / sync fails

Install the package:

```bash
npm install
```

Restart `npm run dev` with `NEXT_PUBLIC_WALLET_BACKEND=sdk`.

### App still asks for barkd in SDK mode

- Confirm `.env.local` contains exactly `NEXT_PUBLIC_WALLET_BACKEND=sdk`.
- Restart the dev server after changing `.env.local`; this flag is baked into the client bundle.
- Check the terminal for `SDK browser-wallet mode` during startup.

### SDK mode has no local daemon, but still cannot sync

SDK mode does not use `barkd`, but it still needs browser HTTPS access to the configured Ark server and esplora. Check that `https://ark.signet.2nd.dev` and `https://esplora.signet.2nd.dev` are reachable from the browser/network.

### “Passkey PRF is not supported”

Use passphrase-only path or a PRF-capable authenticator (YubiKey 5, Touch ID, Windows Hello). Chrome/Safari current versions recommended.

### “Passkey setup expired”

Challenge mismatch — usually fixed in current builds (base64url). Hard-refresh the page and create again.

## Development

### Tests fail on encrypted files

Tests use a temp `WALLET_DATA_DIR` and `SESSION_SECRET`. Run `npm test` from repo root.

### Port 3000 in use

**macOS / Linux:** `lsof -i :3000`

**Windows:** `netstat -ano | findstr :3000`

Stop the other process (docs assume port 3000).

## Security reminders

- Any local process can call **barkd :3535** while it runs — not fixable in this app. See [SECURITY.md](../SECURITY.md).
- Do not expose ports **3000** or **3535** to your LAN or the internet.
