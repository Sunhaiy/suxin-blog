'use client'

import { useEffect, useRef } from 'react'

interface PostScrollTitleProps {
  title: string
}

export function PostScrollTitle({ title }: PostScrollTitleProps) {
  const previousVisible = useRef<boolean | null>(null)

  useEffect(() => {
    let frame = 0

    const notifyNavbar = (visible: boolean, currentTitle = title) => {
      window.dispatchEvent(
        new CustomEvent('post-scroll-title-change', {
          detail: { title: currentTitle, visible },
        })
      )
    }

    const updateVisibility = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const visible = window.scrollY > 64
        if (previousVisible.current !== visible) {
          previousVisible.current = visible
          notifyNavbar(visible)
        }
      })
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
      notifyNavbar(false, '')
      previousVisible.current = null
    }
  }, [title])

  return null
}
