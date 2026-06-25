import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/requireAdmin'
import { findWorkDetails, findWorks, insertWork } from '@/lib/db/dao/worksDao'
import { workSchema } from '@/lib/validation/work'

export async function GET(req: NextRequest) {
  const adminParam = req.nextUrl.searchParams.get('admin') === 'true'

  if (adminParam && !await isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const works = adminParam
    ? await findWorkDetails({ includeUnpublished: true })
    : await findWorks({ includeUnpublished: false })
  return NextResponse.json(works)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = workSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const work = await insertWork(parsed.data)
    return NextResponse.json(work, { status: 201 })
  } catch (error) {
    console.error('[works.create]', error)
    return NextResponse.json({ error: 'Failed to create work' }, { status: 500 })
  }
}
