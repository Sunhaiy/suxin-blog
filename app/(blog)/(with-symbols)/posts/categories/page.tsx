/**
 * app/(blog)/posts/categories/page.tsx
 *
 * 文章分类页 — Bento 网格，首位分类大卡 + 其余小卡，附最新文章预览。
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { findCategories, findLatestPostPerCategory } from '@/lib/db/dao/postDao'
import {
  RiCodeLine, RiToolsLine, RiEditLine, RiBookLine,
  RiCpuLine, RiWifiLine, RiLayoutLine, RiServerLine,
  RiGitBranchLine, RiFolderLine, RiArrowRightUpLine,
} from '@remixicon/react'

export const metadata: Metadata = { title: '分类 · 梨花海' }
export const revalidate = 60

type RemixIcon = React.ComponentType<{ size?: number | string; className?: string }>

const CATEGORY_ICONS: Record<string, RemixIcon> = {
  技术笔记: RiCodeLine,
  项目实战: RiToolsLine,
  生活随笔: RiEditLine,
  读书笔记: RiBookLine,
  工具推荐: RiToolsLine,
  嵌入式:   RiCpuLine,
  物联网:   RiWifiLine,
  前端:     RiLayoutLine,
  后端:     RiServerLine,
  开源:     RiGitBranchLine,
  未分类:   RiFolderLine,
}

function getCategoryIcon(name: string): RemixIcon {
  return CATEGORY_ICONS[name] ?? RiFolderLine
}

/** 给每个分类分配一个微妙的渐变方向，保持在 ember 色系内 */
const GRADIENT_VARIANTS = [
  'from-primary/18 via-primary/6 to-transparent',
  'from-primary/12 via-transparent to-primary/8',
  'from-primary/14 via-transparent to-primary/6',
  'from-primary/10 to-transparent',
]

