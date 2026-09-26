import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const app = document.querySelector("#app");

const state = {
	token: localStorage.getItem("margin_admin_token"),
	user: readUser(),
	posts: [],
	pagination: { page: 1, totalPages: 1 },
	search: "",
	editingPost: null,
};

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

async function render() {
	if (window.location.hash === "#editor" && !state.editingPost) {
		state.editingPost = {};
	}
	if (!window.location.hash || window.location.hash === "#/") {
		state.editingPost = null;
	}
	if (!state.token) {
		renderLogin();
		return;
	}

	try {
		if (!state.user) {
			const data = await apiRequest("/auth/me");
			state.user = data.user;
			localStorage.setItem("margin_admin_user", JSON.stringify(state.user));
		}
		if (state.user.role !== "ADMIN" && state.user.role !== "EDITOR") {
			throw new Error("This account cannot access the publishing desk");
		}
		await loadPosts();
		renderDashboard();
	} catch (error) {
		if (
			error.message.includes("token") ||
			error.message.includes("Authentication")
		) {
			logout();
			return;
		}
		renderDashboard(error.message);
	}
}

function renderLogin(error = "") {
	app.innerHTML = `<main class="login-page"><div class="login-art"><span class="stamp">MJ</span><p>Margin Journal<br /><small>Publishing desk</small></p></div><section class="login-panel"><p class="kicker">Private workspace</p><h1>Make the<br /><em>next note</em>.</h1><p class="muted">Sign in to write, edit, and publish to the journal.</p><form id="login-form"><label>Email<input name="email" type="email" required autocomplete="email" /></label><label>Password<input name="password" type="password" required autocomplete="current-password" /></label><p class="form-error">${escapeHtml(error)}</p><button class="button button-dark" type="submit">Enter desk <span>↗</span></button></form></section></main>`;
	app.querySelector("#login-form").addEventListener("submit", handleLogin);
}

function renderDashboard(error = "") {
	const editing = state.editingPost;
	app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#/"><span></span>margin<span>/</span></a><div class="sidebar-label">Workspace</div><a class="side-link active" href="#/">Overview <b>${state.posts.length}</b></a><a class="side-link" href="#editor">New note <b>+</b></a><div class="sidebar-footer"><div class="avatar">${escapeHtml((state.user.name || "M").slice(0, 1).toUpperCase())}</div><div><strong>${escapeHtml(state.user.name)}</strong><small>${escapeHtml(state.user.role)}</small></div><button class="icon-button" data-logout title="Sign out">↗</button></div></aside><main class="dashboard"><header class="topbar"><div><p class="kicker">${formatDate(new Date())}</p><h2>Good morning, ${escapeHtml(firstName(state.user.name))}.</h2></div><a class="public-link" href="${escapeAttribute(import.meta.env.VITE_WEB_URL || "http://localhost:5173")}" target="_blank" rel="noreferrer">View journal ↗</a></header>${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}${editing ? editorView(editing) : overviewView()}</main></div>`;
	app.querySelector("[data-logout]").addEventListener("click", logout);
	if (editing) {
		app.querySelector("#post-form").addEventListener("submit", handlePostSave);
		app.querySelector("[data-cancel]").addEventListener("click", () => {
			state.editingPost = null;
			renderDashboard();
		});
	} else {
		app
			.querySelector("#managed-search")
			?.addEventListener("submit", handleManagedSearch);
		app.querySelectorAll("[data-edit]").forEach((button) =>
			button.addEventListener("click", () => {
				state.editingPost = state.posts.find(
					(post) => post.id === button.dataset.edit,
				);
				renderDashboard();
			}),
		);
		app
			.querySelectorAll("[data-delete]")
			.forEach((button) =>
				button.addEventListener("click", () =>
					handleDelete(button.dataset.delete),
				),
			);
		app.querySelectorAll("[data-managed-page]").forEach((button) =>
			button.addEventListener("click", () => {
				state.pagination.page = Number(button.dataset.managedPage);
				render();
			}),
		);
	}
}

function overviewView() {
	const published = state.posts.filter(
		(post) => post.status === "PUBLISHED",
	).length;
	const drafts = state.posts.length - published;
	return `<section class="stats"><div><span>Total notes</span><strong>${state.pagination.total}</strong></div><div><span>Published</span><strong>${published}</strong></div><div><span>Drafts</span><strong>${drafts}</strong></div></section><section class="content-section"><div class="section-head"><div><p class="kicker">Editorial queue</p><h1>All notes</h1></div><a class="button button-acid" href="#editor">New note <span>+</span></a></div><form class="managed-search" id="managed-search"><input name="search" type="search" placeholder="Search notes" value="${escapeAttribute(state.search)}" /><button type="submit">Search</button></form>${state.posts.length ? `<div class="post-table"><div class="table-head"><span>Title</span><span>Status</span><span>Updated</span><span></span></div>${state.posts.map(managedPostRow).join("")}</div>${managedPagination()}` : `<div class="empty">No notes found.</div>`}</section>`;
}

function handleManagedSearch(event) {
	event.preventDefault();
	state.search = new FormData(event.currentTarget).get("search").trim();
	state.pagination.page = 1;
	render();
}

