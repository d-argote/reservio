'use client'

/**
 * AnimatedToast — Anime.js 4+ powered toast component.
 *
 * Uses useToastEntrance hook for slide-in animation when visible.
 * The parent controls visibility via conditional rendering — when the element
 * mounts into the DOM, the entrance animation fires automatically.
 */

import { useRef, useEffect, ReactNode } from 'react'
import { animate } from 'animejs'
import { spring } from 'animejs'

interface Props {
  children: ReactNode
  className?: string
}

/**
 * Wraps any toast content in an animated container.
 * Simply place this around your toast JSX — when it mounts, it slides in.
 */
export function AnimatedToast({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    animate(el, {
      opacity: [0, 1],
      translateY: [-16, 0],
      scale: [0.94, 1],
      duration: 350,
      ease: spring({ stiffness: 300, damping: 20, mass: 0.8 }),
    })
  }, [])

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  )
}
