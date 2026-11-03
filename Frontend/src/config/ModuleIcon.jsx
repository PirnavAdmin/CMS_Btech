import { createElement } from 'react'
import { getIcon, getModuleIcon } from './iconRegistry.js'

// The lookup returns imported component references; it never creates a component type.
export default function ModuleIcon({ moduleId, icon, label, size = 20, strokeWidth = 1.8, ...props }) {
  return createElement(icon ? getIcon(icon) : getModuleIcon(moduleId), {
    ...props, size, strokeWidth, color: 'currentColor', focusable: 'false',
    'aria-hidden': label ? undefined : true, role: label ? 'img' : undefined, 'aria-label': label,
  })
}
