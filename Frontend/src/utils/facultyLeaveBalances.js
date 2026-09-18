const id = value => value == null ? '' : String(value)
const numeric = (...values) => {
  const value = values.find(value => value !== null && value !== undefined && value !== '')
  return value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null
}
const metrics = row => {
  const entitled = numeric(row.entitled, row.entitlement, row.totalEntitlement, row.totalEntitled, row.entitledDays)
  const used = numeric(row.used, row.usedDays, row.totalUsed)
  const pending = numeric(row.pending, row.pendingDays, row.totalPending)
  const available = numeric(row.available, row.availableDays, row.remainingDays, row.balance, row.totalAvailable)
  return { entitled, used, pending, available: available ?? (entitled !== null && used !== null && pending !== null ? entitled - used - pending : null) }
}
const hasMetrics = row => Object.values(metrics(row)).some(value => value !== null)

export function employeeLeaveBalances(rows, employee, policy) {
  const matches = rows.filter(row => {
    const facultyId = row.facultyId ?? row.employee?.facultyId ?? row.employee?.id ?? row.faculty?.facultyId ?? row.faculty?.id
    const employeeCode = row.employeeId ?? row.facultyCode ?? row.employee?.employeeId
    const sameEmployee = facultyId != null ? id(facultyId) === id(employee.id)
      : employeeCode != null ? id(employeeCode) === id(employee.employeeId)
        : id(row.id) === id(employee.id)
    return sameEmployee && (!policy?.id || !row.policyId || id(row.policyId) === id(policy.id))
  })
  const details = matches.flatMap(row => {
    const children = row.balances ?? row.leaveBalances ?? row.leaveTypes ?? row.details
    return Array.isArray(children) ? children : row.leaveTypeId != null || row.typeId != null ? [row] : []
  }).filter(row => !policy?.id || !row.policyId || id(row.policyId) === id(policy.id))
    .map(row => ({ ...row, typeId: id(row.leaveTypeId ?? row.typeId ?? row.leaveType?.id), ...metrics(row) }))
  const summary = matches.find(row => row.leaveTypeId == null && row.typeId == null && hasMetrics(row.totals ?? row.summary ?? row))
  const totals = summary ? metrics(summary.totals ?? summary.summary ?? summary) : Object.fromEntries(
    ['entitled', 'used', 'pending', 'available'].map(key => [key, details.length && details.every(row => row[key] !== null) ? details.reduce((sum, row) => sum + row[key], 0) : null])
  )
  return { details, totals }
}

export function leaveBalanceRules(balance, policy, leaveTypes) {
  const rules = new Map()
  for (const row of [...(policy?.entitlements ?? []), ...balance.details]) {
    const typeId = id(row.typeId ?? row.leaveTypeId)
    if (typeId) rules.set(typeId, { ...rules.get(typeId), ...row, typeId })
  }
  if (!rules.size) for (const type of leaveTypes) rules.set(id(type.id), { typeId: id(type.id) })
  return [...rules.values()]
}
