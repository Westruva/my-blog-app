import cors from "cors";
import express from "express";
import helmet from "helmet";

import { prisma } from "./lib/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import authRouter from "./routes/authRoutes.js";
import postRouter from "./routes/postRoutes.js";

export function createApp() {
	const app = express();
	const allowedOrigins = [
		process.env.WEB_ORIGIN,
		process.env.ADMIN_ORIGIN,
	].filter(Boolean);

	app.use(
		cors({
			origin: allowedOrigins.length > 0 ? allowedOrigins : true,
		}),
	);
	app.use(helmet());
	app.use(requestLogger);
	app.use(express.json());
	app.use("/api/auth", authRouter);
	app.use("/api/posts", postRouter);

	app.get("/api/health", (_request, response) => {
		response.json({
			status: "ok",
			service: "blog-backend",
			timestamp: new Date().toISOString(),
		});
	});

	app.get("/api/ready", async (_request, response) => {
		try {
			await prisma.$queryRaw`SELECT 1`;
			return response.json({
				status: "ready",
				service: "blog-backend",
				timestamp: new Date().toISOString(),
			});
		} catch {
			return response.status(503).json({
				status: "not_ready",
				service: "blog-backend",
				reason: "Database unavailable",
			});
		}
	});

	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
}
