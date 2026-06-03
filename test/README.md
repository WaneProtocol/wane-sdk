# tests

`encoding.test.ts` asserts the load-bearing, deterministic facts that make the
SDK produce on-chain-valid transactions:

- Solana anchor discriminators are `sha256("global:<name>")[0..8]` and 8 bytes
- Solana PDA derivation matches the program seeds for antibody, policy, vault,
  and config accounts
- Solana instruction builders target the right program with the right account
  count, and the screened send binds the destination antibody PDA by seeds
- The EVM address subject is a 32-byte left-padded address matching viem `pad`
- The shared `ThreatKind` taxonomy has matching numeric values on both chains

These checks touch no network, no wallet, and no live state, so `npm test` is
fast and stable.
