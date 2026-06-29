'use client'

import { useEffect, useState } from 'react'
import type { WeatherPreset } from '@/types/work'

interface RainDrop {
  left: string
  top: string
  height: string
  opacity: number
  duration: string
  delay: string
  timing: string
  width: string
  blur: string
  driftNear: string
  driftMid: string
  driftFar: string
  angleStart: string
  angleMid: string
  angleEnd: string
  sway: string
  travel: string
  pattern: 'a' | 'b' | 'c' | 'd'
  layer: 'back' | 'front'
}

function createDrops(count: number): RainDrop[] {
  return Array.from({ length: count }, () => {
    const layer = Math.random() > 0.85 ? 'front' : 'back'
    const isFront = layer === 'front'
    const patterns: RainDrop['pattern'][] = ['a', 'b', 'c', 'd']
    const baseAngle = isFront ? 2 - Math.random() * 24 : 4 - Math.random() * 18
    const angleMid = baseAngle + (-5 + Math.random() * 10)
    const angleEnd = baseAngle + (-3 + Math.random() * 6)
    const baseDrift = (isFront ? -2 - Math.random() * 26 : 2 - Math.random() * 20)
    const gustBias = -8 + Math.random() * 16

    return {
      left: `${Math.random() * 100}%`,
      top: `${-18 - Math.random() * 28}%`,
      height: `${isFront ? 30 + Math.random() * 56 : 14 + Math.random() * 36}px`,
      opacity: isFront ? 0.08 + Math.random() * 0.16 : 0.03 + Math.random() * 0.085,
      duration: `${isFront ? 0.84 + Math.random() * 1.05 : 1.18 + Math.random() * 1.55}s`,
      delay: `${Math.random() * 3.6}s`,
      timing: isFront ? 'cubic-bezier(0.32, 0.06, 0.64, 0.98)' : 'linear',
      width: `${isFront ? 0.42 + Math.random() * 0.6 : 0.22 + Math.random() * 0.42}px`,
      blur: `${isFront ? 0.08 + Math.random() * 1.1 : 0.2 + Math.random() * 1.6}px`,
      driftNear: `${baseDrift * (0.12 + Math.random() * 0.18) + gustBias * 0.25}px`,
      driftMid: `${baseDrift * (0.44 + Math.random() * 0.26) + gustBias * 0.6}px`,
      driftFar: `${baseDrift * (0.9 + Math.random() * 0.4) + gustBias}px`,
      angleStart: `${baseAngle}deg`,
      angleMid: `${angleMid}deg`,
      angleEnd: `${angleEnd}deg`,
      sway: `${-4 + Math.random() * 8}px`,
      travel: `${90 + Math.random() * 28}vh`,
      pattern: patterns[Math.floor(Math.random() * patterns.length)],
      layer,
    }
  })
}

interface SceneWeatherLayerProps {
  preset: WeatherPreset
  intensity: number
  enabled: boolean
}

export function SceneWeatherLayer({
  preset,
  intensity,
  enabled,
}: SceneWeatherLayerProps) {
  const [drops, setDrops] = useState<RainDrop[]>([])
  const [isFlashing, setIsFlashing] = useState(false)
  const [boltPos, setBoltPos] = useState(50)

  useEffect(() => {
    if (!enabled || preset !== 'storm') return

    const updateDrops = () => {
      const isMobile = window.innerWidth < 768
      const base = isMobile ? 38 : 64
      const extra = isMobile ? 12 : 20
      setDrops(createDrops(Math.round(base + intensity * extra)))
    }

    updateDrops()
    window.addEventListener('resize', updateDrops)
    return () => window.removeEventListener('resize', updateDrops)
  }, [enabled, intensity, preset])

  useEffect(() => {
    if (!enabled || preset !== 'storm') return

    const timers: number[] = []
    const interval = window.setInterval(() => {
      const threshold = 0.5 - intensity * 0.14

      if (Math.random() <= threshold) return

      setBoltPos(Math.random() * 95)
      setIsFlashing(true)
      timers.push(window.setTimeout(() => setIsFlashing(false), 50))
      timers.push(window.setTimeout(() => setIsFlashing(true), 100))
      timers.push(window.setTimeout(() => setIsFlashing(false), 250))
    }, 680)

    return () => {
      window.clearInterval(interval)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [enabled, intensity, preset])

  if (!enabled || preset !== 'storm') return null

  return (
    <div className="pointer-events-none absolute inset-0 z-[20] overflow-hidden">
      <div className="absolute inset-0">
        {drops.map((drop, index) => (
          <span
            key={`${drop.left}-${index}`}
            className={`absolute ${drop.layer === 'front' ? 'mix-blend-screen' : 'mix-blend-lighten'}`}
            style={{
              left: drop.left,
              top: drop.top,
              height: drop.height,
              opacity: drop.opacity,
              width: drop.width,
              filter: `blur(${drop.blur})`,
              background:
                drop.layer === 'front'
                  ? 'linear-gradient(to bottom, transparent 0%, hsl(var(--weather-rain) / 0.06) 18%, hsl(var(--weather-rain) / 0.32) 58%, transparent 100%)'
                  : 'linear-gradient(to bottom, transparent 0%, hsl(var(--weather-rain) / 0.03) 24%, hsl(var(--weather-rain) / 0.18) 72%, transparent 100%)',
              animation: `scene-rain-fall-${drop.pattern} ${drop.duration} linear infinite`,
              animationDelay: drop.delay,
              animationTimingFunction: drop.timing,
              ['--rain-drift-near' as string]: drop.driftNear,
              ['--rain-drift-mid' as string]: drop.driftMid,
              ['--rain-drift-far' as string]: drop.driftFar,
              ['--rain-angle-start' as string]: drop.angleStart,
              ['--rain-angle-mid' as string]: drop.angleMid,
              ['--rain-angle-end' as string]: drop.angleEnd,
              ['--rain-sway' as string]: drop.sway,
              ['--rain-travel' as string]: drop.travel,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-[25]">
        <div
          className={`absolute inset-0 transition-opacity duration-75 ${isFlashing ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: 'hsl(var(--weather-flash) / 0.14)',
            animation: isFlashing ? 'scene-lightning-flash 0.25s ease-out forwards' : undefined,
          }}
        />

        {isFlashing ? (
          <div
            className="absolute top-0 bottom-0 z-[26] w-[3px] blur-[1.5px]"
            style={{
              left: `${boltPos}%`,
              background: 'hsl(var(--weather-flash))',
              boxShadow:
                '0 0 20px hsl(var(--weather-flash) / 0.96), 0 0 44px hsl(var(--weather-rain) / 0.44), 0 0 86px hsl(var(--primary) / 0.24)',
              transform: 'skewX(-15deg)',
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
