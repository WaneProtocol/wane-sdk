# src layout

| Path | What it is |
|---|---|
| `index.ts` | unified entry: `Wane.base()` / `Wane.solana()` plus the `evm` and `solana` namespaces and the shared `ThreatKind` |
| `evm/index.ts` | viem client: registry reads, policy, EIP-7702 delegate, `WaneVault`, `report`, `protect` |
| `evm/abi.ts` | the minimal ABI slice the EVM client needs, kept tiny so the SDK has no app dependency |
| `solana/index.ts` | `@solana/web3.js` client: registry reads, session-vault instruction builders, PDA derivation |

Each chain client is self-contained: importing `wane-sdk/evm` never loads
`@solana/web3.js`, and importing `wane-sdk/solana` never loads `viem`. The peer
dependency for the chain you do not use stays unloaded.
