/**
 * wane-sdk: on-chain immune memory for AI agents.
 *
 * Two things an agent does:
 *   1. check()        before it signs   -> reading is immunity (free, view)
 *   2. report()       when it detects a novel threat -> auto-publishes an
 *                     antibody so every other agent is immune next time
 *
 * Reading needs only a public RPC. Reporting needs a wallet + $WANE stake.
 */

import {
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  encodeFunctionData,
  decodeErrorResult,
  BaseError,
  pad,
  getAddress,
  type Address,
  type Chain,
  type Hex,
  parseEventLogs,
  type PublicClient,
} from "viem";

/**
 * Minimal wallet surface the SDK needs. Accepting this structural type instead
 * of viem's full generic `WalletClient` avoids cross-version type identity
 * clashes when the host app pins a different viem build.
 *
 * `signAuthorization` and `sendTransaction` are only needed for the 7702
 * protection path (enable / send / wrap); `writeContract` only for report().
 */
export type WaneWallet = {
  account?: { address: Address } | undefined;
  writeContract: (args: any) => Promise<Hex>;
  sendTransaction?: (args: any) => Promise<Hex>;
  signAuthorization?: (args: any) => Promise<any>;
};

export type WaneCall = { to: Address; value?: bigint; data?: Hex };
import { base, baseSepolia } from "viem/chains";
import {
  waneRegistryAbi,
  wanePolicyAbi,
  wanePolicyEnrollAbi,
  waneDelegateAbi,
  waneVaultAbi,
  waneVaultFactoryAbi,
  erc20ApproveAbi,
} from "./abi.js";

/** The EIP-7702 delegation-indicator prefix: an account delegated to ADDR has
 *  code exactly 0xef0100 || ADDR (23 bytes). */
const DELEGATION_PREFIX = "0xef0100";

/**
 * Canonical Wane deployments. Use the static factories `Wane.baseSepolia()` /
 * `Wane.base()` so integrators never hand-paste an address. `base` is null until
 * the mainnet deployment lands (the factory throws a clear error until then).
 */
export const DEPLOYMENTS = {
  baseSepolia: {
    chain: baseSepolia,
    registry: "0x027F371fB139A57EcD2A2E175d30157eEA1C56de" as Address,
    policy: "0x571Ac11310fb5d69D660C30f696a81e097Db8586" as Address,
    delegate: "0x6350D5850143277F7657549FB505569917641927" as Address,
    token: "0x1465E33f687C557BF275D6d692eC1316126d8e9e" as Address,
    // WaneVaultFactory: filled once deployed on Sepolia
    vaultFactory: null as Address | null,
  },
  base: {
    chain: base,
    registry: "0x027F371fB139A57EcD2A2E175d30157eEA1C56de" as Address,
    policy: "0x26deE4503C7f67356837ED41cE285026EF256667" as Address,
    delegate: "0x9175d735D512d730510148ED4D6702eF99CF4901" as Address,
    token: "0x1465E33f687C557BF275D6d692eC1316126d8e9e" as Address,
    // WaneVaultFactory, live on Base mainnet
    vaultFactory: "0x6640dd13F172c356f671d35ef76695792908e2a9" as Address,
  } as null | {
    chain: Chain;
    registry: Address;
    policy: Address;
    delegate: Address;
    token: Address;
    vaultFactory: Address | null;
  },
} as const;

export enum ThreatKind {
  Address = 0,
  CallPattern = 1,
  Bytecode = 2,
  Semantic = 3,
}

export type Verdict = {
  flagged: boolean;
  antibodyId: bigint;
  kind: ThreatKind;
  subject: Hex;
};

export type MintedAntibody = {
  id: bigint;
  kind: ThreatKind;
  subject: Hex;
  publisher: Address;
  evidence: Hex;
  blockNumber: bigint;
  txHash: Hex;
};

export type WaneConfig = {
  registry: Address;
  token?: Address; // required only for report()
  policy?: Address; // required only for per-agent policy checks
  delegate?: Address; // required only for the 7702 protection path (enable/send/wrap)
  vaultFactory?: Address; // required only for the vault (smart-wallet) path
  agent?: Address; // this bot's address, for policy checks
  rpcUrl?: string;
  publicClient?: PublicClient;
  chain?: Chain;
};

export const POLICY_REASON = [
  "allowed",
  "blocklisted",
  "flagged by antibody",
  "over per-tx cap",
  "over daily cap",
  "paused (kill switch)",
  "globally denied recipient",
  "policy expired",
  "selector not allowed",
  "token not allowed",
] as const;

export type PolicyVerdict = { allowed: boolean; reason: number; reasonText: string };

const CLEAN: Omit<Verdict, "kind" | "subject"> = {
  flagged: false,
  antibodyId: 0n,
};

export class Wane {
  readonly registry: Address;
  readonly token?: Address;
  readonly policy?: Address;
  readonly delegate?: Address;
  readonly vaultFactory?: Address;
  readonly agent?: Address;
  private readonly pc: PublicClient;
  private readonly chain: any;

  constructor(cfg: WaneConfig) {
    this.registry = cfg.registry;
    this.token = cfg.token;
    this.policy = cfg.policy;
    this.delegate = cfg.delegate;
    this.vaultFactory = cfg.vaultFactory;
    this.agent = cfg.agent;
    this.chain = cfg.chain ?? baseSepolia;
    this.pc = (cfg.publicClient ??
      createPublicClient({
        chain: this.chain,
        transport: http(cfg.rpcUrl),
      })) as PublicClient;
  }

