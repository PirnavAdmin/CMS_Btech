// Read only values supplied by Student Integration. Zero is a valid amount.
export function studentIntegrationFees(summary = {}, structure = {}) {
  const source = { ...(structure || {}), ...(summary || {}) }
  const amount = (...keys) => {
    const key = keys.find(key => source[key] != null && source[key] !== '')
    const value = key ? Number(source[key]) : null
    return Number.isFinite(value) && value >= 0 ? value : null
  }
  const payable = amount('firstYearTotal', 'payableAmount', 'totalPayable', 'totalFee', 'totalAmount')
  const paid = amount('amountPaid', 'paidAmount', 'totalPaid')
  const balance = amount('balanceAmount', 'outstandingBalance', 'balance')
  const plan = source.academicFeePlan
  const components = source.feeComponents ?? source.components ?? plan?.components ?? []
  const configured = source.academicContextValid !== false && Boolean(source.feeStructureId || source.structureId || plan || components.length || payable > 0)
  return {
    ...source, configured, source: configured ? 'backend' : 'unconfigured',
    structureId: source.feeStructureId ?? source.structureId ?? '',
    structureName: source.structureName ?? source.planName ?? plan?.name ?? '',
    planName: source.planName ?? source.structureName ?? plan?.name ?? '',
    tuitionFee: amount('tuitionFee') ?? 0, admissionFee: amount('admissionFee') ?? 0,
    hostelFee: amount('hostelFee') ?? 0, transportFee: amount('transportationFee', 'transportFee') ?? 0,
    scholarshipAmount: amount('scholarshipAmount') ?? 0,
    totalFee: payable ?? 0, payableAmount: payable,
    paidAmount: paid, balanceAmount: balance ?? (payable != null && paid != null ? Math.max(0, payable - paid) : null),
    balanceVerified: payable != null && paid != null,
    components: Array.isArray(components) ? components : [],
    installments: source.paymentSchedule ?? source.installments ?? [],
    paymentStatus: source.paymentStatus || 'Unavailable', paymentPlan: source.paymentPlan || '',
  }
}
