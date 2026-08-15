import pkg from "@circle-fin/smart-contract-platform";
const { initiateSmartContractPlatformClient } = pkg;
import dotenvPkg from "dotenv";
import { randomUUID } from "crypto";
dotenvPkg.config();

const contractClient = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.ENTITY_SECRET,
});

const JOB_ESCROW_ADDRESS = "0x255c13aBae3bfADdd928A396757b28cE2d5Bb618";

// Every event we want Circle to watch on JobEscrow, with its exact Solidity signature.
const EVENTS_TO_MONITOR = [
  "JobCreated(uint256,address,uint256,uint256)",
  "JobClaimed(uint256,address)",
  "WorkSubmitted(uint256,string)",
  "JobVerified(uint256,address,address,uint256)",
];

async function importJobEscrow() {
  try {
    const response = await contractClient.importContract({
      name: "JobEscrow",
      address: JOB_ESCROW_ADDRESS,
      blockchain: "ARC-TESTNET",
      idempotencyKey: randomUUID(),
    });
    console.log("Imported JobEscrow:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    // If it's already imported from a previous run, Circle returns a
    // duplicate/already-exists error — that's fine, just continue.
    console.log("Import step result (may already exist):", error.message);
  }
}

async function createJobEscrowMonitors() {
  for (const eventSignature of EVENTS_TO_MONITOR) {
    try {
      const response = await contractClient.createEventMonitor({
        blockchain: "ARC-TESTNET",
        contractAddress: JOB_ESCROW_ADDRESS,
        eventSignature,
      });
      console.log(`Created monitor for ${eventSignature}:`);
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error(`Error creating monitor for ${eventSignature}:`, error.message);
    }
  }
}

async function main() {
  await importJobEscrow();
  await createJobEscrowMonitors();
}

main();
