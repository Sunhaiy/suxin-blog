/**
 * app/(blog)/posts/archive/page.tsx
 *
 * 文章归档页 — 按年月时间线排列。
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { findPostsForArchive } from '@/lib/db/dao/postDao'

export const metadata: Metadata = { title: '归档 · 梨花海' }
export const revalidate = 60

interface GroupedPost {
  id: number
  title: string
  slug: string
  category: string | null
  published_at: Date | string | null
}

interface MonthGroup {
  month: number
  posts: GroupedPost[]
}

interface YearGroup {
  year: number
  months: MonthGroup[]
  total: number
}

function groupByDate(posts: GroupedPost[]): YearGroup[] {
  const yearMap = new Map<number, Map<number, GroupedPost[]>>()

  for (const post of posts) {
    if (!post.published_at) continue
    const d = new Date(post.published_at)
    const year = d.getFullYear()
    const month = d.getMonth() + 1

    if (!yearMap.has(year)) yearMap.set(year, new Map())
    const monthMap = yearMap.get(year)!
    if (!monthMap.has(month)) monthMap.set(month, [])
    monthMap.get(month)!.push(post)
  }

  const years: YearGroup[] = []
  for (const [year, monthMap] of yearMap) {
    const months: MonthGroup[] = []
    let total = 0
    for (const [month, monthPosts] of monthMap) {
      months.push({ month, posts: monthPosts })
      total += monthPosts.length
    }
    months.sort((a, b) => b.month - a.month)
    years.push({ year, months, total })
  }
  years.sort((a, b) => b.year - a.year)
  return years
}

export default async function ArchivePage() {
  const posts = await findPostsForArchive()
  const groups = groupByDate(posts)

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      {/* ── 页头 ── */}
      <div className="mb-8">
        <p className="text-xs font-mono text-ember tracking-[0.25em] uppercase mb-2">ARCHIVE</p>
        <h1 className="text-3xl font-bold text-foreground mb-1">归档</h1>
        <p className="text-sm text-muted-foreground">
          共 {posts.length} 篇文章 · 跨越 {groups.length} 年
        </p>
      </div>

      {/* ── 时间线 ── */}
      {groups.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">暂无文章。</div>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map(({ year, months, total }) => (
            <section key={year}>
              {/* 年份标题 */}
              <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground font-mono">{year}</h2>
                <span className="text-sm text-muted-foreground">{total} 篇</span>
              </div>

              {/* 月份列表 */}
              <div className="space-y-6">
                {months.map(({ month, posts: monthPosts }) => (
                  <div key={month} className="grid grid-cols-[56px_1fr] gap-4">
                    {/* 月份标签 */}
                    <div className="pt-0.5">
                      <span className="text-xs font-mono font-semibold text-ember">
                        {String(month).padStart(2, '0')}月
                      </span>
                    </div>

                    {/* 文章列表 */}
                    <div className="relative pl-4 border-l border-border space-y-2.5">
                      {monthPosts.map((post) => {
                        const d = post.published_at ? new Date(post.published_at) : null
                        const dayStr = d
                          ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
                          : ''
                        return (
                          <div key={post.id} className="relative flex items-start gap-3 group">
                            {/* 时间线圆点 */}
                            <div className="absolute -left-[21px] top-[6px] w-2.5 h-2.5 rounded-full
                                            border-2 border-border bg-background
                                            group-hover:border-ember group-hover:bg-ember/20
                                            transition-colors duration-200 flex-shrink-0" />

                            <time className="text-[11px] font-mono text-muted-foreground/60
                                             flex-shrink-0 pt-0.5 w-10">
                              {dayStr}
                            </time>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/posts/${post.slug}`}
                                className="text-sm text-foreground hover:text-ember transition-colors
                                           leading-snug line-clamp-1 font-medium"
                              >
                                {post.title}
                              </Link>
                              {post.category && (
                                <span className="text-[10px] font-mono text-muted-foreground/50 mt-0.5 block">
                                  {post.category}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
