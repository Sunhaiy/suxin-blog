'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { PublicSymbol } from '@/components/ui/PublicSymbol'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className={`h-9 w-9 ${className}`} />
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`
        flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors duration-200
        hover:text-foreground
        ${className}
      `}
    >
      {isDark ? (
        <PublicSymbol icon="light_mode" size={19} />
      ) : (
        <PublicSymbol icon="dark_mode" size={19} />
      )}
    </button>
  )
}
