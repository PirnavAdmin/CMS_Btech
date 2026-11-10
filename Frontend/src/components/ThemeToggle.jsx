import { useTheme } from '../hooks/useTheme'
import { FiMoon, FiSun } from 'react-icons/fi'

export default function ThemeToggle({ className = '' }) {
  const { effectiveTheme, setAppearance } = useTheme()
  const isDark = effectiveTheme === 'dark'
  return <button type="button" className={`theme-toggle public-theme-toggle ${className}`.trim()}
    aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`} title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    aria-pressed={isDark} onClick={() => setAppearance(isDark ? 'light' : 'dark')}>
    {isDark ? <FiMoon aria-hidden="true" /> : <FiSun aria-hidden="true" />}
  </button>
}
