# Roadmap

Shipped milestones. Open work lives in the issue tracker, not here.

## Shipped

- [x] Read path on Base: `checkAddress`, `check`, `assertSafe`, herd feed
      (`count`, `recent`, `watch`)
- [x] Report path on Base: `report` with `$WANE` stake and idempotent skip
- [x] Per-agent policy: caps, kill switch, TTL, token and selector allowlists
- [x] EIP-7702 protection: `enable`, `send`, `sendBatch`, `wrap`, `wouldAllow`,
      and the `waneActions` viem extension
- [x] Non-custodial `WaneVault`: `createVault`, `predictVault`, `vaultSend`,
      `vaultWithdraw`
- [x] `protect()` auto-report loop (guard, run, report on attack)
- [x] Solana client: registry reads, session vault instruction builders, PDA
      derivation, screened send
- [x] Unified package: `Wane.base()` / `Wane.solana()` with `evm` and `solana`
      namespaces and opt-in peer dependencies
- [x] Jest suite over discriminators, PDA seeds, and address encoding
- [x] CI: format check + build, green on push and pull request
