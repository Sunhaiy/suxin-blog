import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicSymbol } from '@/components/ui/PublicSymbol'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { SceneFilterLayer } from '@/components/scene/SceneFilterLayer'
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap'
import { HomeSidebarVisitorCard } from '@/components/ui/HomeSidebarVisitorCard'
import { PostCard } from '@/components/ui/PostCard'
import { getActivityHeatmap } from '@/lib/db/dao/activityDao'
import { getHomepagePostSnapshot } from '@/lib/db/dao/postDao'
import { preload } from 'react-dom'
import { getOptimizedMediaUrl } from '@/lib/media'
import { getBackgroundSceneSettings } from '@/lib/scene'
import { getSiteProfile } from '@/lib/site'

export const metadata: Metadata = {
  title: '\u9996\u9875',
  description: '\u8bb0\u5f55\u6587\u7ae0\u3001\u77ac\u95f4\u3001\u9879\u76ee\u4e0e\u65e5\u5e38\u8f68\u8ff9\u7684\u4e2a\u4eba\u4e3b\u9875\u3002',
}

export const revalidate = 60


function getYearProgress(year: number) {
  const start = new Date(year, 0, 1).getTime()
  const end = new Date(year + 1, 0, 1).getTime()
  const now = Date.now()
  const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))

  return progress
}

function pickSidebarGreeting(pool: string[]) {
  const source = pool.filter(Boolean)
  if (source.length === 0) return '\u4e0b\u5348\u597d\uff0c\u7ee7\u7eed\u5411\u524d\u3002'
  return source[Math.floor(Math.random() * source.length)]
}

export default async function HomePage() {
  const [postsSnapshot, scene, activityData, siteProfile] = await Promise.all([
    getHomepagePostSnapshot(),
    getBackgroundSceneSettings(),
    getActivityHeatmap(365),
    getSiteProfile(),
  ])

  const hasSceneImage = Boolean(scene.image.url)
  const yearProgress = getYearProgress(2026)
  const sidebarGreeting = pickSidebarGreeting(siteProfile.homeGreetingPool)
  const heroSceneUrl = getOptimizedMediaUrl(scene.image.url, { width: 1920, quality: 68 }) ?? scene.image.url
  // 让浏览器尽早高优先级下载首屏背景大图（LCP 元素），不改变任何视觉表现
  if (hasSceneImage && heroSceneUrl) {
    preload(heroSceneUrl, { as: 'image', fetchPriority: 'high' })
  }
  const heroAvatarUrl = getOptimizedMediaUrl(siteProfile.avatarUrl, { width: 256, quality: 80 })
  // 首屏头像（移动端常为 LCP 元素）尽早高优先级加载
  if (heroAvatarUrl) {
    preload(heroAvatarUrl, { as: 'image', fetchPriority: 'high' })
  }
  const sidebarAvatarUrl = getOptimizedMediaUrl(siteProfile.avatarUrl, { width: 256, quality: 76 })

  return (
    <>
      <section className="relative -mt-16 flex min-h-[60vh] flex-col overflow-hidden bg-background">
        {hasSceneImage && heroSceneUrl ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroSceneUrl})`,
              backgroundPosition: scene.image.position,
              backgroundSize: scene.image.size,
              opacity: scene.image.opacity,
            }}
          />
        ) : null}

        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <SceneFilterLayer scene={scene} />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pb-20 pt-28 sm:px-8 md:justify-start lg:px-10">
          <div className="mx-auto max-w-3xl -translate-y-8 text-center md:translate-y-0">
            <p className="scene-copy-subtle text-xs tracking-[0.14em]">与世隔绝</p>
            <h1 className="sr-only">{siteProfile.siteName}</h1>
            <div className="scene-copy mx-auto mt-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-hero-border/70 bg-hero-panel/55 p-1.5 shadow-[0_18px_56px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:h-32 sm:w-32">
              {heroAvatarUrl ? (
                <ProgressiveImage
                  src={heroAvatarUrl}
                  alt={siteProfile.ownerName}
                  width={128}
                  height={128}
                  decoding="async"
                  fetchPriority="high"
                  wrapperClassName="h-full w-full rounded-full"
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

        </div>
      </section>

      <section className="relative z-10 -mt-16 rounded-t-[2rem] bg-background/80 shadow-[0_-20px_48px_rgba(15,23,42,0.04)] backdrop-blur-[25px] backdrop-saturate-150 dark:bg-card/66 dark:shadow-[0_-20px_48px_rgba(0,0,0,0.12)]">
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
                    <PublicSymbol icon="arrow_forward" size={16} />
                  </Link>
                </div>

                {postsSnapshot.posts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {'\u6682\u65f6\u8fd8\u6ca1\u6709\u6587\u7ae0\u3002'}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {postsSnapshot.posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          fallbackCoverUrl={siteProfile.defaultPostCoverUrl}
                          fallbackCoverPool={siteProfile.postCoverPoolUrls}
                        />
                      ))}
                    </div>

                    {postsSnapshot.totalPublished > 6 ? (
                      <div className="mt-8 flex justify-center">
                        <Link
                          href="/posts"
                          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          浏览更多文章
                          <PublicSymbol icon="arrow_forward" size={16} />
                        </Link>
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
                  {sidebarAvatarUrl ? (
                    <ProgressiveImage
                      src={sidebarAvatarUrl}
                      alt={siteProfile.ownerName}
                      width={80}
                      height={80}
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="h-full w-full rounded-full"
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
                    { label: '文章', value: postsSnapshot.totalPublished },
                    { label: '分类', value: postsSnapshot.categoryCount },
                    { label: '标签', value: postsSnapshot.totalTags },
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
                        <PublicSymbol icon={item.icon} size={16} />
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
                  {postsSnapshot.archivePreview.map((item) => (
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
                  {postsSnapshot.topTags.map(({ tag, count }) => (
                    <Link
                      key={tag}
                      href={`/posts?tags=${encodeURIComponent(tag)}`}
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


