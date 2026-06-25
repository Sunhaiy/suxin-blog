/**
 * app/api/acg/game/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findGameById, updateGame, deleteGame } from '@/lib/db/dao/acgDao'
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const game = await findGameById(Number(id))
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(game)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const game = await updateGame(Number(id), parsed.data)
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(game)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ok = await deleteGame(Number(id))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
