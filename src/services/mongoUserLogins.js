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
    loginCount: document.loginCount ?? 1,
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
    firstLoginAt: document.firstLoginAt?.toISOString?.() ?? document.firstLoginAt ?? null,
    lastLoginAt: document.lastLoginAt?.toISOString?.() ?? document.lastLoginAt ?? null,
    createdAt: document.createdAt?.toISOString?.() ?? document.createdAt ?? null,
    savedAt: document.savedAt?.toISOString?.() ?? document.savedAt ?? null,
  };
}

function getLoginIdentityFilters(userRecord) {
  const filters = [
    { privyUserId: userRecord.privyUserId },
    { knownPrivyUserIds: userRecord.privyUserId },
    { walletAddressLower: userRecord.walletAddress.toLowerCase() },
    { knownWalletAddressesLower: userRecord.walletAddress.toLowerCase() },
  ];

  if (userRecord.emailHash) {
    filters.push({ emailHash: userRecord.emailHash }, { knownEmailHashes: userRecord.emailHash });
  }

  return filters;
}

export async function saveUserLoginToMongo({ userRecord, storageResult, indexResult }) {
  const client = await getMongoClient();
  const database = client.db();
  let collection = database.collection(env.mongodbCollection);
  const now = new Date();
  const createdAt = new Date(userRecord.createdAt);
  const indexedAt = indexResult.indexedAt ? new Date(indexResult.indexedAt) : null;
  const walletAddressLower = userRecord.walletAddress.toLowerCase();
  const latestLoginFields = {
    walletAddress: userRecord.walletAddress,
    walletAddressLower,
    type: toDatabaseLoginType(userRecord.loginType),
    loginType: userRecord.loginType,
    linkedAccounts: userRecord.linkedAccounts,
    storageRoot: storageResult.rootHash,
    storageTransactionHash: storageResult.txHash,
    indexTransactionHash: indexResult.transactionHash,
    indexBlockNumber: indexResult.blockNumber,
    indexBlockTimestamp: indexResult.blockTimestamp,
    indexedAt,
    indexExplorerUrl: indexResult.explorerUrl,
    lastLoginAt: now,
    savedAt: now,
    updatedAt: now,
  };

  if (userRecord.emailHash) {
    latestLoginFields.emailHash = userRecord.emailHash;
  }

  const update = {
    $set: latestLoginFields,
    $setOnInsert: {
      privyUserId: userRecord.privyUserId,
      firstLoginAt: createdAt,
      createdAt,
    },
    $inc: {
      loginCount: 1,
    },
    $addToSet: {
      knownPrivyUserIds: userRecord.privyUserId,
      knownWalletAddresses: userRecord.walletAddress,
      knownWalletAddressesLower: walletAddressLower,
      knownLoginTypes: userRecord.loginType,
      linkedAccountTypes: { $each: userRecord.linkedAccounts },
      ...(userRecord.emailHash ? { knownEmailHashes: userRecord.emailHash } : {}),
    },
  };

  const options = {
    upsert: true,
    returnDocument: "after",
    sort: { lastLoginAt: -1, indexedAt: -1, savedAt: -1, createdAt: -1 },
  };
  let savedDocument;

  try {
    savedDocument = await collection.findOneAndUpdate(
      { $or: getLoginIdentityFilters(userRecord) },
      update,
      options,
    );
  } catch (error) {
    await resetMongoClient();
    const retryClient = await getMongoClient();
    collection = retryClient.db().collection(env.mongodbCollection);
    savedDocument = await collection.findOneAndUpdate(
      { $or: getLoginIdentityFilters(userRecord) },
      update,
      options,
    );
  }

  const document = savedDocument?.value ?? savedDocument;

  if (!document?._id) {
    throw new Error("MongoDB did not return the saved login document");
  }

  return {
    id: document._id.toString(),
    collection: env.mongodbCollection,
    loginCount: document.loginCount ?? 1,
    lastLoginAt: document.lastLoginAt?.toISOString?.() ?? null,
  };
}

export async function listUserLoginHistory({ walletAddress, privyUserId, limit = 12 }) {
  const client = await getMongoClient();
  const collection = client.db().collection(env.mongodbCollection);
  const filters = [];

  if (walletAddress) {
    const walletAddressLower = walletAddress.toLowerCase();
    filters.push(
      { walletAddressLower },
      { knownWalletAddressesLower: walletAddressLower },
      { walletAddress: { $regex: `^${escapeRegExp(walletAddress)}$`, $options: "i" } },
    );
  }

  if (privyUserId) {
    filters.push({ privyUserId }, { knownPrivyUserIds: privyUserId });
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
