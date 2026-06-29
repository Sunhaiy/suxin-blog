import type { Metadata } from 'next'
import { AnimeGrid } from '@/components/ui/AnimeGrid'
import { findAnimes, findAnimeStatusCounts } from '@/lib/db/dao/acgDao'
import { getOptimizedMediaUrl } from '@/lib/media'

const PAGE_SIZE = 15

export const metadata: Metadata = {
  title: '追番列表 · 素心',
}

export const revalidate = 3600

export default async function AnimePage() {
  const [{ data: animes, total }, statusCounts] = await Promise.all([
    findAnimes({ pageSize: PAGE_SIZE }),
    findAnimeStatusCounts(),
  ])

  const coverPool = animes.filter((anime) => anime.cover_url)
  const heroBg =
    coverPool.length > 0
      ? coverPool[Math.floor(Math.random() * coverPool.length)].cover_url!
      : null
  const optimizedHeroBg = heroBg
    ? (getOptimizedMediaUrl(heroBg, { width: 1200, quality: 68 }) ?? heroBg)
    : null

  const completed = statusCounts.completed ?? 0
  const watching = statusCounts.watching ?? 0

  return (
    <div className="-mt-16">
      <section className="relative isolate flex min-h-[22rem] items-center overflow-hidden border-b border-border/45 sm:min-h-[24rem]">
        {heroBg ? (
          <img
            src={optimizedHeroBg ?? heroBg}
            alt=""
            aria-hidden
            decoding="async"
            fetchPriority="high"
            className="pointer-events-none absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] object-cover opacity-[0.62] blur-md saturate-[1.08] dark:opacity-[0.5]"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-muted" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-[hsl(var(--background)/0.28)] dark:bg-[hsl(var(--background)/0.42)]" />

        <div className="relative mx-auto w-full max-w-6xl px-6 py-12 sm:py-14">
          <div className="w-full max-w-[460px]">
            <p className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-primary">ANIME LIST</p>
            <h1 className="mb-2 text-4xl font-bold text-foreground drop-shadow-[0_10px_30px_rgba(0,0,0,0.16)] sm:text-5xl">
              追番列表
            </h1>
            <p className="mb-4 text-sm text-foreground/72">记录我的二次元之旅</p>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex h-10 w-[92px] items-center justify-center gap-1 rounded-full border border-border/70 bg-[hsl(var(--background)/0.72)] font-mono dark:bg-white/[0.08]">
                <span className="text-lg font-bold leading-none text-ember">{total}</span>
                <span className="text-muted-foreground">部合计</span>
              </span>
              <span className="inline-flex h-10 w-[92px] items-center justify-center gap-1 rounded-full border border-border/70 bg-[hsl(var(--background)/0.72)] text-muted-foreground dark:bg-white/[0.08]">
                <span className="text-lg font-bold leading-none text-emerald-400">{watching}</span> 在追
              </span>
              <span className="inline-flex h-10 w-[92px] items-center justify-center gap-1 rounded-full border border-border/70 bg-[hsl(var(--background)/0.72)] text-muted-foreground dark:bg-white/[0.08]">
                <span className="text-lg font-bold leading-none text-foreground">{completed}</span> 完结
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {animes.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">暂无动画记录</p>
        ) : (
          <AnimeGrid
            animes={animes}
            total={total}
            statusCounts={statusCounts}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>
    </div>
  )
}
