import pkg from "@circle-fin/smart-contract-platform";
const { initiateSmartContractPlatformClient } = pkg;
import dotenvPkg from "dotenv";
dotenvPkg.config();

const contractClient = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.ENTITY_SECRET,
});

async function createEventMonitor() {
  try {
    const response = await contractClient.createEventMonitor({
      blockchain: "ARC-TESTNET",
      contractAddress: "0x8197844AF51c2D2dC97983fe2d6907C952272272",
      eventSignature: "Transfer(address,address,uint256)",
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
}

createEventMonitor();