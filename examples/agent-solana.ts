// A drop-in Wane agent for Solana. The agent holds ONLY a scoped session key,
// a keypair the owner authorized via set_session, never the owner's wallet.
// Every send runs through the owner's vault: screened against the antibody
// registry and bounded by the policy caps and session expiry. A flagged
// destination reverts before any lamport moves, and the session key can never
// withdraw or change the policy.
//
// Setup (one time):
//   1. Owner issues a session key in the Wane app (Vault, Solana, "agent key"),
//      downloads the json, and drops it next to this file.
//   2. The agent loads the json and calls pay(to, sol). WANE_OWNER is the
//      owner's (master) pubkey, used to derive the vault.
//
// Run: WANE_OWNER=<ownerPubkey> tsx examples/agent-solana.ts <recipient> 0.02
//   with the session keypair json at ./wane-agent-session.json

import { readFileSync } from "node:fs";
import { Wane, Keypair, PublicKey } from "wane-sdk/solana";

const OWNER = new PublicKey(process.env.WANE_OWNER ?? "");
const FILE = process.env.WANE_SESSION_FILE ?? "./wane-agent-session.json";
const secret = JSON.parse(readFileSync(FILE, "utf8")) as number[];
const session = Keypair.fromSecretKey(Uint8Array.from(secret)); // the agent's only credential
const wane = Wane.devnet();

/** The single call your agent uses to move SOL. Screened + capped, can't withdraw. */
export async function pay(to: string, sol: number): Promise<string> {
  return wane.sendAsSession(session, OWNER, new PublicKey(to), BigInt(Math.round(sol * 1e9)));
}

const [to, amount] = process.argv.slice(2);
console.log(`agent session key: ${session.publicKey.toBase58()}`);
console.log(`owner / vault derived from: ${OWNER.toBase58()}`);
if (to) {
  pay(to, parseFloat(amount ?? "0.02"))
    .then((sig) => console.log(`paid (screened, within cap): ${sig}`))
    .catch((e) => console.error(`blocked by Wane: ${(e as Error).message}`));
}
