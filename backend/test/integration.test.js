import assert from "node:assert/strict";
import { test } from "node:test";

import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === "1";
const email = `integration-${Date.now()}@example.com`;
let server;
let baseUrl;
let token;
let postId;

test(
	"authentication and post CRUD routes work together",
	{ skip: !integrationEnabled },
	async (t) => {
		const app = createApp();
		server = await new Promise((resolve) => {
			const activeServer = app.listen(0, () => resolve(activeServer));
		});
		baseUrl = `http://127.0.0.1:${server.address().port}/api`;

		t.after(async () => {
			await prisma.user.delete({ where: { email } }).catch(() => {});
			await new Promise((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
		});

		const registration = await request("/auth/register", {
			method: "POST",
			body: { name: "Integration Writer", email, password: "password-123" },
		});
		assert.equal(registration.status, 201);
		token = registration.data.token;

		const created = await request("/posts", {
			method: "POST",
			body: {
				title: "Integration Note",
				content: "A post created by the route integration test.",
				status: "DRAFT",
			},
		});
		assert.equal(created.status, 201);
		postId = created.data.post.id;
		assert.equal(created.data.post.status, "DRAFT");

		const published = await request(`/posts/${postId}`, {
			method: "PATCH",
			body: { status: "PUBLISHED" },
		});
		assert.equal(published.status, 200);
		assert.equal(published.data.post.status, "PUBLISHED");

		const publicPosts = await request("/posts");
		assert.equal(publicPosts.status, 200);
		assert.equal(
			publicPosts.data.posts.some((post) => post.id === postId),
			true,
		);

		const removed = await request(`/posts/${postId}`, { method: "DELETE" });
		assert.equal(removed.status, 204);
	},
);

async function request(path, options = {}) {
	const response = await fetch(`${baseUrl}${path}`, {
		method: options.method || "GET",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	});

	return {
		status: response.status,
		data: await response.json().catch(() => null),
	};
}
