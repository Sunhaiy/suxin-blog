'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PublicSymbol } from '@/components/ui/PublicSymbol'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface Category {
  category: string
  count: number
}

interface SiteBrand {
  siteName: string
  siteNameEn: string
}

interface NavBarProps {
  categories: Category[]
  siteProfile: SiteBrand
}

const CATEGORY_ICONS: Record<string, string> = {
  技术笔记: 'code',
  项目实战: 'construction',
  生活随笔: 'edit_note',
  读书笔记: 'menu_book',
  站点维护: 'folder',
  未分类: 'folder',
}

const COLLECTION_ITEMS = [
  { href: '/anime', label: '动漫', icon: 'movie', desc: '追番记录' },
  { href: '/games', label: '游戏', icon: 'sports_esports', desc: '游玩足迹' },
  { href: '/gallery', label: '相册', icon: 'photo_camera', desc: '光影收藏' },
]

const POST_SUB_PAGES = [
  { href: '/posts', label: '全部文章', icon: 'article' },
  { href: '/posts/archive', label: '归档', icon: 'inventory_2' },
  { href: '/posts/categories', label: '分类', icon: 'folder' },
  { href: '/posts/tags', label: '标签', icon: 'sell' },
]

const MOBILE_NAV_ITEMS = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/posts', label: '文章', icon: 'article' },
  { href: '/moments', label: '瞬间', icon: 'bolt' },
  { href: '/works', label: '项目', icon: 'deployed_code' },
  { href: '/links', label: '友情链接', icon: 'link' },
  { href: '/about', label: '关于', icon: 'person' },
]

const NAV_BASE_TONE_CLS =
  'bg-background/80 backdrop-blur-[25px] backdrop-saturate-150 dark:bg-card/66'

const NAV_SURFACE_CLS = NAV_BASE_TONE_CLS

const PANEL_CLS =
  `rounded-[24px] border border-border/75 ${NAV_BASE_TONE_CLS} shadow-none dark:border-white/8`

interface MenuPos {
  centerX: number
  bottom: number
}

function getCategoryIcon(name: string) {
  return CATEGORY_ICONS[name] ?? 'folder'
}

