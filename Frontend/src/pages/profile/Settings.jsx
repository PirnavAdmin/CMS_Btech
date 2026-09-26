import { Navigate } from 'react-router-dom'

// Preserve existing bookmarks; workspace selection now lives in the shell.
export default function Settings() {
  return <Navigate to="/dashboard" replace />
}
