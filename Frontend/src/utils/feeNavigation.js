export const feeNavigation = [
  { label: 'Fee Structure', to: '/fees/structures', sections: ['structures', 'components', 'legacy'] },
  { label: 'Fee Management', to: '/fees/overview', sections: ['overview', 'students', 'accounts', 'ledger', 'assignments', 'concessions', 'dues', 'collection', 'receipts', 'reports', 'refunds'] },
]

export const studentAccountOperations = [
  { label: 'Fee Assignment', to: '/fees/assignments', description: 'Assign published fee structures to eligible students.' },
  { label: 'Scholarships & Concessions', to: '/fees/concessions', description: 'Manage scholarships, waivers and approved fee reductions.' },
  { label: 'Dues & Penalties', to: '/fees/dues', description: 'Review overdue balances and applicable penalties.' },
]

export const isFeeRoute = pathname => pathname === '/fees' || pathname.startsWith('/fees/')
export function feeNavigationItem(pathname) {
  if (!isFeeRoute(pathname)) return null
  const section = pathname.split('/')[2] || 'overview'
  return feeNavigation.find(item => item.sections.includes(section)) || null
}
export function feeBreadcrumbs(pathname) {
  if (!isFeeRoute(pathname)) return null
  const item = feeNavigationItem(pathname)
  const crumbs = [{ label: 'Finance' }]
  if (item) crumbs.push({ label: item.label, to: item.to })
  const section = pathname.split('/')[2] || 'overview'
  const managementTabs = {
    overview: 'Overview', students: 'Student Fees', accounts: 'Student Fees', ledger: 'Student Fees', assignments: 'Student Fees',
    concessions: 'Student Fees', dues: 'Student Fees', refunds: 'Student Fees', collection: 'Collect Payment', receipts: 'Receipts & History', reports: 'Reports',
  }
  if (item?.label === 'Fee Management' && managementTabs[section]) crumbs.push({ label: managementTabs[section] })
  const operation = studentAccountOperations.find(operation => pathname === operation.to || pathname === `${operation.to}/`)
  if (operation) crumbs.push({ label: operation.label })
  const facilityEditor = pathname.match(/^\/fees\/structures\/(hostel|transport)\/(create|[^/]+\/edit)\/?$/)
  if (facilityEditor) crumbs.push({ label: `${facilityEditor[2] === 'create' ? 'Create' : 'Edit'} ${facilityEditor[1] === 'hostel' ? 'Hostel' : 'Transport'} Fee Structure` })
  else if (pathname === '/fees/structures/create') crumbs.push({ label: 'Create Fee Structure' })
  else if (/^\/fees\/structures\/[^/]+\/edit\/?$/.test(pathname)) crumbs.push({ label: 'Edit Fee Structure' })
  else if (pathname.startsWith('/fees/structures/') && pathname !== '/fees/structures/') crumbs.push({ label: 'Structure Details' })
  else if (pathname.startsWith('/fees/ledger/')) crumbs.push({ label: 'Student Financial Profile' })
  else if (pathname === '/fees/components') crumbs.push({ label: 'Fee Components' })
  else if (pathname === '/fees/collection') crumbs.push({ label: 'Collect Payment' })
  else if (pathname === '/fees/refunds') crumbs.push({ label: 'Refund Requests' })
  return crumbs
}
