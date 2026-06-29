'use client'

import JsBarcode from 'jsbarcode'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { useGsapScope } from '@/hooks/useGsapScope'
import { getOptimizedMediaUrl, resolveMediaUrl } from '@/lib/media'
import type { WorkListItem } from '@/types/work'

interface Props {
  works: WorkListItem[]
  siteUrl: string
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function WorksCarousel({ works, siteUrl }: Props) {
  const [active, setActive] = useState(() => resolveActiveIndexFromHash(works))
  const [transitionKey, setTransitionKey] = useState(0)
  const directionRef = useRef<1 | -1>(1)
  const initialRenderRef = useRef(true)
  const gestureLockRef = useRef(0)
  const activeWork = works[active]
  const activeWorkCoverUrl = useMemo(
    () => resolveMediaUrl(activeWork.cover_url, activeWork.hero_image_url),
    [activeWork.cover_url, activeWork.hero_image_url]
  )
  const optimizedActiveWorkCoverUrl = useMemo(
    () => getOptimizedMediaUrl(activeWorkCoverUrl, { width: 828, quality: 72 }) ?? activeWorkCoverUrl,
    [activeWorkCoverUrl]
  )
  const ticketDate = useMemo(() => formatTicketDate(activeWork), [activeWork])
  const ticketTime = useMemo(() => formatTicketTime(activeWork), [activeWork])
  const ticketSummary = activeWork.subtitle || activeWork.summary || activeWork.description || ''
  const primaryUrl = activeWork.primary_url || activeWork.url
  const secondaryUrl = activeWork.github_url || activeWork.secondary_url
  const githubUrl = secondaryUrl || (isGithubUrl(primaryUrl) ? primaryUrl : null)
  const officialUrl =
    primaryUrl && !isGithubUrl(primaryUrl) && normalizeExternalUrl(primaryUrl) !== normalizeExternalUrl(githubUrl)
      ? primaryUrl
      : null
  const officialLabel = activeWork.primary_label?.trim() || '项目官网'
  const githubLabel = activeWork.secondary_label?.trim() || 'GitHub'
  const showOfficialUrl = Boolean(officialUrl)
  const showGithubUrl = Boolean(githubUrl)
  const backSummary =
    activeWork.summary || activeWork.description || activeWork.subtitle || '这个项目暂时还没有写简介。'
  const barcodeValue = useMemo(
    () => buildWorkUrl(siteUrl, activeWork.slug),
    [activeWork.slug, siteUrl]
  )

  const { scopeRef } = useGsapScope<HTMLDivElement>((scope, { gsap, prefersReducedMotion }) => {
    const stage = scope.querySelector('[data-ticket-shell]')
    const content = scope.querySelector('[data-ticket-content]')
    const controls = scope.querySelector('[data-ticket-controls]')
    const meta = scope.querySelector('[data-ticket-meta]')
    const postmark = scope.querySelector('[data-ticket-postmark]')
    const direction = directionRef.current

    if (!stage || !content || !controls || !meta) return

    if (prefersReducedMotion) {
      gsap.set([stage, controls, meta], { clearProps: 'all', autoAlpha: 1 })
      gsap.set(postmark, { autoAlpha: 0, clearProps: 'transform' })
      gsap.set(content.querySelectorAll('[data-ticket-line]'), { clearProps: 'all', autoAlpha: 1 })
      initialRenderRef.current = false
      return
    }

    const isInitial = initialRenderRef.current
    initialRenderRef.current = false

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (isInitial) {
      tl.fromTo(
        stage,
        { autoAlpha: 0, y: 24, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.68 }
      )
      tl.fromTo(
        content.querySelectorAll('[data-ticket-line]'),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05 },
        '-=0.42'
      )
      tl.fromTo(
        controls,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.42 },
        '-=0.3'
      )
      tl.fromTo(meta, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.42 }, '-=0.28')
      return
    }

