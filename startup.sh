#!/bin/bash
set -e

echo "==> Syncing database schema..."
npx prisma db push

echo "==> Starting Next.js in production..."
exec npm run start
