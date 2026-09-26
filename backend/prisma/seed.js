import "dotenv/config";
import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Margin Admin";

if (!email || !password) {
	throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding");
}

if (password.length < 8) {
	throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
}

const passwordHash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
	where: { email },
	update: {
		name,
		passwordHash,
		role: "ADMIN",
	},
	create: {
		email,
		name,
		passwordHash,
		role: "ADMIN",
	},
});

console.log(`Admin account ready: ${user.email}`);
await prisma.$disconnect();
