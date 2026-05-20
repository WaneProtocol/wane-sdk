// wane-sdk: the unified Wane client for AI agents.
//
// One package, two chains. An agent does the same three things on either chain:
//   1. check()  a target before it signs   (reading is immunity, free view)
//   2. report() a novel threat             (mints an antibody, herd goes immune)
//   3. drive a session wallet that screens every outflow on-chain
//
// EVM (Base) and Solana clients ship side by side. They share the threat model
// but not the runtime, so each lives in its own namespace to keep the deps a
// host app pulls (viem vs @solana/web3.js) opt-in via peerDependencies.
//
//   import { Wane } from "wane-sdk";
//   const base = Wane.base({ agent });        // viem-backed
//   const sol  = Wane.solana();               // @solana/web3.js-backed
//
// Or import a single chain to avoid loading the other runtime:
//   import { evm } from "wane-sdk";
//   import { solana } from "wane-sdk";

import * as evm from "./evm/index.js";
import * as solana from "./solana/index.js";

export * as evm from "./evm/index.js";
export * as solana from "./solana/index.js";

/** Shared four-kind threat taxonomy. Numeric values match both on-chain registries. */
export enum ThreatKind {
  Address = 0,
  CallPattern = 1,
  Bytecode = 2,
  Semantic = 3,
}
