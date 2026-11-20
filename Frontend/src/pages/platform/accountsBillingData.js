const todayKey = value => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const dateKey = value => {
  if (!value) return null
  const raw = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayKey(value)
}

export function daysUntil(value, now = new Date()) {
  const target = dateKey(value)
  const today = todayKey(now)
  if (!target || !today) return null
  const toUtcDays = key => {
    const [year, month, day] = key.split('-').map(Number)
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
  }
  return toUtcDays(target) - toUtcDays(today)
}

const normalizedStatus = value => String(value || '').trim().toLowerCase()
const isActive = value => value === true || value === 1 || ['1', 'active', 'enabled', 'profile pending'].includes(normalizedStatus(value))
const valuesForRoles = user => [
  ...(Array.isArray(user?.roleCodes) ? user.roleCodes : []),
  ...(Array.isArray(user?.roleNames) ? user.roleNames : []),
  ...(Array.isArray(user?.roles) ? user.roles : []),
  user?.roleCode,
  user?.roleName,
].filter(Boolean).map(value => String(value).trim().toUpperCase().replace(/[\s-]+/g, '_'))
const hasRole = (user, pattern) => valuesForRoles(user).some(role => pattern.test(role))
const recordId = row => row?.collegeId ?? row?.CollegeId ?? row?.organizationId ?? row?.id ?? row?.Id
const subscriptionOrgId = row => row?.organizationId ?? row?.OrganizationId ?? row?.collegeId ?? row?.CollegeId
const subscriptionStart = row => dateKey(row?.startDate ?? row?.StartDate)

function effectiveStatus(subscription, now) {
  if (!subscription) return 'No subscription'
  const status = String(subscription.status ?? subscription.Status ?? 'Unknown').trim()
  const key = status.toLowerCase()
  const days = daysUntil(subscription.endDate ?? subscription.EndDate, now)
  if (key === 'cancelled' || key === 'suspended') return status
  if (days != null && days < 0) return 'Expired'
  const startsIn = daysUntil(subscription.startDate ?? subscription.StartDate, now)
  if (startsIn != null && startsIn > 0) return 'Scheduled'
  if (key === 'trial') return 'Trial'
  if (key === 'active') return 'Active'
  return status
}

const permissionCount = user => {
  const permissions = user?.permissions
  if (!permissions || typeof permissions !== 'object') return null
  const count = Object.values(permissions).filter(grant => grant && typeof grant === 'object'
    && (grant.canView === true || grant.CanView === true || grant.canView === 1 || grant.CanView === 1)).length
  return count || null
}

export function buildBillingAccounts(organizations = [], subscriptions = [], users = [], now = new Date()) {
  const subscriptionsByOrganization = new Map()
  subscriptions.forEach(subscription => {
    const organizationId = subscriptionOrgId(subscription)
    if (organizationId == null) return
    const key = String(organizationId)
    const rows = subscriptionsByOrganization.get(key) || []
    rows.push(subscription)
    subscriptionsByOrganization.set(key, rows)
  })

  const usersByOrganization = new Map()
  users.forEach(user => {
    const organizationId = user?.collegeId ?? user?.CollegeId ?? user?.primaryCollegeId ?? user?.PrimaryCollegeId
    if (organizationId == null) return
    const key = String(organizationId)
    const rows = usersByOrganization.get(key) || []
    rows.push(user)
    usersByOrganization.set(key, rows)
  })

  return organizations.map(organization => {
    const id = recordId(organization)
    const idKey = String(id ?? '')
    const allSubscriptions = [...(subscriptionsByOrganization.get(idKey) || [])]
      .sort((a, b) => String(subscriptionStart(b) || '').localeCompare(String(subscriptionStart(a) || '')))
    const currentSubscription = allSubscriptions.find(subscription => {
      const status = effectiveStatus(subscription, now).toLowerCase()
      return status === 'active' || status === 'trial'
    }) || allSubscriptions[0] || null
    const allUsers = usersByOrganization.get(idKey) || []
    const activeUsers = allUsers.filter(user => isActive(user.accountStatus ?? user.status ?? user.AccountStatus ?? user.Status))
    const administrators = allUsers.filter(user => hasRole(user, /COLLEGE_ADMIN|COLLEGE_ADMINISTRATOR/))
    const activeAdministrators = administrators.filter(user => isActive(user.accountStatus ?? user.status ?? user.AccountStatus ?? user.Status))
    const admin = activeAdministrators[0] || administrators[0] || null
    const maximumUsers = Number(currentSubscription?.maximumUsers ?? currentSubscription?.MaximumUsers)
    const daysRemaining = daysUntil(currentSubscription?.endDate ?? currentSubscription?.EndDate, now)
    const studentCount = activeUsers.filter(user => hasRole(user, /(^|_)STUDENT($|_)/)).length
    const facultyCount = activeUsers.filter(user => hasRole(user, /FACULTY|TEACHER/)).length
    const adminPermissionCount = admin ? permissionCount(admin) : null
    return {
      id,
      source: organization,
      name: organization.collegeName ?? organization.CollegeName ?? organization.name ?? organization.organizationName ?? 'Unnamed organization',
      code: organization.collegeCode ?? organization.CollegeCode ?? organization.code ?? '',
      logo: organization.logoUrl ?? organization.logoPath ?? organization.collegeLogo ?? organization.logo ?? '',
      email: organization.email ?? organization.collegeEmail ?? organization.CollegeEmail ?? '',
      phone: organization.mobile ?? organization.Mobile ?? organization.contactNumber ?? organization.phoneNumber ?? '',
      admin: admin ? {
        id: admin.userId ?? admin.id,
        name: admin.fullName ?? admin.name ?? 'College administrator',
        email: admin.email ?? '',
        status: admin.accountStatus ?? admin.status,
        moduleCount: adminPermissionCount,
      } : null,
      subscription: currentSubscription ? {
        id: currentSubscription.subscriptionId ?? currentSubscription.id,
        planName: currentSubscription.planName ?? currentSubscription.PlanName ?? 'Plan not named',
        billingCycle: currentSubscription.billingCycle ?? currentSubscription.BillingCycle ?? '',
        price: Number(currentSubscription.price ?? currentSubscription.Price),
        maximumUsers: Number.isFinite(maximumUsers) && maximumUsers > 0 ? maximumUsers : null,
        startDate: currentSubscription.startDate ?? currentSubscription.StartDate ?? null,
        endDate: currentSubscription.endDate ?? currentSubscription.EndDate ?? null,
        status: effectiveStatus(currentSubscription, now),
        originalStatus: currentSubscription.status ?? currentSubscription.Status ?? '',
      } : null,
      subscriptionHistory: allSubscriptions.map(subscription => ({
        ...subscription,
        status: effectiveStatus(subscription, now),
        startDate: subscription.startDate ?? subscription.StartDate ?? null,
        endDate: subscription.endDate ?? subscription.EndDate ?? null,
        planName: subscription.planName ?? subscription.PlanName ?? 'Plan not named',
        billingCycle: subscription.billingCycle ?? subscription.BillingCycle ?? '',
        price: Number(subscription.price ?? subscription.Price),
      })),
      daysRemaining,
      activeUserCount: activeUsers.length,
      studentCount,
      facultyCount,
      usagePercentage: maximumUsers
        ? Math.min(100, Math.round(activeUsers.length / maximumUsers * 100))
        : null,
      paymentStatus: 'Not tracked',
      storageUsage: null,
      enabledModuleCount: adminPermissionCount,
    }
  })
}

