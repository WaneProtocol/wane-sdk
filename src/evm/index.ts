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

  /**
   * Subscribe to new antibodies as they are minted, the live herd-immunity
   * stream. Your agent reacts the instant another agent reports a threat. Returns
   * an unsubscribe function.
   *
   *   const stop = wane.watch((ab) => myDenyCache.add(ab.subject));
   */
  watch(
    onAntibody: (ab: MintedAntibody) => void,
    opts: { onError?: (err: Error) => void } = {},
  ): () => void {
    return this.pc.watchContractEvent({
      address: this.registry,
      abi: waneRegistryAbi,
      eventName: "AntibodyMinted",
      onLogs: (logs: any[]) => {
        for (const l of logs) {
          onAntibody({
            id: l.args?.id as bigint,
            kind: Number(l.args?.kind ?? 0) as ThreatKind,
            subject: l.args?.subject as Hex,
            publisher: l.args?.publisher as Address,
            evidence: l.args?.evidence as Hex,
            blockNumber: l.blockNumber as bigint,
            txHash: l.transactionHash as Hex,
          });
        }
      },
      onError: opts.onError,
    });
  }

  /* ── policy path: full per-agent scope (caps, kill switch, TTL, lists) ── */

  /**
   * Evaluate an action against this agent's on-chain policy AND the antibody
   * registry. Pass a function selector to also enforce the selector allowlist
   * and call-pattern antibodies. Free view call. Requires config.policy + agent.
   */
  async checkPolicy(target: Address, amount: bigint = 0n, selector?: Hex): Promise<PolicyVerdict> {
    if (!this.policy || !this.agent) {
      throw new Error("checkPolicy needs config.policy and config.agent");
    }
    const useCall = !!selector && selector !== "0x00000000";
    const tgt = getAddress(target);
    const [allowed, reason] = (await this.pc.readContract({
      address: this.policy,
      abi: wanePolicyAbi,
      functionName: useCall ? "evaluateCall" : "evaluate",
      args: useCall ? [this.agent, tgt, selector, amount] : [this.agent, tgt, amount],
    })) as [boolean, number];
    return { allowed, reason, reasonText: POLICY_REASON[reason] ?? `reason ${reason}` };
  }

  /**
   * Guard helper. Throws WaneBlockedError if the policy would block the action.
   * Wrap any agent action: await wane.guard(target, amount, selector).
   */
  async guard(target: Address, amount: bigint = 0n, selector?: Hex): Promise<void> {
    const v = await this.checkPolicy(target, amount, selector);
    if (!v.allowed) {
      const e = new WaneBlockedError(target, 0n);
      e.message = `Wane policy blocked ${target}: ${v.reasonText}.`;
      throw e;
    }
  }

  /** Is a token allowed for this agent under its token allowlist? */
  async isTokenAllowed(token: Address): Promise<boolean> {
    if (!this.policy || !this.agent) return true;
    return (await this.pc.readContract({
      address: this.policy,
      abi: wanePolicyAbi,
      functionName: "isTokenAllowed",
      args: [this.agent, token],
    })) as boolean;
  }

  /* ── the automatic loop: guard, run, and auto-report on attack ────── */

  /**
   * Wrap a bot action so immunity is automatic end to end:
   *   1. guard the target against policy + antibodies before running
   *   2. run the action
   *   3. if it reverts/throws in a way that looks like a drain, AND a wallet
   *      is configured, mint an antibody so every other agent is immune next.
   *
   * This is the "one bot gets drained, every bot gets immune" loop with no
   * human in it. The bot reports itself.
   *
   * @returns the action result on success
   */
  async protect<T>(
    target: Address,
    action: () => Promise<T>,
    opts: {
      amount?: bigint;
      selector?: Hex;
      wallet?: WaneWallet; // needed to auto-report
      isAttack?: (err: unknown) => boolean; // classify a failure as an attack
      kind?: ThreatKind;
    } = {},
  ): Promise<T> {
    // 1. pre-flight guard (throws WaneBlockedError if already known-bad).
    //    Always check the antibody registry; additionally apply the per-agent
    //    policy when one is configured. Antibodies protect even unenrolled bots.
    await this.assertSafe(target);
    if (this.policy && this.agent) {
      await this.guard(target, opts.amount ?? 0n, opts.selector);
    }

    // 2. run
    try {
      return await action();
    } catch (err) {
      // 3. auto-report novel threats
      const looksLikeAttack = opts.isAttack ? opts.isAttack(err) : defaultIsAttack(err);
      if (looksLikeAttack && this.token && opts.wallet) {
        try {
          await this.report(opts.wallet, {
            kind: opts.kind ?? ThreatKind.Address,
            subject: addressSubject(target),
            evidence: keccak256(
              encodePacked(["string"], [String((err as Error)?.message ?? "attack")]),
            ),
          });
        } catch {
          // reporting is best-effort; never mask the original error
        }
      }
      throw err;
    }
  }

  /* ── 7702 protection path: one sign, then every send is screened ──── */

  /**
   * Is this account currently protected? True when its on-chain code is the
   * 7702 delegation indicator pointing at our WaneDelegate. Free view.
   */
  async isProtected(account?: Address): Promise<boolean> {
    if (!this.delegate) return false;
    const who = account ?? this.agent;
    if (!who) throw new Error("isProtected needs an account or config.agent");
    const code = (await this.pc.getCode({ address: who })) ?? "0x";
    const want = (DELEGATION_PREFIX + this.delegate.slice(2)).toLowerCase();
    return code.toLowerCase() === want;
  }

  /**
   * Turn protection on for an agent's own wallet. ONE signature.
   *
   *   1. signs an EIP-7702 authorization pointing the wallet's code at
   *      WaneDelegate, and sends the type-0x04 set-code tx
   *   2. (optional, default true) enrolls the wallet in WanePolicy so caps /
   *      kill-switch / kinds apply on top of the global antibody registry
   *
   * After this, route actions through `send()` / `wrap()` and each one is
   * screened on-chain before it runs. The wallet keeps its address, funds, and
   * keys; the delegate can only block, never move funds.
   */
  async enable(
    wallet: WaneWallet,
    opts: { enroll?: boolean; blockKinds?: number; perTxCap?: bigint; dailyCap?: bigint } = {},
  ): Promise<{ setCodeTx: Hex; enrollTx?: Hex; alreadyProtected: boolean }> {
    if (!this.delegate) throw new Error("enable() requires config.delegate");
    const account = wallet.account;
    if (!account) throw new Error("walletClient has no account");
    if (!wallet.signAuthorization || !wallet.sendTransaction) {
      throw new Error("wallet must support signAuthorization + sendTransaction (EIP-7702)");
    }

    // skip the set-code tx if already pointing at our delegate
    const already = await this.isProtected(account.address);
    let setCodeTx: Hex;
    if (already) {
      setCodeTx = "0x" as Hex;
    } else {
      const auth = await wallet.signAuthorization({
        account,
        contractAddress: this.delegate,
        executor: "self",
      });
      setCodeTx = await wallet.sendTransaction({
        account,
        to: account.address,
        authorizationList: [auth],
        data: "0x",
        chain: this.chain,
      });
      await this.pc.waitForTransactionReceipt({ hash: setCodeTx });
    }

    let enrollTx: Hex | undefined;
    if (opts.enroll !== false && this.policy) {
      enrollTx = await wallet.writeContract({
        address: this.policy,
        abi: wanePolicyEnrollAbi,
        functionName: "enroll",
        args: [
          account.address,
          opts.blockKinds ?? 0,
          0,
          opts.perTxCap ?? 0n,
          opts.dailyCap ?? 0n,
          0,
        ],
        account,
        chain: this.chain,
      });
      await this.pc.waitForTransactionReceipt({ hash: enrollTx });
    }

    return { setCodeTx, enrollTx, alreadyProtected: already };
  }

  /**
   * Dry-run an action through the delegate's on-chain screen without sending.
   * Returns whether it would be allowed and, if not, the reason. Free view.
   *
   * IMPORTANT: this is called AT the protected wallet's address, because the
   * delegate keys its policy lookup on `address(this)` (the wallet itself under
   * 7702). The wallet address is required: there is no safe default. Falling
   * back to the delegate-contract address would evaluate an unenrolled account
   * and silently return "allowed" for everything.
   */
  async wouldAllow(call: WaneCall, account?: Address): Promise<PolicyVerdict> {
    if (!this.delegate) throw new Error("wouldAllow needs config.delegate");
    const who = account ?? this.agent;
    if (!who)
      throw new Error("wouldAllow needs the protected wallet address (account or config.agent)");
    const [allowed, reason] = (await this.pc.readContract({
      address: who,
      abi: waneDelegateAbi,
      functionName: "wouldAllow",
      args: [getAddress(call.to), call.value ?? 0n, call.data ?? "0x"],
    })) as [boolean, number];
    return { allowed, reason, reasonText: POLICY_REASON[reason] ?? `reason ${reason}` };
  }

  /**
   * Send a single action THROUGH the delegate's screen. This is the protected
   * replacement for walletClient.sendTransaction: the tx calls the wallet's own
   * execute(), which screens the target against antibodies + policy on-chain and
   * reverts (Blocked) before any value moves if it is flagged.
   *
   * Requires the wallet to already be 7702-protected (call enable() once first).
   * If it is not, this throws instead of silently sending an unscreened no-op.
   */
  async send(wallet: WaneWallet, call: WaneCall): Promise<Hex> {
    const account = wallet.account;
    if (!account) throw new Error("walletClient has no account");
    if (!wallet.sendTransaction) throw new Error("wallet must support sendTransaction");
    if (!this.delegate) throw new Error("send() requires config.delegate");

    // Guard against the silent-failure trap: if the wallet is NOT delegated, a
    // to=self call would hit an EOA with no code, ignore the execute() calldata,
    // and just move value to itself, looking like success while screening nothing.
    if (!(await this.isProtected(account.address))) {
      throw new Error(
        "wallet is not protected: call wane.enable(wallet) once before send(). " +
          "Sending unscreened was refused.",
      );
    }

    // pre-screen via the same on-chain view the delegate enforces, so a blocked
    // action throws a clear WaneBlockedError up front and never spends a failed
    // tx. The on-chain execute() still enforces regardless (defense in depth).
    const v = await this.wouldAllow(call, account.address);
    if (!v.allowed) throw blockedError(call.to, v.reasonText);

    const data = encodeFunctionData({
      abi: waneDelegateAbi,
      functionName: "execute",
      args: [getAddress(call.to), call.value ?? 0n, call.data ?? "0x"],
    });
    // to == self: invokes this wallet's own delegate code (execute), which screens.
    try {
      return await wallet.sendTransaction({
        account,
        to: account.address,
        value: call.value ?? 0n,
        data,
        chain: this.chain,
      });
    } catch (err) {
      throw decodeBlocked(err) ?? err;
    }
  }

  /**
   * Send several actions atomically through the screen. Any flagged target
   * reverts the whole batch. Same protection and guards as send().
   */
  async sendBatch(wallet: WaneWallet, calls: WaneCall[]): Promise<Hex> {
    const account = wallet.account;
    if (!account) throw new Error("walletClient has no account");
    if (!wallet.sendTransaction) throw new Error("wallet must support sendTransaction");
    if (!this.delegate) throw new Error("sendBatch() requires config.delegate");
    if (calls.length === 0) throw new Error("sendBatch() needs at least one call");
    if (!(await this.isProtected(account.address))) {
      throw new Error("wallet is not protected: call wane.enable(wallet) once before sendBatch().");
    }

    let total = 0n;
    const targets: Address[] = [];
    const values: bigint[] = [];
    const datas: Hex[] = [];
    for (const c of calls) {
      // pre-screen every leg so the caller learns exactly which one is blocked
      const v = await this.wouldAllow(c, account.address);
      if (!v.allowed) throw blockedError(c.to, v.reasonText);
      targets.push(getAddress(c.to));
      values.push(c.value ?? 0n);
      datas.push(c.data ?? "0x");
      total += c.value ?? 0n;
    }
    const data = encodeFunctionData({
      abi: waneDelegateAbi,
      functionName: "executeBatch",
      args: [targets, values, datas],
    });
    try {
      return await wallet.sendTransaction({
        account,
        to: account.address,
        value: total,
        data,
        chain: this.chain,
      });
    } catch (err) {
      throw decodeBlocked(err) ?? err;
    }
  }

  /**
   * Drop-in wrapper. Returns an object whose `sendTransaction({to,value,data})`
   * transparently routes through the Wane screen. An agent swaps one line:
   *
   *   const client = wane.wrap(walletClient)   // instead of walletClient
   *   await client.sendTransaction({ to, value, data })  // now screened
   *
   * Anything not flagged behaves exactly as before; a flagged target throws
   * a WaneBlockedError instead of draining the wallet.
   */
  wrap(wallet: WaneWallet): {
    sendTransaction: (call: WaneCall) => Promise<Hex>;
    sendBatch: (calls: WaneCall[]) => Promise<Hex>;
  } {
    return {
      sendTransaction: (call: WaneCall) => this.send(wallet, call),
      sendBatch: (calls: WaneCall[]) => this.sendBatch(wallet, calls),
    };
  }

  /* ── write path: auto-publish a novel threat ─────────────────────── */

  /**
   * Report a novel threat. Idempotent against the registry (mint reverts on a
   * live duplicate; we check first and skip). Requires a wallet + $WANE stake.
   *
   * Typical agent usage: after your own runtime detects a drain attempt that
   * the registry does NOT yet know about, call report() so the next agent is
   * immune. This is the "auto-publish on novel block" behavior.
   */
  async report(
    wallet: WaneWallet,
    opts: {
      kind?: ThreatKind;
      subject: Hex; // address (padded), codehash, or marker hash
      evidence?: Hex; // hash of the proof (tx, payload). defaults to subject hash
      autoApprove?: boolean; // approve $WANE stake first (default true)
    },
  ): Promise<{ skipped: boolean; txHash?: Hex; id?: bigint }> {
    const kind = opts.kind ?? ThreatKind.Address;
    const subject = opts.subject;

    // skip if already known and active (reading is free)
    const existing = await this.check(kind, subject);
    if (existing.flagged) return { skipped: true };

    if (!this.token) throw new Error("report() requires config.token ($WANE)");
    const account = wallet.account;
    if (!account) throw new Error("walletClient has no account");

    if (opts.autoApprove !== false) {
      const stake = (await this.pc.readContract({
        address: this.registry,
        abi: waneRegistryAbi,
        functionName: "mintStake",
      })) as bigint;
      const approveHash = await wallet.writeContract({
        address: this.token,
        abi: erc20ApproveAbi,
        functionName: "approve",
        args: [this.registry, stake],
        account,
        chain: this.chain,
      });
      await this.pc.waitForTransactionReceipt({ hash: approveHash as Hex });
    }

    const evidence = opts.evidence ?? keccak256(encodePacked(["bytes32"], [subject]));
    const txHash = await wallet.writeContract({
      address: this.registry,
      abi: waneRegistryAbi,
      functionName: "mintAntibody",
      args: [kind, subject, evidence],
      account,
      chain: this.chain,
    });
    const receipt = await this.pc.waitForTransactionReceipt({ hash: txHash });
    let id: bigint | undefined;
    try {
      const logs = parseEventLogs({
        abi: waneRegistryAbi,
        eventName: "AntibodyMinted",
        logs: receipt.logs,
      }) as Array<{ args: { id: bigint } }>;
      id = logs[0]?.args?.id;
    } catch {
      // id is best-effort
    }
    return { skipped: false, txHash, id };
  }

  /* ── vault path: a non-custodial screening smart wallet ───────────── */
  /* Stronger than 7702: funds live in the vault, so there is no raw-send    */
  /* bypass, and ERC-20 recipients decoded from calldata are screened too.   */

  private vaultFactoryAddr(): Address {
    if (!this.vaultFactory) {
      throw new Error("WaneVaultFactory is not configured for this network yet.");
    }
    return this.vaultFactory;
  }

  /** Deterministic vault address for an owner, whether or not it exists yet. */
  async predictVault(owner: Address): Promise<Address> {
    return (await this.pc.readContract({
      address: this.vaultFactoryAddr(),
      abi: waneVaultFactoryAbi,
      functionName: "predict",
      args: [getAddress(owner)],
    })) as Address;
  }

  /** The owner's created vault, or the zero address if not created yet. */
  async vaultOf(owner: Address): Promise<Address> {
    return (await this.pc.readContract({
      address: this.vaultFactoryAddr(),
      abi: waneVaultFactoryAbi,
      functionName: "vaultOf",
      args: [getAddress(owner)],
    })) as Address;
  }

  /** Create the caller's vault (one-time). Returns the create tx hash. */
  async createVault(wallet: WaneWallet): Promise<Hex> {
    const account = wallet.account;
    if (!account) throw new Error("walletClient has no account");
    return wallet.writeContract({
      address: this.vaultFactoryAddr(),
      abi: waneVaultFactoryAbi,
      functionName: "createVault",
      args: [],
      account,
      chain: this.chain,
    });
  }

  /** Dry-run the vault's on-chain screen for an action. Free view. */
  async vaultWouldAllow(vault: Address, call: WaneCall): Promise<PolicyVerdict> {
    const [allowed, reason] = (await this.pc.readContract({
      address: vault,
      abi: waneVaultAbi,
      functionName: "wouldAllow",
      args: [getAddress(call.to), call.value ?? 0n, call.data ?? "0x"],
    })) as [boolean, number];
    return { allowed, reason, reasonText: POLICY_REASON[reason] ?? `reason ${reason}` };
  }

  /**
   * Send a screened action FROM the vault's own balance. The vault checks the
   * target (and, for ERC-20 movements, the real recipient decoded from calldata)
   * against the owner's policy + the antibody registry, and reverts before any
   * value moves if flagged. Funds held in the vault have no unscreened exit.
   */
  async vaultSend(wallet: WaneWallet, vault: Address, call: WaneCall): Promise<Hex> {
    const account = wallet.account;
    if (!account) throw new Error("walletClient has no account");
    const v = await this.vaultWouldAllow(vault, call);
    if (!v.allowed) throw blockedError(call.to, v.reasonText);
    try {
      return await wallet.writeContract({
        address: vault,
        abi: waneVaultAbi,
        functionName: "execute",
        args: [getAddress(call.to), call.value ?? 0n, call.data ?? "0x"],
        account,
        chain: this.chain,
      });
    } catch (err) {
      throw decodeVaultBlocked(err) ?? err;
    }
  }

  /** Owner withdraws funds back to themselves (unscreened; never trapped). */
  async vaultWithdraw(
    wallet: WaneWallet,
    vault: Address,
    opts: { token?: Address; amount: bigint },
  ): Promise<Hex> {
    const account = wallet.account;
    if (!account) throw new Error("walletClient has no account");
    return wallet.writeContract({
      address: vault,
      abi: waneVaultAbi,
      functionName: opts.token ? "withdrawToken" : "withdrawETH",
      args: opts.token ? [opts.token, opts.amount] : [opts.amount],
      account,
      chain: this.chain,
    });
  }
}

