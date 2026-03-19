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

# Proxy /api/* → api container (strip prefix), /uploads/* → api container,
# everything else → SPA index.html fallback.
RUN printf '\
server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  location /api/ {\n\
    proxy_pass http://api:4000/;\n\
    proxy_http_version 1.1;\n\
    proxy_set_header Host $host;\n\
    proxy_set_header X-Real-IP $remote_addr;\n\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
    proxy_set_header X-Forwarded-Proto $scheme;\n\
  }\n\
\n\
  location /uploads/ {\n\
    proxy_pass http://api:4000/uploads/;\n\
    proxy_http_version 1.1;\n\
    proxy_set_header Host $host;\n\
  }\n\
\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