  /* ── zero-config factories: no address pasting ───────────────────── */

  /** Wane wired to the Base Sepolia deployment. Pass `agent` for policy/7702. */
  static baseSepolia(cfg: Partial<WaneConfig> & { agent?: Address } = {}): Wane {
    const d = DEPLOYMENTS.baseSepolia;
    return new Wane({
      registry: d.registry,
      policy: d.policy,
      delegate: d.delegate,
      token: d.token,
      vaultFactory: d.vaultFactory ?? undefined,
      chain: d.chain,
      ...cfg,
    });
  }

  /** Wane wired to the Base mainnet deployment (available once deployed). */
  static base(cfg: Partial<WaneConfig> & { agent?: Address } = {}): Wane {
    const d = DEPLOYMENTS.base;
    if (!d) {
      throw new Error("Wane is not deployed on Base mainnet yet. Use Wane.baseSepolia() for now.");
    }
    return new Wane({
      registry: d.registry,
      policy: d.policy,
      delegate: d.delegate,
      token: d.token,
      vaultFactory: d.vaultFactory ?? undefined,
      chain: d.chain,
      ...cfg,
    });
  }

  /* ── read path: call this before you sign. reading is immunity. ──── */

  /** Is this address covered by an active antibody? Free view call.
   *  The target is normalized (getAddress) so any casing/checksum works. */
  async checkAddress(target: Address): Promise<Verdict> {
    const addr = getAddress(target);
    const [flagged, id] = (await this.pc.readContract({
      address: this.registry,
      abi: waneRegistryAbi,
      functionName: "checkAddress",
      args: [addr],
    })) as [boolean, bigint];
    return {
      ...CLEAN,
      flagged,
      antibodyId: id,
      kind: ThreatKind.Address,
      subject: pad(addr),
    };
  }

  /** Is this contract codehash flagged? Catches re-deployed drainers. */
  async checkBytecode(codehash: Hex): Promise<Verdict> {
    const [flagged, id] = (await this.pc.readContract({
      address: this.registry,
      abi: waneRegistryAbi,
      functionName: "checkBytecode",
      args: [codehash],
    })) as [boolean, bigint];
    return { ...CLEAN, flagged, antibodyId: id, kind: ThreatKind.Bytecode, subject: codehash };
  }

  /** Generic check by kind + subject. */
  async check(kind: ThreatKind, subject: Hex): Promise<Verdict> {
    const [flagged, id] = (await this.pc.readContract({
      address: this.registry,
      abi: waneRegistryAbi,
      functionName: "check",
      args: [kind, subject],
    })) as [boolean, bigint];
    return { ...CLEAN, flagged, antibodyId: id, kind, subject };
  }

  /**
   * Guard helper. Throws if the target is flagged, so an agent can wrap any
   * action in one call:  await wane.assertSafe(target)
   */
  async assertSafe(target: Address): Promise<void> {
    const v = await this.checkAddress(target);
    if (v.flagged) {
      throw new WaneBlockedError(target, v.antibodyId);
    }
  }

  /* ── herd-immunity feed: the swarm's shared memory, live ──────────── */

  /** How many antibodies the registry knows right now. Free view. */
  async count(): Promise<bigint> {
    return (await this.pc.readContract({
      address: this.registry,
      abi: waneRegistryAbi,
      functionName: "antibodyCount",
    })) as bigint;
  }

  /**
   * Recent antibodies, newest first. Reads `AntibodyMinted` logs, so it shows
   * what the swarm learned lately, the "one bot got hit, now everyone sees it"
   * feed.
   *
   * Scans backward in chunks (default 800 blocks) to stay under the block-range
   * cap that public RPCs enforce, stopping once `limit` are found or `lookback`
   * blocks are exhausted. `chunk` is configurable for archive RPCs.
   */
  async recent(
    limit = 20,
    opts: { lookback?: bigint; chunk?: bigint } = {},
  ): Promise<MintedAntibody[]> {
    const lookback = opts.lookback ?? 200_000n;
    const chunk = opts.chunk ?? 800n;
    const head = await this.pc.getBlockNumber();
    const floor = head > lookback ? head - lookback : 0n;
    const out: MintedAntibody[] = [];
    let to = head;
    while (to >= floor && out.length < limit) {
      const from = to > chunk ? to - chunk : 0n;
      const logs = await this.pc.getContractEvents({
        address: this.registry,
        abi: waneRegistryAbi,
        eventName: "AntibodyMinted",
        fromBlock: from < floor ? floor : from,
        toBlock: to,
      });
      for (const l of logs.reverse() as any[]) {
        out.push({
          id: l.args?.id as bigint,
          kind: Number(l.args?.kind ?? 0) as ThreatKind,
          subject: l.args?.subject as Hex,
          publisher: l.args?.publisher as Address,
          evidence: l.args?.evidence as Hex,
          blockNumber: l.blockNumber as bigint,
          txHash: l.transactionHash as Hex,
        });
        if (out.length >= limit) break;
      }
      if (from === 0n) break;
      to = from - 1n;
    }
    return out.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : -1)).slice(0, limit);
  }
