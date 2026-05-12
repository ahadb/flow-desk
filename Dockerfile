# Flow Desk API — Cloud Run–friendly Node image (compiled JS, no tsx at runtime).
# Build:  docker build -t flowdesk-api .
# Run:     docker run --rm -p 18080:8080 --env-file .env flowdesk-api
# Migrate: docker run --rm --env-file .env flowdesk-api node dist/db/migrate.js
#
# Requires DATABASE_URL (and other secrets) via --env-file or -e; no .env baked in.

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY shared/package.json shared/package-lock.json shared/tsconfig.build.json ./shared/
COPY shared/nlp ./shared/nlp/

WORKDIR /app/shared
RUN npm ci && npm run build

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# --- runtime ---
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/shared/package.json /app/shared/package.json
COPY --from=builder /app/shared/package-lock.json /app/shared/package-lock.json
COPY --from=builder /app/shared/dist /app/shared/dist

WORKDIR /app/shared
RUN npm ci --omit=dev

WORKDIR /app/server
COPY --from=builder /app/server/package.json /app/server/package.json
COPY --from=builder /app/server/package-lock.json /app/server/package-lock.json
RUN npm ci --omit=dev
COPY --from=builder /app/server/dist /app/server/dist

RUN chown -R node:node /app
USER node

WORKDIR /app/server

EXPOSE 8080
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
