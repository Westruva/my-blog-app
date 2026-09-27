# Margin Journal

1 Backend 2 Frontends

A blog platform with one Express/Prisma backend and two browser clients:

- `web/`: public journal client built with Vite, HTML, CSS, and JavaScript
- `admin/`: publishing desk built with Vite, HTML, CSS, and JavaScript
- `backend/`: Express REST API with PostgreSQL, Prisma, and JWT authentication

## Local setup

Requirements: Node.js 20+, npm, and PostgreSQL.

```sh
npm install
cp backend/.env.example backend/.env
cp web/.env.example web/.env
cp admin/.env.example admin/.env
```

Create the `blog_app` PostgreSQL database, then run:

```sh
npm run db:generate
npm run db:migrate --workspace backend -- --name init
npm run db:seed
npm run dev
```

The migration enables PostgreSQL's `pg_trgm` extension and adds GIN indexes for post search fields. The database role running migrations must have permission to create extensions.

The applications run at:

- Public journal: https://marginj.netlify.app/#/
- Admin desk: https://marginjadmin.netlify.app/

Run the database-independent JWT tests with `npm test`. For route and Prisma integration tests, set `DATABASE_URL` to a disposable test database and run `npm run test:integration --workspace backend`.

Run `npm run audit` locally to fail on high or critical dependency vulnerabilities.

GitHub Actions runs migration deployment, unit tests, Prisma-backed integration tests, and both frontend builds on pushes to `main` and pull requests.

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in `backend/.env` before running the seed command. The seed command creates or updates the admin account and hashes the password with bcrypt.

## Production deployment

Deploy the backend as a Node.js service and the `web/` and `admin/` directories as separate static Vite sites.

Backend build and start commands:

```sh
npm install
npm run db:generate
npm run db:deploy --workspace backend
npm run db:seed
npm start
```

Backend production variables:

- `DATABASE_URL`: managed PostgreSQL connection string
- `JWT_SECRET`: long random secret
- `PORT`: service port supplied by the host
- `WEB_ORIGIN`: public web client URL
- `ADMIN_ORIGIN`: admin client URL
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: used only during seeding

For each static site, set `VITE_API_URL` to the deployed backend URL ending in `/api`. Set `VITE_WEB_URL` in the admin site to the public web client URL. Build each site with `npm run build --workspace web` or `npm run build --workspace admin`, and publish its generated `dist/` directory.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/posts?page=1&limit=12&search=design`
- `GET /api/posts/:slug`
- `GET /api/posts/manage?page=1&limit=12&search=design` (JWT)
- `POST /api/posts` (JWT)
- `PATCH /api/posts/:id` (JWT)
- `DELETE /api/posts/:id` (JWT)
