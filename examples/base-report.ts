// Report a novel threat on Base so every other agent goes immune. Idempotent:
// a live duplicate is skipped, so this is safe to call on every suspected attack.
// Run with: PRIVATE_KEY=0x... tsx examples/base-report.ts <badAddress>
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { Wane, evm } from "wane-sdk";

async function main() {
  const pk = process.env.PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("set PRIVATE_KEY=0x...");
  const bad = (process.argv[2] ?? "0x000000000000000000000000000000000000dEaD") as `0x${string}`;

  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain: base, transport: http() });
  const wane = Wane.base({ agent: account.address });

  const res = await wane.report(wallet, { subject: evm.addressSubject(bad) });
  if (res.skipped) {
    console.log(`${bad} is already a known antibody, nothing to do`);
  } else {
    console.log(`minted antibody #${res.id} for ${bad}: ${res.txHash}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
