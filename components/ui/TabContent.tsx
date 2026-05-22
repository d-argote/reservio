'use client'

/**
 * TabContent — Animates its children in whenever `tabKey` changes.
 *
 * Uses React's `key` prop to force remount on tab switch, then runs an
 * Anime.js stagger entrance on any child marked with `data-anim`.
 * Falls back to animating the container itself if no marked children exist.
 */

import { useRef, useEffect, ReactNode, memo } from 'react'
import { animate, stagger } from 'animejs'

interface Props {
  tabKey: string
  children: ReactNode
  className?: string
  /** CSS selector for children to stagger. Defaults to [data-anim] */
  selector?: string
  staggerMs?: number
  duration?: number
  y?: number
}

function TabContentInner({
  children,
  className = '',
  selector = '[data-anim]',
  staggerMs = 52,
  duration = 340,
  y = 14,
}: Omit<Props, 'tabKey'>) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const targets = Array.from(el.querySelectorAll<HTMLElement>(selector))

    if (targets.length > 0) {
      // Reset initial state for targets
      targets.forEach(t => {
        t.style.opacity = '0'
        t.style.transform = `translateY(${y}px)`
      })

      animate(targets, {
        opacity: [0, 1],
        translateY: [y, 0],
        delay: stagger(staggerMs),
        duration,
        ease: 'out(3)',
      })
    } else {
      // Animate the container
      el.style.opacity = '0'
      el.style.transform = `translateY(${y}px)`
      animate(el, {
        opacity: [0, 1],
        translateY: [y, 0],
        duration,
        ease: 'out(3)',
      })
    }
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

/**
 * Wrap tab panel content with this component and pass a unique `tabKey`.
 * When `tabKey` changes, React unmounts+remounts the inner component,
 * which re-triggers the entrance animation automatically.
 */
export function TabContent({ tabKey, children, ...rest }: Props) {
  return <TabContentInner key={tabKey} {...rest}>{children}</TabContentInner>
}

export default memo(TabContent)
