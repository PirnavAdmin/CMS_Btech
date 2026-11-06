import test from 'node:test'
import assert from 'node:assert/strict'
import {updateAcademicFeeDraft} from './academicFeeDraftUpdate.js'
const original={id:41,backendRevision:3,status:'Draft',collegeId:7,code:'AFP-41',studentCategory:'General'}
const form={academicYearId:1,courseId:2,branchId:3,semesterId:4,feeCategoryId:8,name:'Engineering fee',batch:'2025-2029',category:'Convener',cycle:'Semester-wise',plan:'Full Payment',effectiveFrom:'2026-07-01',effectiveTo:'2026-12-31',dueDate:'2026-10-15',components:[{code:'TUITION',name:'Tuition',amount:2000}]}
test('draft edit uses the real backend ID and original revision',async()=>{let request;const saved=await updateAcademicFeeDraft({update:async(...args)=>{request=args;return {feeStructureId:41,revision:4}}},original,form,7);assert.equal(saved.revision,4);assert.equal(request[0],41);assert.equal(request[1].expectedRevision,3);assert.equal(request[1].studentCategory,'General');assert.deepEqual(request[1].installments,[{number:1,dueDate:'2026-10-15',amount:2000}])})
test('draft edit blocks another college and invalid schedule before writing',async()=>{const api={update:()=>assert.fail('unexpected write')};await assert.rejects(updateAcademicFeeDraft(api,original,form,8),/working college/);await assert.rejects(updateAcademicFeeDraft(api,original,{...form,dueDate:'2027-01-01'},7),/within plan validity/)})
test('draft edit never reports an unacknowledged save',async()=>{await assert.rejects(updateAcademicFeeDraft({update:async()=>({})},original,form,7),/did not confirm/);await assert.rejects(updateAcademicFeeDraft({update:async()=>{throw Error('Revision changed')}},original,form,7),/Revision changed/)})

test('a new revision retains its lineage and retries an acknowledged result without creating another draft', async () => {
  let calls = 0
  const api = { create: async body => {
    calls += 1
    assert.equal(body.previousFeeStructureId, 41)
    assert.equal(body.code, 'AFP-41')
    assert.equal(body.expectedRevision, undefined)
    return { feeStructureId: 42, revision: 1 }
  } }
  const parent = { ...original, status: 'Published' }
  const options = { revision: true, progress: {} }
  await updateAcademicFeeDraft(api, parent, form, 7, options)
  assert.equal((await updateAcademicFeeDraft(api, parent, form, 7, options)).feeStructureId, 42)
  assert.equal(calls, 1)
})
