import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";

import { createAccessToken, requireAuth } from "../src/lib/auth.js";
import { config } from "../src/config.js";

const user = {
	id: "user_123",
	email: "writer@example.com",
	role: "ADMIN",
};

function responseDouble() {
	return {
		statusCode: null,
		body: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(body) {
			this.body = body;
			return this;
		},
	};
}

test("createAccessToken includes the user identity and role", () => {
	const token = createAccessToken(user);
	const payload = jwt.verify(token, config.jwtSecret);

	assert.equal(payload.sub, user.id);
	assert.equal(payload.email, user.email);
	assert.equal(payload.role, user.role);
});

test("requireAuth accepts a valid bearer token", () => {
	const token = createAccessToken(user);
	const request = { headers: { authorization: `Bearer ${token}` } };
	const response = responseDouble();
	let nextCalled = false;

	requireAuth(request, response, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true);
	assert.equal(request.auth.sub, user.id);
	assert.equal(response.statusCode, null);
});

test("requireAuth rejects a missing bearer token", () => {
	const response = responseDouble();
	let nextCalled = false;

	requireAuth({ headers: {} }, response, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false);
	assert.equal(response.statusCode, 401);
	assert.deepEqual(response.body, { error: "Authentication required" });
});

test("requireAuth rejects an invalid bearer token", () => {
	const response = responseDouble();
	let nextCalled = false;

	requireAuth(
		{ headers: { authorization: "Bearer definitely-not-a-token" } },
		response,
		() => {
			nextCalled = true;
		},
	);

	assert.equal(nextCalled, false);
	assert.equal(response.statusCode, 401);
	assert.deepEqual(response.body, { error: "Invalid or expired token" });
});
