/**
 * app/api/gallery/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findGalleryItemById, updateGalleryItem, deleteGalleryItem } from '@/lib/db/dao/galleryDao'
import { storage } from '@/lib/storage/LocalStorage'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['photo', 'artwork', 'screenshot', 'other']).optional(),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  albumId: z.number().int().nullable().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await findGalleryItemById(Number(id))
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const item = await updateGalleryItem(Number(id), parsed.data)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const item = await findGalleryItemById(Number(id))
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 删除本地文件
  await storage.delete(item.url).catch(() => {})
  if (item.thumbnail_url) await storage.delete(item.thumbnail_url).catch(() => {})

  const ok = await deleteGalleryItem(Number(id))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
