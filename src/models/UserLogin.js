import mongoose from "mongoose";
import { env } from "../config/env.js";

const userLoginSchema = new mongoose.Schema(
  {
    privyUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    walletAddress: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      index: true,
    },
    loginType: {
      type: String,
      enum: ["google", "email", "connect_wallet"],
      required: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    linkedAccounts: {
      type: [String],
      default: [],
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: env.mongodbCollection,
  },
);

export const UserLogin = mongoose.model("UserLogin", userLoginSchema);
