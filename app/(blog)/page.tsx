import type { Metadata } from 'next'
import Link from 'next/link'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap'
import { HomeSidebarVisitorCard } from '@/components/ui/HomeSidebarVisitorCard'
import { PostCard } from '@/components/ui/PostCard'
import { getActivityHeatmap } from '@/lib/db/dao/activityDao'
import { findMoments } from '@/lib/db/dao/momentDao'
import { findAllTags, findPosts, findPostsForArchive } from '@/lib/db/dao/postDao'
import { getBackgroundSceneSettings } from '@/lib/scene'
import { toRgba } from '@/lib/scene-color'
import { getSiteProfile } from '@/lib/site'
import { extractPlainTextFromRichContent } from '@/lib/utils/extractHeadings'
import type { MomentRow } from '@/types/moment'

export const metadata: Metadata = {
  title: '\u9996\u9875',
  description: '\u8bb0\u5f55\u6587\u7ae0\u3001\u77ac\u95f4\u3001\u9879\u76ee\u4e0e\u65e5\u5e38\u8f68\u8ff9\u7684\u4e2a\u4eba\u4e3b\u9875\u3002',
}

export const revalidate = 60

function getMomentPreview(moment: MomentRow): { text: string; mono: boolean } | null {
  if (moment.content) return { text: moment.content, mono: false }

  if (moment.content_json) {
    const text = extractPlainTextFromRichContent(moment.content_json)
    if (text) return { text, mono: false }
  }

  if (!moment.meta) return null

  if (moment.type === 'sleep') {
    const meta = moment.meta as {
      sleepStart?: string
      sleepEnd?: string
      deepSleepMinutes?: number
      score?: number | null
    }
    const parts: string[] = []
    if (meta.sleepStart && meta.sleepEnd) parts.push(`入睡 ${meta.sleepStart} / 起床 ${meta.sleepEnd}`)
    if (meta.deepSleepMinutes != null) parts.push(`深睡 ${meta.deepSleepMinutes} min`)
    if (meta.score != null) parts.push(`评分 ${meta.score}`)
    return parts.length > 0 ? { text: parts.join('\n'), mono: true } : null
  }

  if (moment.type === 'steps') {
    const meta = moment.meta as { steps?: number; distance?: number; calories?: number }
    const parts: string[] = []
    if (meta.steps != null) parts.push(`${meta.steps.toLocaleString()} \u6b65`)
    if (meta.distance != null) parts.push(`${meta.distance} km`)
    if (meta.calories != null) parts.push(`${meta.calories} kcal`)
    return parts.length > 0 ? { text: parts.join('  '), mono: true } : null
  }

  if (moment.type === 'link') {
    const meta = moment.meta as { title?: string; url?: string }
    const text = meta.title || meta.url
    return text ? { text, mono: false } : null
  }

  return null
}

function getYearProgress(year: number) {
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  const now = Date.now()
  const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))

  return progress
}

function getSidebarGreeting() {
  const hour = new Date().getHours()

  if (hour < 5) return '\u51cc\u6668\u597d\uff0c\u522b\u7184\u5566\uff01'
  if (hour < 11) return '\u65e9\u4e0a\u597d\uff0c\u4eca\u5929\u4e5f\u6162\u6162\u6765\u3002'
  if (hour < 14) return '\u4e2d\u5348\u597d\uff0c\u8bb0\u5f97\u4f11\u606f\u3002'
  if (hour < 18) return '\u4e0b\u5348\u597d\uff0c\u7ee7\u7eed\u5411\u524d\u3002'
  return '\u665a\u4e0a\u597d\uff0c\u6b22\u8fce\u56de\u6765\u3002'
}

