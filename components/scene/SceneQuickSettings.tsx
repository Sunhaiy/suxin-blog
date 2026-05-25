'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
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

export function SceneQuickSettings({
  scene,
  canEdit,
  onPreviewChange,
  onSceneSaved,
  quickActionHref,
  quickActionLabel = '自定义',
}: SceneQuickSettingsProps) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    onPreviewChange(scene)
    onSceneSaved(scene)
  }, [onPreviewChange, onSceneSaved, scene])

  if (!mounted) return null

  const showCustomAction = Boolean(quickActionHref)

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-3">
      {open ? (
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex h-12 min-w-[9.5rem] items-center justify-between rounded-full border border-border/45 bg-background/74 px-4 text-sm font-medium text-foreground shadow-none backdrop-blur-xl transition-all hover:border-primary/24 hover:bg-background/84 hover:text-primary dark:border-white/8 dark:bg-background/62 dark:hover:bg-background/74"
          >
            <span>返回顶部</span>
            <PublicSymbol icon="arrow_upward" size={18} />
          </button>

          {showCustomAction ? (
            <Link
              href={quickActionHref!}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 min-w-[9.5rem] items-center justify-between rounded-full border border-border/45 bg-background/74 px-4 text-sm font-medium text-foreground shadow-none backdrop-blur-xl transition-all hover:border-primary/24 hover:bg-background/84 hover:text-primary dark:border-white/8 dark:bg-background/62 dark:hover:bg-background/74"
            >
              <span>{quickActionLabel}</span>
              <PublicSymbol icon="open_in_new" size={18} />
            </Link>
          ) : null}

          {canEdit ? (
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              编辑模式已关闭
            </Button>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        aria-label={open ? '收起快捷按钮' : '展开快捷按钮'}
        onClick={() => setOpen((current) => !current)}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-border/45 bg-background/76 text-primary shadow-none backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-primary/24 hover:bg-background/86 dark:border-white/8 dark:bg-background/64 dark:hover:bg-background/76"
      >
        <PublicSymbol icon={open ? 'close' : 'widgets'} size={22} />
      </button>
    </div>
  )
}
