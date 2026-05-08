import { ethers } from "ethers";
import { env } from "../config/env.js";

let cachedProvider;
let cachedSigner;

export function getZeroGProvider() {
  if (!cachedProvider) {
    cachedProvider = new ethers.JsonRpcProvider(env.zeroGChainRpcUrl, env.zeroGChainId);
  }

  return cachedProvider;
}

export function getZeroGSigner() {
  if (!env.zeroGPrivateKey) {
    throw new Error("ZERO_G_PRIVATE_KEY is required");
  }

  if (!cachedSigner) {
    cachedSigner = new ethers.Wallet(env.zeroGPrivateKey, getZeroGProvider());
  }

  return cachedSigner;
}
