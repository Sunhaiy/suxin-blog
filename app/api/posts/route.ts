import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { articleDocSchema } from '@/lib/articles/document'
import { findPosts, insertPost } from '@/lib/db/dao/postDao'
import { syncPostSearchIndex } from '@/lib/seo/submission'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  content: articleDocSchema,
  excerpt: z.string().optional(),
  coverUrl: z.string().min(1).nullable().optional(),
  coverAlt: z.string().max(200).nullable().optional(),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? 10), 50)
  const status = searchParams.get('status') as 'draft' | 'published' | 'archived' | null
  const session = await auth()

  try {
    const result = await findPosts({
      page,
      pageSize,
      status: session ? (status ?? undefined) : 'published',
      tag: searchParams.get('tag') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      keyword: searchParams.get('keyword') ?? undefined,
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const post = await insertPost(parsed.data)

    if (post.status === 'published') {
      void syncPostSearchIndex({ after: post })
    }

    return NextResponse.json(post, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('unique')) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
