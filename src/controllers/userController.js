import { UserLogin } from "../models/UserLogin.js";

const allowedLoginTypes = new Set(["google", "email", "connect_wallet"]);

export async function saveAuthenticatedUser(req, res, next) {
  try {
    const { privyUserId, walletAddress, loginType, email, linkedAccounts } = req.body ?? {};

    if (!privyUserId || typeof privyUserId !== "string") {
      return res.status(400).json({ message: "privyUserId is required" });
    }

    if (!allowedLoginTypes.has(loginType)) {
      return res.status(400).json({ message: "loginType must be google, email, or connect_wallet" });
    }

    const savedUser = await UserLogin.findOneAndUpdate(
      { privyUserId },
      {
        $set: {
          walletAddress: walletAddress || null,
          loginType,
          email: email || null,
          linkedAccounts: Array.isArray(linkedAccounts) ? linkedAccounts : [],
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          privyUserId,
        },
      },
      { new: true, upsert: true, runValidators: true },
    );

    return res.status(200).json({ user: savedUser });
  } catch (error) {
    return next(error);
  }
}
