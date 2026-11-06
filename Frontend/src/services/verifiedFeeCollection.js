const receiptRef=value=>typeof value==='string' && value.trim() && !['0','null','undefined','-','—'].includes(value.trim().toLowerCase())
const positiveId=value=>(typeof value==='number'||typeof value==='string')&&Number.isSafeInteger(Number(value))&&Number(value)>0
export const hasOfficialFeeReceipt=receipt=>Boolean(positiveId(receipt?.receiptId)||receiptRef(receipt?.receiptNumber))
export const feeAmountReported=value=>(typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value))
export const canPrintFeeReceipt = receipt => Boolean(
  receiptRef(receipt?.receiptNumber) && receiptRef(receipt?.studentName) &&
  receiptRef(receipt?.paymentMode) &&
  !Number.isNaN(Date.parse(receipt?.issuedAt || receipt?.paymentDate)) &&
  feeAmountReported(receipt?.totalAmount) && Number(receipt.totalAmount) > 0
)

const unresolvedCollections = new Set()
const pendingCollections = new Set()

// Acknowledged collections must not be submitted again when the receipt is missing.
// Existing backend rejection responses remain retryable; ambiguous transport outcomes
// require checking payment history before opening another collection.
export async function collectVerifiedPayment(collect, payload, progress, collegeId) {
  const key = collegeId && positiveId(payload.studentFeeId) ? [collegeId, payload.studentFeeId].join(':') : null
  if (progress.receipt) return progress.receipt
  if (progress.uncertain || key && unresolvedCollections.has(key)) throw new Error('Check payment history before collecting again. The previous payment outcome is unconfirmed.')
  if (progress.pending || key && pendingCollections.has(key)) throw new Error('A payment request is already in progress.')
  progress.pending = true
  if (key) pendingCollections.add(key)
  try {
    const receipt = await collect(payload)
    if (!receipt || !hasOfficialFeeReceipt(receipt) && !positiveId(receipt.paymentId)) {
      progress.uncertain = true
      throw new Error('The server did not return a receipt identity. Check payment history before collecting again.')
    }
    progress.receipt = receipt
    return receipt
  } catch (error) {
    const status = Number(error?.status)
    if (!status || status >= 500 || status === 408) progress.uncertain = true
    if (key && progress.uncertain) unresolvedCollections.add(key)
    throw error
  } finally {
    progress.pending = false
    if (key) pendingCollections.delete(key)
  }
}
