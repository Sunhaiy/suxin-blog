'use client'

import { extractPlainTextFromRichContent } from '@/lib/utils/extractHeadings'
import type { MomentRow } from '@/types/moment'
import type { SiteProfile } from '@/types/site'

type MomentFeedItem = Omit<MomentRow, 'created_at'> & {
  created_at: string
}

interface MomentFeedCardProps {
  moment: MomentFeedItem
  siteProfile: SiteProfile
}

function formatTimestamp(date: Date) {
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-')
}

function formatDistance(distance: number): string {
  if (distance >= 1000) return `${(distance / 1000).toFixed(2)} km`
  return `${distance} m`
}

function getMomentText(moment: MomentFeedItem) {
  if (moment.content?.trim()) return moment.content.trim()

  if (moment.content_json) {
    const text = extractPlainTextFromRichContent(moment.content_json)
    if (text) return text
  }

  if (moment.type === 'sleep' && moment.meta) {
    const meta = moment.meta as {
      sleepStart?: string
      sleepEnd?: string
      deepSleepMinutes?: number
      score?: number | null
    }
    const parts = [
      meta.sleepStart ? `入睡 ${meta.sleepStart}` : null,
      meta.sleepEnd ? `起床 ${meta.sleepEnd}` : null,
      typeof meta.deepSleepMinutes === 'number' ? `深睡 ${meta.deepSleepMinutes} 分钟` : null,
      typeof meta.score === 'number' ? `评分 ${meta.score}` : null,
    ].filter(Boolean)
    if (parts.length > 0) return parts.join('，')
  }

  if (moment.type === 'steps' && moment.meta) {
    const meta = moment.meta as {
      steps?: number
      distance?: number
      calories?: number
    }
    const parts = [
      typeof meta.steps === 'number' ? `${meta.steps.toLocaleString()} 步` : null,
      typeof meta.distance === 'number' ? formatDistance(meta.distance) : null,
      typeof meta.calories === 'number' ? `${meta.calories} kcal` : null,
    ].filter(Boolean)
    if (parts.length > 0) return parts.join('，')
  }

  if (moment.type === 'link' && moment.meta) {
    const meta = moment.meta as { title?: string; url?: string; description?: string }
    return [meta.title, meta.description, meta.url].filter(Boolean).join('\n')
  }

  if (moment.images.length > 0) return ''
  return '这一刻已经被安静地收进回声里。'
}

export function MomentFeedCard({ moment, siteProfile }: MomentFeedCardProps) {
  const createdAt = new Date(moment.created_at)
  const text = getMomentText(moment)

  return (
    <article
      id={`moment-${moment.id}`}
      className="group relative flex scroll-mt-24 gap-3 rounded-[12px] border border-border/60 bg-card/86 px-3.5 py-3.5 text-foreground backdrop-blur-xl transition-colors hover:border-border/90 hover:bg-card/92 sm:px-4"
    >
      <div className="h-10 w-10 shrink-0 self-start overflow-hidden rounded-full bg-background/60">
        {siteProfile.avatarUrl ? (
          <img src={siteProfile.avatarUrl} alt={siteProfile.ownerName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold">
            {siteProfile.ownerInitial}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-h-10 flex-col justify-center">
          <p className="text-[0.94rem] font-semibold leading-none">{siteProfile.ownerName}</p>
          <time className="mt-1 block text-[0.78rem] leading-none text-muted-foreground">{formatTimestamp(createdAt)}</time>
        </div>

        {text ? (
          <p className="mt-1.5 whitespace-pre-line text-[0.94rem] font-semibold leading-6 tracking-[-0.016em] text-foreground/92">
            {text}
          </p>
        ) : null}

        <MomentImages images={moment.images} />
      </div>
    </article>
  )
}

function MomentImages({ images }: { images: string[] }) {
  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <div className="mt-4 overflow-hidden rounded-[10px] bg-background/50">
        <img src={images[0]} alt="" className="max-h-[34rem] w-full object-cover" />
      </div>
    )
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {images.slice(0, 4).map((url, index) => (
        <div key={index} className="relative aspect-square overflow-hidden rounded-[10px] bg-background/50">
          <img src={url} alt="" className="h-full w-full object-cover" />
          {index === 3 && images.length > 4 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <span className="text-lg font-black text-foreground">+{images.length - 4}</span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
