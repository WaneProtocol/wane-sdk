# Errors

## WaneBlockedError

Raised before any value moves when a target is flagged or a policy would block
the action. Carries the `target` and, where known, the `antibodyId`. Both the
EVM and Solana clients throw it.

```ts
import { evm } from "wane-sdk";
try {
  await wane.send(wallet, { to, value });
} catch (err) {
  if (err instanceof evm.WaneBlockedError) {
    console.log(`blocked ${err.target}: ${err.message}`);
  } else {
    throw err;
  }
}
```

## Policy reasons

A blocked action carries a numeric reason that the EVM client maps to readable
text:

| Reason | Meaning |
|---|---|
| 0 | allowed |
| 1 | blocklisted |
| 2 | flagged by antibody |
| 3 | over per-tx cap |
| 4 | over daily cap |
| 5 | paused (kill switch) |
| 6 | globally denied recipient |
| 7 | policy expired |
| 8 | selector not allowed |
| 9 | token not allowed |

## Common setup errors

- "wallet is not protected": call `enable(wallet)` once before `send`.
- "report() requires config.token": use a factory like `Wane.base()` that wires
  the `$WANE` token, or pass `token` in the config.
- "WaneVaultFactory is not configured for this network yet": the vault path is
  not available on that network; use the 7702 path instead.
