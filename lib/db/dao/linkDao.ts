import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { query } from '@/lib/db'
import type { CreateLinkInput, LinkRow, UpdateLinkInput } from '@/types/link'

const LINKS_TAG = 'links'
let activeLinksSnapshot: Promise<LinkRow[]> | null = null

async function findLinksUncached(activeOnly = true): Promise<LinkRow[]> {
  const where = activeOnly ? 'WHERE is_active = TRUE' : ''
  const result = await query<LinkRow>(
    `SELECT * FROM links ${where} ORDER BY sort_order ASC, id ASC`
  )
  return result.rows
}

const findLinksCached = unstable_cache(
  async (activeOnly: boolean): Promise<LinkRow[]> => findLinksUncached(activeOnly),
  ['links-list'],
  {
    revalidate: 300,
    tags: [LINKS_TAG],
  }
)

function resetLinksSnapshot() {
  activeLinksSnapshot = null
}

export async function findLinks(activeOnly = true): Promise<LinkRow[]> {
  if (activeOnly) {
    activeLinksSnapshot ??= findLinksCached(true)
    return activeLinksSnapshot
  }

  return findLinksCached(false)
}

export async function findLinkById(id: number): Promise<LinkRow | null> {
  const activeSnapshot = await findLinks(true)
  const fromSnapshot = activeSnapshot.find((item) => item.id === id)
  if (fromSnapshot) return fromSnapshot

  const result = await query<LinkRow>('SELECT * FROM links WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function insertLink(input: CreateLinkInput): Promise<LinkRow> {
  const result = await query<LinkRow>(
    `INSERT INTO links (name, url, description, avatar_url, category, sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      input.name,
      input.url,
      input.description ?? null,
      input.avatarUrl ?? null,
      input.category ?? 'friend',
      input.sortOrder ?? 0,
      input.isActive ?? true,
    ]
  )

  revalidateTag(LINKS_TAG)
  revalidatePath('/links')
  resetLinksSnapshot()
  return result.rows[0]
}

export async function updateLink(id: number, input: UpdateLinkInput): Promise<LinkRow | null> {
  const map: [keyof UpdateLinkInput, string][] = [
    ['name', 'name'],
    ['url', 'url'],
    ['description', 'description'],
    ['avatarUrl', 'avatar_url'],
    ['category', 'category'],
    ['sortOrder', 'sort_order'],
    ['isActive', 'is_active'],
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

  if (setClauses.length === 0) return findLinkById(id)

  values.push(id)
  const result = await query<LinkRow>(
    `UPDATE links SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  revalidateTag(LINKS_TAG)
  revalidatePath('/links')
  resetLinksSnapshot()
  return result.rows[0] ?? null
}

export async function deleteLink(id: number): Promise<boolean> {
  const result = await query('DELETE FROM links WHERE id = $1', [id])
  revalidateTag(LINKS_TAG)
  revalidatePath('/links')
  resetLinksSnapshot()
  return (result.rowCount ?? 0) > 0
}
