# Contributing to wane-sdk

Thanks for considering a contribution. This is a short, opinionated guide that
gets you from a clean checkout to a merged PR with minimal friction.

## Ground rules

- One concern per PR. Mixed PRs are slow to review.
- Tests live in `test/` as `*.test.ts` and must assert real, deterministic
  facts (discriminators, PDA seeds, encoding), not network state.
- New public APIs need a short doc comment and one usage example.
- We follow [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`).

## Local setup

```bash
git clone https://github.com/WaneProtocol/wane-sdk
cd wane-sdk
npm install
npm run lint    # tsc --noEmit
npm test        # jest
npm run build
```

You need Node.js >= 18. The EVM client peer-depends on `viem`, the Solana client
on `@solana/web3.js`; both install as devDependencies for local work.

## Before submitting

1. `npm run format:check` and fix with `npm run format`.
2. `npm run lint` passes with no type errors.
3. `npm test` is green.
4. Update `CHANGELOG.md` under the latest unreleased section.
5. If you touched the EVM ABI slice or the Solana discriminators / PDA seeds,
   add or update a `test/encoding.test.ts` case proving the new value.

## Reporting bugs

Open an issue with the **Bug report** template. Include the chain, the SDK
version, a minimal reproduction, and a transaction signature or hash where
relevant.

## Proposing features

Open a **Feature request** issue first. Changes that alter the threat taxonomy
or on-chain account layouts need protocol discussion before code lands.

## Security

For vulnerabilities, follow [`SECURITY.md`](./SECURITY.md). Do not open a public
issue.

## Code of conduct

This project follows the
[Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
