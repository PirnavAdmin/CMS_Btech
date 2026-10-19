import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { FaAmazon } from 'react-icons/fa6'
import { SiTcs, SiQualcomm, SiInfosys, SiWipro, SiAccenture, SiHcl } from 'react-icons/si'
import { companyBrand, companyInitials } from '../utils/companyBrand.js'
import './CompanyLogo.css'

const icons = {
  google: [FcGoogle], amazon: [FaAmazon, '#FF9900'],
  tcs: [SiTcs, '#CA2468'], qualcomm: [SiQualcomm, '#3253DC'],
  infosys: [SiInfosys, '#007CC3'], wipro: [SiWipro, '#6F2C91'],
  accenture: [SiAccenture, '#A100FF'], hcl: [SiHcl, '#0073B9'],
}

function MicrosoftLogo() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M13 1h10v10H13z" /><path fill="#00A4EF" d="M1 13h10v10H1z" /><path fill="#FFB900" d="M13 13h10v10H13z" /></svg>
}

// All known logos are bundled with the frontend; no backend logo field or request.
export default function CompanyLogo({ name, compact = false, className = '' }) {
  const brand = companyBrand(name)
  const [failedBrand, setFailedBrand] = useState(null)
  const usableBrand = brand && failedBrand !== brand
  const [Icon, color] = icons[brand] || []
  return <span className={`company-logo ${usableBrand ? 'company-logo--brand' : ''} ${compact ? 'company-logo--compact' : ''} ${className}`} role="img" aria-label={`${name || 'Company'} logo`}>
    {!usableBrand ? companyInitials(name)
      : brand === 'microsoft' ? <MicrosoftLogo />
      : Icon ? <Icon color={color} aria-hidden="true" />
      : <img src={`${import.meta.env.BASE_URL}company-logos/${brand}.png`} alt="" onError={() => setFailedBrand(brand)} />}
  </span>
}
