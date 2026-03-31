# Examples

Runnable snippets for both chains. Each imports the published entry point, so
build the package first (`npm run build`) or run them with a TS runner like
`tsx` against the source.

| File | Chain | What it shows |
|---|---|---|
| `base-check.ts` | Base | free `checkAddress` read plus the herd feed (`count`, `recent`) |
| `base-protect.ts` | Base | one-signature EIP-7702 `enable`, then a screened `send` |
| `base-report.ts` | Base | mint an antibody for a novel threat (idempotent) |
| `solana-session.ts` | Solana | session wallet `enroll` + `deposit` + screened `send` |

## Running

```bash
# read path, no wallet
npx tsx examples/base-check.ts 0x1465E33f687C557BF275D6d692eC1316126d8e9e

# enforced path, needs a funded key
PRIVATE_KEY=0x... npx tsx examples/base-protect.ts 0xRecipient 0

# solana session wallet on devnet
npx tsx examples/solana-session.ts
```

The read examples are safe to run against mainnet or devnet RPC. The protect and
session examples broadcast transactions, so point them at a test key and a
funded test wallet first.
