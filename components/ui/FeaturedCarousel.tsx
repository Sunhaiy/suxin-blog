'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getOptimizedMediaUrl, pickDeterministicMediaUrl, resolveMediaUrl } from '@/lib/media'
import type { PostRow } from '@/types/post'

type CarouselPost = Pick<PostRow, 'id' | 'slug' | 'title' | 'cover_url' | 'published_at' | 'category'>

export function FeaturedCarousel({
  posts,
  fallbackCoverUrl,
  fallbackCoverPool,
}: {
  posts: CarouselPost[]
  fallbackCoverUrl?: string | null
  fallbackCoverPool?: string[]
}) {
  const [page, setPage] = useState(0)
  const PER = 3
  const totalPages = Math.ceil(posts.length / PER)
  const visible = posts.slice(page * PER, page * PER + PER)

  if (posts.length === 0) return null

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {visible.map((post, index) => {
          const coverUrl = resolveMediaUrl(
            post.cover_url,
            pickDeterministicMediaUrl(fallbackCoverPool, post.slug || post.id, fallbackCoverUrl)
          )
          const optimizedCoverUrl = getOptimizedMediaUrl(coverUrl, { width: 828, quality: 72 }) ?? coverUrl

          return (
            <Link
              key={post.id}
              data-route-reveal
              href={`/posts/${post.slug}`}
              className="group relative block aspect-[3/2] overflow-hidden rounded-xl border border-border/80 bg-card/92 transition-colors duration-300 hover:border-border/90"
            >
              {optimizedCoverUrl ? (
                <ProgressiveImage
                  src={optimizedCoverUrl}
                  alt={post.title}
                  loading={page === 0 && index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={page === 0 && index === 0 ? 'high' : 'low'}
                  wrapperClassName="h-full w-full"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-card">
                  <span className="bg-gradient-to-br from-primary/45 to-primary/10 bg-clip-text text-5xl font-bold text-transparent">
                    {post.category?.charAt(0) ?? '文'}
                  </span>
                </div>
              )}

              {post.category ? (
                <span className="cover-category-badge absolute left-3 top-3 z-10 px-3 py-1 text-[11px]">
                  {post.category}
                </span>
              ) : null}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-white">{post.title}</p>
                <time className="mt-1.5 block text-[10px] font-mono text-white/50">
                  {post.published_at ? new Date(post.published_at).toLocaleDateString('zh-CN') : ''}
                </time>
              </div>
            </Link>
          )
        })}
      </div>

      {totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === page
                    ? 'w-5 bg-primary'
                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <RiArrowLeftSLine size={15} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <RiArrowRightSLine size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
