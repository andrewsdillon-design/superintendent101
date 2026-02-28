import { prisma } from './db'
import type { Prisma } from '@prisma/client'

/**
 * Wraps a DailyLog database operation in a transaction that first sets
 * the Postgres session variable `app.current_user_id`. This is what
 * the RLS policy (scripts/rls-migration.sql) reads to enforce row
 * isolation at the database level.
 *
 * Usage:
 *   const logs = await withUserRLS(userId, (tx) =>
 *     tx.dailyLog.findMany({ where: { userId } })
 *   )
 */
export async function withUserRLS<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Sets the RLS session variable scoped to this transaction only
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`
    return fn(tx)
  })
}

/**
 * Application-level guard: throws if a DailyLog Prisma operation is
 * attempted without a userId where clause. Works independently of the
 * Postgres RLS layer as a code-level safety net.
 *
 * Attach via Prisma middleware in src/lib/db.ts if desired.
 */
export function assertDailyLogUserId(args: Record<string, unknown>, userId: string): void {
  const where = args?.where as Record<string, unknown> | undefined
  if (!where?.userId || where.userId !== userId) {
    throw new Error(
      `[RLS Guard] DailyLog query missing userId filter. Expected: ${userId}`
    )
  }
}
