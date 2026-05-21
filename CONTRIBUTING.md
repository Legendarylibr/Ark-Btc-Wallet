# Contributing

Thanks for your interest in Ark Wallet.

## Development setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). For **barkd mode**, install [Bark + barkd](https://second.tech/docs/barkd/install) and run `barkd` on signet before using Pay / Request.

## Checks before a PR

```bash
npm run lint
npm test
npm run build
```

## SDK / WASM (optional)

```bash
npm run vendor:bark-wasm
npm run build:bark-wasm
```

Set `NEXT_PUBLIC_WALLET_BACKEND=sdk` in `.env.local`. See [SECURITY.md](SECURITY.md) — SDK mode is a different trust model, not a drop-in for barkd.

## Security issues

Do not open public issues for exploitable vulnerabilities. Describe the issue privately to the maintainers (email or security contact listed in the repository when available).

## Scope

- Keep changes focused; match existing patterns in `src/`.
- Update [SECURITY.md](SECURITY.md) when behavior or threat model changes.
- Add or extend tests in `tests/` for security-sensitive logic.
