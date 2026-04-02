// Turn on EIP-7702 protection with one signature, then route a send through the
// on-chain screen. A flagged target reverts before any value moves.
// Run with: PRIVATE_KEY=0x... tsx examples/base-protect.ts <to> <valueWei>
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { Wane } from "wane-sdk";

async function main() {
  const pk = process.env.PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("set PRIVATE_KEY=0x...");
  const to = (process.argv[2] ?? "0x0000000000000000000000000000000000000001") as `0x${string}`;
  const value = BigInt(process.argv[3] ?? "0");

  const account = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account, chain: base, transport: http() });
  const wane = Wane.base({ agent: account.address });

  // one-time: delegate the wallet's code to WaneDelegate and enroll a policy
  const { setCodeTx, alreadyProtected } = await wane.enable(wallet);
  console.log(alreadyProtected ? "already protected" : `protection enabled: ${setCodeTx}`);

  // dry-run the on-chain screen, then send through it
  const wouldAllow = await wane.wouldAllow({ to, value }, account.address);
  if (!wouldAllow.allowed) {
    console.log(`screen would block ${to}: ${wouldAllow.reasonText}`);
    return;
  }
  const tx = await wane.send(wallet, { to, value });
  console.log(`screened send sent: ${tx}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
