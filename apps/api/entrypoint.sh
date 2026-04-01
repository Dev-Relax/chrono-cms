#!/bin/sh
set -e

# Wait for Postgres to be ready before running migrations
echo "Waiting for database..."
until npx prisma db execute --stdin --schema=packages/db/prisma/schema.prisma <<'SQL' 2>/dev/null
SELECT 1;
SQL
do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done
echo "Database is ready."

# If a previous migration is stuck in a failed state, resolve it so deploys
# are idempotent. This handles the P3009 error on first-boot race conditions.
npx prisma migrate resolve \
  --applied 20260330000000_init \
  --schema=packages/db/prisma/schema.prisma 2>/dev/null || true

# Run migrations
npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma

# Start the API
exec node apps/api/dist/server.js
