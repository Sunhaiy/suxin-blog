import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { ThemeProvider } from 'next-themes'
import '@fontsource-variable/inter'
import '@fontsource-variable/roboto-mono'
// Noto Sans SC：同款字体，按 unicode-range 分片，浏览器按需加载（替代原 4×1.1MB 整包）
import './noto-sans-sc-sliced.css'
import { DEFAULT_SITE_PROFILE, getSiteProfile } from '@/lib/site'
import './globals.css'

function resolveMetadataBase(siteUrl?: string) {
  try {
    return new URL(siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  } catch {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  }
}

function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile().catch(() => DEFAULT_SITE_PROFILE)
  const siteIcon = profile.avatarUrl || undefined
  const googleVerification = readOptionalEnv('GOOGLE_SITE_VERIFICATION')
  const bingVerification = readOptionalEnv('BING_SITE_VERIFICATION')
  const baiduVerification = readOptionalEnv('BAIDU_SITE_VERIFICATION')
  const otherVerification = {
    ...(bingVerification ? { 'msvalidate.01': bingVerification } : {}),
    ...(baiduVerification ? { 'baidu-site-verification': baiduVerification } : {}),
  }

  return {
    metadataBase: resolveMetadataBase(profile.siteUrl),
    title: {
      default: `${profile.siteName} · ${profile.siteNameEn}`,
      template: `%s | ${profile.siteName}`,
    },
    description: profile.bio,
    authors: [{ name: profile.ownerName }],
    applicationName: profile.siteName,
    alternates: {
      types: {
        'application/rss+xml': profile.rssUrl,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      siteName: profile.siteName,
      title: profile.siteName,
      description: profile.bio,
      images: profile.avatarUrl ? [profile.avatarUrl] : [],
    },
    twitter: {
      card: 'summary',
      title: profile.siteName,
      description: profile.bio,
      images: profile.avatarUrl ? [profile.avatarUrl] : [],
    },
    icons: siteIcon
      ? {
          icon: [{ url: siteIcon }],
          shortcut: [{ url: siteIcon }],
          apple: [{ url: siteIcon }],
        }
      : undefined,
    robots: {
      index: true,
      follow: true,
    },
    verification:
      googleVerification || Object.keys(otherVerification).length > 0
        ? {
            ...(googleVerification ? { google: googleVerification } : {}),
            ...(Object.keys(otherVerification).length > 0 ? { other: otherVerification } : {}),
          }
        : undefined,
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clarityProjectId = readOptionalEnv('MICROSOFT_CLARITY_ID')

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-background font-sans antialiased text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
        {clarityProjectId ? (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityProjectId}");`}
          </Script>
        ) : null}
      </body>
    </html>
  )
}
