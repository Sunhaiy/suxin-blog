'use client'
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

interface ProgressiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string
  skeletonClassName?: string
}

export function ProgressiveImage({
  wrapperClassName = '',
  skeletonClassName = '',
  className = '',
  src,
  alt,
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'loaded'>('idle')

  useEffect(() => {
    const image = imageRef.current
    if (!src || !image) {
      setPhase('loaded')
      return
    }

    if (image.complete && image.naturalWidth > 0) {
      setPhase('loaded')
      return
    }
    
    setPhase('loading')
  }, [src])

  return (
    <div
      className={`image-reveal ${phase === 'loading' ? 'is-loading' : ''} ${phase === 'loaded' ? 'is-loaded' : ''} ${wrapperClassName}`.trim()}
    >
      <div
        aria-hidden="true"
        className={`image-reveal-skeleton ${skeletonClassName}`.trim()}
      />
      <img
        {...props}
        ref={imageRef}
        src={src}
        alt={alt}
        className={`image-reveal-media ${className}`.trim()}
        onLoad={(event) => {
          setPhase('loaded')
          onLoad?.(event)
        }}
        onError={(event) => {
          setPhase('loaded')
          onError?.(event)
        }}
      />
    </div>
  )
}
