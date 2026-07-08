# Cloudflare Deployment Guide

This repo has two separate apps:

- `frontend/`: React + Vite. Deploy this to Cloudflare Pages.
- `backend/`: Express + `better-sqlite3`. This needs a normal Node.js host right now, or a later migration to Cloudflare Workers + D1.

## Recommended first deployment

Use Cloudflare Pages for the frontend and deploy the backend to a Node host with persistent storage. Once the API is live, point the Pages build at it with `VITE_API_URL`.

The backend cannot be deployed to a standard Cloudflare Worker as-is because it uses:

- `better-sqlite3`, a native Node SQLite package
- local filesystem database files under `backend/data`
- local uploads under `backend/uploads`
- Express server startup with `app.listen`

## Frontend on Cloudflare Pages

### Option A: Git integration

1. Push this repo to GitHub or GitLab.
2. In Cloudflare, open **Workers & Pages**.
3. Select **Create application** > **Pages** > **Import an existing Git repository**.
4. Use these build settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

5. Add this Pages environment variable:

```text
VITE_API_URL=https://your-api-host.com/api
```

6. Deploy. The frontend will be available at a `*.pages.dev` URL until you attach a custom domain.

Cloudflare Pages already treats React/Vite apps without a top-level `404.html` as single-page apps, so browser refreshes on React routes should work.

### Option B: Direct upload from your machine

```bash
cd frontend
npm install
npm run build
npx wrangler pages deploy dist --project-name clinic-appointment
```

Direct upload is good for a quick launch. Git integration is better for automatic redeploys.

## Backend deployment

Deploy `backend/` to a Node.js host that supports persistent disk storage.

Required production environment variables:

```text
PORT=4000
JWT_SECRET=use_a_long_random_secret_here
DB_PATH=./data/clinic.db
CORS_ORIGIN=https://your-pages-site.pages.dev
```

If you attach a custom frontend domain later, update `CORS_ORIGIN` to that domain. You can allow more than one frontend origin by separating them with commas:

```text
CORS_ORIGIN=https://your-pages-site.pages.dev,https://app.your-domain.com
```

Run the seed command once on the production backend only if you want the demo accounts:

```bash
cd backend
npm run seed
```

Start command:

```bash
npm start
```

After the backend is live, test:

```bash
curl https://your-api-host.com/api/health
```

Expected response:

```json
{"ok":true,"service":"clinic-token-backend"}
```

## Full Cloudflare backend later

To run the whole app on Cloudflare, migrate the backend instead of deploying it unchanged:

1. Replace `better-sqlite3` with Cloudflare D1 queries.
2. Convert synchronous DB helpers and route handlers to async D1 calls.
3. Move schema changes into D1 migrations.
4. Replace local uploads with Cloudflare R2 or keep using external image URLs.
5. Replace the Express `app.listen` entrypoint with a Worker fetch handler.
6. Store `JWT_SECRET` as a Cloudflare secret.

The existing `backend/wrangler.toml` is only a starting stub for that migration; it is not enough to deploy the current Express/SQLite backend to Workers.

## Before pushing

This repo previously had local-only files that should not go to the cloud, including `.env`, `node_modules`, `dist`, and SQLite data files. `.gitignore` now excludes them for new changes.

If those files are already tracked by Git, untrack them without deleting your local copies:

```bash
git rm -r --cached backend/node_modules frontend/node_modules frontend/dist backend/data backend/.env
git add .gitignore DEPLOYMENT.md frontend/.env.production.example backend/src/server.js
git commit -m "Prepare Cloudflare deployment"
```
