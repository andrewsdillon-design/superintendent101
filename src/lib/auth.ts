import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'

// ─── Simple in-process brute-force limiter ────────────────────────────────────
// Tracks failed attempts per email. Locked out after 10 failures for 15 minutes.
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 10
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

function checkLoginRateLimit(email: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(email)
  if (entry) {
    if (entry.lockedUntil > now) return false  // still locked
    if (entry.lockedUntil <= now) loginAttempts.delete(email) // lockout expired
  }
  return true
}

function recordLoginFailure(email: string) {
  const now = Date.now()
  const entry = loginAttempts.get(email) ?? { count: 0, lockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
  }
  loginAttempts.set(email, entry)
}

function clearLoginAttempts(email: string) {
  loginAttempts.delete(email)
}
// ─────────────────────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Rate limit check
        const email = credentials.email.toLowerCase().trim()
        if (!checkLoginRateLimit(email)) return null

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            companyMemberships: {
              include: { company: true },
              orderBy: { joinedAt: 'asc' },
              take: 1,
            },
          },
        })

        if (!user || !user.passwordHash) {
          recordLoginFailure(email)
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) {
          recordLoginFailure(email)
          return null
        }

        clearLoginAttempts(email)

        const membership = user.companyMemberships[0]

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.username,
          username: user.username,
          role: user.role,
          subscription: user.subscription,
          companyId: membership?.companyId ?? null,
          companyName: membership?.company.name ?? null,
          companyLogoUrl: membership?.company.logoUrl ?? null,
          companyBrandColor: membership?.company.brandColor ?? null,
          companyRole: membership?.role ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.role = (user as any).role
        token.subscription = (user as any).subscription
        token.companyId = (user as any).companyId ?? null
        token.companyName = (user as any).companyName ?? null
        token.companyLogoUrl = (user as any).companyLogoUrl ?? null
        token.companyBrandColor = (user as any).companyBrandColor ?? null
        token.companyRole = (user as any).companyRole ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).username = token.username
        ;(session.user as any).role = token.role
        ;(session.user as any).subscription = token.subscription
        ;(session.user as any).companyId = token.companyId ?? null
        ;(session.user as any).companyName = token.companyName ?? null
        ;(session.user as any).companyLogoUrl = token.companyLogoUrl ?? null
        ;(session.user as any).companyBrandColor = token.companyBrandColor ?? null
        ;(session.user as any).companyRole = token.companyRole ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
