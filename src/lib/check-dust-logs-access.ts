import { prisma } from '@/lib/db'

export async function checkDustLogsAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: true, trialEndsAt: true },
  })
  if (!user) return false
  return (
    user.subscription === 'DUST_LOGS' ||
    user.trialEndsAt === null ||
    user.trialEndsAt > new Date()
  )
}
