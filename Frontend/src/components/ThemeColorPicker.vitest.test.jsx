import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Link, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import ThemeColorPicker from './ThemeColorPicker'
import { defaultColor, normalizeThemeColor } from '../hooks/useTheme'

const root = document.documentElement
let system
function clearRoot() {
  delete root.dataset.theme
  delete root.dataset.appearance
  root.style.removeProperty('--theme-color')
}
beforeEach(() => {
  localStorage.clear()
  system = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('matchMedia', () => system)
})
afterEach(() => {
  cleanup()
  clearRoot()
  vi.unstubAllGlobals()
})

function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: 'Open theme settings' }))
  return within(screen.getByRole('dialog', { name: 'Theme settings' }))
}

function enterHex(picker, hex) {
  fireEvent.change(picker.getByRole('textbox', { name: 'Custom HEX' }), { target: { value: hex } })
  fireEvent.click(picker.getByRole('button', { name: 'Apply' }))
}

test.each([
  ['Burgundy', 'Light', '#800020'],
  ['Burgundy', 'Dark', '#800020'],
  ['Ocean Blue', 'Light', '#2378AF'],
  ['Ocean Blue', 'Dark', '#2378AF'],
  ['Emerald', 'Light', '#16875F'],
  ['Purple', 'Dark', '#883DA7'],
  ['Custom', 'Light', '#8042A8'],
  ['Custom', 'Dark', '#8042A8'],
])('%s + %s preserves both settings through navigation and reload', (name, appearance, color) => {
  const view = render(
    <MemoryRouter>
      <Link to="/directory">Directory</Link>
      <Routes>
        <Route path="/" element={<ThemeColorPicker key="home" />} />
        <Route path="/directory" element={<ThemeColorPicker key="directory" />} />
      </Routes>
    </MemoryRouter>,
  )
  const picker = openPicker()
  fireEvent.click(picker.getByRole('button', { name: appearance }))
  if (name === 'Custom') enterHex(picker, color)
  else fireEvent.click(picker.getByRole('button', { name }))

  expect(root.style.getPropertyValue('--theme-color')).toBe(color)
  expect(root.dataset.theme).toBe(appearance.toLowerCase())
  expect(localStorage.getItem('pirnav-accent-color')).toBe(color)
  expect(localStorage.getItem('pirnav-theme')).toBe(appearance.toLowerCase())

  fireEvent.click(screen.getByRole('link', { name: 'Directory' }))
  expect(openPicker().getByRole('button', { name: appearance }).getAttribute('aria-pressed')).toBe('true')
  view.unmount()
  clearRoot()
  render(<ThemeColorPicker />)
  expect(root.style.getPropertyValue('--theme-color')).toBe(color)
  expect(root.dataset.theme).toBe(appearance.toLowerCase())
})

test('system changes the effective mode while manual appearance and color remain independent', () => {
  render(<ThemeColorPicker />)
  const picker = openPicker()
  fireEvent.click(picker.getByRole('button', { name: 'Burgundy' }))
  expect(picker.getByRole('button', { name: 'System' }).getAttribute('aria-pressed')).toBe('true')
  act(() => {
    system.matches = true
    system.dispatchEvent(new Event('change'))
  })
  expect(root.dataset.theme).toBe('dark')
  fireEvent.click(picker.getByRole('button', { name: 'Light' }))
  act(() => system.dispatchEvent(new Event('change')))
  expect(root.dataset.theme).toBe('light')
  expect(root.style.getPropertyValue('--theme-color')).toBe('#800020')
  fireEvent.click(picker.getByRole('button', { name: 'System' }))
  expect(localStorage.getItem('pirnav-theme')).toBe('system')
  expect(root.dataset.theme).toBe('dark')
})

