import Link from 'next/link'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getOptimizedMediaUrl, pickDeterministicMediaUrl, resolveMediaUrl } from '@/lib/media'
import type { PostRow } from '@/types/post'

interface PostCardProps {
  post: Pick<
    PostRow,
    'id' | 'slug' | 'title' | 'excerpt' | 'cover_url' | 'category' | 'tags' | 'published_at'
  >
  fallbackCoverUrl?: string | null
  fallbackCoverPool?: string[]
}

export function PostCard({ post, fallbackCoverUrl, fallbackCoverPool }: PostCardProps) {
  const coverUrl = resolveMediaUrl(
    post.cover_url,
    pickDeterministicMediaUrl(fallbackCoverPool, post.slug || post.id, fallbackCoverUrl)
  )
  const optimizedCoverUrl = getOptimizedMediaUrl(coverUrl, { width: 828, quality: 72 })

  return (
    <Link href={`/posts/${post.slug}`} className="group block h-full">
      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-[22px] border border-border/80 bg-card/92 backdrop-blur-sm
                      transition-all duration-300 hover:-translate-y-0.5 hover:border-border/90`}
      >
        <div className="relative aspect-[16/9] flex-shrink-0 overflow-hidden">
          {optimizedCoverUrl ? (
            <ProgressiveImage
              src={optimizedCoverUrl}
              alt={post.title}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              wrapperClassName="h-full w-full"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 via-card to-muted">
              <span className="select-none bg-gradient-to-br from-primary/40 to-primary/10 bg-clip-text text-7xl font-bold leading-none text-transparent">
                {post.category?.charAt(0) ?? '文'}
              </span>
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg,currentColor 0,currentColor 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 1px,transparent 32px)',
                }}
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />

          {post.category ? (
            <span className="cover-category-badge absolute left-2.5 top-2.5 z-10 px-2.5 py-1 text-[10px]">
              {post.category}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
          <h3 className="mb-1.5 line-clamp-2 font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
            {post.title}
          </h3>
          {post.excerpt ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="flex flex-wrap gap-1">
              {post.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <time className="ml-2 flex-shrink-0 font-mono text-[11px] text-muted-foreground/50">
              {post.published_at
                ? new Date(post.published_at).toLocaleDateString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                  })
                : '草稿'}
            </time>
          </div>
        </div>
      </div>
    </Link>
  )
}
