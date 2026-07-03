'use client'

import { useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const REVEAL_SELECTOR = 'article, [data-route-reveal], [data-scroll-reveal]'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const frameRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let scrollObserver: IntersectionObserver | null = null

    const prepare = (element: Element) => {
      if (!(element instanceof HTMLElement) || element.dataset.routeRevealed === 'true') return

      const revealAncestor = element.parentElement?.closest(REVEAL_SELECTOR)
      if (revealAncestor && frame.contains(revealAncestor)) return

      element.dataset.routeRevealed = 'true'
      element.classList.add('route-reveal-item')

      if (reduceMotion || !scrollObserver) {
        element.classList.add('route-reveal-visible')
        return
      }

      scrollObserver.observe(element)
    }

    if (!reduceMotion && 'IntersectionObserver' in window) {
      scrollObserver = new IntersectionObserver(
        (entries) => {
          const entering = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

          entering.forEach((entry, index) => {
            if (!(entry.target instanceof HTMLElement)) return
            entry.target.style.setProperty('--route-stagger', `${Math.min(index, 3) * 65}ms`)
            entry.target.classList.add('route-reveal-visible')
            scrollObserver?.unobserve(entry.target)
          })
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      )
    }

    frame.querySelectorAll(REVEAL_SELECTOR).forEach(prepare)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.matches(REVEAL_SELECTOR)) prepare(node)
          node.querySelectorAll(REVEAL_SELECTOR).forEach(prepare)
        }
      }
    })

    observer.observe(frame, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      scrollObserver?.disconnect()
    }
  }, [pathname])

  return (
    <div ref={frameRef} key={pathname} className="page-transition-frame">
      {children}
    </div>
  )
}
