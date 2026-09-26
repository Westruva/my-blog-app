import "dotenv/config";

const port = Number(process.env.PORT || 4000);

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL must be set before starting the backend");
}

if (!process.env.JWT_SECRET) {
	throw new Error("JWT_SECRET must be set before starting the backend");
}

export const config = {
	port,
	jwtSecret: process.env.JWT_SECRET,
};
