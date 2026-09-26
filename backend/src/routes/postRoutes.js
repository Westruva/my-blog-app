import { Router } from "express";

import {
	createPost,
	deletePost,
	getPublishedPost,
	listManagedPosts,
	listPublishedPosts,
	updatePost,
} from "../controllers/postController.js";
import { requireAuth } from "../lib/auth.js";

const postRouter = Router();

postRouter.get("/", listPublishedPosts);
postRouter.get("/manage", requireAuth, listManagedPosts);
postRouter.get("/:slug", getPublishedPost);
postRouter.post("/", requireAuth, createPost);
postRouter.patch("/:id", requireAuth, updatePost);
postRouter.delete("/:id", requireAuth, deletePost);

export default postRouter;
