import type { MetadataRoute } from 'next'
import { findPosts } from '@/lib/db/dao/postDao'
import { findWorkDetails } from '@/lib/db/dao/worksDao'
import { getSiteProfile } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteProfile, posts, works] = await Promise.all([
    getSiteProfile(),
    findPosts({ status: 'published', pageSize: 1000 }),
    findWorkDetails(),
  ])

  const siteUrl = (siteProfile.siteUrl || 'https://haiy.space').replace(/\/$/, '')
  const now = new Date()

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
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/posts' || path === '/works' ? 0.9 : 0.7,
  }))

  const postRoutes: MetadataRoute.Sitemap = posts.data.map((post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    lastModified: post.updated_at ?? post.published_at ?? post.created_at,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const workRoutes: MetadataRoute.Sitemap = works.map((work) => ({
    url: `${siteUrl}/works/${work.slug}`,
    lastModified: work.updated_at,
    changeFrequency: 'monthly',
    priority: 0.75,
  }))

  return [...staticRoutes, ...postRoutes, ...workRoutes]
}
