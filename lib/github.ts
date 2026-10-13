import type { GitHubCommitSummary, WorkGitHubActivity, WorkGitHubActivityMap } from '@/types/github'
import type { WorkListItem } from '@/types/work'

const GITHUB_API_VERSION = '2022-11-28'
const GITHUB_CACHE_SECONDS = 15 * 60

interface GitHubRepository {
  owner: string
  repo: string
}

interface GitHubCommitResponse {
  sha: string
  html_url: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    } | null
  }
  author: {
    login: string
  } | null
}

interface GitHubRepositoryResponse {
  description: string | null
  language: string | null
  default_branch: string
  stargazers_count: number
  forks_count: number
  updated_at: string
}

export async function getWorksGitHubActivity(
  works: WorkListItem[]
): Promise<WorkGitHubActivityMap> {
  const repositories = new Map<string, GitHubRepository>()

  for (const work of works) {
    const repository = resolveWorkRepository(work)
    if (repository) repositories.set(repositoryKey(repository), repository)
  }

  const activityEntries = await Promise.all(
    Array.from(repositories.entries()).map(async ([key, repository]) => {
      const activity = await fetchRepositoryCommits(repository)
      return [key, activity] as const
    })
  )
  const activityByRepository = new Map(activityEntries)

  return Object.fromEntries(
    works.map((work) => {
      const repository = resolveWorkRepository(work)
      return [work.id, repository ? activityByRepository.get(repositoryKey(repository)) ?? null : null]
    })
  ) as WorkGitHubActivityMap
}

function resolveWorkRepository(work: WorkListItem) {
  const candidates = [work.github_url, work.secondary_url, work.primary_url, work.url]

  for (const candidate of candidates) {
    const repository = parseGitHubRepository(candidate)
    if (repository) return repository
  }

  return null
}

function parseGitHubRepository(value?: string | null): GitHubRepository | null {
  if (!value?.trim()) return null

  try {
    const url = new URL(value)
    if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) return null

    const [owner, rawRepo] = url.pathname.split('/').filter(Boolean)
    const repo = rawRepo?.replace(/\.git$/i, '')
    if (!owner || !repo) return null

    return { owner, repo }
  } catch {
    return null
  }
}

async function fetchRepositoryCommits(
  repository: GitHubRepository
): Promise<WorkGitHubActivity> {
  const repositoryName = `${repository.owner}/${repository.repo}`
  const repositoryUrl = `https://github.com/${repositoryName}`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'suxin-blog',
  }
  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) headers.Authorization = `Bearer ${token}`

  const emptyActivity = buildEmptyActivity(repositoryName, repositoryUrl)

  try {
    const requestOptions = {
      headers,
      next: { revalidate: GITHUB_CACHE_SECONDS },
    }
    const [commitsResponse, repositoryResponse] = await Promise.all([
      fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}/commits?per_page=20`, {
        ...requestOptions,
        signal: AbortSignal.timeout(6500),
      }).catch(() => null),
      fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}`, {
        ...requestOptions,
        signal: AbortSignal.timeout(6500),
      }).catch(() => null),
    ])

    const commits = commitsResponse?.ok
      ? ((await commitsResponse.json()) as GitHubCommitResponse[])
      : []
    const repositoryDetails = repositoryResponse?.ok
      ? ((await repositoryResponse.json()) as GitHubRepositoryResponse)
      : null
    return {
      repository: repositoryName,
      repositoryUrl,
      commits: commits.map(mapCommit),
      description: repositoryDetails?.description || null,
      language: repositoryDetails?.language || null,
      defaultBranch: repositoryDetails?.default_branch || null,
      stars: repositoryDetails?.stargazers_count || 0,
      forks: repositoryDetails?.forks_count || 0,
      updatedAt: repositoryDetails?.updated_at || null,
    }
  } catch {
    return emptyActivity
  }
}

function mapCommit(commit: GitHubCommitResponse): GitHubCommitSummary {
  return {
    sha: commit.sha,
    message: commit.commit.message.split('\n')[0]?.trim() || 'Untitled commit',
    url: commit.html_url,
    author: commit.author?.login || commit.commit.author?.name || 'GitHub user',
    authoredAt: commit.commit.author?.date || '',
  }
}

function buildEmptyActivity(repository: string, repositoryUrl: string): WorkGitHubActivity {
  return {
    repository,
    repositoryUrl,
    commits: [],
    description: null,
    language: null,
    defaultBranch: null,
    stars: 0,
    forks: 0,
    updatedAt: null,
  }
}

function repositoryKey(repository: GitHubRepository) {
  return `${repository.owner}/${repository.repo}`.toLowerCase()
}
