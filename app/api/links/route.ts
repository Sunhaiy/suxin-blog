/**
 * app/api/links/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findLinks, insertLink } from '@/lib/db/dao/linkDao'
import { z } from 'zod'

function isUploadOrAbsoluteUrl(value: string) {
  if (value.startsWith('/')) return true
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().optional(),
  avatarUrl: z.string().trim().refine(isUploadOrAbsoluteUrl, 'Invalid avatar URL').optional(),
  category: z.string().trim().min(1).max(60).regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const admin = await isAdmin(req)
  // 管理员可查看全部（包括 inactive），访客只看 active
  const links = await findLinks(!admin)
  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const link = await insertLink(parsed.data)
  return NextResponse.json(link, { status: 201 })
}
