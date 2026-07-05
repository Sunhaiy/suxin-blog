import type { Metadata } from 'next'
import { preload } from 'react-dom'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  RiArrowRightUpLine,
  RiCalendarLine,
  RiEyeLine,
  RiFileCopyLine,
  RiTimeLine,
} from '@remixicon/react'
import { auth } from '@/auth'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { PostScrollTitle } from '@/components/ui/PostScrollTitle'
import { TOC } from '@/components/ui/TOC'
import { getOptimizedMediaUrl, pickDeterministicMediaUrl, resolveMediaUrl } from '@/lib/media'
import {
  findPostBySlug,
  findPosts,
  incrementViewCount,
} from '@/lib/db/dao/postDao'
import { getSiteProfile } from '@/lib/site'
import { estimateReadTime, extractHeadings } from '@/lib/utils/extractHeadings'
import { CommentSection } from './CommentSection'
import { PostContent } from './PostContent'

export const revalidate = 3600

export async function generateStaticParams() {
  try {
    const result = await findPosts({ status: 'published', pageSize: 100 })
    return result.data.map((post) => ({ slug: post.slug }))
  } catch (error) {
    console.warn('[posts/[slug]] Skipping static params generation during build:', error)
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [post, siteProfile] = await Promise.all([findPostBySlug(slug), getSiteProfile()])

  if (!post) {
    return { title: '文章不存在' }
  }

  const coverUrl = resolveMediaUrl(
    post.cover_url,
    pickDeterministicMediaUrl(siteProfile.postCoverPoolUrls, post.slug || post.id, siteProfile.defaultPostCoverUrl)
  )
  const canonicalUrl = `${(siteProfile.siteUrl || 'https://haiy.space').replace(/\/$/, '')}/posts/${post.slug}`
  const publishedTime = toIsoDateString(post.published_at)

  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    keywords: post.tags,
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      images: coverUrl ? [coverUrl] : [],
      type: 'article',
      ...(publishedTime ? { publishedTime } : {}),
      url: canonicalUrl,
    },
    twitter: {
      card: coverUrl ? 'summary_large_image' : 'summary',
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      images: coverUrl ? [coverUrl] : [],
    },
  }
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { slug } = await params
  const { preview } = await searchParams
  const post = await findPostBySlug(slug)
  const session = preview === '1' ? await auth() : null
  const canPreviewDraft = preview === '1' && Boolean(session)

  if (!post || (post.status !== 'published' && !canPreviewDraft)) {
    notFound()
  }

  if (post.status === 'published') {
    incrementViewCount(post.id).catch(() => {})
  }

  const siteProfile = await getSiteProfile()

  const headings = extractHeadings(post.content as object)
  const readTime = estimateReadTime(post.content as object)
  const coverUrl = resolveMediaUrl(
    post.cover_url,
    pickDeterministicMediaUrl(siteProfile.postCoverPoolUrls, post.slug || post.id, siteProfile.defaultPostCoverUrl)
  )
  const optimizedCoverUrl = getOptimizedMediaUrl(coverUrl, { width: 1200, quality: 70 })
  // 文章头图（hero / LCP）尽早高优先级加载
  if (optimizedCoverUrl) {
    preload(optimizedCoverUrl, { as: 'image', fetchPriority: 'high' })
  }
  const optimizedAvatarUrl = getOptimizedMediaUrl(siteProfile.avatarUrl, { width: 256, quality: 76 })
  const canonicalUrl = `${(siteProfile.siteUrl || 'https://haiy.space').replace(/\/$/, '')}/posts/${post.slug}`
  const licenseName = 'CC BY-NC-SA 4.0'
  const publishedAtIso = toIsoDateString(post.published_at)
  const publishedAtLabel = formatZhDate(post.published_at)

  return (
    <>
      <PostScrollTitle title={post.title} />

      <section id="post-detail-hero" className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        {optimizedCoverUrl ? (
          <div className="absolute inset-0">
            <ProgressiveImage
              src={optimizedCoverUrl}
              alt={post.cover_alt || post.title}
              decoding="async"
              fetchPriority="high"
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover brightness-[0.62] saturate-[0.94]"
            />
          </div>
        ) : (
          <>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
            />
          </>
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/96 via-black/68 to-black/46"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.24),transparent_22%,transparent_78%,rgba(0,0,0,0.24))]"
        />

        <div className="relative flex min-h-[420px] flex-col items-center justify-center px-6 pb-28 pt-16 text-center sm:px-20">
          {post.tags.length > 0 ? (
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/posts?tags=${encodeURIComponent(tag)}`}
                  className="scene-chip px-3.5 py-1.5 text-xs font-semibold transition-colors hover:brightness-110"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}

          <h1 className="max-w-3xl text-3xl font-bold leading-snug tracking-tight text-white sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
              {post.excerpt}
            </p>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-6">
          <div className="scene-panel flex items-center divide-x divide-hero-border/20 overflow-hidden rounded-2xl text-xs font-semibold text-hero-muted">
            <div className="px-4 py-2.5 text-hero">
              {siteProfile.ownerName}
            </div>

            {publishedAtIso ? (
              <div className="flex items-center gap-1.5 px-4 py-2.5">
                <RiTimeLine size={12} className="shrink-0 opacity-70" />
                <time dateTime={publishedAtIso}>{publishedAtLabel}</time>
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 px-4 py-2.5">
              <RiEyeLine size={12} className="shrink-0 opacity-70" />
              <span>{post.view_count}</span>
            </div>

            <div className="px-4 py-2.5">
              约 {readTime} 分钟
            </div>
          </div>
        </div>
      </section>

      <div className="bg-background">
        <div className="mx-auto max-w-7xl overflow-visible px-3 py-10 sm:px-5">
          <div className="post-detail-layout grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <article id="post-reading-surface" className="min-w-0">
            <PostContent content={post.content as object} headings={headings} />

            <section aria-label="文章信息" className="mt-14 border-y border-border/75 py-6">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                    {optimizedAvatarUrl ? (
                      <ProgressiveImage
                        src={optimizedAvatarUrl}
                        alt={siteProfile.ownerName}
                        width={48}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        wrapperClassName="h-full w-full rounded-full"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="select-none text-base font-semibold text-muted-foreground">
                        {siteProfile.ownerInitial}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Written by</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{siteProfile.ownerName}</p>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">{siteProfile.bio}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs sm:min-w-[280px]">
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <RiCalendarLine size={13} />
                      发布日期
                    </dt>
                    <dd className="mt-1.5 font-medium text-foreground">{publishedAtLabel || '未发布'}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <RiFileCopyLine size={13} />
                      内容许可
                    </dt>
                    <dd className="mt-1.5 font-medium text-foreground">{licenseName}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-border/65 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  本文标题：<span className="text-foreground/82">{post.title}</span>
                </p>
                <a
                  href={canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-primary"
                >
                  永久链接
                  <RiArrowRightUpLine size={14} />
                </a>
              </div>
            </section>

            <CommentSection
              postId={post.id}
              viewerIsAuthor={Boolean(session)}
              ownerName={siteProfile.ownerName}
            />
          </article>

          <aside className="post-detail-toc sticky top-24 hidden self-start lg:block">
            <div className="z-20 w-[240px] max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
              <TOC
                headings={headings}
                readTime={readTime}
                publishedAt={publishedAtIso}
                articleSelector="#post-reading-surface"
              />
            </div>
          </aside>
          </div>
        </div>
      </div>
    </>
  )
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDateString(value: Date | string | null | undefined) {
  return toDate(value)?.toISOString() ?? null
}

function formatZhDate(value: Date | string | null | undefined) {
  const date = toDate(value)
  if (!date) return null

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
