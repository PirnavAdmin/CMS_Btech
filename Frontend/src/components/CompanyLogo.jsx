import { useState } from 'react'

const domains = {
  microsoft: 'microsoft.com', microsoftindia: 'microsoft.com', google: 'google.com',
  tataconsultancyservices: 'tcs.com', tcs: 'tcs.com', qualcomm: 'qualcomm.com',
  amazon: 'amazon.com', amazonindia: 'amazon.com', infosys: 'infosys.com',
  wipro: 'wipro.com', accenture: 'accenture.com', cognizant: 'cognizant.com',
  deloitte: 'deloitte.com', capgemini: 'capgemini.com', ibm: 'ibm.com',
  oracle: 'oracle.com', techmahindra: 'techmahindra.com', hcl: 'hcltech.com',
}
export function companyDomain(name, website) {
  if (website && !/^https?:\/\/$/.test(website.trim())) {
    try {
      const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`)
      if (url.hostname.includes('.') && ['http:', 'https:'].includes(url.protocol)) return url.hostname
    } catch { /* Unknown website: use the company mapping instead. */ }
  }
  return domains[String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')] || ''
}
export default function CompanyLogo({ name, website }) {
  const domain = companyDomain(name, website)
  return <ResolvedLogo key={domain} domain={domain} name={name} />
}

function ResolvedLogo({ domain, name }) {
  const [attempt, setAttempt] = useState(0)
  const sources = domain ? [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://${domain}/favicon.ico`,
    `https://www.${domain.replace(/^www\./, '')}/favicon.ico`,
  ] : []
  const src = sources[attempt]
  return <div className={`plw-company-avatar ${src ? 'plw-company-avatar--logo' : ''}`}>
    {src ? <img key={src} src={src} alt={`${name} logo`} loading="lazy" referrerPolicy="no-referrer" onError={() => setAttempt(current => current + 1)} /> : String(name || '?').slice(0, 2).toUpperCase()}
  </div>
}
