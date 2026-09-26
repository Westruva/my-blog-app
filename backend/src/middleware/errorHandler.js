import { Prisma } from "@prisma/client";

export function notFoundHandler(_request, response) {
	return response.status(404).json({ error: "Route not found" });
}

export function errorHandler(error, _request, response, _next) {
	if (response.headersSent) {
		return;
	}

	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002") {
			return response
				.status(409)
				.json({ error: "A record with that value already exists" });
		}

		if (error.code === "P2025") {
			return response.status(404).json({ error: "Record not found" });
		}
	}

	if (error instanceof SyntaxError && "body" in error) {
		return response
			.status(400)
			.json({ error: "Request body must contain valid JSON" });
	}

	console.error(error);
	return response.status(500).json({ error: "Internal server error" });
}
