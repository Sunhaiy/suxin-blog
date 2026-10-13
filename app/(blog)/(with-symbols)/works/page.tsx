import { publicPageMetadata } from '@/lib/seo/metadata'
import { WorksCarousel } from '@/components/ui/WorksCarousel'
import { findWorks } from '@/lib/db/dao/worksDao'
import { getWorksGitHubActivity } from '@/lib/github'
import { getSiteProfile } from '@/lib/site'

export const metadata = publicPageMetadata('/works')

export const revalidate = 60

export default async function WorksPage() {
  const [works, siteProfile] = await Promise.all([findWorks(), getSiteProfile()])
  const githubActivity = await getWorksGitHubActivity(works)

  return (
    <main className="min-h-[calc(100vh-64px)] overflow-hidden bg-background">
      <h1 className="sr-only">独立开发项目作品集</h1>
      {works.length === 0 ? (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6 text-center text-muted-foreground">
          暂无项目，敬请期待。
        </div>
      ) : (
        <WorksCarousel
          works={works}
          siteUrl={siteProfile.siteUrl}
          githubActivity={githubActivity}
        />
      )}
    </main>
  )
}
