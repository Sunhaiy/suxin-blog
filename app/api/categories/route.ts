/**
 * app/api/categories/route.ts
 *
 * GET  /api/categories        — 获取分类列表（公开）
 * PUT  /api/categories        — 重命名分类（需鉴权）
 * DELETE /api/categories      — 删除分类 / 重置为未分类（需鉴权）
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findCategories, renameCategory, resetCategory } from '@/lib/db/dao/postDao'
import { z } from 'zod'

export async function GET() {
  try {
    const categories = await findCategories()
    return NextResponse.json(categories)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = z.object({
    oldName: z.string().min(1),
    newName: z.string().min(1).max(50),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { oldName, newName } = parsed.data
  const count = await renameCategory(oldName, newName)
  return NextResponse.json({ updated: count })
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = z.object({ name: z.string().min(1) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const count = await resetCategory(parsed.data.name)
  return NextResponse.json({ updated: count })
}
