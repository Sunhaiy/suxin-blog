'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { PublicSymbol } from '@/components/ui/PublicSymbol'
import { getOptimizedMediaUrl, resolveMediaUrl } from '@/lib/media'
import type { WorkListItem } from '@/types/work'

interface HomeProjectRailProps {
  works: WorkListItem[]
}

export function HomeProjectRail({ works }: HomeProjectRailProps) {
  const railRef = useRef<HTMLDivElement>(null)

  function move(direction: -1 | 1) {
    const rail = railRef.current
    if (!rail) return
    rail.scrollBy({ left: rail.clientWidth * 0.72 * direction, behavior: 'smooth' })
  }

  return (
    <section data-scroll-reveal className="mt-9 overflow-hidden" aria-labelledby="home-projects-title">
      <div className="flex items-center justify-between gap-5 border-b border-border/70 pb-4">
        <h2 id="home-projects-title" className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em] text-foreground sm:text-2xl">
          <PublicSymbol icon="deployed_code" size={22} className="text-muted-foreground" />
          项目
        </h2>

        <div className="flex items-center gap-2">
          {works.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="向前浏览项目"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/75 text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
              >
                <PublicSymbol icon="arrow_back" size={16} />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="向后浏览项目"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/75 text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
              >
                <PublicSymbol icon="arrow_forward" size={16} />
              </button>
            </>
          ) : null}
          <Link
            href="/works"
            aria-label="查看全部项目"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:-translate-y-0.5"
          >
            <PublicSymbol icon="arrow_outward" size={16} />
          </Link>
        </div>
      </div>

      {works.length === 0 ? (
        <div className="border-b border-border/70 py-12 text-sm text-muted-foreground">项目档案仍在整理中。</div>
      ) : (
        <div
          ref={railRef}
          className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 pr-[18%] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {works.map((work, index) => {
            const cover = resolveMediaUrl(work.cover_url, work.hero_image_url)
            const coverUrl = getOptimizedMediaUrl(cover, { width: 828, quality: 72 }) ?? cover
            const summary = work.summary || work.subtitle || work.description || '一个仍在生长中的作品。'

            return (
              <Link
                key={work.id}
                href={`/works#${encodeURIComponent(work.slug)}`}
                className="group relative min-w-[82%] snap-start overflow-hidden rounded-[26px] border border-border/75 bg-card/82 p-3 transition-colors hover:border-primary/30 sm:min-w-[64%] lg:min-w-[58%]"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-[19px] bg-muted">
                  {coverUrl ? (
                    <ProgressiveImage
                      src={coverUrl}
                      alt={work.title}
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="h-full w-full"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,hsl(var(--muted)),hsl(var(--card)))]">
                      <span className="text-7xl font-semibold tracking-[-0.09em] text-foreground/10">{work.title.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/64 via-transparent to-black/10" />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 font-mono text-[10px] uppercase tracking-[0.18em] text-white/72">
                    <span>PRJ / {String(index + 1).padStart(2, '0')}</span>
                    <span>{work.year ?? new Date(work.updated_at).getFullYear()}</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                    <h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{work.title}</h3>
                    <p className="mt-1.5 line-clamp-2 max-w-md text-xs leading-5 text-white/68">{summary}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 px-1 pb-1 pt-3">
                  <div className="flex min-w-0 gap-1.5 overflow-hidden">
                    {work.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="truncate rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex flex-none items-center gap-1.5 text-[11px] font-medium text-foreground">
                    View case
                    <PublicSymbol icon="arrow_outward" size={14} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
