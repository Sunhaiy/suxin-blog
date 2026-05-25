import type { Metadata } from 'next'
import { LinkSiteProfileCard } from '@/components/ui/LinkSiteProfileCard'
import { LinkSubmissionDialog } from '@/components/ui/LinkSubmissionDialog'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { findLinkCategories } from '@/lib/db/dao/linkCategoryDao'
import { findLinks } from '@/lib/db/dao/linkDao'
import { getSiteProfile } from '@/lib/site'
import type { LinkCategoryRow, LinkRow } from '@/types/link'

export const metadata: Metadata = {
  title: '友情链接',
  description: '收藏一些值得停留的站点，也开放友链申请。',
  alternates: {
    canonical: '/links',
  },
}

export const revalidate = 3600

const DEFAULT_CATEGORY_CONFIG: Record<string, { label: string; icon: string; description: string }> = {
  friend: {
    label: '友情链接',
    icon: 'group',
    description: '认真写字、长期更新，也愿意把自己的角落打理得舒服的人。',
  },
  tool: {
    label: '常用工具',
    icon: 'construction',
    description: '真正会被频繁打开的产品和效率工具，安静但很能打。',
  },
  resource: {
    label: '学习资源',
    icon: 'menu_book',
    description: '文档、教程和参考资料，遇到问题时很值得先回到这里。',
  },
  inspire: {
    label: '灵感来源',
    icon: 'auto_awesome',
    description: '能带来审美、表达和想法上的触动，适合慢慢逛。',
  },
  other: {
    label: '其他收藏',
    icon: 'interests',
    description: '不一定容易归类，但确实值得记住的一些地方。',
  },
}

function getCategoryConfig(category?: LinkCategoryRow) {
  const defaults = DEFAULT_CATEGORY_CONFIG[category?.slug ?? ''] ?? DEFAULT_CATEGORY_CONFIG.friend

  return {
    label: category?.label || defaults.label,
    icon: category?.icon || defaults.icon,
    description: category?.description || defaults.description,
  }
}

function groupLinks(links: LinkRow[], categories: LinkCategoryRow[]) {
  const categoryMap = new Map(categories.map((category) => [category.slug, category]))
  const buckets = new Map<string, LinkRow[]>()

  for (const category of categories) {
    buckets.set(category.slug, [])
  }

  for (const link of links) {
    const category = link.category || 'friend'
    if (!buckets.has(category)) buckets.set(category, [])
    buckets.get(category)?.push(link)
  }

  return Array.from(buckets.entries())
    .map(([slug, items]) => ({
      slug,
      category: categoryMap.get(slug),
      items,
    }))
    .filter((group) => group.items.length > 0)
}

function splitRequirements(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default async function LinksPage() {
  const [links, siteProfile, categories] = await Promise.all([
    findLinks(true),
    getSiteProfile(),
    findLinkCategories(),
  ])
  const activeGroups = groupLinks(links, categories)
  const requirements = splitRequirements(siteProfile.friendLinkRequirements)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <div className="space-y-8">
        {activeGroups.map((group) => {
          const items = group.items
          const config = getCategoryConfig(group.category)

          return (
            <section key={group.slug} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/72 px-3 py-1.5 backdrop-blur-md">
                    <MaterialSymbol icon={config.icon} size={15} className="text-primary" />
                    <span className="text-xs font-mono uppercase tracking-[0.22em] text-foreground/72">
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{config.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {items.map((link, index) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.name}
                    className="group relative flex min-h-[86px] items-center gap-3 overflow-hidden rounded-[18px] border border-border/70 bg-card/74 px-3.5 py-3 backdrop-blur-xl transition-colors duration-300 hover:border-primary/32 hover:bg-card/90 dark:bg-white/[0.045] dark:hover:bg-white/[0.065]"
                    style={{ transitionDelay: `${Math.min(index * 22, 160)}ms` }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_48%)] opacity-45 transition-opacity duration-300 group-hover:opacity-60 dark:opacity-25" />

                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[15px] border border-border/70 bg-background/60 transition-transform duration-300 group-hover:scale-[1.03]">
                      {link.avatar_url ? (
                        <img src={link.avatar_url} alt={link.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-base font-semibold text-foreground">
                          {link.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="relative min-w-0 flex-1">
                      <p className="truncate text-base font-semibold leading-tight tracking-[-0.03em] text-foreground transition-colors duration-200 group-hover:text-primary">
                        {link.name}
                      </p>
                      {link.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-muted-foreground">
                          {link.description}
                        </p>
                      ) : null}
                    </div>

                    <span className="relative hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/55 text-muted-foreground transition-colors duration-200 group-hover:border-primary/24 group-hover:text-primary sm:flex">
                      <MaterialSymbol icon="arrow_outward" size={14} />
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )
        })}

          {links.length === 0 ? (
            <div className="rounded-[28px] border border-border/70 bg-card/82 px-6 py-20 text-center shadow-[0_18px_44px_rgba(15,23,42,0.05)] backdrop-blur-2xl">
              <p className="text-sm text-muted-foreground">这里还没有公开链接。</p>
            </div>
          ) : null}
        </div>

        <section className="relative mt-10 overflow-hidden rounded-[30px] border border-border/70 bg-card/88 px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:px-7">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_58%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_58%)]" />

        <div className="relative flex flex-col">
          <div className="flex items-center gap-2">
            <MaterialSymbol icon="add_link" size={18} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">申请友链信息</p>
          </div>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">{siteProfile.friendLinkIntro}</p>

          {requirements.length > 0 ? (
            <div className="mt-5 rounded-[24px] border border-border/70 bg-background/55 px-5 py-5">
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                Requirements
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground/78">
                {requirements.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-[0.58rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/55" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5">
            <div className="flex flex-col gap-4 rounded-[22px] border border-border/70 bg-background/55 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                  <MaterialSymbol icon="schedule" size={14} className="text-muted-foreground" />
                  <span>处理方式</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-foreground/78">收到后会按顺序回访。</p>
              </div>

              <div className="flex justify-end">
                <LinkSubmissionDialog />
              </div>
            </div>
          </div>
        </div>
        </section>

        <div className="mt-10">
          <LinkSiteProfileCard
            siteProfile={siteProfile}
            stats={[
              { label: '总收录', value: `${links.length}` },
              { label: '分类数', value: `${activeGroups.length}` },
              { label: '博主', value: siteProfile.ownerName },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
