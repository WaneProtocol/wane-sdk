# FAQ

## Do I need a wallet to use Wane?

No, not for the read path. `checkAddress`, `check`, `assertSafe`, `count`,
`recent`, and `watch` are free view calls. Reading is immunity. You only need a
wallet and `$WANE` stake to `report` a new threat, and a wallet to drive the
enforced session wallet.

## What is the difference between EIP-7702 and the vault on Base?

The 7702 delegate screens sends from the agent's own EOA after one signature, so
the wallet keeps its address and keys. The vault holds funds in a separate
contract so there is no raw-send bypass and ERC-20 recipients decoded from
calldata are screened too. Use the vault when you want the strongest guarantee.

## Does the SDK hold my keys?

No. It builds and reads transactions. Signing happens in your viem wallet client
or your Solana signer.

## What happens on a flagged target?

Both clients raise `WaneBlockedError` before any value moves. On Base, `send`
also refuses to broadcast when the wallet is not protected, instead of sending an
unscreened self-call.

## Can I import only one chain?

Yes. `import { evm } from "wane-sdk"` or `import ... from "wane-sdk/evm"` loads
viem only. `wane-sdk/solana` loads `@solana/web3.js` only.
