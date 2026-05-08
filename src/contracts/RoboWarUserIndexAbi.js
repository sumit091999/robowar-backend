export const roboWarUserIndexAbi = [
  {
    type: "function",
    name: "indexUser",
    stateMutability: "nonpayable",
    inputs: [
      { name: "walletAddress", type: "address" },
      { name: "dataRoot", type: "bytes32" },
      { name: "loginType", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getUserRecordCount",
    stateMutability: "view",
    inputs: [{ name: "walletAddress", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getLatestUserRecord",
    stateMutability: "view",
    inputs: [{ name: "walletAddress", type: "address" }],
    outputs: [
      { name: "dataRoot", type: "bytes32" },
      { name: "loginType", type: "string" },
      { name: "submitter", type: "address" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "UserIndexed",
    anonymous: false,
    inputs: [
      { name: "walletAddress", type: "address", indexed: true },
      { name: "dataRoot", type: "bytes32", indexed: true },
      { name: "loginType", type: "string", indexed: false },
      { name: "submitter", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
];
