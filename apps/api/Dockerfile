# ── Builder ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install OpenSSL (needed by Prisma engine at generate & runtime)
RUN apk add --no-cache openssl

# Install all deps (workspaces)
RUN npm install

# Copy source
COPY tsconfig.base.json ./
COPY packages/db/ ./packages/db/
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN npm run generate --workspace=packages/db

# Build
RUN npm run build --workspace=packages/db
RUN npm run build --workspace=apps/api

# ── Runner ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4000
CMD ["./entrypoint.sh"]