    gsap.set(stage, {
      transformOrigin: direction > 0 ? '78% 100%' : '22% 100%',
      transformPerspective: 1200,
    })
    gsap.set(postmark, {
      autoAlpha: 0,
      xPercent: direction > 0 ? -34 : 34,
      yPercent: -16,
      rotate: direction > 0 ? -15 : 15,
      scale: 0.94,
    })

    tl.fromTo(
      stage,
      {
        autoAlpha: 0,
        x: direction * 72,
        y: 20,
        rotate: direction * 7.4,
        rotationY: direction * -16,
        scale: 0.948,
        filter: 'blur(1.6px)',
      },
      {
        autoAlpha: 1,
        x: 0,
        y: 0,
        rotate: 0,
        rotationY: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'expo.out',
      }
    )

    tl.fromTo(
      content.querySelectorAll('[data-ticket-line]'),
      { autoAlpha: 0, x: direction * 26, y: 10, rotate: direction * 0.7 },
      { autoAlpha: 1, x: 0, y: 0, rotate: 0, duration: 0.42, stagger: 0.036 },
      '-=0.6'
    )

    tl.fromTo(
      scope.querySelector('[data-ticket-barcode-wrap]'),
      { autoAlpha: 0, scaleX: 0.68, y: 10 },
      { autoAlpha: 1, scaleX: 1, y: 0, duration: 0.38, ease: 'power2.out' },
      '-=0.36'
    )

    if (postmark) {
      tl.to(
        postmark,
        {
          autoAlpha: 0.84,
          xPercent: 0,
          yPercent: 0,
          rotate: direction > 0 ? -11 : 11,
          scale: 1,
          duration: 0.22,
          ease: 'power2.out',
        },
        '-=0.62'
      )

      tl.to(
        postmark,
        {
          autoAlpha: 0,
          xPercent: direction > 0 ? 24 : -24,
          yPercent: 12,
          duration: 0.28,
          ease: 'power2.in',
        },
        '>-0.02'
      )
    }

