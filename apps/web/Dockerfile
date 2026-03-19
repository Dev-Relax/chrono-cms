# ── Builder ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY apps/web/package.json ./apps/web/

RUN npm install

COPY tsconfig.base.json ./
COPY apps/web/ ./apps/web/

# Leave VITE_API_URL empty so the browser uses the relative /api prefix,
# which Nginx proxies to the api container at runtime.
# You can override this at build time if your API is on a separate domain.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=apps/web

# ── Runner (Nginx) ───────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# SPA fallback — all routes → index.html
# API calls go directly to VITE_API_URL (set as a build variable in Coolify).
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
