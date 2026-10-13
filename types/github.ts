export interface GitHubCommitSummary {
  sha: string
  message: string
  url: string
  author: string
  authoredAt: string
}

export interface WorkGitHubActivity {
  repository: string
  repositoryUrl: string
  commits: GitHubCommitSummary[]
  description: string | null
  language: string | null
  defaultBranch: string | null
  stars: number
  forks: number
  updatedAt: string | null
}

export type WorkGitHubActivityMap = Record<number, WorkGitHubActivity | null>
