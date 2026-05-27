'use client'

import { useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react'
import { gsap } from 'gsap'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { useGsapScope } from '@/hooks/useGsapScope'
import { getOptimizedMediaUrl } from '@/lib/media'
import type { GalleryAlbumRow, GalleryItemRow } from '@/types/gallery'

type ImmersiveGalleryProps = {
  items: GalleryItemRow[]
  albums: GalleryAlbumRow[]
  initialMobileLayout?: boolean
}

type GallerySlide = {
  id: number
  title: string
  description: string
  imageUrl: string
  thumbUrl: string
}

type GalleryCollection = {
  id: string
  label: string
  subtitle: string
  slides: GallerySlide[]
}

export function ImmersiveGallery({
  items,
  albums,
  initialMobileLayout = false,
}: ImmersiveGalleryProps) {
  const slides = useMemo(() => buildSlides(items), [items])
  const collections = useMemo(() => buildCollections(slides, items, albums), [albums, items, slides])
  const [activeCollectionId, setActiveCollectionId] = useState(collections[0]?.id ?? '')
  const activeCollection = collections.find((item) => item.id === activeCollectionId) ?? collections[0]
  const activeSlides = activeCollection?.slides ?? []
  const [virtualIndex, setVirtualIndex] = useState(0)
  const [isMobileLayout, setIsMobileLayout] = useState(initialMobileLayout)
  const initialRenderRef = useRef(true)
  const mobileTouchStartRef = useRef<{ x: number; y: number } | null>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)

  const safeIndex = normalizeIndex(virtualIndex, activeSlides.length)
  const activeSlide = activeSlides[safeIndex]

  const { scopeRef, prefersReducedMotion } = useGsapScope<HTMLDivElement>(
    (scope, { gsap: gsapInstance, prefersReducedMotion: reduced }) => {
      const sidebar = scope.querySelector('[data-gallery-sidebar]')
      const sidebarCards = scope.querySelectorAll('[data-gallery-intro]')
      const stage = scope.querySelector('[data-gallery-stage]')
      const info = scope.querySelector('[data-gallery-info]')
      const ruler = scope.querySelector('[data-gallery-ruler]')

      if (!sidebar || !stage || !info || !ruler) return

      if (reduced) {
        gsapInstance.set([sidebar, sidebarCards, stage, info, ruler], {
          clearProps: 'all',
          autoAlpha: 1,
        })
        initialRenderRef.current = false
        return
      }

      if (!initialRenderRef.current) return
      initialRenderRef.current = false

      const tl = gsapInstance.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(sidebar, { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0, duration: 0.5 })
      tl.fromTo(
        sidebarCards,
        { autoAlpha: 0, y: 18, rotate: -2 },
        { autoAlpha: 1, y: 0, rotate: 0, duration: 0.52, stagger: 0.06 },
        '-=0.28'
      )
      tl.fromTo(
        stage,
        { autoAlpha: 0, y: 24, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.7 },
        '-=0.28'
      )
      tl.fromTo(info, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.34 }, '-=0.28')
      tl.fromTo(ruler, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.38 }, '-=0.18')
    },
    [activeCollectionId]
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsMobileLayout(media.matches)

    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setActiveCollectionId((current) =>
      collections.some((item) => item.id === current) ? current : (collections[0]?.id ?? '')
    )
  }, [collections])

  useEffect(() => {
    setVirtualIndex(0)
  }, [activeCollectionId])

  useEffect(() => {
    if (isMobileLayout || !thumbsRef.current) return

    const activeThumb = thumbsRef.current.querySelector<HTMLElement>('[data-thumb-active="true"]')
    activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [isMobileLayout, safeIndex, activeCollectionId])

  useEffect(() => {
    if (isMobileLayout) return

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflowY = html.style.overflowY
    const previousBodyOverflowY = body.style.overflowY
    const previousBodyOverscrollY = body.style.overscrollBehaviorY

    window.scrollTo({ top: 0, left: 0 })
    html.style.overflowY = 'hidden'
    body.style.overflowY = 'hidden'
    body.style.overscrollBehaviorY = 'none'

    return () => {
      html.style.overflowY = previousHtmlOverflowY
      body.style.overflowY = previousBodyOverflowY
      body.style.overscrollBehaviorY = previousBodyOverscrollY
    }
  }, [isMobileLayout])

  useEffect(() => {
    if (!scopeRef.current || !activeSlide || prefersReducedMotion || isMobileLayout) return

    const activeCard = scopeRef.current.querySelector('[data-gallery-card-active="true"]')
    const description = scopeRef.current.querySelector('[data-gallery-slide-description]')
    const rulerTrack = scopeRef.current.querySelector('[data-gallery-ruler-track]')

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    if (activeCard) tl.fromTo(activeCard, { scale: 0.985 }, { scale: 1, duration: 0.36 }, 0)
    if (description) tl.fromTo(description, { autoAlpha: 0.45, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.07)
    if (rulerTrack) tl.fromTo(rulerTrack, { autoAlpha: 0.82 }, { autoAlpha: 1, duration: 0.24 }, 0.02)

    return () => {
      tl.kill()
    }
  }, [activeSlide, isMobileLayout, prefersReducedMotion, safeIndex, scopeRef])

  useEffect(() => {
    if (isMobileLayout || activeSlides.length <= 1) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSlides.length, isMobileLayout])

  useEffect(() => {
    const node = scopeRef.current
    if (!node || activeSlides.length <= 1 || isMobileLayout) return

    let touchStartX = 0
    let touchStartY = 0
    let hasTouch = false
    let lockUntil = 0

    const isLocked = () => Date.now() < lockUntil

    const onWheel = (event: WheelEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('[data-gallery-scroll-area]')) return

      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (Math.abs(delta) < 18) return

      event.preventDefault()
      if (isLocked()) return

      lockUntil = Date.now() + 420
      step(delta > 0 ? 1 : -1)
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
      if (Math.abs(touch.clientX - touchStartX) > Math.abs(touch.clientY - touchStartY)) {
        event.preventDefault()
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!hasTouch) return
      hasTouch = false
      const touch = event.changedTouches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartX
      const deltaY = touch.clientY - touchStartY
      if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return
      if (isLocked()) return

      lockUntil = Date.now() + 420
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
  }, [activeSlides.length, isMobileLayout, scopeRef])

  function step(direction: 1 | -1) {
    if (activeSlides.length <= 1) return
    setVirtualIndex((current) => current + direction)
  }

  function jumpTo(index: number) {
    if (activeSlides.length <= 1) return
    const target = getNearestVirtualIndex(index, virtualIndex, activeSlides.length)
    if (target === virtualIndex) return
    setVirtualIndex(target)
  }

  function handleMobileTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    if (!touch) return
    mobileTouchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleMobileTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    if (!mobileTouchStartRef.current || activeSlides.length <= 1) return

    const touch = event.changedTouches[0]
    if (!touch) return

    const deltaX = touch.clientX - mobileTouchStartRef.current.x
    const deltaY = touch.clientY - mobileTouchStartRef.current.y
    mobileTouchStartRef.current = null

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.1) return
    step(deltaX < 0 ? 1 : -1)
  }

  if (slides.length === 0) {
    return (
      <section className="relative min-h-[calc(100svh-4rem)] overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,hsl(var(--primary)/0.08),transparent_24%),radial-gradient(circle_at_72%_28%,hsl(var(--primary)/0.12),transparent_18%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background)/0.98)_100%)]" />
        <GalleryEmptyState />
      </section>
    )
  }

  if (isMobileLayout) {
    return (
      <section className="relative min-h-[calc(100svh-4rem)] overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,hsl(var(--primary)/0.08),transparent_24%),radial-gradient(circle_at_72%_28%,hsl(var(--primary)/0.12),transparent_18%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background)/0.98)_100%)]" />
        <div className="pointer-events-none absolute bottom-[-10rem] left-1/2 h-64 w-[26rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />

        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-xl flex-col px-4 pb-20 pt-5 sm:px-5">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {collections.map((collection) => {
              const active = collection.id === activeCollectionId
              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setActiveCollectionId(collection.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary/30 bg-primary/12 text-primary'
                      : 'border-border/70 bg-card/70 text-muted-foreground'
                  }`}
                >
                  {collection.label}
                </button>
              )
            })}
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-card/84 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.16)] backdrop-blur-xl">
            <div
              className="overflow-hidden rounded-[1.7rem] border border-border/70 bg-background/70"
              onTouchStart={handleMobileTouchStart}
              onTouchEnd={handleMobileTouchEnd}
            >
              {activeSlide ? (
                <ProgressiveImage
                  src={activeSlide.imageUrl}
                  alt={activeSlide.title}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  wrapperClassName="aspect-[4/5] w-full"
                  className="object-cover"
                />
              ) : (
                <div className="aspect-[4/5] w-full bg-muted/60" />
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                    {activeCollection?.subtitle ?? 'Gallery'}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {activeSlide?.title ?? '相册'}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    disabled={activeSlides.length <= 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/62 text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="上一张"
                  >
                    <MaterialSymbol icon="arrow_back" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    disabled={activeSlides.length <= 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/62 text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="下一张"
                  >
                    <MaterialSymbol icon="arrow_forward" size={18} />
                  </button>
                </div>
              </div>

              {activeSlide?.description?.trim() ? (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{activeSlide.description.trim()}</p>
              ) : null}

              <div className="mt-4 flex items-center justify-between text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
                <span>{activeCollection?.label ?? '最近照片'}</span>
                <span>
                  {activeSlides.length > 0 ? `${safeIndex + 1} / ${activeSlides.length}` : '0 / 0'}
                </span>
              </div>
            </div>
          </div>

          <div
            ref={thumbsRef}
            className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {activeSlides.map((slide, index) => {
              const selected = index === safeIndex
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => jumpTo(index)}
                  data-thumb-active={selected ? 'true' : 'false'}
                  className={`shrink-0 overflow-hidden rounded-[1.1rem] border transition-all ${
                    selected
                      ? 'border-primary/36 ring-2 ring-primary/18'
                      : 'border-border/70 opacity-72'
                  }`}
                  aria-label={slide.title}
                >
                  <ProgressiveImage
                    src={slide.thumbUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    wrapperClassName="h-20 w-20 sm:h-24 sm:w-24"
                    className="object-cover"
                  />
                </button>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative isolate h-[calc(100svh-4rem)] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,hsl(var(--primary)/0.08),transparent_24%),radial-gradient(circle_at_72%_28%,hsl(var(--primary)/0.12),transparent_18%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background)/0.98)_100%)]" />
      <div className="pointer-events-none absolute bottom-[-14rem] left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[210px]" />

      <div
        ref={scopeRef}
        className="relative mx-auto flex h-full max-w-[1520px] items-center px-5 py-8 sm:px-8 md:py-6 xl:px-12"
      >
        <div className="grid w-full items-center gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-10">
          <aside
            className="max-h-[calc(100svh-8rem)] space-y-6 overflow-y-auto overscroll-contain pr-3 [mask-image:linear-gradient(180deg,transparent_0%,black_4%,black_96%,transparent_100%)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            data-gallery-sidebar
            data-gallery-scroll-area
          >
            {collections.map((collection, index) => {
              const active = collection.id === activeCollectionId
              const preview = collection.slides[0]

              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => setActiveCollectionId(collection.id)}
                  className="block w-full text-left"
                  data-gallery-intro
                >
                  <AlbumCollectionCard
                    active={active}
                    index={index}
                    label={collection.label}
                    subtitle={collection.subtitle}
                    count={collection.slides.length}
                    imageUrl={preview?.thumbUrl}
                  />
                </button>
              )
            })}
          </aside>

          <div className="flex min-w-0 items-center justify-center">
            <div className="flex w-full max-w-[980px] flex-col items-center justify-center">
              <div
                className="relative flex h-[clamp(19rem,34vw,30rem)] w-full items-center justify-center overflow-visible"
                data-gallery-stage
              >
                <div className="relative h-full w-full max-w-[760px]">
                  {activeSlides.map((slide, index) => {
                    const offset = getVirtualOffset(index, virtualIndex, activeSlides.length)
                    return (
                      <GalleryCard
                        key={slide.id}
                        slide={slide}
                        offset={offset}
                        isActive={offset === 0}
                        onClick={() => jumpTo(index)}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 w-full max-w-[760px] text-center" data-gallery-info>
                {activeSlide?.description?.trim() ? (
                  <p
                    className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground"
                    data-gallery-slide-description
                  >
                    {activeSlide.description.trim()}
                  </p>
                ) : null}
              </div>

              <TickRuler total={activeSlides.length} virtualIndex={virtualIndex} onSelect={jumpTo} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GalleryEmptyState() {
  return (
    <div className="relative z-10 flex min-h-[60vh] w-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/72">
        <MaterialSymbol icon="photo_library" size={30} className="text-primary/80" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">相册里还没有图片</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        先去后台上传几张照片，这里就会变成沉浸式画廊。
      </p>
    </div>
  )
}

function AlbumCollectionCard({
  active,
  index,
  label,
  subtitle,
  count,
  imageUrl,
}: {
  active: boolean
  index: number
  label: string
  subtitle: string
  count: number
  imageUrl?: string
}) {
  const rotation = active ? '-1.5deg' : `${index % 2 === 0 ? '-2.2deg' : '2deg'}`

  return (
    <div className="relative px-4 py-2">
      <div
        className={`absolute inset-x-9 top-4 h-full rounded-[2rem] border border-border/60 bg-card/60 transition-all duration-500 ${
          active ? 'translate-x-2 rotate-[2deg] opacity-60' : 'translate-x-1 rotate-[3deg] opacity-28'
        }`}
      />
      <div
        className={`absolute inset-x-8 top-3 h-full rounded-[2rem] border border-border/60 bg-card/70 transition-all duration-500 ${
          active ? '-translate-x-2 -rotate-[3deg] opacity-68' : '-translate-x-1 -rotate-[4deg] opacity-38'
        }`}
      />
      <div
        className={`relative rounded-[2rem] border px-4 pb-5 pt-4 shadow-[0_26px_60px_rgba(0,0,0,0.18)] transition-all duration-500 ${
          active
            ? 'border-primary/20 bg-card text-foreground'
            : 'border-border/70 bg-card/92 text-foreground/92 hover:-translate-y-1'
        }`}
        style={{ transform: `rotate(${rotation})` }}
      >
        <div className="mb-3 flex items-center justify-between text-muted-foreground">
          <MaterialSymbol icon="photo_camera" size={20} />
          <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em]">{subtitle}</p>
          <MaterialSymbol icon="bookmark" size={18} />
        </div>

        <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-background/70">
          {imageUrl ? (
            <ProgressiveImage
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              wrapperClassName="aspect-[4/5] w-full"
              className={`object-cover transition-all duration-500 ${
                active ? 'scale-[1.02]' : 'brightness-[0.95] saturate-[0.94]'
              }`}
            />
          ) : (
            <div className="aspect-[4/5] w-full bg-muted/60" />
          )}
          <div className="pointer-events-none absolute inset-x-10 bottom-[6.4rem] h-10 rounded-full bg-black/10 blur-2xl dark:bg-black/30" />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[1.95rem] font-semibold tracking-[-0.06em] text-foreground">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{count} 张收藏</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MaterialSymbol icon="favorite" size={18} />
            <MaterialSymbol icon="mode_comment" size={18} />
          </div>
        </div>
      </div>
    </div>
  )
}

function GalleryCard({
  slide,
  offset,
  isActive,
  onClick,
}: {
  slide: GallerySlide
  offset: number
  isActive: boolean
  onClick: () => void
}) {
  const abs = Math.abs(offset)
  const hidden = abs > 2.2
  const translateX = abs === 0 ? 0 : abs === 1 ? offset * 16.5 : offset * 28
  const scale = abs === 0 ? 1 : abs === 1 ? 0.76 : 0.54
  const rotate = abs === 0 ? 0 : offset * 7
  const opacity = abs === 0 ? 1 : abs === 1 ? 0.42 : 0.16
  const blur = abs >= 2 ? 1.8 : 0
  const saturate = abs === 0 ? 1 : 0.82

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={slide.title}
      data-gallery-card-active={isActive ? 'true' : 'false'}
      className={`absolute left-1/2 top-1/2 h-[clamp(20rem,38vw,33rem)] w-[clamp(14.5rem,27vw,26rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-border/70 bg-card/86 shadow-[0_28px_80px_rgba(0,0,0,0.22)] transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        hidden ? 'pointer-events-none opacity-0' : ''
      }`}
      style={{
        zIndex: 30 - Math.round(abs * 10),
        transform: `translate(-50%, -50%) translateX(${translateX}%) scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        filter: `blur(${blur}px) saturate(${saturate})`,
      }}
    >
      <ProgressiveImage
        src={slide.imageUrl}
        alt={slide.title}
        loading={isActive ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={isActive ? 'high' : 'low'}
        wrapperClassName="h-full w-full"
        className="object-cover"
      />
      <div
        className={`absolute inset-0 ${
          isActive
            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(15,23,42,0.12))] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.16))]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.24))] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.56))]'
        }`}
      />
      <div className="pointer-events-none absolute inset-x-10 bottom-6 h-12 rounded-full bg-black/10 blur-2xl dark:bg-black/25" />
    </button>
  )
}

