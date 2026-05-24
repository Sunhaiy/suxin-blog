import { revalidatePath, revalidateTag } from 'next/cache'
import { SETTINGS_KEYS } from '@/lib/constants/settings'
import { getSettings, setSetting } from '@/lib/db/dao/settingsDao'
import { normalizeHexColor } from '@/lib/scene-color'
import type {
  BackgroundSceneSettings,
  WeatherPreset,
} from '@/types/work'

export const DEFAULT_BACKGROUND_SCENE: BackgroundSceneSettings = {
  image: {
    url: null,
    position: 'center center',
    size: 'cover',
    opacity: 0.56,
  },
  weather: {
    preset: 'storm',
    intensity: 0.62,
  },
  filter: {
    overlay: 0.34,
    gradient: 0.12,
    tintColor: '#e2e8f0',
    blur: 8,
    noise: 0.08,
    vignette: 0.22,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isWeatherPreset(value: unknown): value is WeatherPreset {
  return value === 'none' || value === 'storm'
}

export function normalizeBackgroundSceneSettings(
  raw: unknown,
  legacyHeroUrl?: string | null
): BackgroundSceneSettings {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const image = source.image && typeof source.image === 'object'
    ? source.image as Record<string, unknown>
    : {}
  const weather = source.weather && typeof source.weather === 'object'
    ? source.weather as Record<string, unknown>
    : {}
  const filter = source.filter && typeof source.filter === 'object'
    ? source.filter as Record<string, unknown>
    : {}

  const url = typeof image.url === 'string'
    ? image.url
    : typeof legacyHeroUrl === 'string'
      ? legacyHeroUrl
      : DEFAULT_BACKGROUND_SCENE.image.url

  return {
    image: {
      url,
      position: typeof image.position === 'string' ? image.position : DEFAULT_BACKGROUND_SCENE.image.position,
      size: typeof image.size === 'string' ? image.size : DEFAULT_BACKGROUND_SCENE.image.size,
      opacity: clamp(
        typeof image.opacity === 'number' ? image.opacity : DEFAULT_BACKGROUND_SCENE.image.opacity,
        0,
        1
      ),
    },
    weather: {
      preset: isWeatherPreset(weather.preset) ? weather.preset : DEFAULT_BACKGROUND_SCENE.weather.preset,
      intensity: clamp(
        typeof weather.intensity === 'number' ? weather.intensity : DEFAULT_BACKGROUND_SCENE.weather.intensity,
        0,
        1
      ),
    },
    filter: {
      overlay: clamp(
        typeof filter.overlay === 'number' ? filter.overlay : DEFAULT_BACKGROUND_SCENE.filter.overlay,
        0,
        1
      ),
      gradient: clamp(
        typeof filter.gradient === 'number' ? filter.gradient : DEFAULT_BACKGROUND_SCENE.filter.gradient,
        0,
        1
      ),
      tintColor: normalizeHexColor(
        filter.tintColor,
        DEFAULT_BACKGROUND_SCENE.filter.tintColor
      ),
      blur: clamp(
        typeof filter.blur === 'number' ? filter.blur : DEFAULT_BACKGROUND_SCENE.filter.blur,
        0,
        24
      ),
      noise: clamp(
        typeof filter.noise === 'number' ? filter.noise : DEFAULT_BACKGROUND_SCENE.filter.noise,
        0,
        1
      ),
      vignette: clamp(
        typeof filter.vignette === 'number' ? filter.vignette : DEFAULT_BACKGROUND_SCENE.filter.vignette,
        0,
        1
      ),
    },
  }
}

async function readBackgroundSceneSettings(): Promise<BackgroundSceneSettings> {
  const settings = await getSettings<unknown>([
    SETTINGS_KEYS.BACKGROUND_SCENE,
    SETTINGS_KEYS.HERO_BG,
  ])

  const scene = settings[SETTINGS_KEYS.BACKGROUND_SCENE]
  const legacyHero = settings[SETTINGS_KEYS.HERO_BG] as { url?: string | null } | null

  return normalizeBackgroundSceneSettings(
    scene,
    typeof legacyHero?.url === 'string' ? legacyHero.url : null
  )
}

export async function getBackgroundSceneSettings(): Promise<BackgroundSceneSettings> {
  return readBackgroundSceneSettings()
}

export async function persistBackgroundSceneSettings(scene: BackgroundSceneSettings) {
  await Promise.all([
    setSetting(
      SETTINGS_KEYS.BACKGROUND_SCENE,
      scene,
      'Global background scene configuration'
    ),
    setSetting(
      SETTINGS_KEYS.HERO_BG,
      { url: scene.image.url },
      'Legacy hero background mirror'
    ),
  ])

  revalidateTag('background-scene')
  revalidateTag('settings')
  revalidatePath('/')
  revalidatePath('/moments')
  revalidatePath('/dashboard/settings')

  return scene
}
