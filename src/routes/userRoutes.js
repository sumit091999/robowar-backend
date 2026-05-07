import { Router } from "express";
import { saveAuthenticatedUser } from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.post("/auth", saveAuthenticatedUser);
