/**
 * auth.ts (椤圭洰鏍圭洰褰?)
 *
 * NextAuth.js v5 缁熶竴瀵煎嚭鐐广€?
 * middleware 鍜?API route 鍧囦粠姝ゆ枃浠跺鍏ャ€?
 */

import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { authConfig } from '@/lib/auth/config'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const runtimeAuthConfig: NextAuthConfig = {
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const { authenticateAdmin } = await import('@/lib/auth/adminCredentials')
        return authenticateAdmin(email, password)
      },
    }),
  ],
}

export const { handlers, auth, signIn, signOut } = NextAuth(runtimeAuthConfig)
