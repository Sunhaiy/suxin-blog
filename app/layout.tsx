import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import '@fontsource-variable/inter'
import '@fontsource-variable/roboto-mono'
import '@fontsource/noto-sans-sc/chinese-simplified-400.css'
import '@fontsource/noto-sans-sc/chinese-simplified-500.css'
import '@fontsource/noto-sans-sc/chinese-simplified-600.css'
import '@fontsource/noto-sans-sc/chinese-simplified-700.css'
import { DEFAULT_SITE_PROFILE, getSiteProfile } from '@/lib/site'
import './globals.css'

function resolveMetadataBase(siteUrl?: string) {
  try {
    return new URL(siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  } catch {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile().catch(() => DEFAULT_SITE_PROFILE)
  const siteIcon = profile.avatarUrl || undefined

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
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </body>
    </html>
  )
}
