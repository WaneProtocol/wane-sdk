// A drop-in Wane agent for Base. The agent holds ONLY a scoped session key,
// never the owner's master wallet. Every payout it makes runs through the
// owner's vault: screened against the antibody registry and bounded by the
// per-tx / daily caps and expiry the owner set. A flagged recipient or an
// over-cap amount reverts before any value moves, and the agent can never
// withdraw or change the session.
//
// Setup (one time):
//   1. Owner issues a session key in the Wane app (Vault, "agent key" tab),
//      then pastes the secret here as WANE_SESSION_KEY and the vault address
//      as WANE_VAULT.
//   2. The agent calls pay(to, amount). That is the whole integration.
//
// Run: WANE_VAULT=0x.. WANE_SESSION_KEY=0x.. tsx examples/agent-base.ts 0xRecipient 0.0005

import { createWalletClient, http, parseEther, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { evm } from "wane-sdk";

const VAULT = process.env.WANE_VAULT as Address;
const SESSION_KEY = process.env.WANE_SESSION_KEY as Hex;
if (!VAULT || !SESSION_KEY) {
  throw new Error("set WANE_VAULT and WANE_SESSION_KEY (issue one in the Wane app, Vault > agent key)");
}

// the agent's only credential: a scoped session key, not the owner's wallet.
const session = privateKeyToAccount(SESSION_KEY);
const wallet = createWalletClient({ account: session, chain: base, transport: http() });
const wane = evm.Wane.base();

/** The single call your agent logic uses to move money. Screened + capped. */
export async function pay(to: Address, eth: string): Promise<Hex> {
  return wane.vaultSend(wallet, VAULT, { to, value: parseEther(eth) });
}

// demo: pay the recipient passed on the CLI, or just print which key is loaded.
const [to, amount] = process.argv.slice(2) as [Address, string];
console.log(`agent session key: ${session.address}`);
console.log(`vault: ${VAULT}`);
if (to) {
  pay(to, amount ?? "0.0005")
    .then((tx) => console.log(`paid (screened, within cap): ${tx}`))
    .catch((e) => console.error(`blocked by Wane: ${(e as Error).message}`));
}
