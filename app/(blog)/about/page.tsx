import type { Metadata } from 'next'
import type React from 'react'
import Link from 'next/link'
import { AboutLifestyleShowcase } from '@/components/ui/AboutLifestyleShowcase'
import { AboutMotion } from '@/components/ui/AboutMotion'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { findWorks } from '@/lib/db/dao/worksDao'
import { resolveMediaUrl } from '@/lib/media'
import { getSiteProfile } from '@/lib/site'
import type { SiteProfile } from '@/types/site'
import type { WorkListItem } from '@/types/work'

type AboutProjectCard = {
  title: string
  subtitle: string
  imageUrl: string
  lines: string[]
  slug?: string
}

export const metadata: Metadata = {
  title: '关于',
  description: '孙海洋的个人介绍、核心能力、精选项目与生活方式。',
}

export const revalidate = 60

const FALLBACK_PROJECTS: AboutProjectCard[] = [
  {
    title: '素心',
    subtitle: '个人全栈博客',
    imageUrl: '/hero.png',
    lines: ['个人全栈博客', 'SEO 优化', '内容系统', '全栈开发'],
  },
  {
    title: '来生',
    subtitle: 'Kotlin Android App',
    imageUrl: '/hero.png',
    lines: ['Kotlin Android App', '独立开发', '上线发布', '持续迭代'],
  },
  {
    title: 'Reflex',
    subtitle: 'Electron + SSH Agent',
    imageUrl: '/hero.png',
    lines: ['Electron + SSH Agent', '自然语言操作 Shell', 'AI 自动部署', '提升效率'],
  },
  {
    title: 'LLM',
    subtitle: '从零实现大语言模型',
    imageUrl: '/hero.png',
    lines: ['从零实现大语言模型', '原理实践', '技术文章记录', '持续学习'],
  },
]

const DESIGN_FONTS = [
  {
    badge: 'CN',
    name: 'Noto Sans SC',
    weight: '700 / 900',
    note: '中文标题、正文、导航与后台界面',
  },
  {
    badge: 'EN',
    name: 'Inter Variable',
    weight: '400 / 700',
    note: '英文、数字、说明文字与界面辅助信息',
  },
  {
    badge: '01',
    name: 'Roboto Mono',
    weight: '500 / 700',
    note: '代码、编号、日期、数据与技术标记',
  },
]

const TYPE_SCALE = [
  { label: '辅助标记', value: '12px / 18px' },
  { label: '正文内容', value: '14px / 22px' },
  { label: '卡片正文', value: '16px / 24px' },
  { label: '模块标题', value: '24px / 36px' },
  { label: '页面标题', value: '32px / 48px' },
  { label: '展示标题', value: '48px / 72px' },
  { label: '首页巨幕', value: '56px / 84px' },
]

const COLOR_TOKENS = [
  { name: 'Ink Black', value: '#030303', desc: '作品集底色' },
  { name: 'Paper White', value: '#FFFFFF', desc: '主体文字' },
  { name: 'Soft Line', value: '16%', desc: '细线分割' },
  { name: 'Theme Accent', value: 'var(--primary)', desc: '主题色提示' },
]

const DESIGN_PRINCIPLES = ['黑白基底', '细线分层', '主题色克制', '内容优先', '动效轻量']

function projectLines(work: WorkListItem) {
  const summary = work.subtitle || work.summary || work.description || '独立打磨的长期项目'
  const tagLines = work.tags.slice(0, 3)
  return [summary, ...tagLines].slice(0, 4)
}

function buildProjectCards(works: WorkListItem[], selectedIds: number[]): AboutProjectCard[] {
  const selectedWorks = selectedIds
    .map((id) => works.find((work) => work.id === id))
    .filter((work): work is WorkListItem => Boolean(work))
  const selectedIdSet = new Set(selectedWorks.map((work) => work.id))
  const fallbackWorks = works.filter((work) => !selectedIdSet.has(work.id))

  const workCards: AboutProjectCard[] = [...selectedWorks, ...fallbackWorks].slice(0, 4).map((work) => ({
    title: work.title,
    subtitle: work.subtitle || work.summary || 'Featured project',
    imageUrl: resolveMediaUrl(work.cover_url, work.hero_image_url) || '/hero.png',
    lines: projectLines(work),
    slug: work.slug,
  }))

  return [...workCards, ...FALLBACK_PROJECTS].slice(0, 4)
}

