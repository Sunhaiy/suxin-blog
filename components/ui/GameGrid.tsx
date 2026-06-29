'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getOptimizedMediaUrl } from '@/lib/media'
import type { GameRow } from '@/types/acg'

interface Props {
  games: GameRow[]
  total?: number
  pageSize?: number
}

const DEFAULT_PAGE_SIZE = 15

const STATUS_META: Record<string, { label: string; dotClass: string }> = {
  playing: { label: '游玩中', dotClass: 'bg-emerald-300' },
  completed: { label: '已通关', dotClass: 'bg-white/60' },
  abandoned: { label: '弃坑', dotClass: 'bg-rose-300' },
  plan_to_play: { label: '计划', dotClass: 'bg-primary' },
  platinum: { label: '白金', dotClass: 'bg-amber-300' },
}

const PLATFORM_META: Record<string, { icon: string; label: string }> = {
  pc: { icon: 'desktop_windows', label: 'PC' },
  switch: { icon: 'stadia_controller', label: 'Switch' },
  ps5: { icon: 'sports_esports', label: 'PS5' },
  ps4: { icon: 'sports_esports', label: 'PS4' },
  xbox: { icon: 'sports_esports', label: 'Xbox' },
  mobile: { icon: 'smartphone', label: 'Mobile' },
  other: { icon: 'deployed_code', label: 'Other' },
}

const OVERLAY_BADGE_CLASS =
  'inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/20 bg-zinc-950/[0.82] px-2.5 py-1.5 text-[11px] font-semibold leading-none text-white shadow-[0_12px_28px_rgba(0,0,0,0.34)]'

function getFootnote(game: GameRow) {
  if (game.play_hours != null) return `${game.play_hours}h 游玩`
  if (game.completed_at) {
    return new Date(game.completed_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return '记录中'
}

export function GameGrid({
  games,
  total = games.length,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props) {
  const [items, setItems] = useState(games)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const hasMore = items.length < total

  useEffect(() => {
    setItems(games)
    setPage(1)
    setLoading(false)
    setLoadError(false)
  }, [games])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    const nextPage = page + 1
    setLoading(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      })
      const response = await fetch(`/api/acg/game?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load games')
      const result = (await response.json()) as { data: GameRow[] }

      setItems((current) => {
        const knownIds = new Set(current.map((item) => item.id))
        return [...current, ...result.data.filter((item) => !knownIds.has(item.id))]
      })
      setPage(nextPage)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [hasMore, loading, page, pageSize])

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

  if (items.length === 0) {
    return <p className="py-20 text-center text-sm text-muted-foreground">暂无游戏记录</p>
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((game, index) => {
        const status = STATUS_META[game.status] ?? STATUS_META.completed
        const platform = PLATFORM_META[game.platform] ?? PLATFORM_META.other
        const rating = game.rating != null ? Number(game.rating) : null
        const optimizedCoverUrl =
          getOptimizedMediaUrl(game.cover_url, { width: 640, quality: 70 }) ?? game.cover_url

        return (
          <article
            key={game.id}
            className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/70 bg-[hsl(var(--card)/0.82)] shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
          >
            <div className="relative aspect-square overflow-hidden">
              {optimizedCoverUrl ? (
                <ProgressiveImage
                  src={optimizedCoverUrl}
                  alt={game.title}
                  loading={index < 5 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index < 2 ? 'high' : 'low'}
                  wrapperClassName="h-full w-full"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-4 text-center">
                  <span className="line-clamp-4 text-sm font-semibold leading-6 text-white/85">{game.title}</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/20 to-transparent" />

              <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                <span className={`${OVERLAY_BADGE_CLASS} max-w-[58%]`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                  <span className="truncate">{status.label}</span>
                </span>

                <span className={`${OVERLAY_BADGE_CLASS} shrink-0`}>
                  <MaterialSymbol icon={platform.icon} size={12} />
                  {platform.label}
                </span>
              </div>

              <div className="absolute inset-x-3 bottom-3 rounded-[18px] border border-white/[0.14] bg-zinc-950/[0.84] px-3.5 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.36)] backdrop-blur-md">
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">{game.title}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/70">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MaterialSymbol icon="schedule" size={12} />
                    <span className="truncate">{getFootnote(game)}</span>
                  </span>
                  {rating != null && !Number.isNaN(rating) ? (
                    <span className="inline-flex items-center gap-1 font-mono text-white/85">
                      <MaterialSymbol icon="star" size={12} fill />
                      {rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-3">
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-[hsl(var(--background)/0.8)] px-2.5 py-1 font-mono dark:bg-white/[0.08]">
                  <MaterialSymbol icon={platform.icon} size={12} />
                  {platform.label}
                </span>
                <span className="font-mono tracking-[0.16em] text-muted-foreground/80">{status.label}</span>
              </div>

              {game.short_review ? (
                <p className="line-clamp-3 text-[12px] leading-5 text-muted-foreground">{game.short_review}</p>
              ) : (
                <p className="line-clamp-2 text-[12px] leading-5 text-muted-foreground/72">
                  这张卡片留给那些会在很久以后，还是能一下子想起手感和情绪的游戏。
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
        ) : hasMore ? `继续向下滚动 · 已显示 ${items.length}/${total}` : `已显示全部 ${total} 个`}
      </div>
    </>
  )
}
