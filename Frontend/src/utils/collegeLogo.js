export const collegeLogoValue = record => [
  'logo', 'logoUrl', 'collegeLogo', 'collegeLogoUrl', 'logoPath',
  'Logo', 'LogoUrl', 'CollegeLogo', 'CollegeLogoUrl', 'LogoPath', 'logo_url', 'logo_path',
].map(key => record?.[key]).find(value => typeof value === 'string' && value.trim() && !/^(null|undefined|string)$/i.test(value.trim())) || ''

export const resolveCollegeLogo = (value, baseUrl = '') => {
  const logo = String(value ?? '').trim().replace(/\\/g, '/')
  const base = baseUrl.replace(/\/+$/, '')
  if (!logo || /^(null|undefined|string)$/i.test(logo)) return ''
  if (/^(data:image\/|blob:)/i.test(logo)) return logo
  if (/^https?:\/\//i.test(logo)) {
    const url = new URL(logo)
    // Uploaded backend files can retain a previous development tunnel's host.
    if (/\.(ngrok-free\.dev|ngrok-free\.app|ngrok\.io)$/i.test(url.hostname)
      && /^\/(uploads|images|api)\//i.test(url.pathname)) return `${base}${url.pathname}${url.search}`
    return logo
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(logo) && logo.replace(/\s/g, '').length > 100) return `data:image/png;base64,${logo.replace(/\s/g, '')}`
  if (/^[a-z]+:/i.test(logo) || logo.startsWith('//')) return ''
  return `${base}/${logo.replace(/^\/+/, '')}`
}
