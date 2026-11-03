// Preserve only the documented, non-secret delivery-failure metadata.
export function accountInvitationFailure(body) {
  if (!body || !['ACCOUNT_INVITATION_DELIVERY_FAILED', 'INVITATION_EMAIL_FAILED'].includes(body.code)) return null
  const userId = Number(body.userId ?? body.data?.userId), collegeId = Number(body.collegeId ?? body.data?.collegeId)
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(collegeId) || collegeId <= 0 || body.smtpAccepted === true || body.data?.accountSaved === false) return null
  const correlationId = typeof body.correlationId === 'string' && /^[a-zA-Z0-9-]{1,128}$/.test(body.correlationId) ? body.correlationId : undefined
  return { code: body.code, userId, collegeId, accountSaved: true, smtpAccepted: false, retryAllowed: body.data?.retryAllowed !== false, correlationId }
}
export function invitationDeliveryMessage(failure) {
  return `Account saved (User ID ${failure.userId}, College ID ${failure.collegeId}), but the invitation email was not confirmed by the provider. Check the email configuration and retry the existing invitation; do not repeat onboarding.${failure.correlationId ? ' Reference: ' + failure.correlationId + '.' : ''}`
}
