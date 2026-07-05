import Link from 'next/link'
import { PostCard } from '@/components/ui/PostCard'
import { PublicSymbol } from '@/components/ui/PublicSymbol'
import type { HomepagePostCardRow } from '@/lib/db/dao/postDao'

interface HomeArticleCardsProps {
  posts: HomepagePostCardRow[]
  fallbackCoverUrl?: string | null
  fallbackCoverPool?: string[]
}

export function HomeArticleCards({
  posts,
  fallbackCoverUrl,
  fallbackCoverPool,
}: HomeArticleCardsProps) {
  return (
    <section data-scroll-reveal className="mt-9" id="latest-posts" aria-labelledby="home-latest-title">
      <div className="flex items-center justify-between gap-5 border-b border-border/70 pb-4">
        <h2 id="home-latest-title" className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em] text-foreground sm:text-2xl">
          <PublicSymbol icon="article" size={22} className="text-muted-foreground" />
          最新文章
        </h2>
        <Link href="/posts" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
          查看全部
          <PublicSymbol icon="arrow_forward" size={15} />
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="border-b border-border/70 py-12 text-sm text-muted-foreground">文章仍在整理中。</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {posts.slice(0, 4).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              fallbackCoverUrl={fallbackCoverUrl}
              fallbackCoverPool={fallbackCoverPool}
            />
          ))}
        </div>
      )}
    </section>
  )
}
