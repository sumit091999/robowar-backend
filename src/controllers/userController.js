import crypto from "crypto";
import { uploadJsonToZeroG } from "../services/zeroGStorage.js";
import { indexUserOnChain, listUserIndexEvents } from "../services/userIndexContract.js";
import { listUserLoginHistory, saveUserLoginToMongo } from "../services/mongoUserLogins.js";
import { env } from "../config/env.js";

const allowedLoginTypes = new Set(["google", "email", "connect_wallet"]);

async function runSyncStep(step, action) {
  try {
    return await action();
  } catch (error) {
    error.syncStep = step;
    throw error;
  }
}

function hashEmail(email) {
  if (!email || typeof email !== "string") {
    return null;
  }

  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function mergeLoginHistory({ chainHistory, mongoHistory, limit }) {
  const byTransactionHash = new Map();

  for (const item of mongoHistory) {
    if (!item.indexTransactionHash) {
      continue;
    }

    byTransactionHash.set(item.indexTransactionHash.toLowerCase(), item);
  }

  for (const event of chainHistory) {
    const key = event.indexTransactionHash.toLowerCase();
    const mongoItem = byTransactionHash.get(key);

    byTransactionHash.set(key, {
      id: mongoItem?.id ?? key,
      privyUserId: mongoItem?.privyUserId ?? null,
      walletAddress: mongoItem?.walletAddress ?? event.walletAddress,
      type: mongoItem?.type ?? (event.loginType === "connect_wallet" ? "wallet" : event.loginType),
      loginType: mongoItem?.loginType ?? event.loginType,
      linkedAccounts: mongoItem?.linkedAccounts ?? [],
      storageRoot: mongoItem?.storageRoot ?? event.storageRoot,
      storageTransactionHash: mongoItem?.storageTransactionHash ?? null,
      indexTransactionHash: event.indexTransactionHash,
      indexBlockNumber: event.indexBlockNumber,
      indexBlockTimestamp: event.indexBlockTimestamp,
      indexedAt: event.indexedAt,
      indexExplorerUrl: event.indexExplorerUrl,
      createdAt: mongoItem?.createdAt ?? event.indexedAt,
      savedAt: mongoItem?.savedAt ?? null,
      source: mongoItem ? "mongodb_zero_g_chain" : event.source,
    });
  }

  return Array.from(byTransactionHash.values())
    .sort((first, second) => {
      const firstTime = new Date(first.indexedAt ?? first.createdAt ?? 0).getTime();
      const secondTime = new Date(second.indexedAt ?? second.createdAt ?? 0).getTime();
      return secondTime - firstTime;
    })
    .slice(0, Math.min(Math.max(Number(limit) || 12, 1), 100));
}

export async function saveAuthenticatedUser(req, res, next) {
  try {
    const { privyUserId, walletAddress, loginType, email, linkedAccounts } = req.body ?? {};

    if (!privyUserId || typeof privyUserId !== "string") {
      return res.status(400).json({ message: "privyUserId is required" });
    }

    if (!allowedLoginTypes.has(loginType)) {
      return res.status(400).json({ message: "loginType must be google, email, or connect_wallet" });
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({
        message: "walletAddress is required for verifiable 0G Chain indexing",
      });
    }

    const userRecord = {
      schema: "robowar-user-login-v1",
      privyUserId,
      walletAddress,
      loginType,
      emailHash: hashEmail(email),
      linkedAccounts: Array.isArray(linkedAccounts) ? linkedAccounts : [],
      createdAt: new Date().toISOString(),
    };

    const storageResult = await runSyncStep("zero_g_storage", () => uploadJsonToZeroG(userRecord));
    const indexResult = await runSyncStep("zero_g_chain", () =>
      indexUserOnChain({
        walletAddress,
        dataRoot: storageResult.rootHash,
        loginType,
      }),
    );
    const databaseResult = await runSyncStep("mongodb", () =>
      saveUserLoginToMongo({
        userRecord,
        storageResult,
        indexResult,
      }),
    );

    return res.status(200).json({
      user: {
        privyUserId,
        walletAddress,
        loginType,
        databaseId: databaseResult.id,
        databaseCollection: databaseResult.collection,
        storageRoot: storageResult.rootHash,
        storageTransactionHash: storageResult.txHash,
        indexTransactionHash: indexResult.transactionHash,
        indexBlockNumber: indexResult.blockNumber,
        indexBlockTimestamp: indexResult.blockTimestamp,
        indexedAt: indexResult.indexedAt,
        indexExplorerUrl: indexResult.explorerUrl,
      },
      meta: {
        contractAddress: env.robowarIndexContractAddress,
        explorerUrl: env.zeroGExplorerUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUserLoginHistory(req, res, next) {
  try {
    const walletAddress =
      typeof req.query.walletAddress === "string" ? req.query.walletAddress.trim() : "";
    const privyUserId = typeof req.query.privyUserId === "string" ? req.query.privyUserId.trim() : "";
    const limit = Number(req.query.limit || 12);

    if (!walletAddress && !privyUserId) {
      return res.status(400).json({ message: "walletAddress or privyUserId is required" });
    }

    const mongoHistory = await listUserLoginHistory({
      walletAddress,
      privyUserId,
      limit,
    });
    const chainHistory = walletAddress
      ? await listUserIndexEvents({
          walletAddress,
          limit: Math.max(limit, 50),
        })
      : [];
    const history = mergeLoginHistory({
      chainHistory,
      mongoHistory,
      limit,
    });

    return res.status(200).json({
      history,
      meta: {
        contractAddress: env.robowarIndexContractAddress,
        explorerUrl: env.zeroGExplorerUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
}
