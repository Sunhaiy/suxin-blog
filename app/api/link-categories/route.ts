import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findLinkCategories, insertLinkCategory } from '@/lib/db/dao/linkCategoryDao'

const createSchema = z.object({
  label: z.string().trim().min(1).max(30),
  slug: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .optional(),
  description: z.string().trim().max(180).optional(),
  icon: z.string().trim().max(40).optional(),
})

export async function GET() {
  const categories = await findLinkCategories()
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const category = await insertLinkCategory(parsed.data)
  return NextResponse.json(category, { status: 201 })
}
