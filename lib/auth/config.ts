import type { NextAuthConfig } from 'next-auth'

function applyAuthEnvFallback() {
  const canonicalUrl =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim()

  if (!canonicalUrl) return

  process.env.AUTH_URL ??= canonicalUrl
  process.env.NEXTAUTH_URL ??= canonicalUrl
}

applyAuthEnvFallback()

export const authConfig: NextAuthConfig = {
  providers: [],

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/admin/login',
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')
      if (isOnDashboard) return isLoggedIn
      return true
    },

    jwt({ token, user }) {
      if (user) {
        token.role = 'admin'
        token.id = user.id
      }
      return token
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        // @ts-expect-error custom field
        session.user.role = token.role
      }
      return session
    },
  },
}
