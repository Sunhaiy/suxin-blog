/**
 * app/api/moments/route.ts
 *
 * GET  /api/moments  — 瞬间列表
 * POST /api/moments  — 创建瞬间（需鉴权）
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findMoments, insertMoment } from '@/lib/db/dao/momentDao'
import { z } from 'zod'

const jsonContentSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    text: z.string().optional(),
    attrs: z.record(z.unknown()).optional(),
    content: z.array(jsonContentSchema).optional(),
  })
)

const createSchema = z.object({
  type: z.enum(['text', 'image', 'sleep', 'steps', 'heartrate', 'mood', 'link']).default('text'),
  content: z.string().optional(),
  contentJson: jsonContentSchema.optional(),
  images: z.array(z.string()).optional(),
  meta: z.record(z.unknown()).optional(),
  mood: z.string().optional(),
  weather: z.string().optional(),
  location: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const admin = await isAdmin(req)

  const result = await findMoments({
    page: Number(searchParams.get('page') ?? 1),
    pageSize: Number(searchParams.get('pageSize') ?? 20),
    type: searchParams.get('type') ?? undefined,
    publicOnly: !admin,
  })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const moment = await insertMoment(parsed.data)
  return NextResponse.json(moment, { status: 201 })
}
