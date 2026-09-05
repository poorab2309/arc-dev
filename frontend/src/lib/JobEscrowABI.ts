export const jobEscrowAbi = [
  {
    type: "constructor",
    inputs: [{ name: "agentRegistryAddress", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },

  {
    type: "function",
    name: "agentRegistry",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract AgentRegistry" }],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "cancelJob",
    inputs: [{ name: "jobId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },

  {
    type: "function",
    name: "claimJob",
    inputs: [{ name: "jobId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },

  {
    type: "function",
    name: "createJob",
    inputs: [{ name: "deadline", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "jobId", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },

  {
    type: "function",
    name: "getJob",
    inputs: [{ name: "jobId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "client", type: "address", internalType: "address" },
      { name: "workerAgent", type: "address", internalType: "address" },
      { name: "verifierAgent", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "proofURI", type: "string", internalType: "string" },
      { name: "status", type: "uint8", internalType: "enum JobEscrow.JobStatus" },
    ],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "jobs",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "client", type: "address", internalType: "address" },
      { name: "workerAgent", type: "address", internalType: "address" },
      { name: "verifierAgent", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "deadline", type: "uint256", internalType: "uint256" },
      { name: "proofURI", type: "string", internalType: "string" },
      { name: "status", type: "uint8", internalType: "enum JobEscrow.JobStatus" },
    ],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "nextJobId",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },

  {
    type: "function",
    name: "refundExpired",
    inputs: [{ name: "jobId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },

  {
    type: "function",
    name: "submitWork",
    inputs: [
      { name: "jobId", type: "uint256", internalType: "uint256" },
      { name: "proofURI", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },

  {
    type: "function",
    name: "verifyAndRelease",
    inputs: [{ name: "jobId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },

  {
    type: "event",
    name: "JobCancelled",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true, internalType: "uint256" },
    ],
    anonymous: false,
  },

  {
    type: "event",
    name: "JobClaimed",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },

  {
    type: "event",
    name: "JobCreated",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "client", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "deadline", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },

  {
    type: "event",
    name: "JobExpired",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true, internalType: "uint256" },
    ],
    anonymous: false,
  },

  {
    type: "event",
    name: "JobVerified",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "verifier", type: "address", indexed: true, internalType: "address" },
      { name: "worker", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },

  {
    type: "event",
    name: "WorkSubmitted",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "proofURI", type: "string", indexed: false, internalType: "string" },
    ],
    anonymous: false,
  },
] as const;

export const jobEscrowAddress =
  "0x40aA2523819aD1aa1A07E4e6ba5586881741A532" as const;