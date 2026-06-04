// Verify SDK encoding matches the deployed programs on both chains.
//
// Solana: anchor "global:<name>" discriminators + PDA seeds must byte-match the
// on-chain programs, else the instructions this SDK builds get rejected.
// EVM: address subject padding + checksum normalization must match what the
// registry indexes on, else a clean address looks unflagged when it is flagged.
//
// These are pure, deterministic checks: no network, no wallet, no live state.

import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { pad, getAddress } from "viem";

import { solana, evm, ThreatKind } from "../src/index.js";

const {
  Wane: SolWane,
  antibodyPda,
  policyPda,
  vaultPda,
  configPda,
  REGISTRY_PROGRAM,
  VAULT_PROGRAM,
} = solana;

function disc(name: string): string {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8).toString("hex");
}
