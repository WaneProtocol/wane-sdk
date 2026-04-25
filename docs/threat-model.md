# Threat Model

## What Wane screens

The registry tracks four kinds of threat, with matching numeric values on both
chains:

| Kind | Value | What it flags |
|---|---|---|
| Address | 0 | a known-bad recipient or contract |
| CallPattern | 1 | a selector or call shape used by drainers |
| Bytecode | 2 | a contract codehash, catches re-deployed drainers |
| Semantic | 3 | a higher-level marker hashed into the subject |

A target is enforceable when it carries an active (not revoked) antibody. Reads
return `{ flagged, antibodyId }` (EVM) or `{ flagged, antibody }` (Solana).

## What the screen stops

- An agent transferring to or approving a flagged address.
- An agent calling a contract whose codehash matches a re-deployed drainer.
- On the EVM vault, an ERC-20 transfer whose recipient is decoded from calldata
  and flagged, even when the token contract itself is clean.
- On Solana, a session-vault send whose destination carries an Address antibody,
  bound by PDA seeds so the account cannot be omitted.

## What the screen does not stop

- A target that has never been reported. The first agent to hit a novel threat
  is not protected by the registry; it protects everyone after by calling
  `report`. The `protect()` loop on EVM automates this.
- Off-chain compromise: stolen keys, a malicious RPC returning forged reads, or
  a host environment that bypasses the SDK entirely. Route sends through the SDK
  or the on-chain delegate / vault to keep the screen in the path.
- Value already approved before protection was enabled. Re-check existing
  allowances after enrolling.

## Fail-closed behavior

- A flagged target raises `WaneBlockedError` before any value moves.
- EVM `send()` refuses to broadcast on an unprotected wallet rather than sending
  an unscreened self-call.
- Solana `send` throws if the program reverts on a flagged destination.

## Reporting

Reports stake `$WANE`. A live duplicate is skipped (the client checks first), so
reporting is idempotent and an agent can call it freely on every suspected
attack without double-staking.
