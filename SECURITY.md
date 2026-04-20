# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.4.x | yes |
| 0.3.x | security fixes only |
| < 0.3 | no |

## Reporting a Vulnerability

If you believe you have found a vulnerability in wane-sdk, in the instruction
or transaction construction paths, or in how the SDK derives addresses, PDAs,
or screens calldata, report it privately by emailing `security@wane.network`
with:

- A short description of the issue
- A minimal reproduction (a failing test case, program logs, or transaction
  hash / signature that demonstrates the bug)
- Your assessment of the impact
- Whether you intend to disclose publicly and, if so, on what timeline

We acknowledge reports within 72 hours and provide a disclosure timeline that
does not put users at risk. Please do not open a public GitHub issue for
security reports.

## Scope

In scope:

- The EVM client signing and address-encoding paths (`src/evm`)
- The Solana client instruction builders and PDA derivation (`src/solana`)
- Any path where a flagged target could be slipped past the on-chain screen

Out of scope:

- The on-chain contracts and programs themselves (reported in their own repos)
- Issues that require a compromised host environment or stolen keys
- Social engineering of community members

## Hardening Notes

- The Solana session vault binds the destination's antibody PDA by seeds, so a
  flagged send cannot be slipped through by omitting or swapping the account.
- The EVM `send()` refuses to broadcast an unscreened transfer if the wallet is
  not 7702-protected, instead of silently sending a no-op self-call.
- Both clients fail closed: a flagged target raises `WaneBlockedError` before
  any value moves.

## Coordinated Disclosure

We follow a 90-day coordinated disclosure window by default and may extend it
for critical issues that need user-side action.
