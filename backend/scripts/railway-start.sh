#!/bin/sh
set -e

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Seeding database (skips if already seeded)..."
node prisma/seed.js || echo "Seed skipped (already done)"

echo "▶ Starting server..."
node src/server.js
