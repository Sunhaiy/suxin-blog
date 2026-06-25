/**
 * app/api/acg/anime/route.ts
 *
 * GET  /api/acg/anime  — 动漫列表
 * POST /api/acg/anime  — 新增动漫（需鉴权）
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findAnimes, insertAnime } from '@/lib/db/dao/acgDao'
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
  title: z.string().min(1),
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const result = await findAnimes({
    status: searchParams.get('status') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 50),
  })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const anime = await insertAnime(parsed.data)
  return NextResponse.json(anime, { status: 201 })
}
