import { revalidateTag, unstable_cache } from 'next/cache'
import { query } from '@/lib/db'
import type {
  AnimeRow,
  CreateAnimeInput,
  UpdateAnimeInput,
  GameRow,
  CreateGameInput,
  UpdateGameInput,
} from '@/types/acg'

const ANIMES_TAG = 'animes'
const GAMES_TAG = 'games'

function serializeListParams<T extends Record<string, unknown>>(params: T) {
  return JSON.stringify(params)
}

type AnimeListParams = {
  status?: string
  page?: number
  pageSize?: number
  includeTotal?: boolean
}

async function findAnimesUncached(params: {
  status?: string
  page?: number
  pageSize?: number
  includeTotal?: boolean
} = {}): Promise<{ data: AnimeRow[]; total: number }> {
  const { page = 1, pageSize = 50, status, includeTotal = true } = params
  const values: unknown[] = []
  let idx = 1
  const where = status ? `WHERE status = $${idx++}` : ''
  if (status) values.push(status)
  const offset = (page - 1) * pageSize

  const dataSql = `SELECT * FROM animes ${where} ORDER BY updated_at DESC, id DESC LIMIT $${idx++} OFFSET $${idx++}`
  const dataParams = [...values, pageSize, offset]

  if (!includeTotal) {
    const dataResult = await query<AnimeRow>(dataSql, dataParams)
    return { data: dataResult.rows, total: dataResult.rows.length }
  }

  const [dataResult, countResult] = await Promise.all([
    query<AnimeRow>(dataSql, dataParams),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM animes ${where}`, values),
  ])

  return { data: dataResult.rows, total: Number(countResult.rows[0].count) }
}

const findAnimesCached = unstable_cache(
  async (serializedParams: string): Promise<{ data: AnimeRow[]; total: number }> => {
    return findAnimesUncached(
      JSON.parse(serializedParams) as AnimeListParams
    )
  },
  ['animes-list'],
  {
    revalidate: 300,
    tags: [ANIMES_TAG],
  }
)

export async function findAnimes(params: {
  status?: string
  page?: number
  pageSize?: number
  includeTotal?: boolean
} = {}): Promise<{ data: AnimeRow[]; total: number }> {
  return findAnimesCached(serializeListParams(params))
}

const findAnimeStatusCountsCached = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const result = await query<{ status: string; count: string }>(
      'SELECT status, COUNT(*) AS count FROM animes GROUP BY status'
    )
    return Object.fromEntries(result.rows.map((row) => [row.status, Number(row.count)]))
  },
  ['anime-status-counts'],
  {
    revalidate: 300,
    tags: [ANIMES_TAG],
  }
)

export async function findAnimeStatusCounts(): Promise<Record<string, number>> {
  return findAnimeStatusCountsCached()
}

export async function findAnimeById(id: number): Promise<AnimeRow | null> {
  const result = await query<AnimeRow>('SELECT * FROM animes WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function insertAnime(input: CreateAnimeInput): Promise<AnimeRow> {
  const result = await query<AnimeRow>(
    `INSERT INTO animes
       (title, title_cn, cover_url, type, episodes_total, episodes_watched,
        status, rating, short_review, start_season, mal_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      input.title,
      input.titleCn ?? null,
      input.coverUrl ?? null,
      input.type ?? 'tv',
      input.episodesTotal ?? null,
      input.episodesWatched ?? 0,
      input.status ?? 'plan_to_watch',
      input.rating ?? null,
      input.shortReview ?? null,
      input.startSeason ?? null,
      input.malId ?? null,
    ]
  )

  revalidateTag(ANIMES_TAG)
  return result.rows[0]
}

export async function updateAnime(id: number, input: UpdateAnimeInput): Promise<AnimeRow | null> {
  const map: [keyof UpdateAnimeInput, string][] = [
    ['title', 'title'],
    ['titleCn', 'title_cn'],
    ['coverUrl', 'cover_url'],
    ['type', 'type'],
    ['episodesTotal', 'episodes_total'],
    ['episodesWatched', 'episodes_watched'],
    ['status', 'status'],
    ['rating', 'rating'],
    ['shortReview', 'short_review'],
    ['startSeason', 'start_season'],
    ['malId', 'mal_id'],
  ]
  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [key, col] of map) {
    if (input[key] !== undefined) {
      setClauses.push(`${col} = $${idx++}`)
      values.push(input[key])
    }
  }

  if (setClauses.length === 0) return findAnimeById(id)

  values.push(id)
  const result = await query<AnimeRow>(
    `UPDATE animes SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  revalidateTag(ANIMES_TAG)
  return result.rows[0] ?? null
}

export async function deleteAnime(id: number): Promise<boolean> {
  const result = await query('DELETE FROM animes WHERE id = $1', [id])
  revalidateTag(ANIMES_TAG)
  return (result.rowCount ?? 0) > 0
}

async function findGamesUncached(params: {
  status?: string
  platform?: string
  page?: number
  pageSize?: number
  includeTotal?: boolean
} = {}): Promise<{ data: GameRow[]; total: number }> {
  const { page = 1, pageSize = 50, status, platform, includeTotal = true } = params
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (status) {
    conditions.push(`status = $${idx++}`)
    values.push(status)
  }
  if (platform) {
    conditions.push(`platform = $${idx++}`)
    values.push(platform)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize

  const dataSql = `SELECT * FROM games ${where} ORDER BY updated_at DESC, id DESC LIMIT $${idx++} OFFSET $${idx++}`
  const dataParams = [...values, pageSize, offset]

  if (!includeTotal) {
    const dataResult = await query<GameRow>(dataSql, dataParams)
    return { data: dataResult.rows, total: dataResult.rows.length }
  }

  const [dataResult, countResult] = await Promise.all([
    query<GameRow>(dataSql, dataParams),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM games ${where}`, values),
  ])

  return { data: dataResult.rows, total: Number(countResult.rows[0].count) }
}

