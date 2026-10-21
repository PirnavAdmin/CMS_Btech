const brands = [
  ['microsoft', ['microsoft']],
  ['google', ['google']],
  ['amazon', ['amazon', 'amazon web services', 'aws']],
  ['tcs', ['tata consultancy services', 'tcs']],
  ['qualcomm', ['qualcomm']],
  ['deloitte', ['deloitte', 'deloitte consulting']],
  ['ltts', ['l&t technology services', 'larsen & toubro technology services', 'ltts']],
  ['infosys', ['infosys']],
  ['wipro', ['wipro']],
  ['accenture', ['accenture']],
  ['hcl', ['hcl', 'hcl technologies', 'hcltech']],
]

const normalizeName = name => String(name || '').toLowerCase().trim()
  .replace(/\b(?:private|pvt|limited|ltd|incorporated|inc|corporation|corp|llc|india|usi)\b\.?/g, '')
  .replace(/[^a-z0-9]/g, '')

const aliases = new Map(brands.flatMap(([brand, names]) => names.map(name => [normalizeName(name), brand])))

export const companyBrand = name => aliases.get(normalizeName(name)) || null

export const companyInitials = name => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase()
}
