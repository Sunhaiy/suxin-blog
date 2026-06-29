'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getOptimizedMediaUrl } from '@/lib/media'
import type { AnimeRow } from '@/types/acg'

interface Props {
  animes: AnimeRow[]
  total?: number
  statusCounts?: Record<string, number>
  pageSize?: number
}

const DEFAULT_PAGE_SIZE = 15

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'watching', label: '在看' },
  { key: 'completed', label: '看完' },
  { key: 'plan_to_watch', label: '想看' },
  { key: 'on_hold', label: '搁置' },
  { key: 'dropped', label: '弃坑' },
] as const

type StatusKey = (typeof STATUS_TABS)[number]['key']

const STATUS_BADGE: Record<string, { text: string; dotClass: string }> = {
  watching: { text: '连载中', dotClass: 'bg-emerald-300' },
  plan_to_watch: { text: '想看', dotClass: 'bg-primary' },
  on_hold: { text: '搁置', dotClass: 'bg-amber-300' },
  dropped: { text: '弃坑', dotClass: 'bg-rose-300' },
  completed: { text: '看完', dotClass: 'bg-white/60' },
}

const OVERLAY_BADGE_CLASS =
  'inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/20 bg-zinc-950/[0.82] px-2.5 py-1.5 text-[11px] font-semibold leading-none text-white shadow-[0_12px_28px_rgba(0,0,0,0.34)]'

function getEpisodeText(anime: AnimeRow) {
  if (anime.episodes_total) {
    return `${anime.episodes_watched} / ${anime.episodes_total} 话`
  }

  if (anime.status === 'completed') {
    return `共 ${anime.episodes_watched} 话`
  }

  return undefined
}

export function AnimeGrid({
  animes,
  total = animes.length,
  statusCounts,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const [activeStatus, setActiveStatus] = useState<StatusKey>('all')
  const [items, setItems] = useState(animes)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)

  const counts = useMemo(() => {
    if (statusCounts) return { ...statusCounts, all: total }

    const nextCounts: Record<string, number> = { all: total }

    for (const anime of animes) {
      nextCounts[anime.status] = (nextCounts[anime.status] ?? 0) + 1
    }

    return nextCounts
  }, [animes, statusCounts, total])

  const visibleTabs = STATUS_TABS.filter((tab) => tab.key === 'all' || (counts[tab.key] ?? 0) > 0)

  const activeTotal = activeStatus === 'all' ? total : (counts[activeStatus] ?? 0)
  const hasMore = items.length < activeTotal

  useEffect(() => {
    const requestId = ++requestIdRef.current
    setLoadError(false)
    setPage(1)

    if (activeStatus === 'all') {
      setItems(animes)
      setLoading(false)
      return
    }

    setItems([])
    setLoading(true)
    const params = new URLSearchParams({
      page: '1',
      pageSize: String(pageSize),
      status: activeStatus,
    })

    fetch(`/api/acg/anime?${params.toString()}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load anime')
        return response.json() as Promise<{ data: AnimeRow[] }>
      })
      .then((result) => {
        if (requestId === requestIdRef.current) setItems(result.data)
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setLoadError(true)
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [activeStatus, animes, pageSize])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    const nextPage = page + 1
    const requestId = requestIdRef.current
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    })
    if (activeStatus !== 'all') params.set('status', activeStatus)

    setLoading(true)
    setLoadError(false)
    try {
      const response = await fetch(`/api/acg/anime?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load anime')
      const result = (await response.json()) as { data: AnimeRow[] }
      if (requestId !== requestIdRef.current) return

      setItems((current) => {
        const knownIds = new Set(current.map((item) => item.id))
        return [...current, ...result.data.filter((item) => !knownIds.has(item.id))]
      })
      setPage(nextPage)
    } catch {
      if (requestId === requestIdRef.current) setLoadError(true)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [activeStatus, hasMore, loading, page, pageSize])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore()
      },
      { rootMargin: '600px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading])

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveStatus(tab.key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-all duration-200 ${
              activeStatus === tab.key
                ? 'border-foreground bg-foreground text-background'
                : 'border-border/80 bg-card/70 text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[11px] font-mono opacity-60">{counts[tab.key] ?? 0}</span>
          </button>
        ))}

        <span className="ml-auto text-xs font-mono text-muted-foreground">共 {activeTotal} 部</span>
      </div>

      {items.length === 0 && loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">正在加载…</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          {loadError ? '加载失败，请稍后重试' : '暂无记录'}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((anime, index) => {
            const badge = STATUS_BADGE[anime.status]
            const episodeText = getEpisodeText(anime)
            const title = anime.title_cn ?? anime.title
            const rating = anime.rating != null ? Number(anime.rating) : null
            const optimizedCoverUrl =
              getOptimizedMediaUrl(anime.cover_url, { width: 640, quality: 70 }) ?? anime.cover_url

            return (
              <article
                key={anime.id}
                className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/70 bg-[hsl(var(--card)/0.82)] shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
              >
                <div className="relative aspect-[2/3] overflow-hidden">
                  {optimizedCoverUrl ? (
                    <ProgressiveImage
                      src={optimizedCoverUrl}
                      alt={title}
                      loading={index < 5 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index < 2 ? 'high' : 'low'}
                      wrapperClassName="h-full w-full"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-4 text-center">
                      <span className="line-clamp-4 text-sm font-semibold leading-6 text-white/85">{title}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />

                  <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                    <span className={`${OVERLAY_BADGE_CLASS} max-w-[62%]`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                      <span className="truncate">{badge.text}</span>
                    </span>

                    {rating != null && !Number.isNaN(rating) ? (
                      <span className={`${OVERLAY_BADGE_CLASS} shrink-0`}>
                        <MaterialSymbol icon="star" size={12} fill />
                        {rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute inset-x-3 bottom-3 rounded-[18px] border border-white/[0.14] bg-zinc-950/[0.84] px-3.5 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.36)] backdrop-blur-md">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">{title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/70">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MaterialSymbol icon="tv" size={12} />
                        <span className="truncate">{episodeText ?? anime.type.toUpperCase()}</span>
                      </span>
                      {anime.start_season ? (
                        <span className="truncate font-mono text-white/52">{anime.start_season}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-3">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-[hsl(var(--background)/0.8)] px-2.5 py-1 font-mono dark:bg-white/[0.08]">
                      <MaterialSymbol icon="schedule" size={12} />
                      {episodeText ?? '未更新'}
                    </span>
                    <span className="font-mono uppercase tracking-[0.16em]">{anime.type}</span>
                  </div>

                  {anime.short_review ? (
                    <p className="line-clamp-3 text-[12px] leading-5 text-muted-foreground">{anime.short_review}</p>
                  ) : (
                    <p className="line-clamp-2 text-[12px] leading-5 text-muted-foreground/72">
                      收藏一部会想反复回来的作品，把追番时的情绪和进度都安静记下来。
                    </p>
                  )}
                </div>
              </article>
            )
          })}
          </div>

          <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-6 text-xs font-mono text-muted-foreground">
            {loading ? '正在加载下一批…' : loadError ? (
              <button type="button" onClick={() => void loadMore()} className="transition-colors hover:text-foreground">
                加载失败，点击重试
              </button>
            ) : hasMore ? `继续向下滚动 · 已显示 ${items.length}/${activeTotal}` : `已显示全部 ${activeTotal} 部`}
          </div>
        </>
      )}
    </>
  )
}