function managedPagination() {
	if (state.pagination.totalPages <= 1) return "";
	return `<nav class="managed-pagination"><button data-managed-page="${state.pagination.page - 1}" ${state.pagination.page === 1 ? "disabled" : ""}>← Previous</button><span>Page ${state.pagination.page} of ${state.pagination.totalPages}</span><button data-managed-page="${state.pagination.page + 1}" ${state.pagination.page === state.pagination.totalPages ? "disabled" : ""}>Next →</button></nav>`;
}

function managedPostRow(post) {
	return `<div class="post-row"><div><strong>${escapeHtml(post.title)}</strong><small>/${escapeHtml(post.slug)}</small></div><span class="status status-${post.status.toLowerCase()}">${post.status}</span><span class="date">${formatDate(post.updatedAt)}</span><div class="row-actions"><button data-edit="${escapeAttribute(post.id)}" title="Edit note">Edit</button><button data-delete="${escapeAttribute(post.id)}" title="Delete note">Delete</button></div></div>`;
}

function editorView(post = {}) {
	return `<section class="editor-section"><div class="section-head"><div><p class="kicker">${post.id ? "Edit note" : "New note"}</p><h1>${post.id ? "Shape the story" : "Start a new note"}</h1></div><button class="plain-button" data-cancel>← Back to notes</button></div><form id="post-form" class="post-form"><div class="form-main"><label>Title<input name="title" required maxlength="200" value="${escapeAttribute(post.title || "")}" /></label><label>Excerpt<span class="field-help">Optional summary for the journal card</span><textarea name="excerpt" rows="3" maxlength="500">${escapeHtml(post.excerpt || "")}</textarea></label><label>Content<textarea name="content" required rows="15">${escapeHtml(post.content || "")}</textarea></label></div><aside class="form-side"><label>Slug<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value="${escapeAttribute(post.slug || "")}" /></label><label>Cover image URL<input name="coverImage" type="url" value="${escapeAttribute(post.coverImage || "")}" /></label><label>Status<select name="status"><option value="DRAFT" ${post.status !== "PUBLISHED" ? "selected" : ""}>Draft</option><option value="PUBLISHED" ${post.status === "PUBLISHED" ? "selected" : ""}>Published</option></select></label><p class="form-error" data-save-error></p><button class="button button-dark" type="submit">${post.id ? "Save changes" : "Create note"}<span>↗</span></button></aside></form></section>`;
}

async function handleLogin(event) {
	event.preventDefault();
	const form = event.currentTarget;
	const error = form.querySelector(".form-error");
	error.textContent = "";
	try {
		const data = await apiRequest("/auth/login", {
			method: "POST",
			body: Object.fromEntries(new FormData(form)),
		});
		state.token = data.token;
		state.user = data.user;
		localStorage.setItem("margin_admin_token", state.token);
		localStorage.setItem("margin_admin_user", JSON.stringify(state.user));
		render();
	} catch (loginError) {
		error.textContent = loginError.message;
	}
}

async function handlePostSave(event) {
	event.preventDefault();
	const form = event.currentTarget;
	const error = form.querySelector("[data-save-error]");
	error.textContent = "";
	const body = Object.fromEntries(new FormData(form));
	body.slug = body.slug || undefined;
	body.excerpt = body.excerpt || null;
	body.coverImage = body.coverImage || null;
	try {
		const path = state.editingPost?.id
			? `/posts/${state.editingPost.id}`
			: "/posts";
		await apiRequest(path, {
			method: state.editingPost?.id ? "PATCH" : "POST",
			body,
		});
		state.editingPost = null;
		window.location.hash = "#/";
		await render();
	} catch (saveError) {
		error.textContent = saveError.message;
	}
}

async function handleDelete(id) {
	if (!window.confirm("Delete this note permanently?")) return;
	try {
		await apiRequest(`/posts/${id}`, { method: "DELETE" });
		await render();
	} catch (error) {
		renderDashboard(error.message);
	}
}

async function loadPosts() {
	const query = new URLSearchParams({
		page: String(state.pagination.page),
		limit: "12",
	});
	if (state.search) query.set("search", state.search);
	const data = await apiRequest(`/posts/manage?${query}`);
	state.posts = data.posts;
	state.pagination = data.pagination;
}

async function apiRequest(path, options = {}) {
	const response = await fetch(`${API_URL}${path}`, {
		method: options.method || "GET",
		headers: {
			"Content-Type": "application/json",
			...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(data.error || "Request failed");
	return data;
}

function logout() {
	state.token = null;
	state.user = null;
	localStorage.removeItem("margin_admin_token");
	localStorage.removeItem("margin_admin_user");
	render();
}
function readUser() {
	try {
		return JSON.parse(localStorage.getItem("margin_admin_user"));
	} catch {
		return null;
	}
}
function firstName(name) {
	return name.split(" ")[0];
}
function formatDate(value) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}
function escapeHtml(value) {
	return String(value).replace(
		/[&<>'"]/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
				character
			],
	);
}
function escapeAttribute(value) {
	return escapeHtml(value).replace(/`/g, "&#96;");
}
