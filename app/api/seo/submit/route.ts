import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { findPostById, findPostBySlug, findPosts } from '@/lib/db/dao/postDao'
import {
  buildPostUrl,
  resolveSiteOrigin,
  submitUrlChanges,
} from '@/lib/seo/submission'

const submitSchema = z.object({
  urls: z.array(z.string().url()).max(200).optional(),
  slugs: z.array(z.string().min(1).max(200)).max(200).optional(),
  ids: z.array(z.number().int().positive()).max(200).optional(),
  allPublished: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const siteOrigin = await resolveSiteOrigin()
  if (!siteOrigin) {
    return NextResponse.json({ error: 'Site origin is not configured' }, { status: 500 })
  }

  const urls = new Set<string>(parsed.data.urls ?? [])
  let truncated = false

  if (parsed.data.allPublished) {
    const result = await findPosts({ status: 'published', pageSize: 1000 })
    truncated = result.total > result.data.length

    for (const post of result.data) {
      const url = buildPostUrl(siteOrigin, post.slug)
      if (url) urls.add(url)
    }
  }

  if (parsed.data.slugs?.length) {
    const posts = await Promise.all(parsed.data.slugs.map((slug) => findPostBySlug(slug)))
    for (const post of posts) {
      if (!post || post.status !== 'published') continue
      const url = buildPostUrl(siteOrigin, post.slug)
      if (url) urls.add(url)
    }
  }

  if (parsed.data.ids?.length) {
    const posts = await Promise.all(parsed.data.ids.map((id) => findPostById(id)))
    for (const post of posts) {
      if (!post || post.status !== 'published') continue
      const url = buildPostUrl(siteOrigin, post.slug)
      if (url) urls.add(url)
    }
  }

  if (urls.size === 0) {
    return NextResponse.json(
      { error: 'No published URLs resolved from the request' },
      { status: 400 }
    )
  }

  const resolvedUrls = Array.from(urls)
  const results = await submitUrlChanges(
    resolvedUrls.map((url) => ({ url, kind: 'updated' })),
    { siteOrigin }
  )

  return NextResponse.json({
    submittedUrlCount: resolvedUrls.length,
    truncated,
    urls: resolvedUrls,
    results,
  })
}
