'use client'

/**
 * useAnime.ts — Anime.js 4+ reusable React hooks
 *
 * All hooks follow the createScope + revert() cleanup pattern required
 * by the official Anime.js React guide to prevent memory leaks.
 *
 * Import pattern:  import { animate, createScope, stagger, spring, createTimeline } from 'animejs'
 */

import { useEffect, useRef, RefObject, DependencyList } from 'react'
import { animate, createScope, stagger, spring } from 'animejs'

type AnimeScope = ReturnType<typeof createScope>

// ─────────────────────────────────────────────────────────────────────────────
// useFadeInUp
// Single-element fade + translateY entrance on mount.
// ─────────────────────────────────────────────────────────────────────────────
export function useFadeInUp(
  ref: RefObject<HTMLElement | null>,
  options: { delay?: number; duration?: number; y?: number; deps?: DependencyList } = {},
) {
  const scope = useRef<AnimeScope | null>(null)
  const { delay = 0, duration = 420, y = 20, deps = [] } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    scope.current = createScope({ root: ref as unknown as RefObject<HTMLElement> }).add(() => {
      animate(el, {
        opacity: [0, 1],
        translateY: [y, 0],
        delay,
        duration,
        ease: 'out(3)',
      })
    })

    return () => { scope.current?.revert() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ─────────────────────────────────────────────────────────────────────────────
// useStaggerReveal
// Staggered entrance for children matching `selector` inside `ref`.
// Typically called on mount or when data arrives (pass deps).
// ─────────────────────────────────────────────────────────────────────────────
export function useStaggerReveal(
  ref: RefObject<HTMLElement | null>,
  options: {
    selector?: string
    staggerMs?: number
    startDelay?: number
    duration?: number
    y?: number
    deps?: DependencyList
  } = {},
) {
  const scope = useRef<AnimeScope | null>(null)
  const {
    selector = '[data-anim]',
    staggerMs = 60,
    startDelay = 0,
    duration = 380,
    y = 16,
    deps = [],
  } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const targets = Array.from(el.querySelectorAll<HTMLElement>(selector))
    if (!targets.length) return

    scope.current = createScope({ root: ref as unknown as RefObject<HTMLElement> }).add(() => {
      animate(targets, {
        opacity: [0, 1],
        translateY: [y, 0],
        delay: stagger(staggerMs, { start: startDelay }),
        duration,
        ease: 'out(3)',
      })
    })

    return () => { scope.current?.revert() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ─────────────────────────────────────────────────────────────────────────────
// useTabEntrance
// Re-runs a stagger entrance every time `tabKey` changes.
// Pass the container ref and a key that changes on tab switch.
// ─────────────────────────────────────────────────────────────────────────────
export function useTabEntrance(
  ref: RefObject<HTMLElement | null>,
  tabKey: string,
  options: { selector?: string; staggerMs?: number; duration?: number; y?: number } = {},
) {
  const scope = useRef<AnimeScope | null>(null)
  const {
    selector = '[data-anim]',
    staggerMs = 55,
    duration = 340,
    y = 14,
  } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Cancel any previous scope
    scope.current?.revert()

    const targets = Array.from(el.querySelectorAll<HTMLElement>(selector))
    if (!targets.length) {
      // Animate container itself
      scope.current = createScope({ root: ref as unknown as RefObject<HTMLElement> }).add(() => {
        animate(el, {
          opacity: [0, 1],
          translateY: [y, 0],
          duration,
          ease: 'out(3)',
        })
      })
    } else {
      scope.current = createScope({ root: ref as unknown as RefObject<HTMLElement> }).add(() => {
        animate(targets, {
          opacity: [0, 1],
          translateY: [y, 0],
          delay: stagger(staggerMs),
          duration,
          ease: 'out(3)',
        })
      })
    }

    return () => { scope.current?.revert() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey])
}

// ─────────────────────────────────────────────────────────────────────────────
// useModalEntrance
// Animates a modal panel (backdrop + content) on open/close.
// ─────────────────────────────────────────────────────────────────────────────
export function useModalEntrance(
  backdropRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
) {
  const scope = useRef<AnimeScope | null>(null)

  useEffect(() => {
    scope.current?.revert()
    if (!isOpen) return

    const backdrop = backdropRef.current
    const panel = panelRef.current
    if (!backdrop || !panel) return

    scope.current = createScope({}).add(() => {
      // Backdrop fade
      animate(backdrop, {
        opacity: [0, 1],
        duration: 220,
        ease: 'linear',
      })

      // Panel spring pop
      animate(panel, {
        opacity: [0, 1],
        scale: [0.95, 1],
        translateY: [12, 0],
        duration: 280,
        ease: spring({ stiffness: 280, damping: 22, mass: 0.9 }),
      })
    })

    return () => { scope.current?.revert() }
  }, [isOpen])
}

// ─────────────────────────────────────────────────────────────────────────────
// useToastEntrance
// Slides a toast in from the top when it becomes visible.
// ─────────────────────────────────────────────────────────────────────────────
export function useToastEntrance(
  ref: RefObject<HTMLElement | null>,
  isVisible: boolean,
) {
  const scope = useRef<AnimeScope | null>(null)

  useEffect(() => {
    scope.current?.revert()
    const el = ref.current
    if (!el || !isVisible) return

    scope.current = createScope({}).add(() => {
      animate(el, {
        opacity: [0, 1],
        translateY: [-14, 0],
        scale: [0.96, 1],
        duration: 320,
        ease: spring({ stiffness: 300, damping: 20, mass: 0.8 }),
      })
    })

    return () => { scope.current?.revert() }
  }, [isVisible])
}

// ─────────────────────────────────────────────────────────────────────────────
// useCounterAnimation
// Animates a numeric value from 0 to `target` — useful for KPI cards.
// Returns a ref to attach to the element that will display the number.
// ─────────────────────────────────────────────────────────────────────────────
export function useCounterAnimation(
  ref: RefObject<HTMLElement | null>,
  target: number,
  options: { duration?: number; delay?: number; deps?: DependencyList } = {},
) {
  const scope = useRef<AnimeScope | null>(null)
  const { duration = 1200, delay = 0, deps = [target] } = options

  useEffect(() => {
    const el = ref.current
    if (!el || target === 0) return

    scope.current?.revert()

    const counter = { value: 0 }
    scope.current = createScope({}).add(() => {
      animate(counter, {
        value: target,
        duration,
        delay,
        ease: 'out(3)',
        onUpdate: () => {
          el.textContent = Math.round(counter.value).toString()
        },
      })
    })

    return () => { scope.current?.revert() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ─────────────────────────────────────────────────────────────────────────────
// useButtonPress
// Adds a subtle spring scale "press" effect on click to a button.
// Attach the returned onPress handler to the button's onMouseDown / onTouchStart.
// ─────────────────────────────────────────────────────────────────────────────
export function useButtonPress(ref: RefObject<HTMLElement | null>) {
  const scope = useRef<AnimeScope | null>(null)

  const onPress = () => {
    const el = ref.current
    if (!el) return
    scope.current?.revert()
    scope.current = createScope({}).add(() => {
      animate(el, {
        scale: [1, 0.96, 1],
        duration: 300,
        ease: spring({ stiffness: 400, damping: 14 }),
      })
    })
  }

  useEffect(() => {
    return () => { scope.current?.revert() }
  }, [])

  return { onPress }
}
