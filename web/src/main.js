import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const app = document.querySelector("#app");

const state = {
	posts: [],
	pagination: { page: 1, totalPages: 1 },
	search: "",
	user: readStoredUser(),
	token: localStorage.getItem("margin_token"),
	loading: false,
	error: "",
};

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

async function render() {
	const route = getRoute();
	state.error = "";
	app.innerHTML = shell({ route });

	if (route.name === "home") {
		await renderHome();
	}
	if (route.name === "post") {
		await renderPost(route.slug);
	}
	if (route.name === "account") {
		renderAccount();
	}
}

async function renderHome() {
	const content = document.querySelector("#page-content");
	content.innerHTML = `
		<section class="hero">
			<div class="hero-copy">
				<p class="eyebrow">The Margin Journal</p>
				<h1>Thoughts worth keeping close.</h1>
				<p class="hero-intro">A quiet collection of field notes, creative practice, and useful ideas for making better work.</p>
				<a class="text-link" href="#account">Join the journal <span aria-hidden="true">↗</span></a>
			</div>
			<div class="hero-mark" aria-hidden="true"><span>MJ</span><i></i><i></i></div>
		</section>
		<section class="section-heading">
			<div><p class="eyebrow">Fresh from the desk</p><h2>Latest notes</h2></div>
			<span class="section-count" id="post-count">Loading</span>
		</section>
		<form class="journal-search" id="journal-search"><input name="search" type="search" placeholder="Search the journal" value="${escapeAttribute(state.search)}" /><button type="submit" aria-label="Search">↗</button></form>
		<div id="post-grid" class="post-grid"><div class="loading">Gathering the latest notes<span>.</span><span>.</span><span>.</span></div></div>
		<div id="post-pagination"></div>
	`;
	document
		.querySelector("#journal-search")
		.addEventListener("submit", handleJournalSearch);

	try {
		const query = new URLSearchParams({
			page: String(state.pagination.page),
			limit: "9",
		});
		if (state.search) query.set("search", state.search);
		const data = await apiRequest(`/posts?${query}`);
		state.posts = data.posts;
		state.pagination = data.pagination;
		document.querySelector("#post-count").textContent =
			`${state.posts.length} ${state.posts.length === 1 ? "note" : "notes"}`;
		document.querySelector("#post-grid").innerHTML = state.posts.length
			? state.posts.map(postCard).join("")
			: emptyState(
					"No published notes yet",
					"The editorial desk is still putting the first collection together.",
				);
	} catch (error) {
		document.querySelector("#post-grid").innerHTML = errorState(error.message);
	}
	document.querySelector("#post-pagination").innerHTML = paginationControls();
	document.querySelectorAll("[data-page]").forEach((button) =>
		button.addEventListener("click", () => {
			state.pagination.page = Number(button.dataset.page);
			render();
		}),
	);
}

function handleJournalSearch(event) {
	event.preventDefault();
	state.search = new FormData(event.currentTarget).get("search").trim();
	state.pagination.page = 1;
	render();
}

function paginationControls() {
	if (state.pagination.totalPages <= 1) return "";
	return `<nav class="pagination" aria-label="Journal pages"><button data-page="${state.pagination.page - 1}" ${state.pagination.page === 1 ? "disabled" : ""}>← Newer</button><span>Page ${state.pagination.page} of ${state.pagination.totalPages}</span><button data-page="${state.pagination.page + 1}" ${state.pagination.page === state.pagination.totalPages ? "disabled" : ""}>Older →</button></nav>`;
}

async function renderPost(slug) {
	const content = document.querySelector("#page-content");
	content.innerHTML = `<div class="loading article-loading">Opening the note<span>.</span><span>.</span><span>.</span></div>`;

	try {
		const { post } = await apiRequest(`/posts/${encodeURIComponent(slug)}`);
		content.innerHTML = article(post);
	} catch (error) {
		content.innerHTML = errorState(error.message);
	}
}

function renderAccount() {
	const content = document.querySelector("#page-content");
	content.innerHTML = state.user ? accountView() : authView();
	document
		.querySelectorAll("form[data-auth]")
		.forEach((form) => form.addEventListener("submit", handleAuth));
	document.querySelector("[data-logout]")?.addEventListener("click", logout);
	setupAuthTabs();
}

function shell({ route }) {
	return `
		<header class="site-header">
			<a class="wordmark" href="#/"><span class="wordmark-dot"></span>margin<span class="wordmark-slash">/</span></a>
			<nav aria-label="Primary navigation">
				<a class="nav-link ${route.name === "home" ? "active" : ""}" href="#/">Journal</a>
				<a class="nav-link ${route.name === "account" ? "active" : ""}" href="#account">${state.user ? "Account" : "Sign in"}</a>
			</nav>
		</header>
		<main id="page-content"></main>
		<footer class="site-footer"><span>© ${new Date().getFullYear()} Margin Journal</span><span>Made for the curious</span></footer>
	`;
}

function postCard(post) {
	return `
		<a class="post-card" href="#post/${encodeURIComponent(post.slug)}">
			<div class="post-card-image" style="${post.coverImage ? `background-image: url('${escapeAttribute(post.coverImage)}')` : ""}">
				${post.coverImage ? "" : "<span>MJ</span>"}
				<span class="post-number">${String(state.posts.indexOf(post) + 1).padStart(2, "0")}</span>
			</div>
			<div class="post-card-copy">
				<p class="post-meta">${formatDate(post.publishedAt)} <span>•</span> ${escapeHtml(post.author?.name || "Margin desk")}</p>
				<h3>${escapeHtml(post.title)}</h3>
				<p>${escapeHtml(post.excerpt || truncate(post.content, 140))}</p>
				<span class="read-link">Read note <span aria-hidden="true">↗</span></span>
			</div>
		</a>
	`;
}

