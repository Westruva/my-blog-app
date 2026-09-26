import { Router } from "express";

import { currentUser, login, register } from "../controllers/authController.js";
import { requireAuth } from "../lib/auth.js";
import { authRateLimit } from "../middleware/authRateLimit.js";

const authRouter = Router();

authRouter.post("/register", authRateLimit, register);
authRouter.post("/login", authRateLimit, login);
authRouter.get("/me", requireAuth, currentUser);

export default authRouter;
