'use client'

/**
 * AnimatedModal — Anime.js 4+ powered modal overlay.
 *
 * Wraps a modal backdrop + panel and animates them on mount.
 * The parent controls open/close via conditional rendering (unmount to close).
 */

import { useRef, useEffect, ReactNode } from 'react'
import { animate, spring } from 'animejs'

interface Props {
  children: ReactNode
  className?: string
  /** Extra classes for the inner panel wrapper */
  panelClassName?: string
  /** Callback when the backdrop is clicked */
  onBackdropClick?: () => void
}

/**
 * Renders a full-screen backdrop + animated panel.
 * Mount/unmount this component to open/close the modal.
 *
 * Usage:
 * ```tsx
 * {isOpen && (
 *   <AnimatedModal onBackdropClick={() => setIsOpen(false)}>
 *     <YourModalContent />
 *   </AnimatedModal>
 * )}
 * ```
 */
export function AnimatedModal({ children, className = '', panelClassName = '', onBackdropClick }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const backdrop = backdropRef.current
    const panel = panelRef.current
    if (!backdrop || !panel) return

    // Backdrop fade
    animate(backdrop, {
      opacity: [0, 1],
      duration: 200,
      ease: 'linear',
    })

    // Panel spring pop-in
    animate(panel, {
      opacity: [0, 1],
      scale: [0.95, 1],
      translateY: [10, 0],
      duration: 320,
      ease: spring({ stiffness: 300, damping: 22, mass: 0.9 }),
    })
  }, [])

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      style={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onBackdropClick}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative z-10 ${panelClassName}`}
        style={{ opacity: 0 }}
      >
        {children}
      </div>
    </div>
  )
}
