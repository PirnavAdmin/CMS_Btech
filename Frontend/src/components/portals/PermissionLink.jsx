import { Link as RouterLink } from 'react-router-dom'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'

export default function PermissionLink({ to, ...props }) {
  const { canView } = useScreenAccess()
  const path = typeof to === 'string' ? to : to?.pathname
  if (!path || !canView(path)) return null
  return <RouterLink to={to} {...props} />
}
