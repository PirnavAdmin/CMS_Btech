import { useEffect, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'

const getInitialTheme = () => {
  const stored = localStorage.getItem('pirnav-theme')
  const theme = stored === 'dark' || stored === 'light'
    ? stored
    : window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  // Apply before the first paint so public-page headings never flash with
  // the opposite OS color scheme.
  document.documentElement.dataset.theme = theme
  return theme
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getInitialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pirnav-theme', theme)
  }, [theme])
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return <button type="button" className={`theme-toggle public-theme-toggle ${className}`} onClick={() => setTheme(nextTheme)} aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`}>{theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}</button>
}
