import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { generateArticleFromMaterials } from '@/lib/ai/articleWriter'
import { getDeepSeekPublicStatus } from '@/lib/ai/deepseek'
import { findPostBySlug, insertPost } from '@/lib/db/dao/postDao'
import { pickDeterministicMediaUrl } from '@/lib/media'
import { syncPostSearchIndex } from '@/lib/seo/submission'
import { slugify } from '@/lib/slugify'
import { getSiteProfile } from '@/lib/site'

const requestSchema = z.object({
  materials: z.string().min(20).max(120000),
  titleHint: z.string().max(200).optional(),
  angle: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().min(1).max(24)).max(10).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  publishedAt: z.string().max(80).nullable().optional(),
  model: z.string().max(80).optional(),
})

function createFallbackSlug(title: string) {
  const base = slugify(title)
  if (!base || base === 'work') {
    return `post-${Date.now()}`
  }

  return base
}

function normalizePublishedAt(value?: string | null) {
  if (!value?.trim()) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('发布时间格式不正确')
  }

  return date.toISOString()
}

async function createUniquePostSlug(title: string) {
  const base = createFallbackSlug(title)
  let candidate = base
  let suffix = 2

  while (await findPostBySlug(candidate)) {
    candidate = `${base}-${suffix++}`
  }

  return candidate
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(await getDeepSeekPublicStatus())
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const generated = await generateArticleFromMaterials(parsed.data)
    const slug = await createUniquePostSlug(generated.title)
    const siteProfile = await getSiteProfile()
    const autoCoverUrl = pickDeterministicMediaUrl(
      siteProfile.postCoverPoolUrls,
      slug,
      siteProfile.defaultPostCoverUrl
    )

    const post = await insertPost({
      title: generated.title,
      slug,
      content: generated.content,
      excerpt: generated.excerpt,
      seoTitle: generated.seoTitle,
      seoDescription: generated.seoDescription,
      category: generated.category,
      tags: generated.tags,
      status: parsed.data.status || 'draft',
      publishedAt: normalizePublishedAt(parsed.data.publishedAt),
      isFeatured: false,
      coverUrl: autoCoverUrl,
      coverAlt: autoCoverUrl ? `${generated.title} 封面` : null,
    })

    if (post.status === 'published') {
      void syncPostSearchIndex({ after: post })
    }

    const deepSeekStatus = await getDeepSeekPublicStatus()

    return NextResponse.json(
      {
        post,
        generation: {
          model: parsed.data.model || deepSeekStatus.model,
          sectionCount: generated.content.content.length,
          tagCount: generated.tags.length,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DeepSeek article generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
