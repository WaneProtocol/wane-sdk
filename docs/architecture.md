# Architecture

wane-sdk is a thin, typed client over two on-chain immune systems that share one
threat model. It does not hold keys and it does not run a server. It builds and
reads transactions, and it fails closed when a target is flagged.

## The three things an agent does

1. **Read before signing.** `checkAddress` / `check` are free view calls against
   the antibody registry. Reading is immunity: an agent that checks a target
   before approving or transferring never needs a wallet to be protected.
2. **Report a novel threat.** When an agent's own runtime detects a drain that
   the registry does not yet know, `report` stakes `$WANE` and mints an
   antibody. Every other agent that reads the registry is now immune.
3. **Route enforced outflows.** For full protection the agent moves funds
   through a screening session wallet. A flagged destination reverts on-chain
   before any value moves.

## EVM (Base)

Two enforcement shapes share the same registry and policy:

- **EIP-7702 delegate.** The agent signs one authorization pointing its own EOA
  code at `WaneDelegate`. After that, `send` / `sendBatch` / `wrap` route
  through the wallet's own `execute()`, which screens the target against
  antibodies and the per-agent policy and reverts `Blocked(target, reason)`
  before running. The wallet keeps its address, funds, and keys; the delegate
  can only block, never move funds.
- **WaneVault.** Funds live in a per-owner vault deployed at a deterministic
  address. There is no raw-send bypass, and ERC-20 recipients decoded from
  calldata are screened too. `withdraw` always returns funds to the owner so
  nothing can be trapped by the screen.

The client pre-screens every send with the same on-chain `wouldAllow` view the
contract enforces, so a blocked action throws a clear `WaneBlockedError` up front
and never spends a failed transaction. The on-chain `execute()` still enforces
regardless, which is defense in depth.

## Solana

The Solana client targets a registry program and a session-vault program with
pure `@solana/web3.js`, no Anchor runtime. Instruction data is the 8-byte anchor
discriminator (`sha256("global:<name>")[0..8]`) plus borsh, matching the deployed
programs. The screened `wane_execute` always attaches the destination's Address
antibody PDA at its derived address, whether or not it exists on-chain. The
program binds that account to the destination by seeds, so a flagged send cannot
be slipped through by omitting or swapping the account.

## Fail-closed guarantee

Both clients raise `WaneBlockedError` before any value moves when a target is
flagged. The EVM `send()` additionally refuses to broadcast when the wallet is
not 7702-protected, instead of silently sending an unscreened self-call that
would look like success.
