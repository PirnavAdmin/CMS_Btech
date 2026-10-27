// Accept the API envelope as well as the existing direct session contract.
export function normalizeLoginSession(response) {
  if (response?.success === false) throw new Error('Authentication failed')
  const session = response?.data ?? response
  const user = session?.user ?? {}
  const roles = [session?.roles, user.roles, user.role].flat().filter(Boolean)
  if (!session?.accessToken || !roles.length) throw new Error('Malformed authentication response')
  return {
    ...session,
    roles,
    user: {
      ...user,
      role: user.role || roles[0],
      id: user.id ?? user.userId ?? session.userId,
      name: user.name ?? user.fullName ?? session.fullName,
      email: user.email ?? session.email,
      mobile: user.mobile ?? session.mobile,
      employeeUserId: user.employeeUserId ?? session.employeeUserId,
      collegeId: user.collegeId ?? session.collegeId,
      mustChangePassword: user.mustChangePassword ?? session.mustChangePassword,
    },
  }
}
