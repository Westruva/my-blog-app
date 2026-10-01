import bcrypt from "bcryptjs";
import { z } from "zod";

import { createAccessToken } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const credentialsSchema = z.object({
	email: z.email().trim().toLowerCase(),
	password: z.string().min(8),
	name: z.string().trim().min(1).max(100).optional(),
});

export async function register(request, response) {
	const result = credentialsSchema.safeParse(request.body);

	if (!result.success || !result.data.name) {
		return response
			.status(400)
			.json({ error: "A valid name, email, and password are required" });
	}

	const { email, password, name } = result.data;
	const existingUser = await prisma.user.findUnique({ where: { email } });

	if (existingUser) {
		return response
			.status(409)
			.json({ error: "An account with that email already exists" });
	}

	const passwordHash = await bcrypt.hash(password, 12);
	const user = await prisma.user.create({
		data: {
			email,
			name,
			passwordHash,
		},
	});

	return response.status(201).json({
		token: createAccessToken(user),
		user: serializeUser(user),
	});
}

export async function login(request, response) {
	const result = credentialsSchema
		.pick({ email: true, password: true })
		.safeParse(request.body);

	if (!result.success) {
		return response
			.status(401)
			.json({ error: "Invalid username/email or password" });
	}

	const { email, password } = result.data;
	const user = await prisma.user.findUnique({ where: { email } });
	const passwordMatches = user
		? await bcrypt.compare(password, user.passwordHash)
		: false;

	if (!user || !passwordMatches) {
		return response
			.status(401)
			.json({ error: "Invalid username/email or password" });
	}

	return response.json({
		token: createAccessToken(user),
		user: serializeUser(user),
	});
}

export async function currentUser(request, response) {
	const user = await prisma.user.findUnique({
		where: { id: request.auth.sub },
	});

	if (!user) {
		return response.status(404).json({ error: "User not found" });
	}

	return response.json({ user: serializeUser(user) });
}

function serializeUser(user) {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
	};
}
