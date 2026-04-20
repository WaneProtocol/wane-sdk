# Chains

wane-sdk speaks to two runtimes from one package. Pick the factory for the chain
you are on; the other runtime never loads.

| Factory | Chain | Runtime |
|---|---|---|
| `Wane.base()` | Base mainnet (8453) | viem |
| `Wane.baseSepolia()` | Base Sepolia | viem |
| `Wane.solana()` | Solana mainnet-beta | @solana/web3.js |
| `Wane.solanaDevnet()` | Solana devnet | @solana/web3.js |

## Surface differences

The Base client carries the full enforcement surface: EIP-7702 protection, the
`WaneVault`, per-agent policy reads, the herd feed (`recent`, `watch`), and the
`protect` auto-report loop.

The Solana client carries the read path, the report instruction builder, and the
session-vault path (`enrollIx`, `depositIx`, `sendIx`, `withdrawIx`,
`updatePolicyIx`) plus a convenience `send` that builds, signs, and submits a
screened transfer.

Both share the four-kind `ThreatKind` taxonomy with matching numeric values, so a
threat classified on one chain reads the same on the other.
