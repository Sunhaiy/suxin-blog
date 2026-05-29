import type { Metadata } from 'next'
import { preload } from 'react-dom'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  RiEyeLine,
  RiTimeLine,
} from '@remixicon/react'
import { auth } from '@/auth'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
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
  const optimizedCoverUrl = getOptimizedMediaUrl(coverUrl, { width: 1920, quality: 72 })
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
      <section className="relative overflow-hidden" style={{ minHeight: '420px' }}>
        {optimizedCoverUrl ? (
          <ProgressiveImage
            src={optimizedCoverUrl}
            alt={post.cover_alt || post.title}
            decoding="async"
            fetchPriority="high"
            wrapperClassName="absolute inset-0 h-full w-full"
            className="absolute inset-0 h-full w-full object-cover brightness-[0.62] saturate-[0.94]"
          />
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
                  className="rounded-full border border-white/32 bg-black/76 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-xl transition-colors hover:border-white/42 hover:bg-black/84 dark:border-white/28 dark:bg-zinc-950/72 dark:text-white dark:hover:bg-zinc-950/82"
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
          <div className="divide-x flex items-center gap-0 overflow-hidden rounded-2xl border border-white/34 bg-black/78 text-xs font-semibold text-white backdrop-blur-2xl divide-white/18">
            <div className="px-4 py-2.5 text-white">
              {siteProfile.ownerName}
            </div>

            {publishedAtIso ? (
              <div className="flex items-center gap-1.5 px-4 py-2.5 text-white">
                <RiTimeLine size={12} className="shrink-0 text-white/90" />
                <time className="text-white" dateTime={publishedAtIso}>{publishedAtLabel}</time>
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 px-4 py-2.5 text-white">
              <RiEyeLine size={12} className="shrink-0 text-white/90" />
              <span className="text-white">{post.view_count}</span>
            </div>

            <div className="px-4 py-2.5 text-white">
              约 {readTime} 分钟
            </div>
          </div>
        </div>
      </section>

      <div className="bg-background">
        <div className="mx-auto max-w-7xl overflow-visible px-3 py-10 sm:px-5">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <article id="post-reading-surface" className="min-w-0">
            <PostContent content={post.content as object} headings={headings} />

            <div className="mb-8 mt-12 border-t border-border" />

            <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/25 bg-gradient-to-br from-primary/30 to-primary/8">
                {optimizedAvatarUrl ? (
                  <ProgressiveImage
                    src={optimizedAvatarUrl}
                    alt={siteProfile.ownerName}
                    width={56}
                    height={56}
                    loading="lazy"
                    decoding="async"
                    wrapperClassName="h-full w-full rounded-full"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="select-none text-xl font-bold text-primary">
                    {siteProfile.ownerInitial}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-sm font-semibold text-foreground">
                  {siteProfile.ownerName}
                </p>
                <p className="mb-2 text-[11px] tracking-[0.02em] text-primary">
                  {siteProfile.roleLine}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{siteProfile.bio}</p>
              </div>
            </div>

            <section className="mt-6 overflow-hidden rounded-[30px] border border-border/70 bg-card/82 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <div className="relative px-5 py-5 sm:px-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1 text-[6.5rem] font-semibold leading-none text-foreground/6 sm:right-5 sm:text-[8rem]"
                >
                  CC
                </div>
                <div className="relative">
                  <p className="text-sm font-semibold text-foreground">{post.title}</p>
                  <a
                    href={canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-sm text-primary hover:text-primary/80"
                  >
                    {canonicalUrl}
                  </a>
                  <div className="mt-5 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground/80">作者</p>
                      <p className="font-medium text-foreground">{siteProfile.ownerName}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground/80">发布于</p>
                      <p className="font-medium text-foreground">{publishedAtLabel || '未发布'}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground/80">许可协议</p>
                      <p className="font-medium text-primary">{licenseName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <CommentSection
              postId={post.id}
              viewerIsAuthor={Boolean(session)}
              ownerName={siteProfile.ownerName}
            />
          </article>

          <aside className="sticky top-24 hidden self-start lg:block">
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
