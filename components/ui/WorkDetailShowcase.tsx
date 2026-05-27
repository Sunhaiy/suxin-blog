'use client'

import { useMemo, useRef } from 'react'
import { ProgressiveImage } from '@/components/ui/ProgressiveImage'
import { useGsapScope } from '@/hooks/useGsapScope'
import { getOptimizedMediaUrl, resolveMediaUrl } from '@/lib/media'
import type { WorkContributor, WorkDetail } from '@/types/work'

interface WorkDetailShowcaseProps {
  work: WorkDetail
  siteUrl: string
}

interface ProjectViewModel {
  name: string
  subtitle: string
  tags: string[]
  image: string
  seal: string | null
  users: WorkContributor[]
  progress: string
  statusText: string
  version: string
  price: string
  originalPrice: string | null
  joinUrl: string | null
  joinLabel: string
  actionUrl: string
  actionLabel: string
  milestones: Array<{ date: string; title: string; desc: string; link: string | null }>
  description: string[]
  metaLeft: string
  metaRight: string
  yearLabel: string
}

export function WorkDetailShowcase({ work, siteUrl }: WorkDetailShowcaseProps) {
  const project = useMemo(() => mapWorkToProject(work, siteUrl), [siteUrl, work])
  const projectHeroImageUrl = useMemo(
    () => getOptimizedMediaUrl(project.image, { width: 1200, quality: 72 }) ?? project.image,
    [project.image]
  )
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 })

  const { scopeRef } = useGsapScope<HTMLDivElement>((scope, { gsap, prefersReducedMotion }) => {
    if (prefersReducedMotion) return

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(
      scope.querySelectorAll('.anim-fade-up'),
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.76, stagger: 0.1 }
    )
    tl.fromTo(
      scope.querySelectorAll('.anim-scale-in'),
      { autoAlpha: 0, scale: 0.985 },
      { autoAlpha: 1, scale: 1, duration: 0.88 },
      0.08
    )
    tl.fromTo(
      scope.querySelectorAll('.anim-slide-left'),
      { autoAlpha: 0, x: 18 },
      { autoAlpha: 1, x: 0, duration: 0.62, stagger: 0.08 },
      0.18
    )
    tl.fromTo(
      scope.querySelectorAll('.anim-grow-h'),
      { scaleX: 0, transformOrigin: 'left center' },
      { scaleX: 1, duration: 0.54, stagger: 0.06 },
      0.26
    )

    const shine = scope.querySelector('.shine-sweep')
    if (shine) {
      gsap.set(shine, { xPercent: -160, skewX: -22 })
      gsap.to(shine, {
        xPercent: 235,
        duration: 5.8,
        ease: 'power1.inOut',
        repeat: -1,
        repeatDelay: 1.2,
      })
    }
  }, [work.id])

  function openLink(url?: string | null) {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function startDragging(event: React.MouseEvent<HTMLDivElement>) {
    const container = scrollContainerRef.current
    if (!container) return
    dragStateRef.current = {
      isDown: true,
      startX: event.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
    }
    container.classList.add('grabbing')
  }

  function stopDragging() {
    dragStateRef.current.isDown = false
    scrollContainerRef.current?.classList.remove('grabbing')
  }

  function onDragging(event: React.MouseEvent<HTMLDivElement>) {
    const container = scrollContainerRef.current
    if (!container || !dragStateRef.current.isDown) return
    event.preventDefault()
    const x = event.pageX - container.offsetLeft
    const walk = (x - dragStateRef.current.startX) * 1.8
    container.scrollLeft = dragStateRef.current.scrollLeft - walk
  }

  return (
    <div ref={scopeRef} className="project-view-root">
      <div className="content-container">
        <header className="project-header anim-fade-up">
          <div className="header-shell">
            <div className="header-copy">
              <div className="meta-header">{'// CLASSIFIED_ARCHIVE_V.2026'}</div>
              <h1 className="title">{project.name}</h1>
              <p className="subtitle">{project.subtitle}</p>
              {project.tags.length > 0 ? (
                <div className="tags-row">
                  {project.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="header-aside">
              <span className="header-kicker">ARCHIVE STATUS</span>
              <div className="header-aside-value">{project.statusText}</div>
              <div className="header-facts">
                <div className="fact">
                  <span className="fact-label">YEAR</span>
                  <span className="fact-value">{project.yearLabel}</span>
                </div>
                <div className="fact">
                  <span className="fact-label">VERSION</span>
                  <span className="fact-value">{project.version}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="main-layout">
          <section className="visual-section anim-scale-in">
            <div className="hero-image-wrapper">
              <div className="frame-corner tl" />
              <div className="frame-corner br" />

              <div className="shine-container">
                <div className="shine-sweep" />
                {projectHeroImageUrl ? (
                  <ProgressiveImage
                    src={projectHeroImageUrl}
                    alt={project.name}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    wrapperClassName="h-full w-full"
                    className="hero-img"
                  />
                ) : (
                  <div className="img-placeholder">
                    <span className="ghost-txt">[[ NO_SIGNAL_ESTABLISHED ]]</span>
                  </div>
                )}
              </div>

              {project.seal ? (
                <div className="seal-box">
                  <div className="seal">{project.seal}</div>
                </div>
              ) : null}
            </div>

            <div className="visual-meta">
              <span>{project.metaLeft}</span>
              <span className="divider" />
              <span>{project.metaRight}</span>
            </div>
          </section>

          <aside className="info-sidebar">
            <div className="sidebar-inner">
              <div className="side-item anim-slide-left">
                <h4 className="side-label">参与者 CONTRIBUTORS</h4>
                {project.users.length > 0 ? (
                  <div className="users">
                    {project.users.map((user, index) => (
                      <div key={`${user.name}-${index}`} className="user-row">
                        <div className="avatar-box">
                          {user.avatar_url ? (
                            <ProgressiveImage
                              src={getOptimizedMediaUrl(user.avatar_url, { width: 128, quality: 72 }) ?? user.avatar_url}
                              alt={user.name}
                              loading="lazy"
                              decoding="async"
                              wrapperClassName="h-full w-full rounded-full"
                              className="avatar-img"
                            />
                          ) : (
                            <span className="abbr">{user.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="u-text">
                          <span className="u-name">{user.name}</span>
                          <span className="u-role">{user.role || 'Member'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data">[[ NO_DATA ]]</div>
                )}
              </div>

              <div className="h-line anim-grow-h" />

              <div className="side-item anim-slide-left">
                <h4 className="side-label">当前进度 PROGRESS</h4>
                <div className="status-box">
                  <span className="val">{project.progress}</span>
                  <span className="txt">{project.statusText}</span>
                </div>
              </div>

              <div className="h-line anim-grow-h" />

              <div className="side-item purchase anim-slide-left">
                <h4 className="side-label">系统版本 VERSION</h4>
                <div className="ver-code">{project.version}</div>

                <div className="price-info">
                  <div className="price-cell">
                    <span className="p-label">PRICE_NOW</span>
                    <span className="p-val">{project.price}</span>
                  </div>
                  {project.originalPrice ? (
                    <div className="price-cell old">
                      <span className="p-label">PRICE_OLD</span>
                      <span className="p-val">{project.originalPrice}</span>
                    </div>
                  ) : null}
                </div>

                <div className="action-card">
                  <div className="action-copy">
                    <p className="action-kicker">{project.joinLabel}</p>
                    <p className="action-desc">{project.actionLabel}</p>
                  </div>

                  {project.joinUrl ? (
                    <button className="join-trigger" onClick={() => openLink(project.joinUrl)}>
                      {project.joinLabel}
                    </button>
                  ) : null}

                  <button className="action-trigger" onClick={() => openLink(project.actionUrl)}>
                    {project.actionLabel}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {project.milestones.length > 0 ? (
          <section className="progress-timeline-section anim-fade-up">
            <div className="timeline-header">
              <span className="header-tag">DEVELOPMENT TIMELINE</span>
              <div className="header-line" />
            </div>

            <div
              ref={scrollContainerRef}
              className="scroll-x-container"
              onMouseDown={startDragging}
              onMouseLeave={stopDragging}
              onMouseUp={stopDragging}
              onMouseMove={onDragging}
            >
              <div className="timeline-track">
                {project.milestones.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="timeline-node">
                    <div className="node-head">
                      <span className="node-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="node-date">{step.date}</span>
                    </div>
                    <div className="node-path">
                      <div className="node-dot" />
                      <div className="node-line" />
                    </div>
                    <div className="node-body">
                      <h5
                        className={`node-title ${step.link ? 'has-link' : ''}`}
                        onClick={() => openLink(step.link)}
                      >
                        {step.title}
                        {step.link ? <span className="inline-arrow">↗</span> : null}
                      </h5>
                      <p className="node-desc">{step.desc}</p>
                    </div>
                  </div>
                ))}

                <div className="timeline-end">
                  <div className="end-dot" />
                  <span className="end-txt">EOF</span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="product-intro-section anim-fade-up">
          <div className="timeline-header">
            <span className="header-tag">PRODUCT SPECIFICATION / 产品详述</span>
            <div className="header-line" />
          </div>

          <div className="intro-content">
            {project.description.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`} className="intro-para">
                {paragraph}
              </p>
            ))}

            <p className="intro-para info-tip">
              该节点已通过核心协议验证，所有数据流向受控且加密。开发者可以申请接入
              API，获取实时遥测与版本运行信息。
            </p>
          </div>
        </section>
      </div>

      <div className="bg-watermark">DECODING_MODULE_{work.slug.toUpperCase()}</div>

      <style jsx>{`
        .project-view-root {
          --sidebar-width: 336px;
          position: relative;
          min-height: 100vh;
          overflow: clip;
          padding: 56px 5% 148px;
          color: hsl(var(--foreground));
          font-family: var(--font-mono);
          background:
            radial-gradient(circle at 16% 10%, hsl(var(--primary) / 0.08), transparent 24%),
            radial-gradient(circle at 84% 12%, hsl(var(--primary) / 0.04), transparent 18%),
            linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%);
        }

        .project-view-root::after {
          content: '';
          position: absolute;
          inset: auto 0 0 0;
          z-index: 3;
          height: 96px;
          pointer-events: none;
          background: linear-gradient(180deg, transparent 0%, hsl(var(--background)) 70%);
        }

        .content-container {
          position: relative;
          z-index: 4;
          max-width: 1500px;
          margin: 0 auto;
        }

        .project-header {
          margin-bottom: 40px;
        }

        .header-shell,
        .main-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
          gap: 32px;
          align-items: start;
        }

        .header-shell {
          border: 1px solid hsl(var(--border) / 0.78);
          border-radius: 32px;
          background:
            linear-gradient(180deg, hsl(var(--card) / 0.84), hsl(var(--card) / 0.72)),
            hsl(var(--card));
          padding: 30px 32px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.12);
        }

        .meta-header {
          margin-bottom: 12px;
          color: hsl(var(--primary) / 0.72);
          font-size: 10px;
          letter-spacing: 0.42em;
        }

        .title {
          margin: 0;
          color: hsl(var(--foreground));
          font-family: var(--font-inter);
          font-size: clamp(2.72rem, 5vw, 4.6rem);
          font-weight: 700;
          letter-spacing: -0.068em;
          line-height: 0.94;
        }

        .subtitle {
          margin: 14px 0 0;
          max-width: 42rem;
          color: hsl(var(--muted-foreground));
          font-family: var(--font-inter);
          font-size: clamp(1.02rem, 1.8vw, 1.34rem);
          font-weight: 500;
          line-height: 1.45;
        }

        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .tag-pill {
          border: 1px solid hsl(var(--border));
          border-radius: 999px;
          background: hsl(var(--card) / 0.8);
          padding: 4px 10px;
          color: hsl(var(--muted-foreground));
          font-size: 11px;
        }

        .header-aside,
        .sidebar-inner {
          border: 1px solid hsl(var(--border) / 0.78);
          border-radius: 28px;
          background:
            linear-gradient(180deg, hsl(var(--card) / 0.84), hsl(var(--card) / 0.72)),
            hsl(var(--card));
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.1);
        }

        .header-aside {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 22px;
        }

        .header-kicker,
        .fact-label,
        .side-label,
        .header-tag,
        .p-label,
        .action-kicker {
          color: hsl(var(--muted-foreground));
          font-size: 11px;
          letter-spacing: 0.18em;
        }

        .header-aside-value {
          color: hsl(var(--foreground));
          font-family: var(--font-inter);
          font-size: 1.72rem;
          font-weight: 600;
          line-height: 1.08;
        }

        .header-facts {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .fact {
          border: 1px solid hsl(var(--border) / 0.76);
          border-radius: 18px;
          padding: 12px 14px;
          background: hsl(var(--card) / 0.56);
        }

        .fact-value {
          display: block;
          margin-top: 6px;
          color: hsl(var(--foreground));
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: -0.03em;
        }

        .hero-image-wrapper {
          position: relative;
          overflow: hidden;
          border-radius: 34px;
          border: 1px solid hsl(var(--border) / 0.72);
          background: hsl(var(--card));
          aspect-ratio: 16 / 10;
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.16);
        }

        .shine-container,
        .hero-img,
        .img-placeholder {
          width: 100%;
          height: 100%;
        }

        .shine-container {
          position: relative;
        }

        .hero-img {
          display: block;
          object-fit: cover;
        }

        .shine-sweep {
          position: absolute;
          inset: 0 auto 0 0;
          width: 38%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.02) 18%,
            hsl(var(--primary) / 0.12) 50%,
            transparent 100%
          );
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .img-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, hsl(var(--card)), hsl(var(--muted) / 0.45));
        }

        .ghost-txt {
          color: hsl(var(--muted-foreground) / 0.6);
          font-size: 1rem;
          letter-spacing: 0.24em;
        }

        .frame-corner {
          position: absolute;
          z-index: 2;
          width: 42px;
          height: 42px;
          border-color: hsl(var(--primary));
          border-style: solid;
          opacity: 0.85;
        }

        .tl {
          top: 20px;
          left: 20px;
          border-width: 2px 0 0 2px;
        }

        .br {
          right: 20px;
          bottom: 20px;
          border-width: 0 2px 2px 0;
        }

        .seal-box {
          position: absolute;
          right: 24px;
          bottom: 24px;
          z-index: 3;
        }

        .seal {
          border-radius: 999px;
          background: hsl(var(--primary));
          padding: 10px 18px;
          color: hsl(var(--primary-foreground));
          font-size: 0.95rem;
          font-weight: 700;
        }

        .visual-meta {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 14px;
          margin-top: 14px;
          color: hsl(var(--muted-foreground));
          font-size: 11px;
          letter-spacing: 0.18em;
        }

        .divider {
          width: 30px;
          height: 1px;
          background: hsl(var(--border));
        }

        .info-sidebar {
          position: sticky;
          top: 96px;
        }

        .sidebar-inner {
          padding: 24px;
        }

        .side-item + .side-item {
          margin-top: 28px;
        }

        .users {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .user-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar-box {
          display: flex;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 999px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--primary) / 0.12);
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .abbr {
          color: hsl(var(--foreground));
          font-size: 0.92rem;
          font-weight: 700;
        }

        .u-text span {
          display: block;
        }

        .u-name {
          color: hsl(var(--foreground));
          font-size: 1rem;
          font-weight: 600;
        }

        .u-role {
          margin-top: 4px;
          color: hsl(var(--muted-foreground));
          font-size: 0.86rem;
        }

        .no-data {
          color: hsl(var(--muted-foreground));
          font-size: 0.92rem;
        }

        .h-line {
          height: 1px;
          margin: 24px 0;
          background: hsl(var(--border));
        }

        .status-box {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .val {
          color: hsl(var(--foreground));
          font-family: var(--font-inter);
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: -0.06em;
          line-height: 1;
        }

        .txt {
          color: hsl(var(--primary));
          font-size: 1.05rem;
          font-weight: 700;
        }

        .ver-code {
          color: hsl(var(--foreground));
          font-family: var(--font-inter);
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.05em;
        }

        .price-info {
          display: flex;
          gap: 20px;
          margin-top: 18px;
        }

        .price-cell span {
          display: block;
        }

        .p-val {
          margin-top: 8px;
          color: hsl(var(--primary));
          font-family: var(--font-inter);
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.05em;
        }

        .old .p-val {
          color: hsl(var(--muted-foreground));
          text-decoration: line-through;
        }

        .action-card {
          margin-top: 22px;
          border: 1px solid hsl(var(--border) / 0.9);
          border-radius: 24px;
          padding: 20px;
          background: hsl(var(--card) / 0.7);
        }

        .action-copy {
          margin-bottom: 18px;
        }

        .action-desc {
          margin: 8px 0 0;
          color: hsl(var(--foreground));
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.6;
        }

        .join-trigger,
        .action-trigger {
          width: 100%;
          border-radius: 18px;
          padding: 14px 16px;
          font-size: 0.96rem;
          font-weight: 700;
          transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease,
            color 0.2s ease;
        }

        .join-trigger {
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          color: hsl(var(--foreground));
        }

        .action-trigger {
          margin-top: 12px;
          border: 1px solid hsl(var(--primary));
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }

        .join-trigger:hover,
        .action-trigger:hover {
          transform: translateY(-1px);
        }

        .progress-timeline-section,
        .product-intro-section {
          margin-top: 64px;
        }

        .timeline-header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 28px;
        }

        .header-line {
          flex: 1;
          height: 1px;
          background: hsl(var(--border));
        }

        .scroll-x-container {
          overflow-x: auto;
          padding-bottom: 24px;
          cursor: grab;
          scrollbar-width: none;
          user-select: none;
        }

        .scroll-x-container::-webkit-scrollbar {
          display: none;
        }

        .scroll-x-container.grabbing {
          cursor: grabbing;
        }

        .timeline-track {
          display: flex;
          min-width: max-content;
          padding-left: 4px;
        }

        .timeline-node {
          width: 320px;
          padding-right: 24px;
        }

        .node-head {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        .node-index {
          color: hsl(var(--primary));
          font-size: 11px;
          letter-spacing: 0.22em;
        }

        .node-date {
          color: hsl(var(--muted-foreground));
          font-size: 0.9rem;
        }

        .node-path {
          display: flex;
          align-items: center;
          height: 20px;
        }

        .node-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: hsl(var(--primary));
          box-shadow: 0 0 16px hsl(var(--primary) / 0.32);
        }

        .node-line {
          flex: 1;
          height: 1px;
          background: hsl(var(--border));
        }

        .node-body {
          padding-top: 20px;
        }

        .node-title {
          margin: 0 0 10px;
          color: hsl(var(--foreground));
          font-size: 1.08rem;
          font-weight: 700;
        }

        .node-title.has-link {
          cursor: pointer;
        }

        .inline-arrow {
          margin-left: 6px;
          color: hsl(var(--primary));
          font-size: 0.82em;
        }

        .node-desc,
        .intro-para {
          color: hsl(var(--muted-foreground));
          font-size: 0.96rem;
          line-height: 1.9;
        }

        .timeline-end {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 24px;
        }

        .end-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: hsl(var(--border));
        }

        .end-txt {
          color: hsl(var(--muted-foreground));
          font-size: 11px;
          letter-spacing: 0.22em;
        }

        .intro-content {
          max-width: 920px;
        }

        .intro-para + .intro-para {
          margin-top: 18px;
        }

        .info-tip {
          border-left: 2px solid hsl(var(--primary) / 0.45);
          padding-left: 16px;
        }

        .bg-watermark {
          position: fixed;
          left: -2%;
          bottom: -3%;
          z-index: 0;
          color: hsl(var(--foreground) / 0.03);
          font-family: var(--font-inter);
          font-size: clamp(8rem, 17vw, 16rem);
          font-weight: 700;
          letter-spacing: -0.08em;
          pointer-events: none;
          white-space: nowrap;
        }

        @media (max-width: 1180px) {
          .project-view-root {
            --sidebar-width: 300px;
          }

          .header-shell,
          .main-layout {
            gap: 24px;
          }
        }

        @media (max-width: 980px) {
          .project-view-root {
            padding: 44px 20px 120px;
          }

          .header-shell,
          .main-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .info-sidebar {
            position: static;
          }

          .header-aside,
          .sidebar-inner {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .header-shell,
          .sidebar-inner {
            padding: 20px;
          }

          .title {
            font-size: 2.5rem;
          }

          .val {
            font-size: 2.4rem;
          }

          .ver-code,
          .p-val {
            font-size: 1.7rem;
          }

          .hero-image-wrapper {
            border-radius: 26px;
          }

          .frame-corner {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </div>
  )
}

function mapWorkToProject(work: WorkDetail, siteUrl: string): ProjectViewModel {
  const primaryUrl = work.primary_url || work.url || `${siteUrl.replace(/\/$/, '')}/works/${work.slug}`
  const secondaryUrl = work.secondary_url || work.github_url || work.primary_url || work.url || null
  const descriptionSource = work.description || work.content || work.summary || ''
  const paragraphs = descriptionSource
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    name: work.title,
    subtitle: work.subtitle || '摘录 / ARCHIVE',
    tags: Array.isArray(work.tags) ? work.tags : [],
    image: resolveMediaUrl(work.hero_image_url, work.cover_url) || '',
    seal: work.seal,
    users: Array.isArray(work.contributors) ? work.contributors : [],
    progress: work.progress_text || '0 / 0',
    statusText: work.status_text || 'UNKNOWN',
    version: work.version_text || 'v1.0.0',
    price: formatPrice(work.price),
    originalPrice: work.original_price ? formatPrice(work.original_price) : null,
    joinUrl: secondaryUrl,
    joinLabel: work.secondary_label || '源码 / 外链',
    actionUrl: primaryUrl,
    actionLabel: work.primary_label || '打开项目',
    milestones: Array.isArray(work.milestones) ? work.milestones : [],
    description:
      paragraphs.length > 0
        ? paragraphs
        : ['该项目仍在持续迭代中，详细说明会在后续版本继续补充。'],
    metaLeft: `YEAR: ${work.year ?? 'N/A'}`,
    metaRight: `SLUG: ${work.slug}`,
    yearLabel: work.year ? String(work.year) : 'N/A',
  }
}

function formatPrice(value: string | null | undefined) {
  if (!value) return '¥0'
  return value.startsWith('¥') ? value : `¥${value}`
}
