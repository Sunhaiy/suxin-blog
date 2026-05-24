import type { BackgroundSceneSettings } from '@/types/work'
import { toRgba } from '@/lib/scene-color'

interface SceneFilterLayerProps {
  scene: BackgroundSceneSettings
}

export function SceneFilterLayer({ scene }: SceneFilterLayerProps) {
  const topOverlay = Math.min(0.95, Math.max(0, scene.filter.overlay))
  const bottomOverlay = Math.min(0.98, Math.max(topOverlay, scene.filter.overlay + scene.filter.gradient))
  const topTint = Math.min(0.32, Math.max(0, scene.filter.gradient * 0.22))
  const vignetteStart = Math.min(0.9, Math.max(0, scene.filter.vignette * 0.52))
  const vignetteEnd = Math.min(1, Math.max(vignetteStart, scene.filter.vignette * 0.88))
  const hasBackdropBlur = scene.filter.blur > 0
  const hasOverlay = topOverlay > 0 || bottomOverlay > 0
  const hasTint = topTint > 0
  const hasVignette = vignetteStart > 0 || vignetteEnd > 0
  const hasNoise = scene.filter.noise > 0

  return (
    <>
      {hasBackdropBlur || hasOverlay ? (
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: hasBackdropBlur ? `blur(${scene.filter.blur}px)` : undefined,
            WebkitBackdropFilter: hasBackdropBlur ? `blur(${scene.filter.blur}px)` : undefined,
            background: hasOverlay
              ? `linear-gradient(180deg, hsl(var(--background) / ${topOverlay}) 0%, hsl(var(--background) / ${bottomOverlay}) 100%)`
              : 'transparent',
          }}
        />
      ) : null}
      {hasTint || hasVignette ? (
        <div
          className="absolute inset-0"
          style={{
            background: [
              hasTint
                ? `radial-gradient(circle at top, ${toRgba(scene.filter.tintColor, topTint)} 0%, transparent 46%)`
                : null,
              hasVignette
                ? `radial-gradient(circle at bottom, hsl(var(--background) / ${vignetteStart}) 0%, hsl(var(--background) / ${vignetteEnd}) 100%)`
                : null,
            ]
              .filter(Boolean)
              .join(', '),
          }}
        />
      ) : null}
      {hasNoise ? <div className="absolute inset-0 scene-noise" style={{ opacity: scene.filter.noise }} /> : null}
    </>
  )
}
