# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-06-18

### Added

- Unified entry point: `Wane.base()`, `Wane.baseSepolia()`, `Wane.solana()`,
  `Wane.solanaDevnet()` return the chain-native client
- `evm` and `solana` namespaces re-exported so an app loads only the runtime it
  uses (peer deps `viem` and `@solana/web3.js` stay opt-in)
- Shared four-kind `ThreatKind` taxonomy with matching numeric values on both
  chains
- Jest suite asserting Solana anchor discriminators, PDA seed derivation, and
  EVM address-subject encoding

### Changed

- Merged the standalone Base SDK and Solana SDK into a single package under
  `src/evm` and `src/solana`
- Switched the build to NodeNext module resolution with declaration output

## [0.3.0] - 2026-05-12

### Added

- EVM `WaneVault` path: `createVault`, `predictVault`, `vaultSend`,
  `vaultWithdraw` for a non-custodial screening smart wallet
- `protect()` auto-report loop: guard the target, run the action, mint an
  antibody on a failure that looks like an attack

### Changed

- `send()` now refuses to broadcast when the wallet is not 7702-protected,
  closing the unscreened self-call trap

## [0.2.0] - 2026-04-15

### Added

- EIP-7702 protection path on Base: `enable`, `send`, `sendBatch`, `wrap`,
  `wouldAllow`, plus the `waneActions` viem extension
- Per-agent policy reads: `checkPolicy`, `guard`, `isTokenAllowed`

## [0.1.0] - 2026-03-26

### Added

- Initial read and report path: `checkAddress`, `check`, `assertSafe`, `count`,
  `recent`, `watch`, `report` against the antibody registry
- Solana instruction builders: `enrollIx`, `depositIx`, `sendIx`, `withdrawIx`,
  `updatePolicyIx`, plus PDA derivation helpers

[0.4.0]: https://github.com/WaneProtocol/wane-sdk/releases/tag/v0.4.0
[0.3.0]: https://github.com/WaneProtocol/wane-sdk/releases/tag/v0.3.0
[0.2.0]: https://github.com/WaneProtocol/wane-sdk/releases/tag/v0.2.0
[0.1.0]: https://github.com/WaneProtocol/wane-sdk/releases/tag/v0.1.0
