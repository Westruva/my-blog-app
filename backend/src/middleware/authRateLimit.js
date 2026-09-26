import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: { error: "Too many authentication attempts. Try again later." },
});
