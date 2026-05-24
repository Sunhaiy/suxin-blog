export type WeatherPreset = 'none' | 'storm'
export type SceneEnabledPage = 'all' | 'home' | 'moments' | 'works'

export interface BackgroundSceneSettings {
  image: {
    url: string | null
    position: string
    size: string
    opacity: number
  }
  weather: {
    preset: WeatherPreset
    intensity: number
  }
  filter: {
    overlay: number
    gradient: number
    tintColor: string
    blur: number
    noise: number
    vignette: number
  }
}

export interface WorkContributor {
  name: string
  role: string | null
  avatar_url: string | null
}

export interface WorkMilestone {
  date: string
  title: string
  desc: string
  link: string | null
}

export interface WorkListItem {
  id: number
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  cover_url: string
  hero_image_url: string
  tags: string[]
  url: string | null
  github_url: string | null
  primary_url: string | null
  primary_label: string | null
  secondary_url: string | null
  secondary_label: string | null
  year: number | null
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface WorkDetail extends WorkListItem {
  content: string | null
  seal: string | null
  status_text: string | null
  progress_text: string | null
  version_text: string | null
  price: string | null
  original_price: string | null
  contributors: WorkContributor[]
  milestones: WorkMilestone[]
  gallery: string[]
}

export interface WorkInput {
  slug?: string
  title: string
  subtitle?: string | null
  summary?: string | null
  description?: string | null
  content?: string | null
  cover_url?: string
  hero_image_url?: string
  seal?: string | null
  status_text?: string | null
  progress_text?: string | null
  version_text?: string | null
  price?: string | null
  original_price?: string | null
  tags?: string[]
  url?: string | null
  github_url?: string | null
  primary_url?: string | null
  primary_label?: string | null
  secondary_url?: string | null
  secondary_label?: string | null
  year?: number | null
  sort_order?: number
  is_published?: boolean
  contributors?: WorkContributor[]
  milestones?: WorkMilestone[]
  gallery?: string[]
}
