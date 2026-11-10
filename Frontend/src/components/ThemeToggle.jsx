import { useLayoutEffect } from 'react'
import { initializeSavedThemePreferences } from './ThemeColorPicker'

// Public landing and login screens inherit the saved workspace colors without
// exposing theme controls before the user signs in.
export default function ThemeToggle() {
  useLayoutEffect(() => {
    initializeSavedThemePreferences()
  }, [])
  return null
}
