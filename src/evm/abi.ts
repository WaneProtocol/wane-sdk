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