function StudioNameplate({ siteProfile }: { siteProfile: SiteProfile }) {
  return (
    <section className="about-reveal mt-9 border-y border-white/[0.14] py-8 sm:py-10">
      <div className="relative min-h-[230px] overflow-hidden border border-white/[0.12] bg-[#080808]">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% -16%, rgba(255,255,255,0.78), rgba(255,255,255,0.22) 20%, rgba(255,255,255,0.08) 36%, transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 48%, rgba(255,255,255,0.08))',
          }}
        />
        <div
          aria-hidden
          className="absolute -left-28 top-0 h-full w-96 opacity-60 blur-3xl"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,69,58,0.46), rgba(255,160,122,0.08), transparent)',
          }}
        />
        <div
          aria-hidden
          className="absolute -right-24 top-0 h-full w-[28rem] opacity-70 blur-3xl"
          style={{
            background:
              'linear-gradient(270deg, rgba(79,137,255,0.42), rgba(130,190,255,0.08), transparent)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.52) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.52) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/48 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.58)_100%)]"
        />

        <div className="relative z-10 flex min-h-[230px] flex-col items-center justify-center px-6 py-10 text-center">
          <div className="relative mb-6 h-16 w-24 text-white">
            <span className="absolute left-3 top-3 -rotate-6 text-[1.55rem] font-black italic leading-none tracking-[-0.12em]">
              {siteProfile.aboutNameplateLogoTop}
            </span>
            <span className="absolute left-9 top-8 -rotate-6 text-[1.55rem] font-black italic leading-none tracking-[-0.12em]">
              {siteProfile.aboutNameplateLogoBottom}
            </span>
            <span className="absolute bottom-2 left-1 h-4 w-16 -rotate-6 rounded-[50%] border-b-[6px] border-l-[4px] border-white" />
            <span className="absolute right-2 top-0 h-10 w-10 rotate-12">
              <span className="absolute left-1/2 top-0 h-10 w-px -translate-x-1/2 bg-white" />
              <span className="absolute left-0 top-1/2 h-px w-10 -translate-y-1/2 bg-white" />
              <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white" />
            </span>
          </div>

          <h2 className="text-[clamp(1.35rem,2.6vw,2.45rem)] font-black leading-tight tracking-[-0.05em] text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
            {siteProfile.aboutNameplateTitle}
            {siteProfile.aboutNameplateSubtitle ? (
              <>
                <br />
                {siteProfile.aboutNameplateSubtitle}
              </>
            ) : null}
          </h2>
          <p className="mt-5 text-[clamp(0.82rem,1.45vw,1.28rem)] font-black tracking-[-0.03em] text-white/24 [text-shadow:0_2px_10px_rgba(0,0,0,0.72)]">
            {siteProfile.aboutNameplateEnglish}
          </p>
        </div>
      </div>
    </section>
  )
}

