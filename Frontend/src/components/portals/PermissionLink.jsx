import { Link } from 'react-router-dom'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'

export default function PermissionLink({ to, ...props }) {
  const { canView } = useScreenAccess()
  const path = typeof to === 'string' ? to.split(/[?#]/)[0] : to?.pathname
  if (path?.startsWith('/') && !canView(path)) return null
  return <Link to={to} {...props} />
}
