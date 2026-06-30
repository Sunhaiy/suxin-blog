'use client'

import { useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const frameRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    let staggerIndex = 0
    const reveal = (element: Element) => {
      if (!(element instanceof HTMLElement) || element.dataset.routeRevealed === 'true') return
      element.dataset.routeRevealed = 'true'
      element.style.setProperty('--route-stagger', `${Math.min(staggerIndex, 10) * 55}ms`)
      element.classList.add('route-reveal-item')
      staggerIndex += 1
    }

    frame.querySelectorAll('article, [data-route-reveal]').forEach(reveal)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.matches('article, [data-route-reveal]')) reveal(node)
          node.querySelectorAll('article, [data-route-reveal]').forEach(reveal)
        }
      }
    })

    observer.observe(frame, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [pathname])

  return (
    <div ref={frameRef} key={pathname} className="page-transition-frame">
      {children}
    </div>
  )
}
