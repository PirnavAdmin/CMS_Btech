import { afterEach, expect, test } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ThemeColorPicker from './ThemeColorPicker.jsx'

const themeProperties = [
  '--cms-primary',
  '--cms-primary-dark',
  '--cms-primary-hover',
  '--cms-primary-active',
  '--cms-primary-soft',
  '--cms-primary-border',
  '--cms-border',
  '--cms-border-strong',
  '--cms-secondary',
  '--cms-subtle',
  '--cms-table-header',
  '--cms-hover',
  '--page-gradient',
  '--cms-header',
  '--cms-sidebar',
  '--cms-sidebar-hover',
  '--cms-sidebar-active',
  '--cms-sidebar-active-glow',
  '--scrollbar-thumb-hover',
]

afterEach(() => {
  cleanup()
  localStorage.removeItem('pirnav-accent-color')
  localStorage.removeItem('pirnav-theme')
  document.documentElement.removeAttribute('data-theme')
  themeProperties.forEach(property => document.documentElement.style.removeProperty(property))
})

test('selected accent updates the sidebar and shared theme surfaces', () => {
  render(<ThemeColorPicker />)
  fireEvent.click(screen.getByRole('button', { name: 'Open theme settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Peach theme' }))

  expect(document.documentElement.style.getPropertyValue('--cms-sidebar')).toContain('#FFD9B5')
  expect(document.documentElement.style.getPropertyValue('--cms-sidebar-active')).toContain('hsl(')
  expect(document.documentElement.style.getPropertyValue('--cms-sidebar-hover')).toContain('#FFD9B5')
  expect(document.documentElement.style.getPropertyValue('--cms-hover')).toContain('#FFD9B5')
  expect(localStorage.getItem('pirnav-accent-color')).toBe('#FFD9B5')
})

test('dark mode recalculates the themed sidebar and shared surfaces', () => {
  render(<ThemeColorPicker />)
  fireEvent.click(screen.getByRole('button', { name: 'Open theme settings' }))
  fireEvent.click(screen.getByRole('button', { name: 'Dark', exact: false }))
  fireEvent.click(screen.getByRole('button', { name: 'Mint theme' }))

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(document.documentElement.style.getPropertyValue('--cms-sidebar')).toContain('#AEEFC1')
  expect(document.documentElement.style.getPropertyValue('--cms-header')).toContain('#AEEFC1')
  expect(localStorage.getItem('pirnav-theme')).toBe('dark')
})