export default async function AboutPage() {
  const [siteProfile, works] = await Promise.all([getSiteProfile(), findWorks()])
  const projects = buildProjectCards(works, siteProfile.aboutFeaturedWorkIds)

  return (
    <div className="about-portfolio relative isolate -mt-16 min-h-screen overflow-hidden bg-[#030303] pt-16 text-white selection:bg-white selection:text-black">
      <AboutMotion />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 72% 12%, rgba(255,255,255,0.08), transparent 26%), radial-gradient(circle at 18% 78%, rgba(255,255,255,0.05), transparent 28%), linear-gradient(120deg, rgba(255,255,255,0.035) 0%, transparent 34%, transparent 66%, rgba(255,255,255,0.025) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <main className="mx-auto max-w-[1160px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
        <section className="about-hero about-reveal relative min-h-[430px] border-b border-white/[0.16] pb-12 sm:pb-16">
          <div className="absolute right-0 top-0 hidden text-right sm:block">
            <p className="font-mono text-2xl font-black leading-none tracking-[0.08em] text-white">
              ###
            </p>
            <p className="mt-1 text-sm text-white/58">作品集</p>
          </div>

          <Link
            href="/works"
            className="about-hero-link mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border-4 border-white text-white transition-colors hover:bg-white hover:text-black"
            aria-label="查看作品"
          >
            <MaterialSymbol icon="arrow_outward" size={42} weight={700} />
          </Link>

          <div className="max-w-[640px]">
            <p className="about-hero-title text-[clamp(4.6rem,12vw,8.8rem)] font-black leading-[0.82] tracking-[-0.12em] text-white">
              {siteProfile.aboutHeroName}
            </p>
            <p className="about-hero-copy mt-6 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              {siteProfile.aboutHeroNameEn}
            </p>
            <p className="about-hero-copy mt-5 text-xl font-semibold leading-relaxed tracking-[-0.03em] text-white sm:text-2xl">
              {siteProfile.aboutHeroRoleLine}
            </p>
            <p className="about-hero-copy mt-8 max-w-[520px] text-base leading-8 text-white/72">
              {siteProfile.aboutHeroBio}
            </p>
          </div>
        </section>

        <StudioNameplate siteProfile={siteProfile} />

        <AboutSection title="核心能力" label="CORE STRENGTHS">
          <div className="about-stagger grid divide-y divide-white/[0.16] border-y border-white/[0.16] md:grid-cols-5 md:divide-x md:divide-y-0">
            {siteProfile.aboutStrengths.map((item, index) => (
              <div
                key={item.title}
                className="px-0 py-7 md:px-8"
                style={{ '--stagger-index': index } as React.CSSProperties}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center border border-white/[0.52] text-white">
                  <MaterialSymbol icon={item.icon} size={34} weight={450} />
                </div>
                <h3 className="text-2xl font-bold tracking-[-0.05em] text-white">{item.title}</h3>
                <div className="mt-3 space-y-1 text-sm leading-6 text-white/62">
                  {item.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AboutSection>

        <AboutSection id="featured-projects" title="精选项目" label="FEATURED PROJECTS">
          <div className="about-stagger grid gap-7 md:grid-cols-2 xl:grid-cols-4">
            {projects.map((project, index) => (
              <article
                key={`${project.title}-${index}`}
                className="group"
                style={{ '--stagger-index': index } as React.CSSProperties}
              >
                <Link
                  href={project.slug ? `/works#work-${project.slug}` : '/works'}
                  className="block focus:outline-none"
                >
                  <p className="mb-2 font-mono text-xl font-bold text-white">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <div className="about-project-card border border-white/[0.42] bg-black transition-colors duration-300 group-hover:border-white group-focus-visible:border-white">
                    <div className="aspect-[4/3] overflow-hidden border-b border-white/[0.22] bg-white/[0.04]">
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="h-full w-full object-cover grayscale transition duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
                      />
                    </div>
                    <div className="min-h-[185px] px-5 py-5">
                      <h3 className="text-3xl font-black tracking-[-0.08em] text-white">
                        {project.title}
                      </h3>
                      <div className="mt-4 space-y-1 text-base leading-6 text-white/72">
                        {project.lines.map((line) => (
                          <p key={line}>/ {line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </AboutSection>

        <AboutSection title="生活方式" label="LIFESTYLE">
          <AboutLifestyleShowcase items={siteProfile.aboutLifestyleItems} />
        </AboutSection>

        <section className="about-reveal mt-10 border border-white/[0.28] p-6 sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
            <div className="relative flex min-h-40 items-center justify-center border-white/[0.16] lg:border-r">
              <div
                aria-hidden
                className="absolute h-32 w-32 rounded-full opacity-50"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.78) 1px, transparent 1.5px)',
                  backgroundSize: '14px 14px',
                }}
              />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-white text-white">
                <MaterialSymbol icon="arrow_outward" size={40} weight={650} />
              </span>
            </div>
            <div>
              <h2 className="max-w-2xl whitespace-pre-line text-3xl font-black leading-tight tracking-[-0.08em] text-white sm:text-4xl">
                {siteProfile.aboutClosingTitle}
              </h2>
              <p className="mt-5 text-base leading-8 text-white/62">
                {siteProfile.aboutClosingDescription}
              </p>
            </div>
          </div>
        </section>

        <DesignSystemSection />

        <div className="about-reveal mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.16] pt-6 text-xs uppercase tracking-[0.26em] text-white/42">
          <span>{siteProfile.siteNameEn || 'SUXIN'}</span>
          <span>{siteProfile.aboutContactEmail}</span>
        </div>
      </main>
    </div>
  )
}

function DesignSystemSection() {
  return (
    <AboutSection title="设计规范" label="DESIGN SYSTEM">
      <div className="grid border border-white/[0.24] lg:grid-cols-[270px_1fr_320px]">
        <div className="relative min-h-[520px] overflow-hidden border-b border-white/[0.18] bg-black lg:border-b-0 lg:border-r">
          <div className="absolute -left-12 top-14 text-[22rem] font-black leading-none tracking-[-0.18em] text-white">
            &
          </div>
          <div aria-hidden className="absolute left-20 top-28 h-px w-36 rotate-12 bg-white/70" />
          <div aria-hidden className="absolute left-8 top-48 h-px w-28 rotate-[-34deg] bg-white/70" />
          <div aria-hidden className="absolute bottom-40 left-24 h-px w-44 rotate-[-18deg] bg-white/70" />
          {[
            'left-16 top-24',
            'left-44 top-32',
            'left-7 top-48',
            'bottom-36 left-28',
            'bottom-44 right-12',
          ].map((position) => (
            <span
              key={position}
              aria-hidden
              className={`absolute h-2 w-2 rounded-full border border-white bg-black ${position}`}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 p-8">
            <h3 className="text-3xl font-black tracking-[-0.08em] text-white">字 Text</h3>
            <p className="mt-4 text-lg tracking-[-0.04em] text-white/78">
              非衬线 | 对比 | 节奏
            </p>
          </div>
        </div>

        <div className="border-b border-white/[0.18] px-6 py-8 lg:border-b-0 lg:px-10">
          <h3 className="text-xl font-black tracking-[-0.05em] text-white">字体</h3>
          <div className="mt-6 divide-y divide-white/[0.18]">
            {DESIGN_FONTS.map((font) => (
              <div key={font.name} className="grid gap-4 py-6 sm:grid-cols-[1fr_170px]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full border border-white/70 px-2 font-mono text-[11px] text-white">
                      {font.badge}
                    </span>
                    <p className="text-2xl font-black tracking-[-0.06em] text-white">
                      {font.name}
                    </p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/52">{font.note}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 self-center text-sm">
                  <span className="font-mono text-white/36">字重</span>
                  <span className="font-mono font-bold text-white">{font.weight}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-black tracking-[-0.05em] text-white">界面原则</h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {DESIGN_PRINCIPLES.map((item) => (
                <span
                  key={item}
                  className="border border-white/[0.22] px-3 py-1.5 text-xs tracking-[0.16em] text-white/68"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-8 lg:px-10">
          <h3 className="text-xl font-black tracking-[-0.05em] text-white">字号与行高</h3>
          <div className="mt-7 space-y-5">
            {TYPE_SCALE.map((item, index) => (
              <div key={item.label} className="grid grid-cols-[84px_1fr] items-baseline gap-4">
                <p className="text-xs text-white/38">{item.label}</p>
                <p
                  className={`font-mono font-black tracking-[-0.06em] text-white ${
                    index >= 5 ? 'text-4xl' : index >= 3 ? 'text-2xl' : 'text-base'
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-white/[0.18] pt-7">
            <h3 className="text-xl font-black tracking-[-0.05em] text-white">色彩令牌</h3>
            <div className="mt-5 space-y-3">
              {COLOR_TOKENS.map((token) => (
                <div
                  key={token.name}
                  className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm"
                >
                  <span
                    className="h-4 w-4 border border-white/[0.32]"
                    style={{
                      background:
                        token.value === '#FFFFFF'
                          ? '#fff'
                          : token.value === '#030303'
                            ? '#030303'
                            : token.value === 'var(--primary)'
                              ? 'hsl(var(--primary))'
                              : 'rgba(255,255,255,0.16)',
                    }}
                  />
                  <span className="font-mono text-white/78">{token.name}</span>
                  <span className="text-xs text-white/42">{token.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AboutSection>
  )
}

function AboutSection({
  id,
  title,
  label,
  children,
}: {
  id?: string
  title: string
  label: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="about-reveal mt-12 sm:mt-16">
      <div className="mb-7 flex items-end justify-between gap-6 border-b border-white/[0.16] pb-3">
        <h2 className="text-2xl font-black tracking-[-0.06em] text-white sm:text-3xl">
          {title}
        </h2>
        <p className="hidden font-mono text-xs uppercase tracking-[0.42em] text-white/54 sm:block">
          {label}
        </p>
      </div>
      {children}
    </section>
  )
}
