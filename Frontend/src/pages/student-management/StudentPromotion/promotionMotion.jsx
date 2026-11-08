import React, { Fragment, createElement, useEffect, useState } from 'react'

const animatedElement = (tag) => function AnimatedElement({
  children,
  className = '',
  style,
  initial: _initial,
  animate: _animate,
  transition: _transition,
  ...props
}) {
  return createElement(tag, {
    ...props,
    className: `promotion-motion-enter ${className}`.trim(),
    style,
  }, children)
}

export const motion = new Proxy({}, {
  get: (_target, tag) => animatedElement(tag),
})

export function AnimatePresence({ children }) {
  return <Fragment>{children}</Fragment>
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  return reduced
}
