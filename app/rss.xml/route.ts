import { findPosts } from '@/lib/db/dao/postDao'
import { getSiteProfile } from '@/lib/site'

export const revalidate = 3600

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toUtcString(value: Date | string | null | undefined) {
  if (!value) return new Date().toUTCString()
  return new Date(value).toUTCString()
}

export async function GET() {
  const [siteProfile, postResult] = await Promise.all([
    getSiteProfile(),
    findPosts({ status: 'published', pageSize: 1000 }),
  ])

  const siteUrl = (siteProfile.siteUrl || 'https://haiy.space').replace(/\/$/, '')
  const latestDate = toUtcString(postResult.data[0]?.published_at)

  const items = postResult.data
    .map((post) => {
      const description =
        post.seo_description?.trim() ||
        post.excerpt?.trim() ||
        '查看这篇文章的完整内容。'

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${siteUrl}/posts/${post.slug}</link>
          <guid>${siteUrl}/posts/${post.slug}</guid>
          <pubDate>${toUtcString(post.published_at ?? post.created_at)}</pubDate>
          <description>${escapeXml(description)}</description>
        </item>
      `.trim()
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteProfile.siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteProfile.bio)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
