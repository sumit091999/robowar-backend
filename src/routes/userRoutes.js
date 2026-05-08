import { Router } from "express";
import { getUserLoginHistory, saveAuthenticatedUser } from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.post("/auth", saveAuthenticatedUser);
userRoutes.get("/history", getUserLoginHistory);
