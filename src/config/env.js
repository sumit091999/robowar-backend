import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "MONGODB_URI",
  "ZERO_G_CHAIN_RPC_URL",
  "ZERO_G_STORAGE_INDEXER_RPC",
  "ZERO_G_PRIVATE_KEY",
  "ROBOWAR_INDEX_CONTRACT_ADDRESS",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`[env] ${key} is not set`);
  }
}

const defaultClientOrigins = [
  "http://localhost:5173",
  "https://robowarsgame.xyz",
  "https://www.robowarsgame.xyz",
];

function parseClientOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const clientOrigins = parseClientOrigins(
  process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || defaultClientOrigins.join(","),
);

export const env = {
  port: process.env.PORT || 4000,
  clientOrigin: clientOrigins[0],
  clientOrigins,
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbCollection: process.env.MONGODB_COLLECTION || "RoboWar",
  zeroGChainRpcUrl: process.env.ZERO_G_CHAIN_RPC_URL || "https://evmrpc.0g.ai",
  zeroGChainId: Number(process.env.ZERO_G_CHAIN_ID || 16661),
  zeroGStorageIndexerRpc:
    process.env.ZERO_G_STORAGE_INDEXER_RPC || "https://indexer-storage-turbo.0g.ai",
  zeroGPrivateKey: process.env.ZERO_G_PRIVATE_KEY || "",
  zeroGExplorerUrl: process.env.ZERO_G_EXPLORER_URL || "https://chainscan.0g.ai",
  robowarIndexContractFile:
    process.env.ROBOWAR_INDEX_CONTRACT_FILE || "contract/RoboWarUserIndex.sol",
  robowarIndexContractAddress: process.env.ROBOWAR_INDEX_CONTRACT_ADDRESS || "",
  robowarIndexStartBlock: Number(process.env.ROBOWAR_INDEX_START_BLOCK || 0),
};
