import type { MetadataRoute } from 'next'
import { getSiteProfile } from '@/lib/site'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteProfile = await getSiteProfile()
  const siteUrl = (siteProfile.siteUrl || 'https://haiy.space').replace(/\/$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
