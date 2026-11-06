import { expect, test, vi } from 'vitest'
import { collectVerifiedPayment, hasOfficialFeeReceipt, feeAmountReported, canPrintFeeReceipt } from '../services/verifiedFeeCollection'
test('verified payment preserves actual receipt and never repeats an acknowledged collection',async()=>{const collect=vi.fn(async()=>({receiptId:41,receiptNumber:'OFFICIAL-41'})),progress={};expect(await collectVerifiedPayment(collect,{feeAmount:150},progress)).toEqual({receiptId:41,receiptNumber:'OFFICIAL-41'});await collectVerifiedPayment(collect,{feeAmount:150},progress);expect(collect).toHaveBeenCalledTimes(1)})
test('missing receipt identity blocks blind repeated payment and never returns fabricated receipt',async()=>{const collect=vi.fn(async()=>({})),progress={};await expect(collectVerifiedPayment(collect,{},progress)).rejects.toThrow('receipt identity');await expect(collectVerifiedPayment(collect,{},progress)).rejects.toThrow('Check payment history');expect(collect).toHaveBeenCalledTimes(1)})
test('definitive backend validation rejects without success and permits corrected retry',async()=>{const collect=vi.fn().mockRejectedValueOnce(Object.assign(new Error('Amount exceeds balance'),{status:400})).mockResolvedValue({receiptId:5}),progress={};await expect(collectVerifiedPayment(collect,{feeAmount:200},progress)).rejects.toThrow('exceeds balance');expect(await collectVerifiedPayment(collect,{feeAmount:100},progress)).toEqual({receiptId:5})})
test('ambiguous transport failure requires payment history verification',async()=>{const collect=vi.fn().mockRejectedValue(Object.assign(new Error('Connection lost'),{status:0})),progress={};await expect(collectVerifiedPayment(collect,{},progress)).rejects.toThrow('Connection lost');await expect(collectVerifiedPayment(collect,{},progress)).rejects.toThrow('history');expect(collect).toHaveBeenCalledTimes(1)})
test('payment acknowledgement without a receipt never qualifies as a printable receipt',async()=>{const collect=vi.fn(async()=>({paymentId:9})),progress={};const saved=await collectVerifiedPayment(collect,{},progress);expect(hasOfficialFeeReceipt(saved)).toBe(false);expect(hasOfficialFeeReceipt({receiptNumber:'OFFICIAL-9'})).toBe(true);await collectVerifiedPayment(collect,{},progress);expect(collect).toHaveBeenCalledTimes(1)})
test('unreported payment amounts and balances are distinct from a confirmed zero',()=>{expect(feeAmountReported(null)).toBe(false);expect(feeAmountReported(undefined)).toBe(false);expect(feeAmountReported(0)).toBe(true)})

test('an unclassified network failure blocks a repeat from a reopened dialog', async () => {
  const collect = vi.fn().mockRejectedValue(new TypeError('Network unavailable'))
  const payload = { studentFeeId: 42, feeAmount: 25 }
  await expect(collectVerifiedPayment(collect, payload, {}, 7)).rejects.toThrow('Network unavailable')
  await expect(collectVerifiedPayment(collect, payload, {}, 7)).rejects.toThrow('unconfirmed')
  expect(collect).toHaveBeenCalledOnce()
})
test('receipt printing requires the reported amount, student, date and payment method', () => {
  const receipt = { receiptNumber:'F-123', studentName:'Student', paymentMode:'CASH', issuedAt:'2026-11-06', totalAmount:25 }
  expect(canPrintFeeReceipt(receipt)).toBe(true)
  expect(canPrintFeeReceipt({ ...receipt, totalAmount:null })).toBe(false)
  expect(canPrintFeeReceipt({ ...receipt, receiptNumber:'', paymentId:12 })).toBe(false)
})

test('acknowledged partial collection allows a separate collection of the remaining balance', async () => {
  const collect = vi.fn().mockResolvedValueOnce({ paymentId: 71 }).mockResolvedValueOnce({ paymentId: 72 })
  const partial = { studentFeeId: 43, feeAmount: 25, paymentMode: 'CASH' }
  const remainder = { ...partial, feeAmount: 75 }
  await expect(collectVerifiedPayment(collect, partial, {}, 7)).resolves.toEqual({ paymentId: 71 })
  await expect(collectVerifiedPayment(collect, remainder, {}, 7)).resolves.toEqual({ paymentId: 72 })
  expect(collect.mock.calls).toEqual([[partial], [remainder]])
})
