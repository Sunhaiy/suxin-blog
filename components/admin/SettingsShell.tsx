'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export type SettingsSection = {
  id: string
  label: string
  icon: string
}

/**
 * 后台设置页外壳：左侧锚点子导航 + 右侧内容 + 底部固定保存栏。
 * 纯展示容器，不持有任何业务状态；点击左侧平滑滚动到对应 section(用 id 锚点)。
 */
export function SettingsShell({
  sections,
  saveBar,
  children,
}: {
  sections: SettingsSection[]
  saveBar: ReactNode
  children: ReactNode
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id)

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0, 1] }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  function jump(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* 左侧锚点子导航 */}
        <nav className="lg:sticky lg:top-2 lg:w-[208px] lg:shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {sections.map((s) => {
              const active = s.id === activeId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jump(s.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'border-primary/24 bg-primary/12 text-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground'
                  )}
                >
                  <MaterialSymbol
                    icon={s.icon}
                    size={17}
                    className={active ? 'text-primary' : ''}
                  />
                  <span className="whitespace-nowrap font-medium lg:whitespace-normal">{s.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* 右侧内容 */}
        <div className="min-w-0 flex-1 space-y-5 pb-24">{children}</div>
      </div>

      {/* 底部固定保存栏 */}
      <div className="pointer-events-none sticky bottom-0 z-20 -mx-4 mt-2 sm:-mx-6 lg:-mx-8">
        <div className="pointer-events-auto border-t border-border/70 bg-background/85 px-4 py-3 backdrop-blur-2xl sm:px-6 lg:px-8">
          {saveBar}
        </div>
      </div>
    </div>
  )
}

/**
 * 一个紧凑区块容器：替代页面里厚重的 AdminPanel + AdminSection 双层壳。
 * 自带 id 锚点、标题行、可选右侧操作区。
 */
export function SettingsBlock({
  id,
  title,
  icon,
  description,
  actions,
  children,
}: {
  id: string
  title: string
  icon: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-4 rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-primary">
            <MaterialSymbol icon={icon} size={17} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight text-foreground">{title}</h2>
            {description ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

/** 紧凑版保存栏内容：左状态、右按钮。 */
export function SettingsSaveBar({
  dirty,
  children,
}: {
  dirty: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            dirty ? 'bg-amber-400' : 'bg-emerald-400'
          )}
        />
        {dirty ? '有未保存的更改' : '已是最新'}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