    tl.fromTo(
      controls,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.34 },
      '-=0.28'
    )

    tl.fromTo(meta, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.36 }, '-=0.24')
  }, [active, transitionKey])

  useEffect(() => {
    const applyHashSelection = () => {
      const targetIndex = resolveActiveIndexFromHash(works)
      setActive(targetIndex)
    }

    applyHashSelection()
    window.addEventListener('hashchange', applyHashSelection)

    return () => window.removeEventListener('hashchange', applyHashSelection)
  }, [works])

  useEffect(() => {
    if (works.length <= 1) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [works.length])

  useEffect(() => {
    if (works.length <= 1) return

    const node = scopeRef.current
    if (!node) return

    let touchStartX = 0
    let touchStartY = 0
    let hasTouch = false

    const isGestureLocked = () => Date.now() - gestureLockRef.current < 640

    const onWheel = (event: WheelEvent) => {
      const dominantDelta =
        Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (Math.abs(dominantDelta) < 18) return
      event.preventDefault()
      if (isGestureLocked()) return
      gestureLockRef.current = Date.now()
      step(dominantDelta > 0 ? 1 : -1)
    }

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      touchStartX = touch.clientX
      touchStartY = touch.clientY
      hasTouch = true
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!hasTouch) return
      const touch = event.touches[0]
      if (!touch) return
      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY
      if (Math.abs(deltaX) > Math.abs(deltaY)) event.preventDefault()
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!hasTouch) return
      hasTouch = false
      const touch = event.changedTouches[0]
      if (!touch) return
      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY
      if (Math.abs(deltaX) < 46 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return
      if (isGestureLocked()) return
      gestureLockRef.current = Date.now()
      step(deltaX < 0 ? 1 : -1)
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    node.addEventListener('touchstart', onTouchStart, { passive: true })
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    node.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('touchstart', onTouchStart)
      node.removeEventListener('touchmove', onTouchMove)
      node.removeEventListener('touchend', onTouchEnd)
    }
  }, [scopeRef, works.length])

  function navigateTo(targetIndex: number, direction: 1 | -1) {
    directionRef.current = direction
    const normalizedIndex = (targetIndex + works.length) % works.length
    setActive(normalizedIndex)
    setTransitionKey((current) => current + 1)
    updateWorkHash(works[normalizedIndex]?.slug)
  }

  function step(direction: 1 | -1) {
    directionRef.current = direction
    setActive((current) => {
      const nextIndex = (current + direction + works.length) % works.length
      updateWorkHash(works[nextIndex]?.slug)
      return nextIndex
    })
    setTransitionKey((current) => current + 1)
  }

  return (
    <section
      ref={scopeRef}
      className="relative isolate flex h-[calc(100vh-5rem)] w-full items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-10"
      style={{
        backgroundColor: 'var(--works-stage)',
        color: 'var(--works-stage-copy)',
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
      data-works-stage
    >
      <div className="relative mx-auto flex w-full flex-col items-center">
        <div className="relative w-full max-w-[19.4rem] sm:max-w-[20rem]" data-ticket-shell>
          <div
            className="pointer-events-none absolute inset-x-7 top-4 h-full rounded-[2rem] blur-[20px]"
            style={{ backgroundColor: 'var(--works-ticket-shadow-soft)' }}
          />
          <div
            className="pointer-events-none absolute inset-x-5 top-[0.85rem] h-full rounded-[1.95rem] opacity-70"
            style={{ backgroundColor: 'var(--works-ticket-shadow-mid)' }}
          />
          <div
            className="pointer-events-none absolute inset-x-3 top-2 h-full rounded-[1.9rem] opacity-78"
            style={{ backgroundColor: 'var(--works-ticket-shadow-hard)' }}
          />

          <article className="group/ticket relative transition-transform duration-300 hover:-translate-y-0.5 [perspective:1400px]">
            <div className="relative transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] group-hover/ticket:[transform:rotateY(180deg)] group-focus-within/ticket:[transform:rotateY(180deg)]">
              <div
                className="relative overflow-hidden rounded-[1.85rem] border p-[0.92rem] [backface-visibility:hidden]"
                style={{
                  backgroundColor: 'var(--works-ticket-bg)',
                  color: 'var(--works-ticket-copy)',
                  borderColor: 'var(--works-ticket-border)',
                  boxShadow:
                    '0 28px 90px var(--works-ticket-shadow), 0 6px 22px var(--works-ticket-shadow-soft)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                  <div
                    className="absolute left-[9%] top-[42%] h-[6.2rem] w-[82%] rounded-[1.15rem] border-[2px] opacity-0"
                    style={{ borderColor: 'var(--works-postmark-ring)' }}
                    data-ticket-postmark
                  >
                    <div
                      className="absolute inset-[0.46rem] rounded-[0.92rem] border"
                      style={{ borderColor: 'var(--works-postmark-ring-soft)' }}
                    />
                    <div className="absolute left-[8%] right-[10%] top-[36%] h-px" style={{ backgroundColor: 'var(--works-postmark-line)' }} />
                    <div className="absolute left-[11%] right-[8%] top-[50%] h-px" style={{ backgroundColor: 'var(--works-postmark-line)' }} />
                    <div className="absolute left-[9%] right-[14%] top-[64%] h-px" style={{ backgroundColor: 'var(--works-postmark-line)' }} />
                    <p className="absolute inset-x-0 top-[0.72rem] text-center text-[0.5rem] font-mono uppercase tracking-[0.34em]" style={{ color: 'var(--works-postmark-copy)' }}>
                      SUXIN POST
                    </p>
                    <p className="absolute inset-x-0 bottom-[0.72rem] text-center text-[0.44rem] font-mono uppercase tracking-[0.28em]" style={{ color: 'var(--works-postmark-copy)' }}>
                      {activeWork.slug}
                    </p>
                  </div>
                </div>

                <div key={activeWork.id} className="block" data-ticket-content>
                  <div
                    className="relative overflow-hidden rounded-[1.08rem] border"
                    style={{
                      backgroundColor: 'var(--works-image-frame)',
                      borderColor: 'var(--works-image-border)',
                      boxShadow: 'inset 0 0 0 1px var(--works-image-outline)',
                    }}
                    data-ticket-line
                  >
                    <div className="aspect-[1.43/1]">
                      {optimizedActiveWorkCoverUrl ? (
                        <ProgressiveImage
                          src={optimizedActiveWorkCoverUrl}
                          alt={activeWork.title}
                          loading="eager"
                          decoding="async"
                          fetchPriority="high"
                          wrapperClassName="h-full w-full"
                          className="object-cover transition-transform duration-700 group-hover/ticket:scale-[1.025]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(146,122,255,0.7),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(35,215,255,0.65),transparent_34%),radial-gradient(circle_at_50%_75%,rgba(255,92,163,0.55),transparent_30%),linear-gradient(135deg,#050505,#2e2e2e)]">
                          <span className="text-7xl font-black tracking-[-0.08em] text-white/16">
                            {activeWork.title.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.22))' }}
                    />
                  </div>

                  <div className="px-[0.35rem] pb-1 pt-[1.15rem]">
                    <p className="text-[0.78rem] font-medium tracking-[-0.01em]" style={{ color: 'var(--works-ticket-subtle)' }} data-ticket-line>
                      Name
                    </p>
                    <h2 className="mt-1.5 text-[1.18rem] font-semibold leading-[1.08] tracking-[-0.055em] sm:text-[1.32rem]" data-ticket-line>
                      {activeWork.title}
                    </h2>

                    <div className="mt-[1.4rem] grid grid-cols-2 gap-4">
                      <div data-ticket-line>
                        <p className="text-[0.78rem] font-medium tracking-[-0.01em]" style={{ color: 'var(--works-ticket-muted)' }}>
                          Date
                        </p>
                        <p className="mt-[0.32rem] text-[0.9rem] font-medium tracking-[-0.025em]">{ticketDate}</p>
                      </div>
                      <div data-ticket-line>
                        <p className="text-[0.78rem] font-medium tracking-[-0.01em]" style={{ color: 'var(--works-ticket-muted)' }}>
                          Time
                        </p>
                        <p className="mt-[0.32rem] text-[0.9rem] font-medium tracking-[-0.025em]">{ticketTime}</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-[1.35rem]" data-ticket-line>
                    <span className="absolute -left-[1.55rem] top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 rounded-full shadow-[inset_-1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]" style={{ backgroundColor: 'var(--works-cutout)' }} />
                    <span className="absolute -right-[1.55rem] top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 rounded-full shadow-[inset_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[inset_1px_0_0_rgba(255,255,255,0.08)]" style={{ backgroundColor: 'var(--works-cutout)' }} />
                    <div
                      className="h-px w-full bg-repeat-x bg-center"
                      style={{
                        backgroundImage: 'radial-gradient(circle, var(--works-perf) 1px, transparent 1.2px)',
                        backgroundSize: '10px 1px',
                      }}
                    />
                  </div>

                  <div className="px-[1rem] pb-[1rem] pt-[1.55rem]" data-ticket-line>
                    <div
                      className="relative rounded-[4px] border px-[0.38rem] py-[0.34rem]"
                      style={{
                        borderColor: 'var(--works-barcode-border)',
                        backgroundColor: 'var(--works-barcode-shell)',
                        boxShadow:
                          'inset 0 1px 0 var(--works-barcode-shell-shine), 0 10px 18px var(--works-barcode-drop)',
                      }}
                      data-ticket-barcode-wrap
                    >
                      <TicketBarcode value={barcodeValue} title={activeWork.title} />
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute inset-0 flex flex-col overflow-hidden rounded-[1.85rem] border p-[1.25rem] [backface-visibility:hidden] [transform:rotateY(180deg)]"
                style={{
                  backgroundColor: 'var(--works-ticket-bg)',
                  color: 'var(--works-ticket-copy)',
                  borderColor: 'var(--works-ticket-border)',
                  boxShadow:
                    '0 28px 90px var(--works-ticket-shadow), 0 6px 22px var(--works-ticket-shadow-soft)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-55" aria-hidden="true">
                  <div
                    className="absolute inset-x-5 top-5 h-px"
                    style={{
                      backgroundImage: 'radial-gradient(circle, var(--works-perf) 1px, transparent 1.2px)',
                      backgroundSize: '10px 1px',
                    }}
                  />
                  <div
                    className="absolute inset-x-5 bottom-5 h-px"
                    style={{
                      backgroundImage: 'radial-gradient(circle, var(--works-perf) 1px, transparent 1.2px)',
                      backgroundSize: '10px 1px',
                    }}
                  />
                </div>

                <p className="text-[0.68rem] font-mono uppercase tracking-[0.28em]" style={{ color: 'var(--works-ticket-muted)' }}>
                  Project Links
                </p>
                <h3 className="mt-4 text-[1.35rem] font-semibold leading-tight tracking-[-0.055em]">
                  {activeWork.title}
                </h3>
                <p className="mt-3 line-clamp-6 text-sm leading-6 opacity-75" style={{ color: 'var(--works-ticket-copy)' }}>
                  {backSummary}
                </p>

                <div className="mt-auto space-y-2.5 pt-5">
                  {showOfficialUrl && officialUrl ? (
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                      style={{
                        borderColor: 'var(--works-ticket-border)',
                        backgroundColor: 'var(--works-accent)',
                        color: 'var(--works-accent-copy)',
                      }}
                    >
                      <span>{officialLabel}</span>
                      <MaterialSymbol icon="open_in_new" size={17} />
                    </a>
                  ) : null}

                  {showGithubUrl && githubUrl ? (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                      style={{
                        borderColor: 'var(--works-ticket-border)',
                        backgroundColor: 'var(--works-fact-bg)',
                        color: 'var(--works-panel-copy)',
                      }}
                    >
                      <span>{githubLabel}</span>
                      <MaterialSymbol icon="code_blocks" size={17} />
                    </a>
                  ) : null}

                  <Link
                    href={`/works/${activeWork.slug}`}
                    className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      borderColor: 'var(--works-ticket-border)',
                      backgroundColor: 'var(--works-chip-bg)',
                      color: 'var(--works-panel-copy)',
                    }}
                  >
                    <span>查看详情</span>
                    <MaterialSymbol icon="arrow_forward" size={17} />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-9 flex items-center gap-3" data-ticket-controls>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous project"
            className="flex h-[3.1rem] w-[3.1rem] items-center justify-center rounded-full border transition-transform duration-200 hover:-translate-x-0.5"
            style={{
              background: 'var(--works-control-bg)',
              color: 'var(--works-control-copy)',
              borderColor: 'var(--works-control-border)',
              boxShadow: '0 10px 24px var(--works-control-shadow)',
            }}
          >
            <MaterialSymbol icon="chevron_left" size={19} />
          </button>

          <div
            className="relative overflow-hidden rounded-full border px-[0.72rem] py-[0.6rem]"
            style={{
              borderColor: 'var(--works-rail-border)',
              background: 'var(--works-rail-bg)',
              boxShadow: 'inset 0 1px 0 var(--works-rail-shine), 0 10px 22px var(--works-control-shadow)',
            }}
            data-ticket-rail
          >
            <div
              className="pointer-events-none absolute inset-x-[0.75rem] top-[0.38rem] h-[4px]"
              style={{
                backgroundImage: 'radial-gradient(circle, var(--works-rail-perf) 1px, transparent 1.35px)',
                backgroundSize: '12px 4px',
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-[0.75rem] bottom-[0.38rem] h-[4px]"
              style={{
                backgroundImage: 'radial-gradient(circle, var(--works-rail-perf) 1px, transparent 1.35px)',
                backgroundSize: '12px 4px',
              }}
            />

            <div className="relative flex items-center gap-[0.34rem]">
              {works.map((work, index) => (
                <button
                  key={work.id}
                  type="button"
                  onClick={() => {
                    if (index === active) return
                    navigateTo(index, index > active ? 1 : -1)
                  }}
                  aria-label={`Go to ${work.title}`}
                  className="relative flex h-[1.76rem] min-w-[1.82rem] items-center justify-center rounded-full px-[0.42rem] font-mono text-[0.62rem] uppercase tracking-[0.2em] transition-all duration-300"
                  style={{
                    backgroundColor: index === active ? 'var(--works-rail-active-bg)' : 'transparent',
                    color:
                      index === active ? 'var(--works-rail-active-copy)' : 'var(--works-rail-copy)',
                    boxShadow:
                      index === active ? '0 8px 16px var(--works-rail-active-shadow)' : 'none',
                  }}
                  data-ticket-rail-item
                >
                  <span
                    className="absolute inset-x-[24%] bottom-[0.33rem] h-px"
                    style={{
                      backgroundColor:
                        index === active
                          ? 'var(--works-rail-active-line)'
                          : 'var(--works-rail-line)',
                    }}
                  />
                  {String(index + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next project"
            className="flex h-[3.1rem] w-[3.1rem] items-center justify-center rounded-full border transition-transform duration-200 hover:translate-x-0.5"
            style={{
              background: 'var(--works-control-bg)',
              color: 'var(--works-control-copy)',
              borderColor: 'var(--works-control-border)',
              boxShadow: '0 10px 24px var(--works-control-shadow)',
            }}
          >
            <MaterialSymbol icon="chevron_right" size={19} />
          </button>
        </div>

        <div className="mt-5 text-center" data-ticket-meta>
          <p className="text-[0.72rem] font-mono uppercase tracking-[0.32em]" style={{ color: 'var(--works-stage-meta)' }}>
            {String(active + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')}
          </p>
          {ticketSummary ? (
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7" style={{ color: 'var(--works-stage-muted)' }}>
              {ticketSummary}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function resolveActiveIndexFromHash(works: WorkListItem[]) {
  if (typeof window === 'undefined') return 0

  const hash = window.location.hash.trim()
  if (!hash) return 0

  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  const slug = normalizedHash.startsWith('work-') ? normalizedHash.slice(5) : normalizedHash
  const matchIndex = works.findIndex((work) => work.slug === slug)
  return matchIndex >= 0 ? matchIndex : 0
}

function updateWorkHash(slug?: string) {
  if (typeof window === 'undefined' || !slug) return

  const nextHash = `#work-${slug}`
  if (window.location.hash === nextHash) return

  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`
  window.history.replaceState(null, '', nextUrl)
}

function formatTicketDate(work: WorkListItem) {
  const timestamp = resolveTicketTimestamp(work)
  return dateFormatter.format(timestamp)
}

function formatTicketTime(work: WorkListItem) {
  const timestamp = resolveTicketTimestamp(work)
  return timeFormatter.format(timestamp).toLowerCase()
}

function resolveTicketTimestamp(work: WorkListItem) {
  const candidates = [work.updated_at, work.created_at]

  for (const value of candidates) {
    const timestamp = new Date(value)
    if (!Number.isNaN(timestamp.getTime())) return timestamp
  }

  return new Date()
}

function buildWorkUrl(siteUrl: string, slug: string) {
  const base = siteUrl?.trim() || 'http://127.0.0.1:3000'
  return `${base.replace(/\/$/, '')}/works/${slug}`
}

function normalizeExternalUrl(url?: string | null) {
  return (url ?? '').trim().replace(/\/+$/, '').toLowerCase()
}

function isGithubUrl(url?: string | null) {
  return normalizeExternalUrl(url).includes('github.com')
}

function TicketBarcode({ value, title }: { value: string; title: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    JsBarcode(svgRef.current, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      height: 34,
      width: 1.38,
      background: 'transparent',
      lineColor: '#141414',
    })
  }, [value])

  return (
    <div className="overflow-hidden rounded-[2px] bg-[#fbf8f2] px-[0.42rem] py-[0.36rem]">
      <svg
        ref={svgRef}
        className="block h-[2.08rem] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title} barcode`}
      />
    </div>
  )
}