export default async function CategoriesPage() {
  const [categories, latestPosts] = await Promise.all([
    findCategories(),
    findLatestPostPerCategory(),
  ])

  const total = categories.reduce((s, c) => s + c.count, 0)

  const latestByCategory = Object.fromEntries(
    latestPosts.map((p) => [p.category, p])
  )

  if (categories.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center py-24 text-muted-foreground">暂无分类。</div>
      </div>
    )
  }

  const [featured, ...rest] = categories

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      {/* ── 页头 ── */}
      <div className="mb-10">
        <p className="text-xs font-mono text-primary tracking-[0.25em] uppercase mb-2">CATEGORIES</p>
        <h1 className="text-3xl font-bold text-foreground mb-1">分类</h1>
        <p className="text-sm text-muted-foreground">
          {categories.length} 个分类 · 共 {total} 篇文章
        </p>
      </div>

      {/* ── 色段进度条（各分类占比） ── */}
      <div className="flex h-1 rounded-full overflow-hidden mb-10 gap-0.5">
        {categories.map(({ category, count }) => (
          <div
            key={category}
            className="h-full bg-primary/60 first:rounded-l-full last:rounded-r-full transition-all hover:bg-primary"
            style={{ width: `${(count / total) * 100}%` }}
            title={`${category} ${count} 篇`}
          />
        ))}
      </div>

      {/* ── Bento 网格 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 auto-rows-auto">

        {/* 首位大卡 — col-span-2 */}
        {(() => {
          const { category, count } = featured
          const CatIcon = getCategoryIcon(category)
          const pct = Math.round((count / total) * 100)
          const latest = latestByCategory[category]
          return (
            <Link
              href={`/posts?category=${encodeURIComponent(category)}`}
              className={`group relative sm:col-span-2 rounded-2xl border border-border bg-card
                          overflow-hidden flex flex-col min-h-[240px] p-7
                          hover:border-primary/45
                          transition-all duration-300`}
            >
              {/* 渐变背景 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENT_VARIANTS[0]} pointer-events-none`} />

              {/* 大号序号水印 */}
              <span className="absolute -top-3 -right-1 text-[120px] font-black
                               text-foreground/[0.04] leading-none select-none pointer-events-none">
                01
              </span>

              {/* 顶部：图标 + 百分比徽章 */}
              <div className="relative flex items-start justify-between mb-auto">
                <span className="w-12 h-12 rounded-xl bg-primary/12 border border-primary/20
                                  flex items-center justify-center text-primary
                                  group-hover:bg-primary/20 transition-colors">
                  <CatIcon size={22} />
                </span>
                <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/25
                                  px-2.5 py-1 rounded-full">
                  {pct}%
                </span>
              </div>

              {/* 分类名 + 篇数 */}
              <div className="relative mt-6">
                <h2 className="text-2xl font-bold text-foreground
                                group-hover:text-primary transition-colors duration-200">
                  {category}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="text-primary font-semibold">{count}</span> 篇文章
                </p>
              </div>

              {/* 最新文章预览 */}
              {latest && (
                <div className="relative mt-5 pt-4 border-t border-border/60">
                  <p className="mb-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground/60">
                    最新
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-1
                                  group-hover:text-foreground transition-colors">
                    {latest.title}
                  </p>
                </div>
              )}

              {/* 右下角箭头 */}
              <RiArrowRightUpLine
                size={16}
                className="absolute bottom-5 right-5 text-muted-foreground/30
                            group-hover:text-primary transition-colors duration-200"
              />
            </Link>
          )
        })()}

        {/* 第二个分类（对齐首位大卡右列） */}
        {rest[0] && (() => {
          const { category, count } = rest[0]
          const CatIcon = getCategoryIcon(category)
          const pct = Math.round((count / total) * 100)
          const latest = latestByCategory[category]
          return (
            <Link
              href={`/posts?category=${encodeURIComponent(category)}`}
              className={`group relative rounded-2xl border border-border bg-card
                          overflow-hidden flex flex-col min-h-[240px] p-6
                          hover:border-primary/45
                          transition-all duration-300`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENT_VARIANTS[1]} pointer-events-none`} />

              <span className="absolute -top-3 -right-1 text-[100px] font-black
                               text-foreground/[0.04] leading-none select-none pointer-events-none">
                02
              </span>

              <div className="relative flex items-start justify-between mb-auto">
                <span className="w-10 h-10 rounded-xl bg-primary/12 border border-primary/20
                                  flex items-center justify-center text-primary
                                  group-hover:bg-primary/20 transition-colors">
                  <CatIcon size={18} />
                </span>
                <span className="text-[11px] font-mono text-primary/70">{pct}%</span>
              </div>

              <div className="relative mt-4">
                <h2 className="text-xl font-bold text-foreground
                                group-hover:text-primary transition-colors duration-200">
                  {category}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="text-primary font-semibold">{count}</span> 篇
                </p>
              </div>

              {latest && (
                <div className="relative mt-4 pt-3 border-t border-border/60">
                  <p className="mb-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground/60">
                    最新
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-snug
                                  group-hover:text-foreground transition-colors">
                    {latest.title}
                  </p>
                </div>
              )}

              <RiArrowRightUpLine
                size={14}
                className="absolute bottom-4 right-4 text-muted-foreground/30
                            group-hover:text-primary transition-colors duration-200"
              />
            </Link>
          )
        })()}

        {/* 剩余分类 — 每三个一行 */}
        {rest.slice(1).map(({ category, count }, idx) => {
          const CatIcon = getCategoryIcon(category)
          const pct = Math.round((count / total) * 100)
          const latest = latestByCategory[category]
          const ordinal = String(idx + 3).padStart(2, '0')
          const gradient = GRADIENT_VARIANTS[(idx + 2) % GRADIENT_VARIANTS.length]

          return (
            <Link
              key={category}
              href={`/posts?category=${encodeURIComponent(category)}`}
              className={`group relative rounded-2xl border border-border bg-card
                          overflow-hidden flex flex-col p-5 min-h-[180px]
                          hover:border-primary/45
                          transition-all duration-300`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />

              <span className="absolute -top-2 -right-1 text-[80px] font-black
                               text-foreground/[0.04] leading-none select-none pointer-events-none">
                {ordinal}
              </span>

              <div className="relative flex items-start justify-between mb-auto">
                <span className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15
                                  flex items-center justify-center text-primary/80
                                  group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <CatIcon size={16} />
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50">{pct}%</span>
              </div>

              <div className="relative mt-3">
                <h3 className="text-base font-bold text-foreground
                                group-hover:text-primary transition-colors duration-200">
                  {category}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="text-primary/80">{count}</span> 篇
                </p>
              </div>

              {latest && (
                <p className="relative text-[11px] text-muted-foreground/60 mt-3
                               line-clamp-1 group-hover:text-muted-foreground transition-colors">
                  {latest.title}
                </p>
              )}

              <RiArrowRightUpLine
                size={13}
                className="absolute bottom-3.5 right-3.5 text-muted-foreground/20
                            group-hover:text-primary transition-colors duration-200"
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
