import { call, requireId, unwrap } from './scopedModulesService'

export async function inviteCollegeAccount(value) {
  const response = await call('admin/users/invite', {
    method: 'POST',
    body: {
      collegeId: requireId(value.collegeId, 'college'),
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      mobile: value.mobile.trim() || null,
      roleIds: [requireId(value.roleId, 'role')],
      ...(value.permissions ? { permissions: value.permissions } : {}),
    },
  })
  if (!(Number(unwrap(response)?.userId) > 0)) throw Object.assign(new Error('The server did not confirm the new account identity. Review invitation history before another creation.'), { creationUnconfirmed: true })
  return response
}

export async function readAccountDetails(user) {
  const id = requireId(user.userId, 'user')
  const collegeId = requireId(user.collegeId, 'college')
  const value = unwrap(await call(`admin/users/${id}/access`))
  if (Number(value?.user?.userId) !== id || Number(value.user.collegeId) !== collegeId || !Array.isArray(value.permissions)) {
    throw new Error('The account access response does not match this user and college.')
  }
  return value
}

export async function readAccountAccess(user) {
  const value = await readAccountDetails(user)
  return value.permissions.filter(row => Number(row.collegeId) === Number(user.collegeId))
}

export async function readDirectoryPages(readPage, identity, pageSize = 200) {
  const records = new Map()
  for (let pageNumber = 1; ; pageNumber++) {
    const page = await readPage({ pageNumber, pageSize })
    if (!Array.isArray(page)) throw new Error('The server returned an invalid directory page.')
    const previousCount = records.size
    page.forEach(row => records.set(requireId(row[identity], 'directory record'), row))
    if (page.length < pageSize) return [...records.values()]
    if (records.size === previousCount) throw new Error('The server repeated a directory page. Refresh before relying on these results.')
  }
}

export async function saveAccountAccess(user, permissions, acknowledgement) {
  const id = requireId(user.userId, 'user')
  const collegeId = requireId(user.collegeId, 'college')
  if (!acknowledgement.current) {
    acknowledgement.current = true
    try {
      await call(`admin/users/${id}/permissions`, { method: 'PUT', body: { collegeId, permissions } })
    } catch (error) {
      if (error.status >= 400 && error.status < 500 && ![408, 409].includes(error.status)) acknowledgement.current = false
      throw error
    }
  }
  const saved = await readAccountAccess(user)
  const signature = rows => JSON.stringify(rows.map(row => [row.moduleKey, ...['canView', 'canCreate', 'canEdit', 'canDelete', 'canExport'].map(field => row[field] === true || row[field] === 1)]).sort(([left], [right]) => left.localeCompare(right)))
  if (signature(saved) !== signature(permissions)) throw new Error('Account permissions were saved but verification differs. Reload the account before another change.')
  return saved
}
