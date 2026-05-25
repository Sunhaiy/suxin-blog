import type { Metadata } from 'next'
import Link from 'next/link'
import { FeaturedCarousel } from '@/components/ui/FeaturedCarousel'
import { PostsFilter } from '@/components/ui/PostsFilter'
import { MaterialSymbol } from '@/components/ui/MaterialSymbol'
import { findAllTags, findCategories, findPosts } from '@/lib/db/dao/postDao'
import { pickDeterministicMediaUrl, resolveMediaUrl } from '@/lib/media'
import { getSiteProfile } from '@/lib/site'

export const metadata: Metadata = {
  title: '文章',
  description: '按分类、标签和关键词浏览全部公开文章。',
  alternates: {
    canonical: '/posts',
  },
}

export const revalidate = 60

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tags?: string; keyword?: string; category?: string }>
}) {
  const { page, tags: tagsParam, keyword, category } = await searchParams

  const currentCategory = category ?? ''
  const currentTags = tagsParam ? tagsParam.split(',').filter(Boolean) : []
  const isFiltered = Boolean(currentCategory || currentTags.length || keyword)
  const currentPage = Math.max(1, Number(page ?? 1) || 1)

  const filteredPromise = findPosts({
    status: 'published',
    page: currentPage,
    pageSize: 9,
    tags: currentTags.length > 0 ? currentTags : undefined,
    category: currentCategory || undefined,
    keyword: keyword ?? undefined,
  })

  const featuredPromise = isFiltered
    ? findPosts({ status: 'published', pageSize: 9 })
    : filteredPromise

  const [featuredResult, allTagsResult, categoriesResult, filteredResult, siteProfile] =
    await Promise.all([
      featuredPromise,
      findAllTags(),
      findCategories(),
      filteredPromise,
      getSiteProfile(),
    ])

  const carouselPosts = [
    ...featuredResult.data.filter((post) => post.is_featured && post.cover_url),
    ...featuredResult.data.filter((post) => post.is_featured && !post.cover_url),
    ...featuredResult.data.filter((post) => !post.is_featured && post.cover_url),
    ...featuredResult.data.filter((post) => !post.is_featured && !post.cover_url),
  ].slice(0, 9)

  function paginationHref(nextPage: number) {
    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    if (currentCategory) params.set('category', currentCategory)
    if (currentTags.length) params.set('tags', currentTags.join(','))
    if (keyword) params.set('keyword', keyword)
    return `/posts?${params.toString()}`
  }

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
      {!isFiltered ? (
        <section className="mb-10 rounded-[28px] border border-border/75 bg-card/72 p-5 backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">推荐阅读</p>
              <p className="mt-1 text-sm text-muted-foreground">
                优先展示推荐文章与带封面的内容。
              </p>
            </div>
            <span className="rounded-full border border-border/70 bg-background/45 px-3 py-1 text-[11px] font-mono text-muted-foreground">
              Featured
            </span>
          </div>
          <FeaturedCarousel
            posts={carouselPosts}
            fallbackCoverUrl={siteProfile.defaultPostCoverUrl}
            fallbackCoverPool={siteProfile.postCoverPoolUrls}
          />
        </section>
      ) : null}

      {isFiltered ? (
        <section className="mb-8 rounded-[28px] border border-primary/18 bg-primary/8 px-5 py-5 backdrop-blur-xl sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <MaterialSymbol icon="filter_alt" size={16} className="text-primary" />
            <span>当前正在查看筛选结果</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {currentCategory || (currentTags.length ? `#${currentTags[0]}` : '全部文章')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">共 {filteredResult.total} 篇匹配内容。</p>
        </section>
      ) : null}

      <PostsFilter
        categories={categoriesResult}
        tags={allTagsResult}
        currentCategory={currentCategory}
        currentTags={currentTags}
        totalPublished={featuredResult.total}
      />

      {filteredResult.data.length === 0 ? (
        <div className="rounded-[28px] border border-border/75 bg-card/72 px-6 py-20 text-center backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">当前条件下还没有文章。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResult.data.map((post) => {
            const coverUrl = resolveMediaUrl(
              post.cover_url,
              pickDeterministicMediaUrl(
                siteProfile.postCoverPoolUrls,
                post.slug || post.id,
                siteProfile.defaultPostCoverUrl
              )
            )

            return (
              <Link key={post.id} href={`/posts/${post.slug}`} className="group block h-full">
                <article className="flex h-full flex-col overflow-hidden rounded-[24px] border border-border/75 bg-card/78 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-border">
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted/70">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="relative flex h-full items-center justify-center bg-gradient-to-br from-primary/12 via-card to-muted">
                        <span className="select-none bg-gradient-to-br from-primary/40 to-primary/10 bg-clip-text text-6xl font-semibold text-transparent">
                          {post.category?.charAt(0) ?? '文'}
                        </span>
                        <div
                          className="absolute inset-0 opacity-[0.03]"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(0deg,currentColor 0,currentColor 1px,transparent 1px,transparent 24px),repeating-linear-gradient(90deg,currentColor 0,currentColor 1px,transparent 1px,transparent 24px)',
                          }}
                        />
                      </div>
                    )}

                    {post.category ? (
                      <span className="cover-category-badge absolute left-3 top-3 z-10 px-3 py-1 text-[11px]">
                        {post.category}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">
                        {post.excerpt}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-4 text-[11px] font-mono text-muted-foreground">
                      <time>
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString('zh-CN')
                          : '草稿'}
                      </time>
                      <span className="inline-flex items-center gap-1 transition-transform duration-200 group-hover:translate-x-0.5">
                        阅读
                        <MaterialSymbol icon="arrow_forward" size={14} />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}

      {filteredResult.totalPages > 1 ? (
        <div className="mt-12 flex justify-center gap-2">
          {Array.from({ length: filteredResult.totalPages }, (_, index) => index + 1).map(
            (nextPage) => (
              <Link
                key={nextPage}
                href={paginationHref(nextPage)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-colors ${
                  nextPage === filteredResult.page
                    ? 'border-primary/24 bg-primary text-primary-foreground'
                    : 'border-border/70 bg-card/72 text-muted-foreground hover:border-primary/24 hover:text-primary'
                }`}
              >
                {nextPage}
              </Link>
            )
          )}
        </div>
      ) : null}
      </div>
    </div>
  )
}
