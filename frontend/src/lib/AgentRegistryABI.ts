export const agentRegistryAbi = [
  {
    type: "function",
    name: "registerAgent",
    inputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "metadataURI",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isRegisteredAgent",
    inputs: [
      {
        name: "agent",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgent",
    inputs: [
      {
        name: "agent",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "metadataURI",
        type: "string",
        internalType: "string",
      },
      {
        name: "registeredAt",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deactivateAgent",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const agentRegistryAddress =
  "0x321038bc8FED7Fb4D35E0C30EC01f3537184C1f8" as const;