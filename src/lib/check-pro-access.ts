import { prisma } from '@/lib/db'

export async function checkProAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: true, trialEndsAt: true },
  })
  if (!user) return false
  return (
    user.subscription === 'PRO' ||
    user.subscription === 'DUST_LOGS' || // legacy users
    user.trialEndsAt === null ||
    user.trialEndsAt > new Date()
  )
}
