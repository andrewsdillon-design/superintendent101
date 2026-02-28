import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'

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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            companyMemberships: {
              include: { company: true },
              orderBy: { joinedAt: 'asc' },
              take: 1,
            },
          },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

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
