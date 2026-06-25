/**
 * app/api/acg/anime/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findAnimeById, updateAnime, deleteAnime } from '@/lib/db/dao/acgDao'
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
  title: z.string().min(1).optional(),
  titleCn: z.string().optional(),
  coverUrl: z.string().trim().refine(isUploadOrAbsoluteUrl, 'Invalid cover URL').optional(),
  type: z.enum(['tv', 'movie', 'ova', 'special']).optional(),
  episodesTotal: z.number().int().positive().optional(),
  episodesWatched: z.number().int().min(0).optional(),
  status: z.enum(['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']).optional(),
  rating: z.number().min(1).max(10).optional(),
  shortReview: z.string().optional(),
  startSeason: z.string().optional(),
  malId: z.number().int().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const anime = await findAnimeById(Number(id))
  if (!anime) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(anime)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const anime = await updateAnime(Number(id), parsed.data)
  if (!anime) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(anime)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ok = await deleteAnime(Number(id))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
