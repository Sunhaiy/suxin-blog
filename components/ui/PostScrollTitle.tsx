'use client'

import { useEffect, useState } from 'react'

interface PostScrollTitleProps {
  title: string
  heroId?: string
}

export function PostScrollTitle({ title, heroId = 'post-detail-hero' }: PostScrollTitleProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0

    const updateVisibility = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const hero = document.getElementById(heroId)
        setVisible(Boolean(hero && hero.getBoundingClientRect().bottom <= 64))
      })
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [heroId])

  return (
    <div
      data-testid="post-scroll-title-bar"
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-0 z-[60] flex h-16 items-center justify-center border-b border-border/75 bg-background/80 px-4 backdrop-blur-[25px] backdrop-saturate-150 transition-[opacity,transform] duration-300 dark:border-white/8 dark:bg-card/66 motion-reduce:transition-none ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-full opacity-0'
      }`}
    >
      <button
        type="button"
        data-testid="post-scroll-title"
        tabIndex={visible ? 0 : -1}
        aria-label={`返回顶部：${title}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="group relative flex h-11 w-[min(100%,36rem)] items-center justify-center overflow-hidden rounded-full px-6 text-sm font-semibold text-foreground transition-[background-color,color,box-shadow] duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/20 focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 motion-reduce:transition-none sm:text-base"
      >
        <span className="max-w-full truncate transition-[opacity,transform] duration-200 group-hover:-translate-y-2 group-hover:opacity-0 group-focus-visible:-translate-y-2 group-focus-visible:opacity-0 motion-reduce:transition-none">
          {title}
        </span>
        <span className="absolute inset-0 flex translate-y-2 items-center justify-center opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
          返回顶部
        </span>
      </button>
    </div>
  )
}
