import { randomUUID } from "node:crypto";

export function requestLogger(request, response, next) {
	const requestId = randomUUID();
	const startedAt = Date.now();

	response.setHeader("X-Request-Id", requestId);
	response.on("finish", () => {
		console.log(
			JSON.stringify({
				requestId,
				method: request.method,
				path: request.originalUrl,
				status: response.statusCode,
				durationMs: Date.now() - startedAt,
			}),
		);
	});

	next();
}
