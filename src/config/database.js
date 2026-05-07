import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is missing. Add it to robowar-backend/.env");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongodbUri, {
    dbName: undefined,
  });

  console.log("[database] MongoDB connected");
}
