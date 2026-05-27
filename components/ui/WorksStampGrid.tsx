import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { getOptimizedMediaUrl, resolveMediaUrl } from '@/lib/media'
import type { WorkListItem } from '@/types/work'

interface Props {
  works: WorkListItem[]
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未更新'
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function WorksStampGrid({ works }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-[0.32em] text-primary">Project archive</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
          项目
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          保留最简单的项目展示方式：封面、名称、时间、摘要和两个直达按钮。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {works.map((work, index) => {
          const coverUrl = resolveMediaUrl(work.cover_url, work.hero_image_url)
          const optimizedCoverUrl = getOptimizedMediaUrl(coverUrl, { width: 828, quality: 72 }) ?? coverUrl
          const primaryHref = work.primary_url || work.url || ''
          const githubHref = work.github_url || work.secondary_url || ''
          const summary = work.summary || work.subtitle || work.description || '这个项目暂时还没有补充更多说明。'

          return (
            <article
              key={work.id}
              className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-[#121214] p-4 text-zinc-100 shadow-[0_28px_60px_rgba(15,23,42,0.18)]"
            >
              <div className="overflow-hidden rounded-[20px] border border-white/8 bg-black/30">
                <div className="aspect-[16/10] w-full overflow-hidden">
                  {optimizedCoverUrl ? (
                    <ProgressiveImage
                      src={optimizedCoverUrl}
                      alt={work.title}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={index < 3 ? 'high' : 'low'}
                      wrapperClassName="h-full w-full"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 via-zinc-900 to-zinc-800">
                      <span className="text-6xl font-black tracking-[-0.08em] text-white/18">
                        {work.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-zinc-500">Name</p>
                  <p className="mt-1 line-clamp-2 text-xl font-medium text-white">{work.title}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Year</p>
                  <p className="mt-1 text-lg font-medium text-white">{work.year ?? '未填写'}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Updated</p>
                  <p className="mt-1 text-base text-white/88">{formatDate(work.updated_at)}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Links</p>
                  <p className="mt-1 text-base text-white/88">
                    {[primaryHref ? '官网' : null, githubHref ? 'GitHub' : null].filter(Boolean).join(' / ') ||
                      '未填写'}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-7 text-zinc-300">
                {summary}
              </div>

              {work.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {work.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="relative mt-5">
                <div className="absolute left-[-1.35rem] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
                <div className="absolute right-[-1.35rem] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
                <div className="border-t border-dashed border-white/22" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a
                  href={primaryHref || undefined}
                  target={primaryHref ? '_blank' : undefined}
                  rel="noreferrer"
                  aria-disabled={!primaryHref}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] border px-4 text-sm font-medium transition-colors ${
                    primaryHref
                      ? 'border-primary/30 bg-primary text-primary-foreground hover:opacity-92'
                      : 'cursor-not-allowed border-white/8 bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  <MaterialSymbol icon="open_in_new" size={18} />
                  <span>官网入口</span>
                </a>

                <a
                  href={githubHref || undefined}
                  target={githubHref ? '_blank' : undefined}
                  rel="noreferrer"
                  aria-disabled={!githubHref}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[16px] border px-4 text-sm font-medium transition-colors ${
                    githubHref
                      ? 'border-white/10 bg-white/[0.04] text-white hover:border-primary/24 hover:text-primary'
                      : 'cursor-not-allowed border-white/8 bg-white/[0.04] text-zinc-500'
                  }`}
                >
                  <MaterialSymbol icon="code" size={18} />
                  <span>GitHub 仓库</span>
                </a>
              </div>

              <div className="mt-5 h-10 rounded-[12px] bg-gradient-to-r from-zinc-700 via-zinc-200 to-zinc-700 opacity-90" />
            </article>
          )
        })}
      </div>
    </section>
  )
}
