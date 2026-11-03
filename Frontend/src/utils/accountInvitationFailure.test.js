import test from 'node:test'
import assert from 'node:assert/strict'
import { accountInvitationFailure, invitationDeliveryMessage } from './accountInvitationFailure.js'
test('saved-account delivery failure retains IDs and safe correlation without trusting nextAction', () => {
 const failure = accountInvitationFailure({ success: false, code: 'ACCOUNT_INVITATION_DELIVERY_FAILED', userId: 41, collegeId: 106, accountCreated: false, smtpAccepted: false, data: { accountSaved: true, retryAllowed: true }, nextAction: 'https://untrusted.test', correlationId: 'a212f14f2017446dacd443bca8be859e' })
 assert.equal(failure.userId, 41); assert.equal(failure.collegeId, 106); assert.equal(failure.accountSaved, true)
 assert.equal(failure.nextAction, undefined); assert.match(invitationDeliveryMessage(failure), /do not repeat onboarding/)
 assert.match(invitationDeliveryMessage(failure), /a212f14f2017446dacd443bca8be859e/)
})
test('local nested failure DTO is supported without reporting delivery success', () => {
 assert.equal(accountInvitationFailure({ code: 'INVITATION_EMAIL_FAILED', data: { userId: 41, collegeId: 106, emailStatus: 'Failed' } }).smtpAccepted, false)
})
test('unrelated errors, invalid IDs and provider-success contradictions are not reclassified', () => {
 assert.equal(accountInvitationFailure({ code: 'UNKNOWN', userId: 41, collegeId: 106 }), null)
 assert.equal(accountInvitationFailure({ code: 'INVITATION_EMAIL_FAILED', userId: 0, collegeId: 106 }), null)
 assert.equal(accountInvitationFailure({ code: 'INVITATION_EMAIL_FAILED', userId: 41, collegeId: 106, smtpAccepted: true }), null)
})
