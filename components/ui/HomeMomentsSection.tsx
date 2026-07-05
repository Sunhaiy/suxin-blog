import Link from 'next/link'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { PublicSymbol } from '@/components/ui/PublicSymbol'
import { getOptimizedMediaUrl } from '@/lib/media'
import type { MomentRow } from '@/types/moment'

interface HomeMomentsSectionProps {
  moments: MomentRow[]
  ownerName: string
  avatarUrl?: string | null
}

function formatMomentDate(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-- / --'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function momentTypeLabel(type: MomentRow['type']) {
  const labels: Partial<Record<MomentRow['type'], string>> = {
    image: 'IMAGE NOTE',
    mood: 'MOOD LOG',
    link: 'LINK DROP',
    sleep: 'SLEEP DATA',
    steps: 'DAILY MOVE',
    heartrate: 'BODY SIGNAL',
  }
  return labels[type] ?? 'DAILY NOTE'
}

export function HomeMomentsSection({
  moments,
  ownerName,
  avatarUrl,
}: HomeMomentsSectionProps) {
  const recentMoments = moments.slice(0, 2)

  return (
    <section data-scroll-reveal className="mt-9" aria-labelledby="home-moments-title">
      <div className="flex items-center justify-between gap-5 border-b border-border/70 pb-4">
        <h2 id="home-moments-title" className="flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em] text-foreground sm:text-2xl">
          <PublicSymbol icon="bolt" size={22} className="text-muted-foreground" />
          最新瞬间
        </h2>
        <Link href="/moments" className="inline-flex items-center gap-2 text-xs font-medium text-foreground transition-colors hover:text-primary">
          全部瞬间
          <PublicSymbol icon="arrow_outward" size={15} />
        </Link>
      </div>

      {recentMoments.length === 0 ? (
        <div className="border-b border-border/70 py-8 text-sm text-muted-foreground">下一条信号还在路上。</div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {recentMoments.map((moment, index) => {
            const imageUrl = moment.images?.[0]
              ? getOptimizedMediaUrl(moment.images[0], { width: 240, quality: 68 }) ?? moment.images[0]
              : null

            return (
              <Link
                key={moment.id}
                href="/moments"
                className="group flex min-h-[172px] flex-col rounded-[20px] border border-border/75 bg-card/66 p-4 transition-colors hover:border-foreground/25 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <ProgressiveImage
                      src={avatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="h-9 w-9 shrink-0 rounded-full"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {ownerName.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{ownerName}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      {momentTypeLabel(moment.type)}
                    </p>
                  </div>
                  <span className="ml-auto self-start font-mono text-[10px] text-muted-foreground/65">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 items-start gap-4">
                  <p className="line-clamp-3 flex-1 text-[15px] font-medium leading-6 tracking-[-0.02em] text-foreground/92">
                    {moment.content || '此刻没有说明，只有一点正在经过的时间。'}
                  </p>
                  {imageUrl ? (
                    <ProgressiveImage
                      src={imageUrl}
                      alt=""
                      width={72}
                      height={72}
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[14px] bg-muted"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                  <span className="font-mono">{formatMomentDate(moment.created_at)}</span>
                  <span className="flex items-center gap-2">
                    {moment.mood ? <span>{moment.mood}</span> : null}
                    <PublicSymbol icon="arrow_outward" size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
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
