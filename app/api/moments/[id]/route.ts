/**
 * app/api/moments/[id]/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findMomentById, updateMoment, deleteMoment } from '@/lib/db/dao/momentDao'
import { z } from 'zod'

const jsonContentSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    text: z.string().optional(),
    attrs: z.record(z.unknown()).optional(),
    content: z.array(jsonContentSchema).optional(),
  })
)

const updateSchema = z.object({
  type: z.enum(['text', 'image', 'sleep', 'steps', 'heartrate', 'mood', 'link']).optional(),
  content: z.string().optional(),
  contentJson: jsonContentSchema.nullable().optional(),
  images: z.array(z.string()).optional(),
  meta: z.record(z.unknown()).optional(),
  mood: z.string().optional(),
  weather: z.string().optional(),
  location: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const moment = await findMomentById(Number(id))
  if (!moment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!moment.is_public && !await isAdmin(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(moment)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const moment = await updateMoment(Number(id), parsed.data)
  if (!moment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(moment)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ok = await deleteMoment(Number(id))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