function getArchivePreview(posts: Array<{ published_at: Date | string | null }>) {
  const buckets = new Map<string, { label: string; count: number; href: string }>()

  for (const post of posts) {
    if (!post.published_at) continue

    const date = new Date(post.published_at)
    if (Number.isNaN(date.getTime())) continue

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const key = `${year}-${String(month).padStart(2, '0')}`
    const current = buckets.get(key)

    if (current) {
      current.count += 1
    } else {
      buckets.set(key, {
        label: `${year} / ${String(month).padStart(2, '0')}`,
        count: 1,
        href: '/posts/archive',
      })
    }
  }

  return Array.from(buckets.values()).slice(0, 5)
}

function pickSidebarGreeting(pool: string[]) {
  const source = pool.filter(Boolean)
  if (source.length === 0) return '\u4e0b\u5348\u597d\uff0c\u7ee7\u7eed\u5411\u524d\u3002'
  return source[Math.floor(Math.random() * source.length)]
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const [postsResult, momentsResult, scene, activityData, siteProfile, tags, archivePosts] = await Promise.all([
    findPosts({ status: 'published', pageSize: 6, page }),
    findMoments({ publicOnly: true, pageSize: 10 }),
    getBackgroundSceneSettings(),
    getActivityHeatmap(365),
    getSiteProfile(),
    findAllTags(),
    findPostsForArchive(),
  ])

  const hasSceneImage = Boolean(scene.image.url)
  const topTags = tags.slice(0, 18)
  const archivePreview = getArchivePreview(archivePosts)
  const categoryCount = new Set(
    archivePosts.map((post) => post.category || '\u672a\u5206\u7c7b')
  ).size
  const yearProgress = getYearProgress(2026)
  const sidebarGreeting = pickSidebarGreeting(siteProfile.homeGreetingPool)

  return (
    <>
      <section className="relative -mt-16 flex min-h-[100svh] flex-col overflow-hidden bg-background">
        {hasSceneImage ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${scene.image.url})`,
              backgroundPosition: scene.image.position,
              backgroundSize: scene.image.size,
              opacity: scene.image.opacity,
              filter: `saturate(0.94) brightness(${1 - scene.image.opacity * 0.12})`,
            }}
          />
        ) : null}

        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: hasSceneImage
              ? 'linear-gradient(180deg, hsl(var(--background) / 0.16) 0%, hsl(var(--background) / 0.32) 26%, hsl(var(--background) / 0.88) 100%)'
              : 'linear-gradient(180deg, hsl(var(--background) / 0.1) 0%, hsl(var(--background) / 0.2) 40%, hsl(var(--background) / 0.96) 100%)',
          }}
        />

        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top, hsl(var(--primary) / 0.16), transparent 36%), linear-gradient(180deg, transparent 0%, hsl(var(--background) / 0.08) 48%, hsl(var(--background) / 0.16) 100%)',
          }}
        />

        <div
          aria-hidden
          className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full blur-[140px]"
          style={{
            background: `radial-gradient(circle, ${toRgba(
              '#10b981',
              hasSceneImage ? 0.18 : 0.1
            )}, transparent 70%)`,
          }}
        />

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-20 pt-28 sm:px-8 md:justify-start lg:px-10">
          <div className="mx-auto max-w-3xl -translate-y-8 text-center md:translate-y-0">
            <p className="scene-copy-subtle text-xs tracking-[0.14em]">与世隔绝</p>
            <h1 className="sr-only">{siteProfile.siteName}</h1>
            <div className="scene-copy mx-auto mt-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-hero-border/70 bg-hero-panel/55 p-1.5 shadow-[0_18px_56px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:h-32 sm:w-32">
              {siteProfile.avatarUrl ? (
                <img
                  src={siteProfile.avatarUrl}
                  alt={siteProfile.ownerName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-primary/12 text-4xl font-semibold text-primary sm:text-5xl">
                  {siteProfile.ownerInitial}
                </span>
              )}
            </div>
            <div className="scene-chip mt-6 max-w-2xl flex-wrap justify-center gap-2 px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] backdrop-blur-md">
              <span>{siteProfile.siteNameEn}</span>
              <span className="text-hero-subtle/40">/</span>
              <span>{siteProfile.roleLine}</span>
              <span className="text-hero-subtle/40">/</span>
              <span>{siteProfile.slogan}</span>
            </div>
          </div>

          {momentsResult.data.length > 0 ? (
            <div className="mt-auto hidden pt-16 md:block">
              <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-primary/8 bg-background/74 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.035)] backdrop-blur-[22px] dark:border-white/[0.05] dark:bg-card/60 dark:shadow-[0_16px_36px_rgba(0,0,0,0.14)] sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="scene-icon-badge h-8 w-8 rounded-2xl border border-primary/10 bg-background/64 text-primary dark:border-white/[0.06] dark:bg-background/50">
                      <MaterialSymbol icon="chat_bubble" size={16} />
                    </span>
                    <span className="text-sm font-medium text-foreground">瞬间</span>
                  </div>
                  <Link
                    href="/moments"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/10 bg-background/62 text-muted-foreground transition-colors hover:border-primary/26 hover:text-primary dark:border-white/[0.06] dark:bg-background/48"
                    aria-label="查看全部瞬间"
                  >
                    <MaterialSymbol icon="arrow_forward" size={16} />
                  </Link>
                </div>

                <div className="flex gap-3 overflow-x-auto px-0.5 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {momentsResult.data.map((moment) => {
                    const preview = getMomentPreview(moment)

                    return (
                      <Link
                        key={moment.id}
                        href="/moments"
                        className="group relative flex min-h-[172px] w-[18rem] flex-shrink-0 flex-col justify-between overflow-hidden rounded-[24px] border border-primary/8 bg-background/62 p-4 shadow-[0_10px_20px_rgba(15,23,42,0.03)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/14 hover:bg-background/68 dark:border-white/[0.04] dark:bg-card/54 dark:shadow-[0_12px_24px_rgba(0,0,0,0.12)] dark:hover:bg-card/60 sm:w-[19rem]"
                      >
                        <div className="scene-terminal-grid absolute inset-0 opacity-[0.03]" />
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.01] opacity-70" />
                        <div className="relative z-10">
                          {moment.images.length > 0 ? (
                              <div className="mb-3 aspect-[16/9] overflow-hidden rounded-[18px] border border-primary/8 bg-background/42 dark:border-white/[0.05] dark:bg-black/10">
                              <img
                                src={moment.images[0]}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                              />
                            </div>
                          ) : null}

                          {preview ? (
                            <p
                              className={`line-clamp-4 whitespace-pre-line text-[13px] leading-6 text-foreground/78 ${
                                preview.mono ? 'font-mono' : ''
                              }`}
                            >
                              {preview.text}
                            </p>
                          ) : (
                            <p className="text-xs leading-6 text-muted-foreground">
                              {'\u8fd9\u4e00\u523b\u8fd8\u6ca1\u6709\u7559\u4e0b\u6587\u5b57\u3002'}
                            </p>
                          )}
                        </div>

                        <div className="relative z-10 mt-5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <MaterialSymbol icon="schedule" size={13} />
                            {new Date(moment.created_at).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/10 bg-background/56 text-muted-foreground transition-colors group-hover:border-primary/24 group-hover:text-primary dark:border-white/[0.05] dark:bg-card/48">
                            <MaterialSymbol icon="arrow_outward" size={13} />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="relative z-10 rounded-t-[2rem] bg-background/94 shadow-[0_-20px_48px_rgba(15,23,42,0.04)] backdrop-blur-2xl dark:shadow-[0_-20px_48px_rgba(0,0,0,0.12)]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 items-start gap-8 pb-20 pt-14 lg:grid-cols-[1fr_280px]">
            <div className="min-w-0" id="latest-posts">
              <ActivityHeatmap data={activityData} />

              <div className="mt-8">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {'\u6700\u65b0\u6587\u7ae0'}
                  </h2>
                  <Link
                    href="/posts"
                    className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/75"
                  >
                    查看全部
                    <MaterialSymbol icon="arrow_forward" size={16} />
                  </Link>
                </div>

                {postsResult.data.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {'\u6682\u65f6\u8fd8\u6ca1\u6709\u6587\u7ae0\u3002'}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {postsResult.data.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          fallbackCoverUrl={siteProfile.defaultPostCoverUrl}
                          fallbackCoverPool={siteProfile.postCoverPoolUrls}
                        />
                      ))}
                    </div>

                    {postsResult.total > 6 ? (
                      <div className="mt-8 flex justify-center gap-2">
                        {Array.from({ length: Math.ceil(postsResult.total / 6) }, (_, index) => index + 1).map(
                          (current) => (
                            <Link
                              key={current}
                              href={`/?page=${current}#latest-posts`}
                              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${
                                current === page
                                  ? 'border-foreground bg-foreground text-background'
                                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                              }`}
                            >
                              {current}
                            </Link>
                          )
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            <aside className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex lg:self-start">
              <HomeSidebarVisitorCard />

              <div className="rounded-[24px] border border-border/75 bg-card/78 p-4 backdrop-blur-xl">
                <div className="relative mx-auto w-fit rounded-full border border-border/70 bg-background/52 px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                  {sidebarGreeting}
                  <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border/70 bg-background/52" />
                </div>

                <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-primary/22 bg-primary/8">
                  {siteProfile.avatarUrl ? (
                    <img
                      src={siteProfile.avatarUrl}
                      alt={siteProfile.ownerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="select-none text-4xl font-semibold text-primary">
                      {siteProfile.ownerInitial}
                    </span>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xl font-semibold tracking-[-0.05em] text-foreground">
                    {siteProfile.ownerName}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{siteProfile.slogan}</p>
                </div>

                <div className="mt-4 grid grid-cols-3 rounded-[18px] border border-border/70 bg-background/44 py-2.5">
                  {[
                    { label: '文章', value: postsResult.total },
                    { label: '分类', value: categoryCount },
                    { label: '标签', value: tags.length },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className={`text-center ${index > 0 ? 'border-l border-border/70' : ''}`}
                    >
                      <p className="text-xl font-semibold leading-none text-foreground">{item.value}</p>
                      <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-center gap-2.5 text-muted-foreground">
                  {siteProfile.homeProfileLinks
                    .filter((item) => item.href.trim())
                    .slice(0, 4)
                    .map((item) => (
                      <a
                        key={item.id}
                        href={item.href}
                        aria-label={item.label}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/42 transition-colors hover:border-primary/32 hover:text-primary"
                      >
                        <MaterialSymbol icon={item.icon} size={16} />
                      </a>
                    ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-border/75 bg-card/78 p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-foreground">2026</p>
                  <p className="font-mono text-sm font-semibold text-muted-foreground">
                    {yearProgress.toFixed(6)}%
                  </p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/70">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${yearProgress}%` }}
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-border/75 bg-card/78 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    归档
                  </p>
                  <Link
                    href="/posts/archive"
                    className="text-[11px] text-primary transition-colors hover:text-primary/75"
                  >
                    查看全部
                  </Link>
                </div>
                <div className="mt-3 space-y-2">
                  {archivePreview.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center justify-between rounded-[16px] border border-border/55 bg-background/34 px-3 py-2 text-sm transition-colors hover:border-primary/28 hover:text-primary"
                    >
                      <span className="font-medium text-foreground/86">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.count} 篇</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-border/75 bg-card/78 p-4 backdrop-blur-xl">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  {'\u6807\u7b7e\u4e91'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topTags.map(({ tag, count }) => (
                    <Link
                      key={tag}
                      href={`/posts?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/42 px-3 py-1.5 text-xs text-foreground/82 transition-colors hover:border-primary/30 hover:bg-primary/6 hover:text-primary"
                    >
                      <span>{tag}</span>
                      <span className="text-[10px] text-muted-foreground">{count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}

