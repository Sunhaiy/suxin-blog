'use client'

import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import {
  DASHBOARD_EDITOR_ITEM,
  DASHBOARD_ITEM_MAP,
  DASHBOARD_NAV_GROUPS,
} from './dashboard-nav'

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardFrame({
  email,
  themeChannels,
  children,
}: {
  email?: string | null
  themeChannels?: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const current = DASHBOARD_ITEM_MAP.find((item) => isActivePath(pathname, item.href))
  const currentGroup =
    DASHBOARD_NAV_GROUPS.find((group) => group.items.some((item) => isActivePath(pathname, item.href))) ??
    DASHBOARD_NAV_GROUPS[0]

  return (
    <div
      className="admin-theme h-screen overflow-hidden bg-background text-foreground"
      style={
        themeChannels
          ? ({
              '--primary': themeChannels,
              '--ring': themeChannels,
              '--accent': themeChannels,
              '--ember': themeChannels,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="mx-auto flex h-full max-w-[1720px]">
        <aside className="hidden h-full w-[220px] shrink-0 border-r border-border/60 bg-card/60 backdrop-blur-2xl lg:flex lg:flex-col">
          {/* Logo */}
          <div className="px-4 pt-5 pb-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <MaterialSymbol icon="dashboard_customize" size={14} fill />
              </span>
              <span className="truncate text-sm font-semibold text-foreground">Suxin Blog</span>
            </Link>
            <Link
              href={DASHBOARD_EDITOR_ITEM.href}
              className="mt-3.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-primary/12 text-xs font-medium text-foreground transition-colors hover:bg-primary/18"
            >
              <MaterialSymbol icon={DASHBOARD_EDITOR_ITEM.icon} size={14} />
              {DASHBOARD_EDITOR_ITEM.label}
            </Link>
          </div>

          {/* Nav */}
          <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
            {DASHBOARD_NAV_GROUPS.map((group) => (
              <section key={group.label}>
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-primary/12 text-foreground'
                            : 'text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5'
                        )}
                      >
                        <MaterialSymbol
                          icon={item.icon}
                          size={16}
                          className={active ? 'text-primary' : ''}
                        />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-border/60 px-4 py-3">
            <p className="truncate text-xs text-muted-foreground">{email ?? '未登录'}</p>
            <div className="mt-2 flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <MaterialSymbol icon="open_in_new" size={13} />
                前台
              </Link>
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-red-400"
              >
                <MaterialSymbol icon="logout" size={13} />
                退出
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-border/70 bg-background/84 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                  {currentGroup.label}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {current?.label ?? '后台'}
                  </span>
                  {current?.description ? (
                    <span className="hidden text-sm text-muted-foreground xl:inline">{current.description}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={DASHBOARD_EDITOR_ITEM.href}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/18 bg-primary/10 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-primary/15 lg:hidden"
                >
                  <MaterialSymbol icon={DASHBOARD_EDITOR_ITEM.icon} size={16} />
                  {DASHBOARD_EDITOR_ITEM.label}
                </Link>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-3 lg:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {DASHBOARD_NAV_GROUPS.flatMap((group) => group.items).map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors',
                      active
                        ? 'border-primary/18 bg-primary/10 text-foreground'
                        : 'border-border/70 bg-background/55 text-muted-foreground'
                    )}
                  >
                    <MaterialSymbol icon={item.icon} size={15} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="min-h-full p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
