// Drive a Wane session wallet on Solana devnet: enroll, deposit, and make a
// screened transfer. The program reverts before any lamport moves if the
// destination carries an enforceable antibody.
// Run with: tsx examples/solana-session.ts (uses a fresh keypair, fund it first)
import { Wane, Keypair, PublicKey } from "wane-sdk/solana";

async function main() {
  const wane = Wane.devnet();
  const owner = Keypair.generate();
  const destination = new PublicKey("So11111111111111111111111111111111111111112");

  console.log(`owner: ${owner.publicKey.toBase58()}`);
  console.log("fund this address on devnet, then re-run with a persisted keypair");

  // free read first: reading is immunity
  const verdict = await wane.checkAddress(destination);
  console.log(verdict.flagged ? "destination is flagged" : "destination is clear");

  // build the one-time enroll + a deposit, submit together
  const enroll = wane.enrollIx(owner.publicKey, { blockKinds: 1, perTxCap: 5_000_000_000n });
  const deposit = wane.depositIx(owner.publicKey, 1_000_000_000n);
  const setup = await wane.submit([enroll, deposit], owner, [owner]);
  console.log(`enroll + deposit: ${setup}`);

  // screened send: throws if the program reverts on a flagged destination
  const sig = await wane.send(owner, destination, 100_000_000n);
  console.log(`screened transfer: ${sig}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
