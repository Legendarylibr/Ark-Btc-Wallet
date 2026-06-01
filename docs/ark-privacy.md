# Ark privacy

Ark can improve some payment privacy properties by moving frequent payments off the public Bitcoin transaction graph. It does not make Bitcoin activity invisible.

## What improves

| Activity | Privacy effect |
|----------|----------------|
| Ark-to-Ark payment | Usually avoids creating a new public Bitcoin transaction per payment. |
| VTXO refresh | Can help maintain spendability without exposing a direct normal payment for every action. |
| Browser SDK mode | Removes the local `barkd` HTTP daemon and its `127.0.0.1:3535` bypass surface. |

## What remains visible

| Activity | Visibility |
|----------|------------|
| Boarding into Ark | Public Bitcoin transaction. |
| Exiting/offboarding | Public Bitcoin transaction. |
| Amount and timing patterns | May still be linkable by observers or infrastructure. |
| Ark server interaction | The selected Ark server may observe protocol metadata. |
| Chain-source queries | The selected esplora service may observe address/transaction lookups. |

## App controls

### Screen privacy

The eye button in the wallet header hides balances and activity amounts. Use it before screen sharing, recording, or working in public.

This is display privacy only. It does not alter wallet state, transactions, network requests, or Ark protocol behavior.

### Trusted endpoints

In SDK mode, set these in `.env.local` to use trusted HTTPS endpoints:

```bash
NEXT_PUBLIC_WALLET_BACKEND=sdk
NEXT_PUBLIC_ARK_SERVER=https://your-ark.example
NEXT_PUBLIC_ESPLORA_URL=https://your-esplora.example
```

These settings are public because they are compiled into the browser bundle. Do not put secrets in them.

## Good hygiene

- Avoid address reuse.
- Keep unrelated activity in separate browser profiles or wallets.
- Back up the SDK mnemonic before funding.
- Prefer trusted or self-hosted infrastructure where possible.
- Use one browser origin consistently so WebAuthn behavior stays predictable.
- Treat board and exit transactions as public Bitcoin transactions.
- Keep browser extensions minimal in the profile that holds an SDK wallet.

## Non-goals

This app does not provide anonymity guarantees, laundering workflows, decoy traffic, or protection from a compromised browser while the wallet is unlocked.
