import fs from "fs";
import os from "os";
import path from "path";
import dotenv from "dotenv";
import { Indexer } from "@0gfoundation/0g-storage-ts-sdk";
import { ethers } from "ethers";
import { MongoClient } from "mongodb";
import { roboWarUserIndexAbi } from "../src/contracts/RoboWarUserIndexAbi.js";

dotenv.config();

const walletAddress = process.argv[2];

if (!walletAddress || !ethers.isAddress(walletAddress)) {
  console.error("Usage: node scripts/backfill-chain-to-mongo.mjs <walletAddress>");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(
  process.env.ZERO_G_CHAIN_RPC_URL,
  Number(process.env.ZERO_G_CHAIN_ID || 16661),
);
const contract = new ethers.Contract(
  process.env.ROBOWAR_INDEX_CONTRACT_ADDRESS,
  roboWarUserIndexAbi,
  provider,
);
const indexer = new Indexer(process.env.ZERO_G_STORAGE_INDEXER_RPC);
const mongo = new MongoClient(process.env.MONGODB_URI);

await mongo.connect();

const collection = mongo.db().collection(process.env.MONGODB_COLLECTION || "RoboWar");
const indexStartBlock = Number(process.env.ROBOWAR_INDEX_START_BLOCK || 0);
const logs = await contract.queryFilter(
  contract.filters.UserIndexed(walletAddress),
  indexStartBlock,
  "latest",
);

let existing = 0;
let inserted = 0;
let failed = 0;

for (const log of logs) {
  const dataRoot = log.args.dataRoot;
  const exists = await collection.findOne({ storageRoot: dataRoot });

  if (exists) {
    existing += 1;
    continue;
  }

  const output = path.join(os.tmpdir(), `robowar-backfill-${dataRoot.slice(2, 12)}.json`);
  fs.rmSync(output, { force: true });
  const downloadError = await indexer.download(dataRoot, output, true);

  if (downloadError) {
    console.error(`download failed for ${dataRoot}: ${downloadError.message || downloadError}`);
    failed += 1;
    continue;
  }

  const userRecord = JSON.parse(fs.readFileSync(output, "utf8"));
  const block = await provider.getBlock(log.blockNumber);

  await collection.updateOne(
    { privyUserId: userRecord.privyUserId },
    {
      $set: {
        privyUserId: userRecord.privyUserId,
        walletAddress: userRecord.walletAddress,
        type: userRecord.loginType === "connect_wallet" ? "wallet" : userRecord.loginType,
        loginType: userRecord.loginType,
        emailHash: userRecord.emailHash,
        linkedAccounts: userRecord.linkedAccounts,
        storageRoot: dataRoot,
        storageTransactionHash: null,
        indexTransactionHash: log.transactionHash,
        indexBlockNumber: log.blockNumber,
        indexBlockTimestamp: block?.timestamp ?? null,
        indexedAt: block?.timestamp ? new Date(Number(block.timestamp) * 1000) : null,
        indexExplorerUrl: `${process.env.ZERO_G_EXPLORER_URL}/tx/${log.transactionHash}`,
        createdAt: new Date(userRecord.createdAt),
        savedAt: new Date(),
        source: "chain_backfill",
      },
      $setOnInsert: {
        firstSavedAt: new Date(),
      },
    },
    { upsert: true },
  );

  inserted += 1;
}

const mongoCount = await collection.countDocuments();
console.log(JSON.stringify({ logs: logs.length, existing, inserted, failed, mongoCount }, null, 2));

await mongo.close();