export function summarizeBillingAccounts(accounts = [], now = new Date()) {
  const expiringIn = days => accounts.filter(account => {
    const status = account.subscription?.status?.toLowerCase()
    return status === 'active' && account.daysRemaining != null && account.daysRemaining >= 0 && account.daysRemaining <= days
  }).length
  return {
    totalAccounts: accounts.length,
    activeSubscriptions: accounts.filter(account => account.subscription?.status?.toLowerCase() === 'active').length,
    trials: accounts.filter(account => account.subscription?.status?.toLowerCase() === 'trial').length,
    expiring7: expiringIn(7),
    expiring30: expiringIn(30),
    expired: accounts.filter(account => account.subscription?.status?.toLowerCase() === 'expired').length,
    pendingPayments: null,
    outstandingAmount: null,
    revenue: null,
    generatedAt: todayKey(now),
  }
}

export function filterBillingAccounts(accounts = [], filters = {}) {
  const search = String(filters.search || '').trim().toLowerCase()
  const rows = accounts.filter(account => {
    const subscription = account.subscription
    const matchesSearch = !search || [account.name, account.code, account.admin?.name, account.admin?.email, subscription?.planName]
      .some(value => String(value || '').toLowerCase().includes(search))
    const matchesCollege = !filters.college || filters.college === 'all' || String(account.id) === String(filters.college)
    const matchesPlan = !filters.plan || filters.plan === 'all' || subscription?.planName === filters.plan
    const matchesStatus = !filters.status || filters.status === 'all' || (subscription?.status || 'No subscription') === filters.status
    const matchesCycle = !filters.cycle || filters.cycle === 'all' || subscription?.billingCycle === filters.cycle
    const days = account.daysRemaining
    const matchesExpiry = !filters.expiry || filters.expiry === 'all'
      || (filters.expiry === 'expired' && subscription?.status === 'Expired')
      || (filters.expiry === '7' && days != null && days >= 0 && days <= 7)
      || (filters.expiry === '30' && days != null && days >= 0 && days <= 30)
      || (filters.expiry === 'no-plan' && !subscription)
    return matchesSearch && matchesCollege && matchesPlan && matchesStatus && matchesCycle && matchesExpiry
  })
  const direction = filters.direction === 'desc' ? -1 : 1
  const key = filters.sort || 'name'
  return rows.sort((a, b) => {
    const left = key === 'expiry' ? a.daysRemaining ?? Number.POSITIVE_INFINITY
      : key === 'usage' ? a.usagePercentage ?? -1
        : key === 'plan' ? a.subscription?.planName || '' : a.name
    const right = key === 'expiry' ? b.daysRemaining ?? Number.POSITIVE_INFINITY
      : key === 'usage' ? b.usagePercentage ?? -1
        : key === 'plan' ? b.subscription?.planName || '' : b.name
    return typeof left === 'number' && typeof right === 'number'
      ? (left - right) * direction
      : String(left).localeCompare(String(right)) * direction
  })
}
