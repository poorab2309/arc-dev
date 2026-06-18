import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const response = await registerEntitySecretCiphertext({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

fs.writeFileSync("recovery-file.json", JSON.stringify(response.data, null, 2));
console.log("Registered successfully!");
console.log("Recovery file:", response.data?.recoveryFile);