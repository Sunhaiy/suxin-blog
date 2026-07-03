'use client'

import { useEffect, useState } from 'react'

interface VisitorContext {
  locationLabel: string
  greeting: string
  quote: {
    text: string
    from: string
  }
}

const FALLBACK_CONTEXT: VisitorContext = {
  locationLabel: '远方',
  greeting: '路过这里的朋友，欢迎你。',
  quote: {
    text: '慢一点没关系，重要的是一直在靠近。',
    from: '站点备忘',
  },
}

export function HomeSidebarVisitorCard() {
  const [context, setContext] = useState<VisitorContext>(FALLBACK_CONTEXT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadContext() {
      try {
        const response = await fetch('/api/visitor-context', { cache: 'no-store' })
        if (!response.ok) throw new Error('request failed')
        const data = (await response.json()) as VisitorContext
        if (!cancelled) {
          setContext(data)
        }
      } catch {
        if (!cancelled) {
          setContext(FALLBACK_CONTEXT)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadContext()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div data-scroll-reveal className="rounded-[24px] border border-border/75 bg-card/76 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          一言
        </p>
        <span className="rounded-full border border-border/70 bg-background/48 px-2.5 py-1 text-[10px] text-muted-foreground">
          {loading ? '加载中' : context.locationLabel}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium leading-7 text-foreground/88">
        “{context.quote.text}”
      </p>
      <p className="mt-3 text-[11px] text-muted-foreground">{context.quote.from}</p>
    </div>
  )
}
