/**
 * middleware.ts
 *
 * Next.js 涓棿浠?鈥?淇濇姢 /dashboard/* 璺敱銆?
 * 鏈櫥褰曟椂閲嶅畾鍚戝埌 /admin/login銆?
 */

import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/config'

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ['/dashboard/:path*'],
}
