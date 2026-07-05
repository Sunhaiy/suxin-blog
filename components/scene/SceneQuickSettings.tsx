'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { PublicSymbol } from '@/components/ui/PublicSymbol'
import type { BackgroundSceneSettings } from '@/types/work'

interface SceneQuickSettingsProps {
  scene: BackgroundSceneSettings
  canEdit: boolean
  onPreviewChange: (scene: BackgroundSceneSettings) => void
  onSceneSaved: (scene: BackgroundSceneSettings) => void
  quickActionHref?: string
  quickActionLabel?: string
}

type DockSide = 'left' | 'right'
type ReaderSize = 'normal' | 'large' | 'xlarge'

const readerSizes: Array<{ id: ReaderSize; label: string }> = [
  { id: 'normal', label: '100%' },
  { id: 'large', label: '110%' },
  { id: 'xlarge', label: '120%' },
]

function ToolAction({
  icon,
  label,
  meta,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: string
  label: string
  meta?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex min-h-[72px] flex-col items-start justify-between rounded-[16px] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:cursor-default disabled:opacity-45 ${
        active
          ? 'border-foreground/16 bg-foreground/[0.075] text-foreground'
          : 'border-border/65 bg-background/48 text-muted-foreground hover:border-foreground/15 hover:bg-foreground/[0.045] hover:text-foreground'
      }`}
    >
      <span className="flex w-full items-start justify-between gap-3">
        <PublicSymbol icon={icon} size={18} />
        {meta ? (
          <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground/75">
            {meta}
          </span>
        ) : null}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function isPostDetail(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return (
    segments.length === 2 &&
    segments[0] === 'posts' &&
    !['archive', 'categories', 'tags'].includes(segments[1])
  )
}

export function SceneQuickSettings({
  scene,
  canEdit,
  onPreviewChange,
  onSceneSaved,
  quickActionHref,
  quickActionLabel = '站点源码',
}: SceneQuickSettingsProps) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const dockRef = useRef<HTMLDivElement>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [dockSide, setDockSide] = useState<DockSide>('right')
  const [scrollProgress, setScrollProgress] = useState(0)
  const [readerSize, setReaderSize] = useState<ReaderSize>('normal')
  const [readingFocus, setReadingFocus] = useState(false)
  const [copied, setCopied] = useState(false)

  const articlePage = isPostDetail(pathname)
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    setMounted(true)
    const savedSide = window.localStorage.getItem('suxin-tool-dock-side')
    const savedSize = window.localStorage.getItem('suxin-reader-size')
    if (savedSide === 'left' || savedSide === 'right') setDockSide(savedSide)
    if (savedSize === 'normal' || savedSize === 'large' || savedSize === 'xlarge') {
      setReaderSize(savedSize)
    }
  }, [])

  useEffect(() => {
    onPreviewChange(scene)
    onSceneSaved(scene)
  }, [onPreviewChange, onSceneSaved, scene])

  useEffect(() => {
    function updateProgress() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const next = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0
      setScrollProgress(Math.min(100, Math.max(0, Math.round(next))))
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [pathname])

  useEffect(() => {
    document.documentElement.dataset.readerSize = readerSize
    window.localStorage.setItem('suxin-reader-size', readerSize)
  }, [readerSize])

  useEffect(() => {
    if (articlePage && readingFocus) {
      document.documentElement.dataset.readerFocus = 'true'
    } else {
      delete document.documentElement.dataset.readerFocus
    }

    return () => {
      delete document.documentElement.dataset.readerFocus
    }
  }, [articlePage, readingFocus])

  useEffect(() => {
    setOpen(false)
    setReadingFocus(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!dockRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  if (!mounted) return null

  function moveDock() {
    const next: DockSide = dockSide === 'right' ? 'left' : 'right'
    setDockSide(next)
    window.localStorage.setItem('suxin-tool-dock-side', next)
  }

  function cycleReaderSize() {
    const currentIndex = readerSizes.findIndex((item) => item.id === readerSize)
    setReaderSize(readerSizes[(currentIndex + 1) % readerSizes.length].id)
  }

  async function copyPageLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = window.location.href
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }

    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1800)
  }

  const readerSizeLabel = readerSizes.find((item) => item.id === readerSize)?.label ?? '100%'
  const dockPosition = dockSide === 'right' ? 'right-4 sm:right-6' : 'left-4 sm:left-6'
  const dockAlignment = dockSide === 'right' ? 'items-end' : 'items-start'

  return (
    <div
      ref={dockRef}
      className={`fixed bottom-4 z-[80] flex flex-col gap-2.5 sm:bottom-6 ${dockPosition} ${dockAlignment}`}
    >
      {open ? (
        <section
          aria-label="页面快捷工具"
          className="w-[min(17.5rem,calc(100vw-2rem))] rounded-[22px] border border-border/70 bg-card/88 p-2 shadow-[0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
            <div>
              <p className="text-xs font-semibold text-foreground">快捷工具</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {articlePage ? '阅读辅助已就绪' : '只保留常用操作'}
              </p>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">{scrollProgress}%</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ToolAction
              icon="arrow_upward"
              label={scrollProgress < 2 ? '已在顶部' : '回到顶部'}
              meta={`${scrollProgress}%`}
              disabled={scrollProgress < 2}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            <ToolAction
              icon={isDark ? 'light_mode' : 'dark_mode'}
              label={isDark ? '切换浅色' : '切换深色'}
              meta={isDark ? 'DARK' : 'LIGHT'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            />

            {articlePage ? (
              <>
                <ToolAction
                  icon={readingFocus ? 'visibility' : 'visibility_off'}
                  label={readingFocus ? '退出专注' : '专注阅读'}
                  meta={readingFocus ? 'ON' : 'OFF'}
                  active={readingFocus}
                  onClick={() => setReadingFocus((current) => !current)}
                />
                <ToolAction
                  icon="text_fields"
                  label="正文字号"
                  meta={readerSizeLabel}
                  active={readerSize !== 'normal'}
                  onClick={cycleReaderSize}
                />
              </>
            ) : null}

            <ToolAction
              icon={copied ? 'check' : 'content_copy'}
              label={copied ? '链接已复制' : '复制页面链接'}
              meta={copied ? 'DONE' : 'SHARE'}
              active={copied}
              onClick={() => void copyPageLink()}
            />

            {quickActionHref ? (
              <Link
                href={quickActionHref}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-[72px] flex-col items-start justify-between rounded-[16px] border border-border/65 bg-background/48 p-3 text-left text-muted-foreground transition-colors hover:border-foreground/15 hover:bg-foreground/[0.045] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <PublicSymbol icon="open_in_new" size={18} />
                  <span className="font-mono text-[9px] tracking-[0.08em] text-muted-foreground/75">LINK</span>
                </span>
                <span className="text-xs font-medium">{quickActionLabel}</span>
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            onClick={moveDock}
            className="mt-2 flex h-9 w-full items-center justify-between rounded-[13px] px-3 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/[0.045] hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <PublicSymbol icon="view_column" size={15} />
              移至{dockSide === 'right' ? '左侧' : '右侧'}
            </span>
            <PublicSymbol icon={dockSide === 'right' ? 'chevron_left' : 'chevron_right'} size={16} />
          </button>

          {canEdit ? (
            <p className="px-3 pb-1 pt-1 text-[10px] text-muted-foreground">场景预览模式已连接</p>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        aria-label={open ? '收起快捷工具' : '展开快捷工具'}
        aria-expanded={open}
        title="快捷工具"
        onClick={() => setOpen((current) => !current)}
        className="rounded-[18px] p-[1px] shadow-[0_12px_32px_rgba(0,0,0,0.16)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
        style={{
          background: `conic-gradient(hsl(var(--foreground) / 0.78) ${scrollProgress}%, hsl(var(--border) / 0.9) ${scrollProgress}% 100%)`,
        }}
      >
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[17px] bg-background/92 text-foreground backdrop-blur-2xl">
          <PublicSymbol icon={open ? 'close' : 'widgets'} size={20} />
        </span>
      </button>
    </div>
  )
}
