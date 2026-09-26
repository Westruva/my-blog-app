import { z } from "zod";

import { prisma } from "../lib/prisma.js";

const postSchema = z.object({
	title: z.string().trim().min(1).max(200),
	slug: z
		.string()
		.trim()
		.min(1)
		.max(220)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
		.optional(),
	excerpt: z.string().trim().max(500).nullable().optional(),
	content: z.string().min(1),
	coverImage: z.string().url().nullable().optional(),
	status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

const postUpdateSchema = postSchema.partial();

const authorSelect = {
	id: true,
	name: true,
};

export async function listPublishedPosts(request, response) {
	const { page, limit, search } = getListOptions(request);
	const where = {
		status: "PUBLISHED",
		...searchFilter(search),
	};
	const [posts, total] = await prisma.$transaction([
		prisma.post.findMany({
			where,
			orderBy: { publishedAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
			include: { author: { select: authorSelect } },
		}),
		prisma.post.count({ where }),
	]);

	return response.json({
		posts,
		pagination: createPagination(page, limit, total),
	});
}

export async function getPublishedPost(request, response) {
	const post = await prisma.post.findFirst({
		where: {
			slug: request.params.slug,
			status: "PUBLISHED",
		},
		include: { author: { select: authorSelect } },
	});

	if (!post) {
		return response.status(404).json({ error: "Post not found" });
	}

	return response.json({ post });
}

export async function listManagedPosts(request, response) {
	const { page, limit, search } = getListOptions(request);
	const where = {
		...(request.auth.role === "ADMIN" ? {} : { authorId: request.auth.sub }),
		...searchFilter(search),
	};
	const [posts, total] = await prisma.$transaction([
		prisma.post.findMany({
			where,
			orderBy: { updatedAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
			include: { author: { select: authorSelect } },
		}),
		prisma.post.count({ where }),
	]);

	return response.json({
		posts,
		pagination: createPagination(page, limit, total),
	});
}

export async function createPost(request, response) {
	const result = postSchema.safeParse(request.body);

	if (!result.success) {
		return response
			.status(400)
			.json({ error: "Invalid post data", details: result.error.flatten() });
	}

	const data = {
		...result.data,
		slug: result.data.slug || createSlug(result.data.title),
		authorId: request.auth.sub,
		publishedAt: result.data.status === "PUBLISHED" ? new Date() : null,
	};
	const post = await prisma.post.create({
		data,
		include: { author: { select: authorSelect } },
	});

	return response.status(201).json({ post });
}

export async function updatePost(request, response) {
	const result = postUpdateSchema.safeParse(request.body);

	if (!result.success) {
		return response
			.status(400)
			.json({ error: "Invalid post data", details: result.error.flatten() });
	}

	const existingPost = await prisma.post.findUnique({
		where: { id: request.params.id },
	});

	if (!existingPost || !canManagePost(request, existingPost)) {
		return response.status(404).json({ error: "Post not found" });
	}

	const data = { ...result.data };
	if (data.status === "PUBLISHED" && existingPost.status !== "PUBLISHED") {
		data.publishedAt = new Date();
	}
	if (data.status === "DRAFT") {
		data.publishedAt = null;
	}

	const post = await prisma.post.update({
		where: { id: request.params.id },
		data,
		include: { author: { select: authorSelect } },
	});

	return response.json({ post });
}

export async function deletePost(request, response) {
	const existingPost = await prisma.post.findUnique({
		where: { id: request.params.id },
	});

	if (!existingPost || !canManagePost(request, existingPost)) {
		return response.status(404).json({ error: "Post not found" });
	}

	await prisma.post.delete({ where: { id: request.params.id } });
	return response.status(204).send();
}

function canManagePost(request, post) {
	return request.auth.role === "ADMIN" || request.auth.sub === post.authorId;
}

function createSlug(title) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 220);
}

function getListOptions(request) {
	const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
	const limit = Math.min(
		50,
		Math.max(1, Number.parseInt(request.query.limit, 10) || 12),
	);
	const search =
		typeof request.query.search === "string"
			? request.query.search.trim().slice(0, 100)
			: "";
	return { page, limit, search };
}

function searchFilter(search) {
	return search
		? {
				OR: [
					{ title: { contains: search, mode: "insensitive" } },
					{ excerpt: { contains: search, mode: "insensitive" } },
					{ content: { contains: search, mode: "insensitive" } },
				],
			}
		: {};
}

function createPagination(page, limit, total) {
	return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
