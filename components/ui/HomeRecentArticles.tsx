import Link from 'next/link'
import { PublicSymbol } from '@/components/ui/PublicSymbol'
import type { PostRow } from '@/types/post'

interface HomeRecentArticlesProps {
  posts: Array<
    Pick<PostRow, 'id' | 'slug' | 'title' | 'excerpt' | 'category' | 'view_count'>
  >
}

export function HomePopularArticles({ posts }: HomeRecentArticlesProps) {
  return (
    <section data-scroll-reveal className="mb-2 mt-9" id="popular-posts" aria-labelledby="home-popular-title">
      <div className="flex items-center justify-between gap-5 border-b border-foreground/80 pb-4">
        <h2 id="home-popular-title" className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em] text-foreground sm:text-2xl">
          <PublicSymbol icon="local_fire_department" size={22} className="text-muted-foreground" />
          热度文章
        </h2>
      </div>

      <div>
        {posts.map((post, index) => (
          <Link
            key={post.id}
            href={`/posts/${post.slug}`}
            className="group grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/75 py-5 transition-colors hover:bg-primary/[0.035] sm:grid-cols-[42px_100px_minmax(0,1fr)_80px_28px] sm:gap-4 sm:px-2"
          >
            <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
            <span className="hidden w-fit rounded-full border border-border/80 px-2.5 py-1 text-[10px] text-muted-foreground sm:inline-flex">
              {post.category || '未分类'}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold tracking-[-0.025em] text-foreground transition-transform duration-300 group-hover:translate-x-1 sm:text-lg">
                {post.title}
              </h3>
              {post.excerpt ? <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:hidden">{post.excerpt}</p> : null}
            </div>
            <span className="hidden items-center justify-end gap-1 text-right font-mono text-[10px] text-muted-foreground sm:flex">
              <PublicSymbol icon="visibility" size={13} />
              {post.view_count}
            </span>
            <PublicSymbol icon="arrow_outward" size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <div className="flex justify-end pt-6">
        <Link href="/posts" className="inline-flex items-center gap-2 rounded-full border border-border/80 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/35 hover:text-primary">
          进入文章档案
          <PublicSymbol icon="arrow_forward" size={15} />
        </Link>
      </div>
    </section>
  )
}
