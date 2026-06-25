/**
 * app/api/acg/game/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findGames, insertGame } from '@/lib/db/dao/acgDao'
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
  coverUrl: z.string().trim().refine(isUploadOrAbsoluteUrl, 'Invalid cover URL').optional(),
  cartridgeImageUrl: z
    .string()
    .trim()
    .refine(isUploadOrAbsoluteUrl, 'Invalid cartridge image URL')
    .optional(),
  platform: z.enum(['pc', 'ps5', 'ps4', 'switch', 'xbox', 'mobile', 'other']).optional(),
  status: z.enum(['playing', 'completed', 'abandoned', 'plan_to_play', 'platinum']).optional(),
  playHours: z.number().min(0).optional(),
  rating: z.number().min(1).max(10).optional(),
  shortReview: z.string().optional(),
  completedAt: z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const result = await findGames({
    status: searchParams.get('status') ?? undefined,
    platform: searchParams.get('platform') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 50),
  })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const game = await insertGame(parsed.data)
  return NextResponse.json(game, { status: 201 })
}
