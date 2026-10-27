const field = (row, ...keys) => keys.map(key => row?.[key]).find(value => value !== undefined && value !== null && value !== '')
const userId = row => String(field(row, 'userId', 'UserId', 'user_id', 'id') || '')
const collegeId = row => String(field(row, 'collegeId', 'CollegeId', 'college_id') || '')
const active = row => [1, '1', true, 'active'].includes(field(row, 'status', 'Status'))

// Faculty IDs and user IDs are different keys. Never infer one from the other.
export function resolveStaffAccount(staff, users, college) {
  const scoped = users.filter(row => (!college || collegeId(row) === String(college)) && active(row))
  const linkedId = field(staff, 'userId', 'UserId', 'user_id')
  const email = String(staff.email || '').trim().toLowerCase()
  const employee = String(field(staff, 'employeeUserId', 'EmployeeUserId') || '').trim()
  const matches = scoped.filter(row => linkedId ? userId(row) === String(linkedId)
    : employee ? String(field(row, 'employeeUserId', 'EmployeeUserId') || '').trim() === employee
    : email && String(field(row, 'email', 'Email') || '').trim().toLowerCase() === email)
  if (matches.length !== 1) throw new Error('This staff member needs one active login account in this college before assigning access.')
  return Number(userId(matches[0]))
}

export function planRoleAssignment(mappings, targetUserId, roleId) {
  if (!Number.isInteger(Number(roleId)) || Number(roleId) <= 0) throw new Error('Save this role to the server before assigning login access.')
  const current = mappings.filter(row => String(field(row, 'userId', 'UserId')) === String(targetUserId) && active(row))
  if (current.some(row => String(field(row, 'roleId', 'RoleId')) === String(roleId))) return { method: 'none' }
  if (current.length > 1) throw new Error('This account has multiple active roles. Review its existing role mappings before replacing access.')
  const reusable = current[0] || mappings.find(row => String(field(row, 'userId', 'UserId')) === String(targetUserId) && String(field(row, 'roleId', 'RoleId')) === String(roleId))
  return { method: reusable ? 'PUT' : 'POST', id: field(reusable, 'userRoleId', 'UserRoleId', 'user_role_id'), payload: { userId: targetUserId, roleId: Number(roleId), status: 1 } }
}
