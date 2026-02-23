#!/bin/sh
set -e

echo "Running Prisma db push..."
npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push had issues, continuing..."

echo "Starting Next.js..."
exec npm run dev