test('invalid HEX preserves the current color and reset restores defaults', () => {
  render(<ThemeColorPicker />)
  const picker = openPicker()
  fireEvent.click(picker.getByRole('button', { name: 'Dark' }))
  enterHex(picker, ' #abc ')
  expect(root.style.getPropertyValue('--theme-color')).toBe('#AABBCC')
  enterHex(picker, '#12345z')
  expect(picker.getByRole('alert')).toBeTruthy()
  expect(root.style.getPropertyValue('--theme-color')).toBe('#AABBCC')
  expect(normalizeThemeColor('red')).toBeNull()
  fireEvent.click(picker.getByRole('button', { name: 'Reset to default' }))
  expect(root.style.getPropertyValue('--theme-color')).toBe(defaultColor)
  expect(root.dataset.appearance).toBe('system')
  expect(picker.queryByRole('alert')).toBeNull()
})

test.each([
  ['dark', 'abc', 'dark', '#AABBCC'],
  ['system', '#8042A8', 'dark', '#8042A8'],
  ['emerald', null, 'light', '#176446'],
  [null, 'invalid', 'dark', defaultColor],
])('the HTML bootstrap initializes stored appearance %s and color %s before paint', (appearance, color, mode, expected) => {
  const html = readFileSync('index.html', 'utf8')
  const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  const setProperty = vi.fn()
  const element = { dataset: {}, style: { setProperty } }
  runInNewContext(bootstrap, {
    document: { documentElement: element },
    localStorage: { getItem: key => key === 'pirnav-theme' ? appearance : color },
    window: { matchMedia: () => ({ matches: true }) },
  })
  expect(element.dataset.theme).toBe(mode)
  expect(setProperty).toHaveBeenCalledWith('--theme-color', expected)
})

function paletteRoles(mode, color) {
  const css = readFileSync('src/styles/tokens.css', 'utf8')
  const roles = new Map()
  for (const [, selector, body] of css.matchAll(/(:root(?:\[data-theme="dark"\])?)\s*\{([^}]+)\}/g)) {
    if (selector.includes('dark') && mode !== 'dark') continue
    for (const [, name, value] of body.matchAll(/(--[a-z-]+):\s*([^;]+);/g)) roles.set(name, value)
  }
  roles.set('--theme-color', color)
  function resolve(value) {
    const token = value.match(/^var\((--[a-z-]+)\)$/)
    if (token) return resolve(roles.get(token[1]))
    const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1]
    if (hex) return hex.match(/../g).map(part => Number.parseInt(part, 16))
    const [, from, percent, to] = value.match(/^color-mix\(in srgb, (.+) (\d+)%, (#[\da-f]{6})\)$/i)
    const weight = Number(percent) / 100
    const other = resolve(to)
    return resolve(from).map((channel, index) => channel * weight + other[index] * (1 - weight))
  }
  return role => resolve(roles.get(role))
}

function luminance(color) {
  return color.map(channel => channel / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

test.each(['light', 'dark'])('%s derives distinct layout surfaces and readable text from the selected color', mode => {
  const surfaces = ['app-bg', 'main-bg', 'header-bg', 'sidebar-bg', 'surface', 'surface-alt', 'table-head', 'table-row', 'table-row-hover', 'input-bg', 'dialog-bg', 'dropdown-bg']
  const burgundy = paletteRoles(mode, '#800020')
  const blue = paletteRoles(mode, '#2378AF')
  for (const role of surfaces) {
    expect(burgundy('--' + role), role).not.toEqual(blue('--' + role))
  }

  for (const color of ['#800020', '#2378AF', '#16875F', '#883DA7', '#8042A8', '#000000', '#FFFFFF', '#FFFF00', '#00FFFF', '#FF00FF']) {
    const palette = paletteRoles(mode, color)
    for (const [text, background] of [
      ['text-primary', 'surface'], ['text-secondary', 'sidebar-bg'], ['text-secondary', 'table-head'],
      ['text-muted', 'input-bg'], ['brand', 'surface'], ['text-on-brand', 'brand-solid'],
    ]) {
      const [bright, dim] = [luminance(palette('--' + text)), luminance(palette('--' + background))].sort((a, b) => b - a)
      expect((bright + 0.05) / (dim + 0.05), color + ' ' + text + ' on ' + background).toBeGreaterThanOrEqual(4.5)
    }
  }
})