function TickRuler({
  total,
  virtualIndex,
  onSelect,
}: {
  total: number
  virtualIndex: number
  onSelect: (index: number) => void
}) {
  if (total === 0) return null

  const ticks = buildLineTicks(total, virtualIndex, 4)

  return (
    <div className="mt-5 w-full max-w-[860px]" data-gallery-ruler>
      <div className="relative mx-auto h-[3.1rem] w-full max-w-[40rem] overflow-hidden px-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_36%)] blur-xl"
          data-gallery-ruler-glow
        />

        <div
          className="absolute inset-0 [mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.94)_14%,black_26%,black_74%,rgba(0,0,0,0.94)_86%,transparent_100%)]"
          data-gallery-ruler-track
        >
          {ticks.map((tick) => {
            const abs = Math.abs(tick.offset)
            const translateX = tick.offset * 1.12
            const opacity = abs === 0 ? 1 : abs <= 4 ? 0.88 : abs <= 8 ? 0.54 : abs <= 14 ? 0.22 : 0.08
            const height = tick.kind === 'major' ? '1.55rem' : tick.kind === 'medium' ? '1.1rem' : '0.82rem'
            const width = tick.kind === 'major' ? '0.12rem' : '0.08rem'

            return (
              <button
                key={tick.key}
                type="button"
                onClick={() => onSelect(tick.index)}
                className="absolute left-1/2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-foreground transition-[transform,opacity,height,width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  transform: `translate(-50%, -50%) translateX(${translateX}rem)`,
                  opacity,
                  height,
                  width,
                }}
                aria-label={`跳转到第 ${tick.index + 1} 张`}
              />
            )
          })}
        </div>

        <span
          className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff3b30] shadow-[0_0_18px_rgba(255,59,48,0.85)]"
          data-gallery-ruler-indicator
        />
      </div>
    </div>
  )
}

