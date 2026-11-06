const normalized = value => String(value || '').trim().toLowerCase()
export const isPendingInvitation = row => Boolean(row?.invitationId && row?.userId && row?.collegeId && ['Pending Invitation', 'Expired', 'Email Failed', 'Not Created'].includes(row.invitationStatus))
export const canResendInvitation = row => isPendingInvitation(row) && row.canResend !== false && !(row.retryAfterSeconds > 0)
export function resolveOnboardingConflict(records, payload, deliveryFailure = null) {
  const email = normalized(payload.email), code = normalized(payload.collegeCode), mobile = normalized(payload.mobile)
  const sameEmail = records.filter(row => normalized(row.email) === email)
  // Only an exact server-confirmed user/college association can expose recovery.
  const exact = sameEmail.filter(row => normalized(row.collegeCode) === code && normalized(row.mobile) === mobile && isPendingInvitation(row))
  if (exact.length === 1 && sameEmail.length === 1 && (!deliveryFailure || (String(exact[0].userId) === String(deliveryFailure.userId) && String(exact[0].collegeId) === String(deliveryFailure.collegeId)))) return { match: exact[0] }
  if (sameEmail.length) return { conflict: 'This email is already linked to an existing account. Its college association or invitation status does not match this request. No invitation or password reset was sent.' }
  if (records.some(row => normalized(row.collegeCode) === code || normalized(row.mobile) === mobile)) return { conflict: 'The college code or mobile belongs to an existing onboarding record. Review Pending Invitations; no college association was changed and no email was sent.' }
  return {}
}
