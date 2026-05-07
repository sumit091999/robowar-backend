import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["MONGODB_URI"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`[env] ${key} is not set`);
  }
}

export const env = {
  port: process.env.PORT || 4000,
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbCollection: process.env.MONGODB_COLLECTION || "RoboWar",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