const findGamesCached = unstable_cache(
  async (serializedParams: string): Promise<{ data: GameRow[]; total: number }> => {
    return findGamesUncached(
      JSON.parse(serializedParams) as {
        status?: string
        platform?: string
        page?: number
        pageSize?: number
      }
    )
  },
  ['games-list'],
  {
    revalidate: 300,
    tags: [GAMES_TAG],
  }
)

export async function findGames(params: {
  status?: string
  platform?: string
  page?: number
  pageSize?: number
  includeTotal?: boolean
} = {}): Promise<{ data: GameRow[]; total: number }> {
  return findGamesCached(serializeListParams(params))
}

const findGameStatusCountsCached = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const result = await query<{ status: string; count: string }>(
      'SELECT status, COUNT(*) AS count FROM games GROUP BY status'
    )
    return Object.fromEntries(result.rows.map((row) => [row.status, Number(row.count)]))
  },
  ['game-status-counts'],
  {
    revalidate: 300,
    tags: [GAMES_TAG],
  }
)

export async function findGameStatusCounts(): Promise<Record<string, number>> {
  return findGameStatusCountsCached()
}

export async function findGameById(id: number): Promise<GameRow | null> {
  const result = await query<GameRow>('SELECT * FROM games WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function insertGame(input: CreateGameInput): Promise<GameRow> {
  const result = await query<GameRow>(
    `INSERT INTO games
       (title, cover_url, cartridge_image_url, platform, status,
        play_hours, rating, short_review, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      input.title,
      input.coverUrl ?? null,
      input.cartridgeImageUrl ?? null,
      input.platform ?? 'pc',
      input.status ?? 'plan_to_play',
      input.playHours ?? null,
      input.rating ?? null,
      input.shortReview ?? null,
      input.completedAt ?? null,
    ]
  )

  revalidateTag(GAMES_TAG)
  return result.rows[0]
}

export async function updateGame(id: number, input: UpdateGameInput): Promise<GameRow | null> {
  const map: [keyof UpdateGameInput, string][] = [
    ['title', 'title'],
    ['coverUrl', 'cover_url'],
    ['cartridgeImageUrl', 'cartridge_image_url'],
    ['platform', 'platform'],
    ['status', 'status'],
    ['playHours', 'play_hours'],
    ['rating', 'rating'],
    ['shortReview', 'short_review'],
    ['completedAt', 'completed_at'],
  ]
  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  for (const [key, col] of map) {
    if (input[key] !== undefined) {
      setClauses.push(`${col} = $${idx++}`)
      values.push(input[key])
    }
  }

  if (setClauses.length === 0) return findGameById(id)

  values.push(id)
  const result = await query<GameRow>(
    `UPDATE games SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  revalidateTag(GAMES_TAG)
  return result.rows[0] ?? null
}

export async function deleteGame(id: number): Promise<boolean> {
  const result = await query('DELETE FROM games WHERE id = $1', [id])
  revalidateTag(GAMES_TAG)
  return (result.rowCount ?? 0) > 0
}
