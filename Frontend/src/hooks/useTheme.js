import { useLayoutEffect, useSyncExternalStore } from 'react'

const appearanceKey = 'pirnav-theme'
const colorKey = 'pirnav-accent-color'
export const defaultColor = '#E3F7A9'
export const appearances = ['light', 'dark', 'system']
const legacyColors = { 'ocean-blue': '#165B91', emerald: '#176446', 'royal-purple': '#6B3A9B' }
const listeners = new Set()
let systemQuery

function preference(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // The current tab can still use the selection.
  }
}

export function normalizeThemeColor(input) {
  const hex = input.trim().replace(/^#/, '')
  if (/^[a-f\d]{3}$/i.test(hex)) return '#' + [...hex.toUpperCase()].map(digit => digit.repeat(2)).join('')
  if (/^[a-f\d]{6}$/i.test(hex)) return '#' + hex.toUpperCase()
  return null
}

function getAppearance() {
  const stored = document.documentElement.dataset.appearance || preference(appearanceKey)
  if (appearances.includes(stored)) return stored
  if (Object.hasOwn(legacyColors, stored)) return 'light'
  return 'system'
}

function getColor() {
  const color = normalizeThemeColor(document.documentElement.style.getPropertyValue('--theme-color') || preference(colorKey) || '')
  if (color) return color
  const savedAppearance = preference(appearanceKey)
  const legacyColor = Object.hasOwn(legacyColors, savedAppearance) ? legacyColors[savedAppearance] : null
  return legacyColor || defaultColor
}

function getEffectiveTheme() {
  const appearance = getAppearance()
  if (appearance !== 'system') return appearance
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

function notify() {
  listeners.forEach(listener => listener())
}

function applyTheme(appearance, color) {
  const root = document.documentElement
  root.dataset.appearance = appearance
  root.dataset.theme = getEffectiveTheme()
  root.style.setProperty('--theme-color', color)
  notify()
}

function onSystemChange() {
  if (getAppearance() === 'system') applyTheme('system', getColor())
}

function subscribe(listener) {
  if (!listeners.size) {
    systemQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
    systemQuery?.addEventListener?.('change', onSystemChange)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) systemQuery?.removeEventListener?.('change', onSystemChange)
  }
}

function setAppearance(appearance) {
  if (!appearances.includes(appearance)) return
  const color = getColor()
  save(appearanceKey, appearance)
  save(colorKey, color)
  applyTheme(appearance, color)
}

function setColor(input) {
  const color = normalizeThemeColor(input)
  if (!color) return false
  save(colorKey, color)
  applyTheme(getAppearance(), color)
  return true
}

function resetTheme() {
  save(appearanceKey, 'system')
  save(colorKey, defaultColor)
  applyTheme('system', defaultColor)
}

export function useTheme() {
  const appearance = useSyncExternalStore(subscribe, getAppearance)
  const color = useSyncExternalStore(subscribe, getColor)
  const effectiveTheme = useSyncExternalStore(subscribe, getEffectiveTheme)

  useLayoutEffect(() => {
    if (!document.documentElement.dataset.appearance) applyTheme(getAppearance(), getColor())
  }, [])

  return { appearance, color, effectiveTheme, setAppearance, setColor, resetTheme }
}
