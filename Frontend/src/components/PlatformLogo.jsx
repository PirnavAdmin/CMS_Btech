import { useEffect, useState } from 'react'
import { platformLogoUpdated, platformLogoUrl } from '../api/apiEndpoints.js'

export default function PlatformLogo({ fallback, className }) {
  const [source, setSource] = useState(platformLogoUrl)

  useEffect(() => {
    const refreshLogo = () => setSource(`${platformLogoUrl}?v=${Date.now()}`)
    window.addEventListener(platformLogoUpdated, refreshLogo)
    return () => window.removeEventListener(platformLogoUpdated, refreshLogo)
  }, [])

  return source
    ? <img className={className} src={source} alt="" onError={() => setSource(current => current === source ? '' : current)} />
    : fallback
}
