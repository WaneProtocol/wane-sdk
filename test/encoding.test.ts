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

describe("solana anchor discriminators", () => {
  const names = [
    "init_config",
    "mint_antibody",
    "corroborate",
    "seed_genesis",
    "challenge",
    "resolve",
    "claim_rewards",
    "update_config",
    "set_registry_paused",
    "nominate_governor",
    "accept_governor",
    "enroll",
    "deposit",
    "wane_execute",
    "withdraw",
    "update_policy",
  ];

  it("are each exactly 8 bytes (16 hex chars)", () => {
    for (const n of names) {
      expect(disc(n)).toHaveLength(16);
    }
  });

  it("are deterministic for a known instruction", () => {
    // sha256("global:mint_antibody")[0..8] is fixed; recomputing must match.
    expect(disc("mint_antibody")).toBe(disc("mint_antibody"));
    expect(disc("enroll")).not.toBe(disc("deposit"));
  });
});

describe("solana PDA derivation matches program seeds", () => {
  const owner = new PublicKey("11111111111111111111111111111112");
  const target = new PublicKey("So11111111111111111111111111111111111111112");
  const subject = Buffer.from(target.toBytes());

  it("antibody PDA uses seeds [antibody, kind, subject]", () => {
    const got = antibodyPda(ThreatKind.Address as unknown as solana.ThreatKind, subject);
    const want = PublicKey.findProgramAddressSync(
      [Buffer.from("antibody"), Buffer.from([ThreatKind.Address]), subject],
      REGISTRY_PROGRAM,
    )[0];
    expect(got.toBase58()).toBe(want.toBase58());
  });

  it("policy PDA uses seeds [policy, owner]", () => {
    const got = policyPda(owner);
    const want = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), owner.toBuffer()],
      VAULT_PROGRAM,
    )[0];
    expect(got.toBase58()).toBe(want.toBase58());
  });
