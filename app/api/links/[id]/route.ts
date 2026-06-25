/**
 * app/api/links/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findLinkById, updateLink, deleteLink } from '@/lib/db/dao/linkDao'
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

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  avatarUrl: z.string().trim().refine(isUploadOrAbsoluteUrl, 'Invalid avatar URL').optional(),
  category: z.string().trim().min(1).max(60).regex(/^[a-z0-9][a-z0-9_-]*$/).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const link = await updateLink(Number(id), parsed.data)
  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(link)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ok = await deleteLink(Number(id))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
