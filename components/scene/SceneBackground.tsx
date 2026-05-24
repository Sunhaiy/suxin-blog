'use client'

import { SceneContentLayer } from './SceneContentLayer'
import { SceneFilterLayer } from './SceneFilterLayer'
import { SceneWeatherLayer } from './SceneWeatherLayer'
import type { BackgroundSceneSettings, SceneEnabledPage } from '@/types/work'

interface SceneBackgroundProps {
  scene: BackgroundSceneSettings
  page: SceneEnabledPage
  children: React.ReactNode
  className?: string
  contentClassName?: string
  style?: React.CSSProperties
}

function isWeatherEnabled(scene: BackgroundSceneSettings, page: SceneEnabledPage) {
  return page === 'moments' && scene.weather.preset !== 'none'
}

export function SceneBackground({
  scene,
  page,
  children,
  className = '',
  contentClassName = '',
  style,
}: SceneBackgroundProps) {
  const weatherEnabled = isWeatherEnabled(scene, page)
  const hasImage = Boolean(scene.image.url) && page !== 'moments' && page !== 'home'
  const filterEnabled = page !== 'moments' && page !== 'home'
  const weatherIntensity =
    page === 'moments' ? Math.max(scene.weather.intensity, 0.58) : scene.weather.intensity

  return (
    <div className={`scene-page-${page} relative isolate bg-background ${className}`.trim()} style={style}>
      {hasImage ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${scene.image.url})`,
            backgroundPosition: scene.image.position,
            backgroundSize: scene.image.size,
            opacity: scene.image.opacity,
          }}
        />
      ) : null}

      {filterEnabled ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <SceneFilterLayer scene={scene} />
        </div>
      ) : null}

      <SceneWeatherLayer
        preset={scene.weather.preset}
        intensity={weatherIntensity}
        enabled={weatherEnabled}
      />

      <SceneContentLayer className={contentClassName}>{children}</SceneContentLayer>
    </div>
  )
}
