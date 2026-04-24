# Quickstart

## Install

```bash
npm install wane-sdk viem            # for Base
npm install wane-sdk @solana/web3.js # for Solana
```

You only need the peer dependency for the chain you use.

## Read before you sign (Base)

```ts
import { Wane } from "wane-sdk";

const wane = Wane.base({ agent });
if ((await wane.checkAddress(target)).flagged) throw new Error("flagged");
```

## One-signature protection (Base)

```ts
await wane.enable(wallet);                 // EIP-7702, one signature
await wane.send(wallet, { to, value });    // screened on-chain, reverts if flagged
```

## Session wallet (Solana)

```ts
import { Wane } from "wane-sdk/solana";

const wane = Wane.devnet();
await wane.submit([wane.enrollIx(owner), wane.depositIx(owner, 1_000_000_000n)], signer, [signer]);
await wane.send(signer, destination, 100_000_000n); // throws if the program reverts
```

## Report a novel threat (Base)

```ts
import { evm } from "wane-sdk";
await wane.report(wallet, { subject: evm.addressSubject(badAddress) });
```

Reporting is idempotent: a live duplicate is skipped, so an agent can call it on
every suspected attack without double-staking `$WANE`.
