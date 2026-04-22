# Encoding

The SDK builds transactions that the deployed programs accept byte for byte. The
test suite locks these values down so a regression fails before it ships.

## Solana anchor discriminators

Instruction data starts with the 8-byte anchor discriminator,
`sha256("global:<instruction_name>")[0..8]`, followed by borsh-encoded args. The
SDK computes this at call time, so adding an instruction needs only its name.

## Solana PDA seeds

| Account | Seeds | Program |
|---|---|---|
| antibody | `["antibody", kind, subject]` | registry |
| config | `["config"]` | registry |
| policy | `["policy", owner]` | vault |
| vault | `["vault", owner]` | vault |

The screened send always attaches the destination's antibody PDA at its derived
address. The program binds that account to the destination by seeds, so a flagged
send cannot be slipped through by omitting or swapping the account.

## EVM address subject

An address threat subject is the 20-byte address left-padded to 32 bytes
(`pad(address)`), matching what the registry indexes on. `evm.addressSubject`
returns this `bytes32` form for `report` and `check`.
