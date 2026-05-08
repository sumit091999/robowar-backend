import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { env } from "../config/env.js";
import { getZeroGSigner } from "./zeroGClient.js";

const textEncoder = new TextEncoder();

function normalizeUploadResult(result) {
  if (Array.isArray(result)) {
    const [tx, error] = result;

    if (error) {
      throw new Error(error.message || String(error));
    }

    return tx;
  }

  return result;
}

export async function uploadJsonToZeroG(payload) {
  const serializedPayload = JSON.stringify(payload);
  const indexer = new Indexer(env.zeroGStorageIndexerRpc);
  const data = new MemData(textEncoder.encode(serializedPayload));
  const uploadResult = normalizeUploadResult(
    await indexer.upload(data, env.zeroGChainRpcUrl, getZeroGSigner()),
  );

  const rootHash = uploadResult?.rootHash ?? uploadResult?.root ?? uploadResult?.merkleRoot;
  const txHash = uploadResult?.txHash ?? uploadResult?.transactionHash ?? uploadResult?.hash;

  if (!rootHash) {
    throw new Error("0G upload did not return a data root");
  }

  return {
    rootHash,
    txHash: txHash ?? null,
  };
}
