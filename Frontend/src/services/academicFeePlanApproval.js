export async function approveForAdmission(api, id, collegeId) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number(collegeId)) throw new Error('Save this fee plan to the server before approving it for admission.')
  let plan = await api.get(id, collegeId)
  if (String(plan.status).toUpperCase() === 'SUBMITTED') plan = await api.transition(id, collegeId, 'approve', plan.revision)
  if (String(plan.status).toUpperCase() === 'APPROVED') {
    try { plan = await api.transition(id, collegeId, 'publish', plan.revision) }
    catch { throw new Error('Approval was saved, but the plan is not available for admission yet. Click Approve Plan again to retry.') }
  }
  if (String(plan.status).toUpperCase() !== 'PUBLISHED') throw new Error('Submit this plan for approval before making it available for admission.')
  const saved = await api.get(id, collegeId)
  if (String(saved.status).toUpperCase() !== 'PUBLISHED') throw new Error('Admission availability could not be verified. Please retry approval.')
  return saved
}
