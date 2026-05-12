# FlowDesk Server

Express + WebSocket mock stream server, with Postgres connection scaffolding.

The server imports **`@flowdesk/shared`** (`file:../shared`). That package resolves to compiled files under **`shared/dist/`**. After a fresh clone, from the **repo root** run **`npm run build:api`** once (or `npm run build --prefix shared` before your first `npm run dev` in `server/`). Otherwise TypeScript and Node may not find the shared modules.

## 1) Start Postgres

Make sure Postgres is running locally on `127.0.0.1:5432`.

## 2) Create DB user + database

From a terminal, connect as a superuser (usually `postgres`):

```bash
# homebrew on mac
psql -h 127.0.0.1 -U postgres 
```

Then run:

```sql
CREATE ROLE flowdesk_app WITH LOGIN PASSWORD 'change_me';
CREATE DATABASE flowdesk OWNER flowdesk_app;

REVOKE ALL ON DATABASE flowdesk FROM PUBLIC;
GRANT CONNECT ON DATABASE flowdesk TO flowdesk_app;
```

Reconnect to the new DB and grant schema permissions:

```bash
psql -h 127.0.0.1 -U postgres -d flowdesk
```

```sql
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO flowdesk_app;
```

## 3) Run migrations

Run from the `server` folder:

```bash
cd server
npm run db:migrate
```

## 4) Configure app connection

Set env vars in the **repo-root `.env`** only (same file Vite uses). See `../.env.example` for the full list.

```bash
cp ../.env.example ../.env
# edit ../.env — at minimum set DATABASE_URL, e.g.:
# DATABASE_URL=postgres://flowdesk_app:change_me@127.0.0.1:5432/flowdesk
```

Migration SQL files live in `src/db/migrations/` (first one: `001_init.sql`).

## 5) Run server

```bash
cd server
npm install
npm run dev
```

Optional: run on a non-default port (then point Vite’s `server.proxy` at the same port):

```bash
PORT=3001 npm run dev
```

## Docker (API image)

From the **repo root** (needs `shared/` + `server/` — see root `Dockerfile`):

```bash
docker build -t flowdesk-api .
docker run --rm -p 18080:8080 --env-file .env -e PORT=8080 flowdesk-api
```

The container listens on **`PORT`** (default **8080** for Cloud Run parity). Map host **`18080` → `8080`** as above (avoids colliding with a local dev server on **8000**), then:

```bash
curl http://localhost:18080/health
```

One-off migrations inside the same image (compiled `dist/`; no tsx):

```bash
docker run --rm --env-file .env flowdesk-api node dist/db/migrate.js
```

Local compile before Docker (optional sanity check): from repo root, `npm run build:api`. NPM shortcuts: `npm run docker:api:build`, `npm run docker:api:run`.

## Quick checks

```bash
curl http://localhost:8000/health
# or if you set PORT=3001:
curl http://localhost:3001/health
```

