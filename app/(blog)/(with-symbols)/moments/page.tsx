import type { Metadata } from 'next'
import { findMoments } from '@/lib/db/dao/momentDao'
import { getSiteProfile } from '@/lib/site'
import type { MomentRow } from '@/types/moment'
import { MomentFeedCard } from './MomentFeedCard'

export const metadata: Metadata = {
  title: '瞬间',
  description: '把照片、碎念、天气和路过的小事收在这里。',
}

export const revalidate = 30

function serializeMoment(moment: MomentRow) {
  return {
    ...moment,
    created_at:
      moment.created_at instanceof Date
        ? moment.created_at.toISOString()
        : new Date(moment.created_at).toISOString(),
  }
}

export default async function MomentsPage() {
  const [{ data: moments }, siteProfile] = await Promise.all([
    findMoments({ publicOnly: true, pageSize: 50 }),
    getSiteProfile(),
  ])

  return (
    <div className="relative z-10 mx-auto max-w-[700px] px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      {moments.length === 0 ? (
        <div className="rounded-[28px] border border-border/75 bg-card/92 px-8 py-24 text-center backdrop-blur-2xl">
          <p className="text-lg font-semibold text-foreground">暂时还没有新的瞬间。</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            等下一阵风或者下一场雨过来，这里会先亮起第一张卡片。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {moments.map((moment) => (
            <MomentFeedCard
              key={moment.id}
              moment={serializeMoment(moment)}
              siteProfile={siteProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}
