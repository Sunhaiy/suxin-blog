'use client'

import { useEffect, useMemo, useState } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getOptimizedMediaUrl } from '@/lib/media'
import type { AboutLifestyleItem } from '@/types/site'

export function AboutLifestyleShowcase({ items }: { items: AboutLifestyleItem[] }) {
  const lifestyleItems = useMemo(
    () => items.filter((item) => item.label.trim() && item.mediaUrl.trim()),
    [items]
  )
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const activeItem =
    lifestyleItems.find((item) => item.id === previewId) ?? lifestyleItems[0]
  const previewOpen = previewId !== null && Boolean(activeItem)

  useEffect(() => {
    setVideoFailed(false)
  }, [previewId])

  if (!lifestyleItems.length || !activeItem) return null

  const fallbackImage =
    activeItem.mediaType === 'video'
      ? activeItem.posterUrl || activeItem.mediaUrl
      : activeItem.mediaUrl
  const optimizedFallbackImage = getOptimizedMediaUrl(fallbackImage, { width: 1200, quality: 72 }) ?? fallbackImage

  return (
    <div className="border border-white/[0.18]" onMouseLeave={() => setPreviewId(null)}>
      <div className="grid divide-y divide-white/[0.16] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
        {lifestyleItems.map((item) => {
          const active = item.id === previewId
          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setPreviewId(item.id)}
              onFocus={() => setPreviewId(item.id)}
              onClick={() => setPreviewId((current) => (current === item.id ? null : item.id))}
              aria-expanded={active}
              className={`flex min-h-24 items-center gap-4 px-5 py-6 text-left transition-colors ${
                active
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <MaterialSymbol icon={item.icon} size={34} weight={520} />
              <span className="text-xl font-black tracking-[-0.05em]">{item.label}</span>
            </button>
          )
        })}
      </div>

      {previewOpen ? (
        <div className="grid border-t border-white/[0.18] lg:grid-cols-[1.18fr_0.82fr]">
          <div className="relative min-h-[310px] overflow-hidden bg-white/[0.03]">
            {activeItem.mediaType === 'video' && !videoFailed ? (
              <video
                key={activeItem.id}
                className="absolute inset-0 h-full w-full object-cover"
                poster={activeItem.posterUrl || undefined}
                controls
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
              >
                <source src={activeItem.mediaUrl} type="video/mp4" />
              </video>
            ) : (
              <ProgressiveImage
                src={optimizedFallbackImage}
                alt={activeItem.label}
                loading="lazy"
                decoding="async"
                wrapperClassName="absolute inset-0 h-full w-full"
                className="absolute inset-0 h-full w-full object-cover grayscale"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/14 to-transparent" />
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)',
                backgroundSize: '56px 56px',
              }}
            />

            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.32em] text-white/58">
                  {activeItem.eyebrow}
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.08em] text-white sm:text-4xl">
                  {activeItem.label}
                </h3>
              </div>
              <span className="inline-flex items-center gap-2 border border-white/[0.34] bg-black/42 px-3 py-2 text-xs font-medium text-white/78 backdrop-blur">
                <MaterialSymbol
                  icon={activeItem.mediaType === 'video' ? 'play_circle' : 'image'}
                  size={18}
                />
                {activeItem.mediaType === 'video' ? '视频展示' : '图片展示'}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between border-t border-white/[0.18] p-7 lg:border-l lg:border-t-0">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-white/58">
                {activeItem.eyebrow}
              </p>
              <h3 className="mt-5 max-w-md text-3xl font-black leading-tight tracking-[-0.08em] text-white">
                {activeItem.title}
              </h3>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/62">
                {activeItem.description}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/[0.16] pt-5 text-xs text-white/46">
              <span>展示类型</span>
              <span className="col-span-2 text-right font-mono uppercase text-white/70">
                {activeItem.mediaType}
              </span>
              <span>当前条目</span>
              <span className="col-span-2 text-right font-mono text-white/70">
                {String(lifestyleItems.findIndex((item) => item.id === activeItem.id) + 1).padStart(2, '0')} /{' '}
                {String(lifestyleItems.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