export function NavBar({ categories, siteProfile }: NavBarProps) {
  const [mounted, setMounted] = useState(false)
  const [postMenuOpen, setPostMenuOpen] = useState(false)
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const postTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const postTriggerRef = useRef<HTMLDivElement>(null)
  const collectionTriggerRef = useRef<HTMLDivElement>(null)
  const [postPos, setPostPos] = useState<MenuPos>({ centerX: 0, bottom: 0 })
  const [collectionPos, setCollectionPos] = useState<MenuPos>({ centerX: 0, bottom: 0 })

  useEffect(() => setMounted(true), [])

  function openPostMenu() {
    setMobileMenuOpen(false)
    if (postTimer.current) clearTimeout(postTimer.current)
    if (postTriggerRef.current) {
      const rect = postTriggerRef.current.getBoundingClientRect()
      setPostPos({ centerX: rect.left + rect.width / 2, bottom: rect.bottom })
    }
    setPostMenuOpen(true)
  }

  function closePostMenuLater() {
    postTimer.current = setTimeout(() => setPostMenuOpen(false), 180)
  }

  function openCollectionMenu() {
    setMobileMenuOpen(false)
    if (collectionTimer.current) clearTimeout(collectionTimer.current)
    if (collectionTriggerRef.current) {
      const rect = collectionTriggerRef.current.getBoundingClientRect()
      setCollectionPos({ centerX: rect.left + rect.width / 2, bottom: rect.bottom })
    }
    setCollectionMenuOpen(true)
  }

  function closeCollectionMenuLater() {
    collectionTimer.current = setTimeout(() => setCollectionMenuOpen(false), 180)
  }

  const navLinkClass =
    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground'
  const postMenuItemClass =
    'group flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 transition-all duration-200 hover:bg-muted hover:text-foreground'
  const postCategoryItemClass =
    'group flex items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-muted hover:text-foreground'
  const collectionMenuItemClass =
    'group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-muted hover:text-foreground'
  const mobileMenuItemClass =
    'group flex items-center gap-2.5 rounded-2xl border border-border/65 bg-background/58 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/28 hover:bg-primary/6 hover:text-primary dark:border-white/[0.07] dark:bg-card/55'

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 ${NAV_SURFACE_CLS}`}>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/75 dark:bg-white/8" />
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            {siteProfile.siteName}
            <span className="ml-2 text-xs font-normal tracking-[0.22em] text-muted-foreground">
              {siteProfile.siteNameEn}
            </span>
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/" className={navLinkClass}>
              <PublicSymbol icon="home" size={16} />
              首页
            </Link>

            <div
              ref={postTriggerRef}
              className="relative"
              onMouseEnter={openPostMenu}
              onMouseLeave={closePostMenuLater}
            >
              <Link
                href="/posts"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all duration-200 ${
                  postMenuOpen
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <PublicSymbol icon="article" size={16} />
                文章
              </Link>
            </div>

            <Link href="/moments" className={navLinkClass}>
              <PublicSymbol icon="bolt" size={16} />
              瞬间
            </Link>

            <Link href="/works" className={navLinkClass}>
              <PublicSymbol icon="deployed_code" size={16} />
              项目
            </Link>

            <div
              ref={collectionTriggerRef}
              className="relative"
              onMouseEnter={openCollectionMenu}
              onMouseLeave={closeCollectionMenuLater}
            >
              <button
                type="button"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all duration-200 ${
                  collectionMenuOpen
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <PublicSymbol icon="star" size={16} />
                收藏
              </button>
            </div>

            <Link href="/links" className={navLinkClass}>
              <PublicSymbol icon="link" size={16} />
              友情链接
            </Link>

            <Link href="/about" className={navLinkClass}>
              <PublicSymbol icon="person" size={16} />
              关于
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-controls="mobile-site-menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => {
                setPostMenuOpen(false)
                setCollectionMenuOpen(false)
                setMobileMenuOpen((open) => !open)
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:hidden ${
                mobileMenuOpen
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <PublicSymbol icon={mobileMenuOpen ? 'close' : 'menu'} size={18} />
            </button>
          </div>
        </nav>
      </header>

      {mounted && mobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="关闭菜单"
            className="fixed inset-0 z-[9997] bg-transparent sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-x-3 top-[4.75rem] z-[9998] sm:hidden">
            <div
              id="mobile-site-menu"
              className={`menu-popover ${PANEL_CLS} max-h-[calc(100svh-6rem)] overflow-y-auto p-3`}
            >
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileMenuItemClass}
                  >
                    <span className="text-muted-foreground transition-colors group-hover:text-primary">
                      <PublicSymbol icon={item.icon} size={16} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="my-3 border-t border-border/75 dark:border-white/[0.07]" />
              <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                收藏夹
              </p>
              <div className="grid grid-cols-1 gap-2">
                {COLLECTION_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileMenuItemClass}
                  >
                    <span className="text-muted-foreground transition-colors group-hover:text-primary">
                      <PublicSymbol icon={item.icon} size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block">{item.label}</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {item.desc}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>

              <div className="my-3 border-t border-border/75 dark:border-white/[0.07]" />
              <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                文章入口
              </p>
              <div className="grid grid-cols-1 gap-2">
                {POST_SUB_PAGES.slice(1).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileMenuItemClass}
                  >
                    <span className="text-muted-foreground transition-colors group-hover:text-primary">
                      <PublicSymbol icon={item.icon} size={16} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {categories.length > 0 ? (
                <>
                  <div className="my-3 border-t border-border/75 dark:border-white/[0.07]" />
                  <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                    文章分类
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {categories.slice(0, 6).map(({ category, count }) => (
                      <Link
                        key={category}
                        href={`/posts?category=${encodeURIComponent(category)}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileMenuItemClass}
                      >
                        <span className="text-muted-foreground transition-colors group-hover:text-primary">
                          <PublicSymbol icon={getCategoryIcon(category)} size={16} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{category}</span>
                        <span className="text-xs font-normal text-muted-foreground">{count}</span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {mounted && postMenuOpen ? (
          <div
            style={{
              position: 'fixed',
              top: postPos.bottom + 8,
              left: postPos.centerX,
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }}
            onMouseEnter={openPostMenu}
            onMouseLeave={closePostMenuLater}
          >
            <div className={`menu-popover ${PANEL_CLS} min-w-[320px] p-3.5`}>
              <div className="mb-1 grid grid-cols-4 gap-1">
                {POST_SUB_PAGES.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setPostMenuOpen(false)}
                    className={postMenuItemClass}
                  >
                    <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                      <PublicSymbol icon={item.icon} size={15} />
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              {categories.length > 0 ? (
                <>
                  <div className="my-2 border-t border-border" />
                  <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground select-none">
                    文章分类
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {categories.map(({ category, count }) => (
                      <Link
                        key={category}
                        href={`/posts?category=${encodeURIComponent(category)}`}
                        onClick={() => setPostMenuOpen(false)}
                        className={postCategoryItemClass}
                      >
                        <span className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
                          <PublicSymbol icon={getCategoryIcon(category)} size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">
                            {category}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">{count} 篇</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

      {mounted && collectionMenuOpen ? (
          <div
            style={{
              position: 'fixed',
              top: collectionPos.bottom + 8,
              left: collectionPos.centerX,
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }}
            onMouseEnter={openCollectionMenu}
            onMouseLeave={closeCollectionMenuLater}
          >
            <div className={`menu-popover ${PANEL_CLS} min-w-[220px] p-3.5`}>
              <p className="mb-2 px-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground select-none">
                收藏夹
              </p>
              <div className="flex flex-col gap-1">
                {COLLECTION_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setCollectionMenuOpen(false)}
                    className={collectionMenuItemClass}
                  >
                    <span className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
                      <PublicSymbol icon={item.icon} size={16} />
                    </span>
                    <span>
                      <span className="block text-xs font-medium text-foreground">{item.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{item.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
    </>
  )
}
