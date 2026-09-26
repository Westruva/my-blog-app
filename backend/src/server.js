import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
const server = app.listen(config.port, () => {
	console.log(`Blog backend listening on port ${config.port}`);
});

let shuttingDown = false;

async function shutdown(signal) {
	if (shuttingDown) {
		return;
	}

	shuttingDown = true;
	console.log(`Received ${signal}; shutting down`);

	server.close(async (error) => {
		if (error) {
			console.error(error);
			process.exitCode = 1;
		}

		await prisma.$disconnect();
	});
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
