import jwt from "jsonwebtoken";

import { config } from "../config.js";

export function createAccessToken(user) {
	return jwt.sign(
		{
			sub: user.id,
			email: user.email,
			role: user.role,
		},
		config.jwtSecret,
		{ expiresIn: "1d" },
	);
}

export function requireAuth(request, response, next) {
	const authorization = request.headers.authorization;
	const token = authorization?.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: null;

	if (!token) {
		return response.status(401).json({ error: "Authentication required" });
	}

	try {
		request.auth = jwt.verify(token, config.jwtSecret);
		return next();
	} catch {
		return response.status(401).json({ error: "Invalid or expired token" });
	}
}
