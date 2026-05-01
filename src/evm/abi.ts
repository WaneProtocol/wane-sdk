// Minimal ABI slice the SDK needs from WaneRegistry. Full ABI lives in the
// app under app/_lib/abi. Kept tiny here so the SDK has no app dependency.
export const waneRegistryAbi = [
  {
    type: "function",
    name: "check",
    stateMutability: "view",
    inputs: [
      { name: "kind", type: "uint8" },
      { name: "subject", type: "bytes32" },
    ],
    outputs: [
      { name: "active", type: "bool" },
      { name: "id", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "checkAddress",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [
      { name: "active", type: "bool" },
      { name: "id", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "checkBytecode",
    stateMutability: "view",
    inputs: [{ name: "codehash", type: "bytes32" }],
    outputs: [
      { name: "active", type: "bool" },
      { name: "id", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "mintAntibody",
    stateMutability: "nonpayable",
    inputs: [
      { name: "kind", type: "uint8" },
      { name: "subject", type: "bytes32" },
      { name: "evidence", type: "bytes32" },
    ],
    outputs: [{ name: "id", type: "uint64" }],
  },
  {
    type: "function",
    name: "mintStake",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint96" }],
  },
  {
    type: "function",
    name: "antibodyCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "AntibodyMinted",
    inputs: [
      { name: "id", type: "uint64", indexed: true },
      { name: "kind", type: "uint8", indexed: true },
      { name: "subject", type: "bytes32", indexed: true },
      { name: "publisher", type: "address", indexed: false },
      { name: "evidence", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const wanePolicyAbi = [
  {
    type: "function",
    name: "evaluate",
    stateMutability: "view",
    inputs: [
      { name: "agent", type: "address" },
      { name: "target", type: "address" },
      { name: "amount", type: "uint128" },
    ],
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "reason", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "evaluateCall",
    stateMutability: "view",
    inputs: [
      { name: "agent", type: "address" },
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "amount", type: "uint128" },
    ],
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "reason", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "isTokenAllowed",
    stateMutability: "view",
    inputs: [
      { name: "agent", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// WaneDelegate: the EIP-7702 delegate code an agent's wallet points at. Every
// outbound action the agent routes through execute() is screened on-chain
// before it runs; a flagged target reverts with Blocked(target, reason).
export const waneDelegateAbi = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "ret", type: "bytes" }],
  },
  {
    type: "function",
    name: "executeBatch",
    stateMutability: "payable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "datas", type: "bytes[]" },
    ],
    outputs: [{ name: "rets", type: "bytes[]" }],
  },
  {
    type: "function",
    name: "wouldAllow",
    stateMutability: "view",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "reason", type: "uint8" },
    ],
  },
  {
    type: "error",
    name: "Blocked",
    inputs: [
      { name: "target", type: "address" },
      { name: "reason", type: "uint8" },
    ],
  },
  { type: "error", name: "NotSelf", inputs: [] },
] as const;
