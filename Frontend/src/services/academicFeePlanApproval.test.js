import test from 'node:test'
import assert from 'node:assert/strict'
import { approveForAdmission } from './academicFeePlanApproval.js'
function server(status = 'SUBMITTED') {
  let row = { status, revision:1 }; const calls=[]
  return { calls, get:async () => ({...row}), transition:async (_id,_college,action,revision) => {
    assert.equal(revision,row.revision); calls.push(action)
    row = { status:action === 'approve' ? 'APPROVED' : 'PUBLISHED',revision:revision+1 }; return {...row}
  } }
}
test('approval makes the plan available to admission using current server revisions', async () => {
  const api=server(); const row=await approveForAdmission(api,4,1)
  assert.deepEqual(api.calls,['approve','publish']); assert.equal(row.status,'PUBLISHED')
})
test('retry resumes an already approved plan and does not approve twice', async () => {
  const api=server('APPROVED'); await approveForAdmission(api,4,1); assert.deepEqual(api.calls,['publish'])
})
test('an already available plan requires no transition', async () => {
  const api=server('PUBLISHED'); await approveForAdmission(api,4,1); assert.deepEqual(api.calls,[])
})
test('activation failure is not reported as complete approval', async () => {
  const api=server('APPROVED'); api.transition=async () => { throw Error('offline') }
  await assert.rejects(approveForAdmission(api,4,1),/not available for admission yet/)
})
test('draft and unsaved plans cannot bypass approval', async () => {
  const api=server('DRAFT'); await assert.rejects(approveForAdmission(api,4,1),/Submit/)
  await assert.rejects(approveForAdmission(api,'local-4',1),/Save this fee plan/)
  assert.deepEqual(api.calls,[])
})
