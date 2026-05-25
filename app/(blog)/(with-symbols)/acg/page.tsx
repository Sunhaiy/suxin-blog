import type { Metadata } from 'next'
import { AnimeGrid } from '@/components/ui/AnimeGrid'
import { GameGrid } from '@/components/ui/GameGrid'
import { findAnimes, findGames } from '@/lib/db/dao/acgDao'

export const metadata: Metadata = { title: '数字陈列室' }
export const revalidate = 3600

export default async function AcgPage() {
  const [{ data: animes }, { data: games }] = await Promise.all([
    findAnimes({ pageSize: 100, includeTotal: false }),
    findGames({ pageSize: 100, includeTotal: false }),
  ])

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <section id="anime" className="mb-20">
        <h2 className="mb-2 text-2xl font-bold">动漫追迹</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          {animes.filter((anime) => anime.status === 'completed').length} 部完结 ·{' '}
          {animes.filter((anime) => anime.status === 'watching').length} 部连载中
        </p>

        <AnimeGrid animes={animes} />
      </section>

      <section id="games">
        <h2 className="mb-2 text-2xl font-bold">游戏收藏</h2>
        <p className="mb-8 text-sm text-muted-foreground">
          {games.filter((game) => game.status === 'completed' || game.status === 'platinum').length} 部通关 ·{' '}
          {games.filter((game) => game.status === 'playing').length} 部游玩中
        </p>

        <GameGrid games={games} />
      </section>
    </div>
  )
}