export class WaneBlockedError extends Error {
  constructor(
    public readonly target: string,
    public readonly antibodyId: bigint,
  ) {
    super(`Wane: ${target} is flagged by antibody #${antibodyId}. Action aborted.`);
    this.name = "WaneBlockedError";
  }
}

/**
 * viem-native adapter. Extend a wallet client so protection feels built in:
 *
 *   import { createWalletClient, http } from "viem";
 *   import { Wane, waneActions } from "wane-sdk";
 *
 *   const wane = Wane.baseSepolia({ agent: account.address });
 *   const wallet = createWalletClient({ account, chain, transport: http() })
 *     .extend(waneActions(wane));
 *
 *   await wallet.enableProtection();              // one signature
 *   await wallet.protectedSend({ to, value });    // screened on-chain
 *   await wallet.isProtected();                   // true
 *
 * Every flagged target throws WaneBlockedError before anything moves; a clean
 * one behaves like a normal send.
 */
export function waneActions(wane: Wane) {
  return (client: any) => {
    const w = client as WaneWallet;
    const self = (): Address => {
      const a = client.account?.address as Address | undefined;
      if (!a) throw new Error("wallet client has no account");
      return a;
    };
    return {
      enableProtection: (opts?: Parameters<Wane["enable"]>[1]) => wane.enable(w, opts),
      protectedSend: (call: WaneCall) => wane.send(w, call),
      protectedBatch: (calls: WaneCall[]) => wane.sendBatch(w, calls),
      isProtected: () => wane.isProtected(self()),
      wouldAllow: (call: WaneCall) => wane.wouldAllow(call, self()),
    };
  };
}
