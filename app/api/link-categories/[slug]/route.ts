import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { deleteLinkCategory } from '@/lib/db/dao/linkCategoryDao'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const result = await deleteLinkCategory(decodeURIComponent(slug))
  if (!result.deleted) {
    return NextResponse.json({ error: 'Category not found or cannot be deleted' }, { status: 400 })
  }

  return NextResponse.json(result)
}