function buildSlides(items: GalleryItemRow[]): GallerySlide[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title?.trim() || item.file_name,
    description: item.description?.trim() || '',
    imageUrl: getOptimizedMediaUrl(item.url, { width: 1200, quality: 72 }) ?? item.url,
    thumbUrl:
      getOptimizedMediaUrl(item.thumbnail_url || item.url, { width: 384, quality: 72 }) ??
      (item.thumbnail_url || item.url),
  }))
}

function buildCollections(
  slides: GallerySlide[],
  source: GalleryItemRow[],
  albums: GalleryAlbumRow[]
): GalleryCollection[] {
  const collections: GalleryCollection[] = []

  if (slides.length > 0) {
    collections.push({
      id: 'recent',
      label: '最近照片',
      subtitle: 'Latest capture',
      slides,
    })
  }

  albums.forEach((album) => {
    const albumSlides = source
      .filter((item) => item.album_id === album.id)
      .map((item) => slides.find((slide) => slide.id === item.id))
      .filter((item): item is GallerySlide => Boolean(item))

    if (albumSlides.length === 0) return

    collections.push({
      id: `album-${album.id}`,
      label: album.name,
      subtitle: formatAlbumSubtitle(album),
      slides: albumSlides,
    })
  })

  return collections
}

function formatAlbumSubtitle(album: GalleryAlbumRow) {
  const description = album.description?.trim()
  if (description && /^[a-z0-9 -]+$/i.test(description)) {
    return description
  }

  const slugText = album.slug
    .split('-')
    .filter(Boolean)
    .join(' ')
    .trim()

  if (slugText) return slugText
  return 'Photo archive'
}

function normalizeIndex(index: number, length: number) {
  if (length === 0) return 0
  return (index % length + length) % length
}

function getNearestVirtualIndex(index: number, anchor: number, length: number) {
  if (length <= 1) return index
  const base = Math.round((anchor - index) / length)
  return index + base * length
}

function getVirtualOffset(index: number, anchor: number, length: number) {
  const nearest = getNearestVirtualIndex(index, anchor, length)
  return nearest - anchor
}

function buildLineTicks(total: number, virtualIndex: number, repeatRadius: number) {
  const ticks: Array<{ key: string; index: number; offset: number; kind: 'major' | 'medium' | 'minor' }> = []
  const segment = 4

  for (let loop = -repeatRadius; loop <= repeatRadius; loop += 1) {
    for (let index = 0; index < total; index += 1) {
      for (let part = 0; part < segment; part += 1) {
        const virtualPosition = index + loop * total + part / segment
        ticks.push({
          key: `${loop}-${index}-${part}`,
          index,
          offset: virtualPosition - virtualIndex,
          kind: part === 0 ? 'major' : part === 2 ? 'medium' : 'minor',
        })
      }
    }
  }

  return ticks.filter((tick) => Math.abs(tick.offset) <= 16)
}
