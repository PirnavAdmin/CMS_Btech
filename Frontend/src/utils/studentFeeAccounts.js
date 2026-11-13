// Pending obligations and payment history have different scopes. Never use a
// student's unrelated receipts to reconstruct an individual semester balance.
export const feeNumber = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
export function feePrincipalBalance(row) {
  const assigned = feeNumber(row.payableAmount), paid = feeNumber(row.paidAmount);
  return assigned == null || paid == null ? 0 : Math.max(0, Math.round((assigned - paid) * 100) / 100);
}
export function sumFeeRows(rows, field) {
  return rows.length && rows.every(row => feeNumber(row[field]) != null)
    ? rows.reduce((sum, row) => sum + Math.round(Number(row[field]) * 100), 0) / 100 : null;
}
export function uniqueObligations(rows = []) {
  return [...new Map(rows.filter(row => row.studentFeeId != null).map(row => [String(row.studentFeeId), row])).values()];
}
export function semesterFeeGroups(rows = [], today = new Date().toISOString().slice(0, 10)) {
  const groups = new Map();
  for (const row of uniqueObligations(rows)) {
    const category = /hostel/i.test(row.feeCategory || '') ? 'Hostel' : /transport/i.test(row.feeCategory || '') ? 'Transport' : 'Academic';
    const key = `${category}:${row.semesterId ?? 'unmapped'}`;
    if (!groups.has(key)) groups.set(key, { key, category, semesterId: row.semesterId, semesterName: row.semesterName, rows: [] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()].map(group => {
    const balance = sumFeeRows(group.rows, 'balanceAmount');
    const paid = sumFeeRows(group.rows, 'paidAmount');
    const dueDates = group.rows.filter(row => Number(row.balanceAmount) > 0).map(row => String(row.dueDate || '').slice(0, 10)).filter(Boolean).sort();
    const overdue = group.rows.filter(row => Number(row.balanceAmount) > 0 && row.dueDate && String(row.dueDate).slice(0, 10) < today);
    return { ...group, amount: sumFeeRows(group.rows, 'payableAmount'), paid, balance, dueDate: dueDates[0], overdue: sumFeeRows(overdue, 'balanceAmount') ?? 0,
      status: balance == null ? 'Unavailable' : balance === 0 ? 'Paid' : overdue.length ? 'Overdue' : paid > 0 ? 'Partially Paid' : 'Pending' };
  });
}
export function studentFeeAccounts(students = [], obligations = [], history = []) {
  const accounts = new Map();
  for (const student of students) if (student.id != null && !accounts.has(String(student.id))) accounts.set(String(student.id), { ...student, rows: [], paymentHistory: [] });
  for (const row of uniqueObligations(obligations)) {
    if (row.studentId == null) continue;
    const id = String(row.studentId);
    if (!accounts.has(id)) accounts.set(id, { id, name: row.studentName, roll: row.studentCode, application: row.studentCode, courseName: row.courseName, branchName: row.branchName, rows: [], paymentHistory: [] });
    accounts.get(id).rows.push(row);
  }
  const seenPayments = new Set();
  for (const payment of history) {
    if (payment.studentId == null || payment.paymentId == null || seenPayments.has(String(payment.paymentId))) continue;
    seenPayments.add(String(payment.paymentId));
    const id = String(payment.studentId);
    if (!accounts.has(id)) accounts.set(id, { id, name: payment.studentName, roll: payment.studentCode, application: payment.studentCode, rows: [], paymentHistory: [] });
    accounts.get(id).paymentHistory.push(payment);
  }
  return [...accounts.values()].map(account => {
    const groups = semesterFeeGroups(account.rows);
    const balance = sumFeeRows(account.rows, 'balanceAmount');
    const overdue = groups.some(group => group.overdue > 0);
    return { ...account, admissionNumber: account.admissionNumber || account.application || account.roll,
      // The pending endpoint omits settled obligations. Complete assigned and
      // paid totals therefore cannot be claimed from this response.
      totalFee: null, paid: sumFeeRows(account.paymentHistory, 'feeAmount'), balance,
      feeCategory: [...new Set(groups.map(group => group.category))].join(', '),
      semesterIds: account.rows.map(row => String(row.semesterId)),
      nextDue: groups.map(group => group.dueDate).filter(Boolean).sort()[0], overdue,
      status: balance == null ? 'Balance Unavailable' : overdue ? 'Overdue' : groups.some(group => group.paid > 0) ? 'Partially Paid' : 'Pending',
      statusSlug: balance == null ? 'unavailable' : overdue ? 'overdue' : 'pending', receiptId: account.paymentHistory.find(row => row.receiptId)?.receiptId };
  });
}
