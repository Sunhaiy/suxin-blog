'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import type { SiteProfile } from '@/types/site'

type LinkSiteProfileCardProps = {
  siteProfile: SiteProfile
  stats: Array<{ label: string; value: string }>
}

type InfoItem = {
  key: string
  icon: string
  label: string
  value: string
  copyValue?: string
  href?: string
  fullWidth?: boolean
}

function toAbsoluteAssetUrl(url?: string | null, baseUrl?: string) {
  const value = (url ?? '').trim()
  if (!value) return ''

  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }

  const base = (baseUrl || 'https://haiy.space').replace(/\/+$/, '')
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value.replace(/^\/+/, '')}`
}

function normalizeCardAvatarUrl(url?: string | null, siteUrl?: string) {
  const value = (url ?? '').trim()
  if (!value) return ''

  if (value.startsWith('/uploads/')) return value

  const brokenSameHost = value.match(/^https?:\/\/\/+([^/]+)(\/uploads\/.*)$/i)
  if (brokenSameHost) {
    const host = brokenSameHost[1]?.toLowerCase()
    const siteHost = (() => {
      try {
        return new URL((siteUrl || 'https://haiy.space').trim()).host.toLowerCase()
      } catch {
        return 'haiy.space'
      }
    })()

    if (host === siteHost) {
      return brokenSameHost[2]
    }
  }

  try {
    const target = new URL(value)
    const base = new URL((siteUrl || 'https://haiy.space').trim())
    if (target.host === base.host && target.pathname.startsWith('/uploads/')) {
      return `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    return value
  }

  return value
}

export function LinkSiteProfileCard({ siteProfile, stats }: LinkSiteProfileCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const timerRef = useRef<number | null>(null)
  const siteUrl = siteProfile.siteUrl || 'https://haiy.space'
  const siteUrlBase = siteUrl.replace(/\/+$/, '')

  const avatarDisplayUrl = useMemo(
    () => normalizeCardAvatarUrl(siteProfile.avatarUrl, siteUrlBase),
    [siteProfile.avatarUrl, siteUrlBase]
  )
  const avatarAbsoluteUrl = useMemo(
    () => toAbsoluteAssetUrl(avatarDisplayUrl, siteUrlBase),
    [avatarDisplayUrl, siteUrlBase]
  )
  const avatarRenderUrl = avatarDisplayUrl || avatarAbsoluteUrl

  const infoItems: InfoItem[] = [
    {
      key: 'site-url',
      icon: 'home',
      label: '站点地址',
      value: siteUrl,
      copyValue: siteUrl,
      href: siteUrl,
    },
    {
      key: 'rss',
      icon: 'rss_feed',
      label: 'RSS 订阅',
      value: '/rss.xml',
      copyValue: `${siteUrlBase}/rss.xml`,
      href: `${siteUrlBase}/rss.xml`,
    },
    {
      key: 'email',
      icon: 'mail',
      label: '联系邮箱',
      value: siteProfile.email,
      copyValue: siteProfile.email,
      href: `mailto:${siteProfile.email}`,
    },
    {
      key: 'avatar-url',
      icon: 'image',
      label: '头像地址',
      value: avatarAbsoluteUrl || '未设置',
      copyValue: avatarAbsoluteUrl || undefined,
      href: avatarAbsoluteUrl || undefined,
    },
    {
      key: 'profile',
      icon: 'person',
      label: '站点说明',
      value: `${siteProfile.ownerName} / ${siteProfile.roleLine}`,
      copyValue: `${siteProfile.ownerName} / ${siteProfile.roleLine}`,
      fullWidth: true,
    },
  ]

  useEffect(() => {
    setAvatarFailed(false)
  }, [avatarRenderUrl])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  async function handleCopy(item: InfoItem) {
    if (!item.copyValue) return

    try {
      await navigator.clipboard.writeText(item.copyValue)
      setCopiedKey(item.key)

      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(() => {
        setCopiedKey((current) => (current === item.key ? null : current))
      }, 1600)
    } catch {
      setCopiedKey(null)
    }
  }

  return (
    <section className="relative self-start overflow-hidden rounded-[30px] border border-border/70 bg-card/88 px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-2xl sm:px-6 sm:py-7">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_58%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_58%)]" />

      <div className="relative">
        <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
          简介
        </p>

        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-border/70 bg-background/70">
            {avatarRenderUrl && !avatarFailed ? (
              <img
                src={avatarRenderUrl}
                alt={siteProfile.ownerName}
                className="h-full w-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span className="text-lg font-semibold text-primary">{siteProfile.ownerInitial}</span>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
              {siteProfile.siteName}
            </h2>
            <p className="mt-2 text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground">
              {siteProfile.siteNameEn}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {stats.map((stat) => (
            <span
              key={stat.label}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] font-mono text-muted-foreground backdrop-blur-md"
            >
              <span>{stat.label}</span>
              <span className="text-foreground">{stat.value}</span>
            </span>
          ))}
        </div>

        <div className="mt-6 rounded-[22px] border border-border/70 bg-background/55 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {infoItems.map((item) => {
              const copied = copiedKey === item.key

              return (
                <div
                  key={item.key}
                  className={`rounded-[16px] border border-border/70 bg-card/68 px-3 py-3 ${
                    item.fullWidth ? 'sm:col-span-2' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                      <MaterialSymbol
                        icon={item.icon}
                        size={14}
                        className="shrink-0 text-muted-foreground"
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith('mailto:') ? undefined : '_blank'}
                          rel="noreferrer"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition-colors hover:border-primary/24 hover:text-primary"
                          aria-label={`打开${item.label}`}
                          title={`打开${item.label}`}
                        >
                          <MaterialSymbol icon="open_in_new" size={12} />
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        disabled={!item.copyValue}
                        className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[10px] transition-colors ${
                          copied
                            ? 'border-primary/28 bg-primary/10 text-primary'
                            : 'border-border/70 bg-background/70 text-muted-foreground hover:border-primary/24 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40'
                        }`}
                        title={copied ? '已复制到剪贴板' : `复制${item.label}`}
                      >
                        <MaterialSymbol icon={copied ? 'check' : 'content_copy'} size={12} />
                        {copied ? '已复制' : '复制'}
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 truncate text-sm text-foreground/82" title={item.value}>
                    {item.value}
                  </p>

                  {copied ? <p className="mt-1 text-[11px] text-primary">已复制到剪贴板</p> : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
