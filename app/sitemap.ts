import type { MetadataRoute } from 'next'
import { findPosts } from '@/lib/db/dao/postDao'
import { getSiteProfile } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteProfile, firstPage] = await Promise.all([
    getSiteProfile(),
    findPosts({ status: 'published', pageSize: 1000 }),
  ])

  const siteUrl = (siteProfile.siteUrl || 'https://haiy.space').replace(/\/$/, '')
  const posts = [...firstPage.data]
  for (let page = 2; page <= firstPage.totalPages; page++) {
    const result = await findPosts({ status: 'published', pageSize: 1000, page })
    posts.push(...result.data)
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/anime',
    '/games',
    '/gallery',
    '/links',
    '/moments',
    '/posts',
    '/posts/archive',
    '/posts/categories',
    '/posts/tags',
    '/works',
    '/acg',
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/posts' || path === '/works' ? 0.9 : 0.7,
  }))

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    // The database also updates updated_at on view-count changes, so it cannot
    // serve as an honest content modification timestamp for crawlers.
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // Work detail routes redirect to /works and are not canonical documents.
  return [...staticRoutes, ...postRoutes]
}
