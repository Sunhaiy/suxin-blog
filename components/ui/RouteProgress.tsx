'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const MIN_VISIBLE_MS = 180

export function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const active = useRef(false)
  const startedAt = useRef(0)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (tickTimer.current) clearInterval(tickTimer.current)
    if (finishTimer.current) clearTimeout(finishTimer.current)
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current)
    tickTimer.current = null
    finishTimer.current = null
    fallbackTimer.current = null
  }, [])

  const finish = useCallback(() => {
    if (!active.current) return
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current))
    if (tickTimer.current) clearInterval(tickTimer.current)
    tickTimer.current = null
    finishTimer.current = setTimeout(() => {
      setProgress(100)
      finishTimer.current = setTimeout(() => {
        active.current = false
        setVisible(false)
        setProgress(0)
      }, 220)
    }, wait)
  }, [])

  const start = useCallback(() => {
    clearTimers()
    active.current = true
    startedAt.current = Date.now()
    setVisible(true)
    setProgress(10)
    tickTimer.current = setInterval(() => {
      setProgress((current) => Math.min(88, current + Math.max(1.5, (88 - current) * 0.09)))
    }, 240)
    fallbackTimer.current = setTimeout(finish, 12000)
  }, [clearTimers, finish])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) return

      start()
    }

    const handlePopState = () => start()
    document.addEventListener('click', handleClick, true)
    window.addEventListener('popstate', handlePopState)
    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [start])

  useEffect(() => finish(), [routeKey, finish])
  useEffect(() => clearTimers, [clearTimers])

  return (
    <div
      data-testid="route-progress"
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[10000] h-[3px] overflow-hidden transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="h-full origin-left bg-primary transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  )
}
