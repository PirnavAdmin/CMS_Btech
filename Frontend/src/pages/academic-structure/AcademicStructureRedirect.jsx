import { Navigate, useLocation } from 'react-router-dom'

export default function AcademicStructureRedirect({ step }) {
  const { pathname, search, hash, state } = useLocation()
  const params = new URLSearchParams(search)
  params.set('step', step)
  const [, , first, second] = pathname.split('/')
  const prefix = step === 'departments' ? 'department' : step === 'courses' ? 'course' : 'branch'
  if (['add', 'new', 'create'].includes(first)) params.set(prefix + 'Action', 'add')
  else if (/^\d+$/.test(first || '')) {
    params.set(prefix + 'Id', first)
    params.set(prefix + 'Action', second === 'edit' ? 'edit' : 'view')
  }
  return <Navigate replace to={{ pathname: '/academic-structure', search: '?' + params.toString(), hash }} state={state} />
}
