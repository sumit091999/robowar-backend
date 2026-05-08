import { ethers } from "ethers";
import { env } from "../config/env.js";
import { roboWarUserIndexAbi } from "../contracts/RoboWarUserIndexAbi.js";
import { getZeroGProvider, getZeroGSigner } from "./zeroGClient.js";

function getUserIndexContract(runner = getZeroGSigner()) {
  if (!env.robowarIndexContractAddress) {
    throw new Error("ROBOWAR_INDEX_CONTRACT_ADDRESS is required");
  }

  if (!ethers.isAddress(env.robowarIndexContractAddress)) {
    throw new Error("ROBOWAR_INDEX_CONTRACT_ADDRESS is not a valid address");
  }

  return new ethers.Contract(
    env.robowarIndexContractAddress,
    roboWarUserIndexAbi,
    runner,
  );
}

function toBytes32Root(rootHash) {
  const normalizedRoot = rootHash.startsWith("0x") ? rootHash : `0x${rootHash}`;

  if (!ethers.isHexString(normalizedRoot, 32)) {
    throw new Error("0G data root must be a bytes32 hex string");
  }

  return normalizedRoot;
}

export async function indexUserOnChain({ walletAddress, dataRoot, loginType }) {
  if (!ethers.isAddress(walletAddress)) {
    throw new Error("walletAddress is not a valid EVM address");
  }

  const contract = getUserIndexContract();
  const transaction = await contract.indexUser(walletAddress, toBytes32Root(dataRoot), loginType);
  const receipt = await transaction.wait();
  const block = await getZeroGSigner().provider.getBlock(receipt.blockNumber);

  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockTimestamp: block?.timestamp ?? null,
    indexedAt: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toISOString() : null,
    explorerUrl: `${env.zeroGExplorerUrl}/tx/${receipt.hash}`,
  };
}

export async function listUserIndexEvents({ walletAddress, limit = 50 }) {
  if (!ethers.isAddress(walletAddress)) {
    throw new Error("walletAddress is not a valid EVM address");
  }

  const provider = getZeroGProvider();
  const contract = getUserIndexContract(provider);
  const logs = await contract.queryFilter(
    contract.filters.UserIndexed(walletAddress),
    env.robowarIndexStartBlock,
    "latest",
  );

  return logs
    .slice(-Math.min(Math.max(Number(limit) || 50, 1), 100))
    .reverse()
    .map((log) => ({
      walletAddress: log.args.walletAddress,
      storageRoot: log.args.dataRoot,
      loginType: log.args.loginType,
      submitter: log.args.submitter,
      indexBlockTimestamp: Number(log.args.timestamp),
      indexedAt: new Date(Number(log.args.timestamp) * 1000).toISOString(),
      indexTransactionHash: log.transactionHash,
      indexBlockNumber: log.blockNumber,
      indexExplorerUrl: `${env.zeroGExplorerUrl}/tx/${log.transactionHash}`,
      source: "zero_g_chain",
    }));
}
