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
        <aside className="hidden h-full w-[296px] shrink-0 border-r border-border/70 bg-card/76 backdrop-blur-2xl lg:flex lg:flex-col">
          <div className="border-b border-border/70 px-6 py-5">
            <Link href="/dashboard" className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[20px] border border-border/70 bg-background/60 text-primary">
                <MaterialSymbol icon="dashboard_customize" size={20} fill />
              </span>
              <div className="min-w-0">
                <span className="block truncate text-lg font-semibold text-foreground">Suxin Blog Console</span>
                <span className="mt-1 block text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                  Unified Admin System
                </span>
              </div>
            </Link>

            <Link
              href={DASHBOARD_EDITOR_ITEM.href}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[20px] border border-primary/18 bg-primary/10 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/28 hover:bg-primary/14"
            >
              <MaterialSymbol icon={DASHBOARD_EDITOR_ITEM.icon} size={18} />
              {DASHBOARD_EDITOR_ITEM.label}
            </Link>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
              {DASHBOARD_NAV_GROUPS.map((group) => (
                <section key={group.label}>
                  <p className="px-2 text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="mt-2 space-y-1">
                    {group.items.map((item) => {
                      const active = isActivePath(pathname, item.href)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'group flex items-start gap-3 rounded-[20px] border px-3 py-2.5 transition-colors',
                            active
                              ? 'border-primary/18 bg-primary/10 text-foreground'
                              : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/45 hover:text-foreground'
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] border transition-colors',
                              active
                                ? 'border-primary/18 bg-background/58 text-primary'
                                : 'border-border/70 bg-background/48 text-muted-foreground group-hover:text-foreground'
                            )}
                          >
                            <MaterialSymbol icon={item.icon} size={17} />
                          </span>
                          <span className="min-w-0 pt-0.5">
                            <span className="block text-sm font-medium leading-5">{item.label}</span>
                            <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              ))}
            </nav>

            <div className="border-t border-border/70 px-5 py-4">
              <div className="rounded-[22px] border border-border/70 bg-background/42 p-4">
                <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">账号</p>
                <p className="mt-3 truncate text-sm text-foreground">{email ?? '未登录'}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/55 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <MaterialSymbol icon="open_in_new" size={15} />
                    查看前台
                  </Link>
                  <Link
                    href="/api/auth/signout"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/55 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-red-500/28 hover:text-red-300"
                  >
                    <MaterialSymbol icon="logout" size={15} />
                    退出
                  </Link>
                </div>
              </div>
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
