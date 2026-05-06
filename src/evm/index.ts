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
