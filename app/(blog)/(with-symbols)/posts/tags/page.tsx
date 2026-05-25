/**
 * app/(blog)/posts/tags/page.tsx
 *
 * 标签页 — 标签云 + 热门标签可视图。
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { findAllTags } from '@/lib/db/dao/postDao'

export const metadata: Metadata = { title: '标签 · 梨花海' }
export const revalidate = 60

/** 根据 count 计算标签云字号（px），线性映射到 [12, 28] */
function tagFontSize(count: number, min: number, max: number): number {
  if (max === min) return 16
  return Math.round(12 + ((count - min) / (max - min)) * 16)
}

export default async function TagsPage() {
  const tags = await findAllTags()

  const top10 = tags.slice(0, 10)
  const maxCount = tags[0]?.count ?? 1
  const minCount = tags[tags.length - 1]?.count ?? 1
  const total = tags.reduce((s, t) => s + t.count, 0)

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      {/* ── 页头 ── */}
      <div className="mb-8">
        <p className="text-xs font-mono text-ember tracking-[0.25em] uppercase mb-2">TAGS</p>
        <h1 className="text-3xl font-bold text-foreground mb-1">标签</h1>
        <p className="text-sm text-muted-foreground">
          {tags.length} 个标签 · 共 {total} 次使用
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">暂无标签。</div>
      ) : (
        <div className="mt-10 space-y-10">

          {/* ── 热门标签 — CSS 横向条形图 ── */}
          {top10.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-medium tracking-[0.16em] text-muted-foreground">
                热门标签
              </h2>
              <div className="space-y-2.5">
                {top10.map(({ tag, count }) => {
                  const pct = Math.round((count / maxCount) * 100)
                  return (
                    <Link
                      key={tag}
                      href={`/posts?tag=${encodeURIComponent(tag)}`}
                      className="group flex items-center gap-3"
                    >
                      {/* 标签名 */}
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-ember
                                        transition-colors w-24 text-right flex-shrink-0 truncate">
                        #{tag}
                      </span>
                      {/* 进度条 */}
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-ember/70 group-hover:bg-ember
                                      transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* 次数 */}
                      <span className="text-[10px] font-mono text-muted-foreground/60
                                        flex-shrink-0 w-10 text-right">
                        {count}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── 标签云 ── */}
          <section>
            <h2 className="mb-4 text-xs font-medium tracking-[0.16em] text-muted-foreground">
              全部标签
            </h2>
            <div className="flex flex-wrap gap-2 items-baseline rounded-xl border border-border
                             bg-card/50 p-5">
              {tags.map(({ tag, count }) => {
                const size = tagFontSize(count, minCount, maxCount)
                /* opacity 0.6 ~ 1.0 */
                const opacity = 0.6 + ((count - minCount) / Math.max(maxCount - minCount, 1)) * 0.4
                return (
                  <Link
                    key={tag}
                    href={`/posts?tag=${encodeURIComponent(tag)}`}
                    style={{ fontSize: `${size}px`, opacity }}
                    className="font-medium text-muted-foreground hover:text-ember hover:opacity-100
                                transition-all duration-200 leading-relaxed"
                    title={`${count} 篇`}
                  >
                    #{tag}
                  </Link>
                )
              })}
            </div>
          </section>

        </div>
      )}
    </div>
  )
}
