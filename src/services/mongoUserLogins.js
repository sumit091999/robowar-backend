import { MongoClient } from "mongodb";
import { env } from "../config/env.js";

let mongoClientPromise;
let mongoClient;

function getMongoClient() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is required");
  }

  if (!mongoClientPromise) {
    mongoClient = new MongoClient(env.mongodbUri);
    mongoClientPromise = mongoClient.connect();
  }

  return mongoClientPromise;
}

async function resetMongoClient() {
  const client = mongoClient;
  mongoClient = null;
  mongoClientPromise = null;

  if (client) {
    await client.close(true).catch(() => {});
  }
}

function toDatabaseLoginType(loginType) {
  return loginType === "connect_wallet" ? "wallet" : loginType;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeLoginDocument(document) {
  return {
    id: document._id.toString(),
    privyUserId: document.privyUserId,
    walletAddress: document.walletAddress,
    type: document.type,
    loginType: document.loginType,
    linkedAccounts: document.linkedAccounts,
    storageRoot: document.storageRoot,
    storageTransactionHash: document.storageTransactionHash,
    indexTransactionHash: document.indexTransactionHash,
    indexBlockNumber: document.indexBlockNumber,
    indexBlockTimestamp: document.indexBlockTimestamp,
    indexedAt: document.indexedAt?.toISOString?.() ?? document.indexedAt ?? null,
    indexExplorerUrl: document.indexExplorerUrl,
    createdAt: document.createdAt?.toISOString?.() ?? document.createdAt ?? null,
    savedAt: document.savedAt?.toISOString?.() ?? document.savedAt ?? null,
  };
}

function isLegacyPrivyUniqueIndexError(error) {
  return (
    error?.code === 11000 &&
    (error?.keyPattern?.privyUserId || error?.message?.includes("privyUserId_1"))
  );
}

async function dropLegacyPrivyUniqueIndex(collection) {
  try {
    await collection.dropIndex("privyUserId_1");
    console.warn("[mongo] Dropped legacy unique privyUserId_1 index for login history");
  } catch (error) {
    if (error?.codeName !== "IndexNotFound") {
      throw error;
    }
  }
}

export async function saveUserLoginToMongo({ userRecord, storageResult, indexResult }) {
  const client = await getMongoClient();
  const database = client.db();
  let collection = database.collection(env.mongodbCollection);

  const document = {
    privyUserId: userRecord.privyUserId,
    walletAddress: userRecord.walletAddress,
    walletAddressLower: userRecord.walletAddress.toLowerCase(),
    type: toDatabaseLoginType(userRecord.loginType),
    loginType: userRecord.loginType,
    emailHash: userRecord.emailHash,
    linkedAccounts: userRecord.linkedAccounts,
    storageRoot: storageResult.rootHash,
    storageTransactionHash: storageResult.txHash,
    indexTransactionHash: indexResult.transactionHash,
    indexBlockNumber: indexResult.blockNumber,
    indexBlockTimestamp: indexResult.blockTimestamp,
    indexedAt: indexResult.indexedAt ? new Date(indexResult.indexedAt) : null,
    indexExplorerUrl: indexResult.explorerUrl,
    createdAt: new Date(userRecord.createdAt),
    savedAt: new Date(),
  };

  let result;

  try {
    result = await collection.insertOne(document);
  } catch (error) {
    if (isLegacyPrivyUniqueIndexError(error)) {
      await dropLegacyPrivyUniqueIndex(collection);
      result = await collection.insertOne(document);

      return {
        id: result.insertedId.toString(),
        collection: env.mongodbCollection,
      };
    }

    await resetMongoClient();
    const retryClient = await getMongoClient();
    collection = retryClient.db().collection(env.mongodbCollection);

    try {
      result = await collection.insertOne(document);
    } catch (retryError) {
      if (isLegacyPrivyUniqueIndexError(retryError)) {
        await dropLegacyPrivyUniqueIndex(collection);
        result = await collection.insertOne(document);
      } else {
        throw retryError;
      }
    }
  }

  return {
    id: result.insertedId.toString(),
    collection: env.mongodbCollection,
  };
}

export async function listUserLoginHistory({ walletAddress, privyUserId, limit = 12 }) {
  const client = await getMongoClient();
  const collection = client.db().collection(env.mongodbCollection);
  const filters = [];

  if (walletAddress) {
    filters.push(
      { walletAddressLower: walletAddress.toLowerCase() },
      { walletAddress: { $regex: `^${escapeRegExp(walletAddress)}$`, $options: "i" } },
    );
  }

  if (privyUserId) {
    filters.push({ privyUserId });
  }

  if (filters.length === 0) {
    return [];
  }

  const documents = await collection
    .find({ $or: filters })
    .sort({ indexedAt: -1, savedAt: -1, createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 12, 1), 100))
    .toArray();

  return documents.map(serializeLoginDocument);
}