function article(post) {
	return `
		<article class="article">
			<a class="back-link" href="#/">← Back to all notes</a>
			<header class="article-header">
				<p class="eyebrow">${formatDate(post.publishedAt)} <span>•</span> ${escapeHtml(post.author?.name || "Margin desk")}</p>
				<h1>${escapeHtml(post.title)}</h1>
				${post.excerpt ? `<p class="article-excerpt">${escapeHtml(post.excerpt)}</p>` : ""}
			</header>
			${post.coverImage ? `<div class="article-image" style="background-image: url('${escapeAttribute(post.coverImage)}')"></div>` : ""}
			<div class="article-body">${post.content
				.split(/\n\s*\n/)
				.filter((paragraph) => paragraph.trim())
				.map(
					(paragraph) =>
						`<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`,
				)
				.join("")}</div>
		</article>
	`;
}

function authView() {
	return `
		<section class="account-page">
			<div class="account-intro"><p class="eyebrow">Your reading room</p><h1>Keep a little<br /><em>space</em> for ideas.</h1><p>Sign in to keep your place and receive new notes from the journal.</p></div>
			<div class="auth-panel">
				<div class="auth-tabs"><button class="auth-tab active" data-tab="login">Sign in</button><button class="auth-tab" data-tab="register">Create account</button></div>
				<div id="auth-forms">${authForm("login")}</div>
			</div>
		</section>
	`;
}

function authForm(mode) {
	const isRegister = mode === "register";
	return `<form class="auth-form" data-auth data-mode="${mode}">
		${isRegister ? `<label>Name<input name="name" required autocomplete="name" /></label>` : ""}
		<label>Email<input name="email" type="email" required autocomplete="email" /></label>
		<label>Password<input name="password" type="password" required minlength="8" autocomplete="${isRegister ? "new-password" : "current-password"}" /></label>
		<p class="form-error" data-form-error></p>
		<button class="button button-dark" type="submit">${isRegister ? "Create account" : "Sign in"}<span aria-hidden="true">↗</span></button>
	</form>`;
}

function accountView() {
	return `<section class="account-page logged-in"><div class="account-intro"><p class="eyebrow">Signed in</p><h1>Welcome back,<br /><em>${escapeHtml(state.user.name)}</em>.</h1><p>Your reading room is ready whenever you are.</p></div><div class="account-card"><span class="account-label">Account details</span><strong>${escapeHtml(state.user.email)}</strong><span class="role-pill">${escapeHtml(state.user.role)}</span><button class="button button-outline" data-logout>Sign out</button></div></section>`;
}

async function handleAuth(event) {
	event.preventDefault();
	const form = event.currentTarget;
	const errorElement = form.querySelector("[data-form-error]");
	const mode = form.dataset.mode;
	const body = Object.fromEntries(new FormData(form));
	errorElement.textContent = "";

	try {
		const data = await apiRequest(`/auth/${mode}`, { method: "POST", body });
		state.token = data.token;
		state.user = data.user;
		localStorage.setItem("margin_token", state.token);
		localStorage.setItem("margin_user", JSON.stringify(state.user));
		window.location.hash = "#account";
	} catch (error) {
		errorElement.textContent = error.message;
	}
}

function setupAuthTabs() {
	document.querySelectorAll("[data-tab]").forEach((tab) =>
		tab.addEventListener("click", () => {
			document
				.querySelectorAll("[data-tab]")
				.forEach((item) => item.classList.toggle("active", item === tab));
			document.querySelector("#auth-forms").innerHTML = authForm(
				tab.dataset.tab,
			);
			document
				.querySelector("[data-auth]")
				.addEventListener("submit", handleAuth);
		}),
	);
}

function logout() {
	state.token = null;
	state.user = null;
	localStorage.removeItem("margin_token");
	localStorage.removeItem("margin_user");
	render();
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
	if (!response.ok) throw new Error(data.error || "Something went wrong");
	return data;
}

function getRoute() {
	const hash = window.location.hash.replace(/^#\/?/, "");
	if (hash.startsWith("post/"))
		return { name: "post", slug: decodeURIComponent(hash.slice(5)) };
	if (hash === "account") return { name: "account" };
	return { name: "home" };
}

function readStoredUser() {
	try {
		return JSON.parse(localStorage.getItem("margin_user"));
	} catch {
		return null;
	}
}
function formatDate(value) {
	return value
		? new Intl.DateTimeFormat("en", {
				month: "short",
				day: "numeric",
				year: "numeric",
			}).format(new Date(value))
		: "Unpublished";
}
function truncate(value, length) {
	return value.length > length ? `${value.slice(0, length).trim()}…` : value;
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
function emptyState(title, message) {
	return `<div class="empty-state"><span>✦</span><h3>${title}</h3><p>${message}</p></div>`;
}
function errorState(message) {
	const detail =
		message === "Internal server error"
			? "The journal database is temporarily unavailable. Please try again in a moment."
			: message;
	return `<div class="empty-state error"><span>!</span><h3>We could not load the journal.</h3><p>${escapeHtml(detail)}</p><a class="text-link" href="#/">Try again <span aria-hidden="true">↗</span></a></div>`;
}

const observer = new MutationObserver(() => {
	if (document.querySelector(".auth-tabs")) setupAuthTabs();
});
observer.observe(app, { childList: true, subtree: true });
