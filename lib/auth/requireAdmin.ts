import { NextRequest } from 'next/server'
import { auth } from '@/auth'

/**
 * Returns true if the request is authenticated as admin —
 * either via a NextAuth session (browser) or a Bearer API key (desktop apps).
 *
 * Set ADMIN_API_KEY in .env to enable API key auth.
 * Desktop clients send: Authorization: Bearer <ADMIN_API_KEY>
 */
export async function isAdmin(req: NextRequest): Promise<boolean> {
  const key = process.env.ADMIN_API_KEY
  if (key) {
    const authHeader = req.headers.get('authorization') ?? ''
    if (authHeader === `Bearer ${key}`) return true
  }
  const session = await auth()
  return !!session
}
