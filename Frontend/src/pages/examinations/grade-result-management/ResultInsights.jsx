import { resultAnalytics, resultIssues, summarize, weightedGpa } from './gradeResultModel'

export function ResultInsights({ rows, title = 'Performance insights' }) {
  const stats = resultAnalytics(rows)
  return <section className="grm-insights" aria-label={title}>
    <div className="grm-insights-heading"><h3>{title}</h3><span>{rows.length} assessment records in this view</span></div>
    <div className="grm-insight-metrics">{[['Pass rate', stats.passRate === null ? '-' : `${stats.passRate.toFixed(1)}%`], ['Average score', stats.average === null ? '-' : `${stats.average.toFixed(1)}%`], ['Highest score', stats.highest === null ? '-' : `${stats.highest.toFixed(1)}%`], ['Pending', stats.pending]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
    <div className="grm-insight-grid"><div><h4>Grade distribution</h4>{stats.distribution.length ? stats.distribution.map(({ grade, count }) => <div className="grm-grade-bar" key={grade}><span>{grade}</span><div role="img" aria-label={`${grade}: ${count} of ${rows.length} assessments`}><i style={{ width: `${count / rows.length * 100}%` }} /></div><strong>{count}</strong></div>) : <p>No grades in the current view.</p>}</div><div><h4>Data readiness</h4><div className="grm-readiness"><strong>{rows.length - stats.issues}<small>complete records</small></strong><strong>{stats.issues}<small>need review</small></strong></div><p>Readiness checks student/subject IDs, marks, maximum marks and credits. Pass rate uses completed assessments only; averages exclude invalid scores.</p></div></div>
  </section>
}

export function ResultQuality({ rows }) {
  const issues = rows.map(row => ({ row, issues: resultIssues(row) })).filter(item => item.issues.length)
  if (!issues.length) return null
  const counts = new Map()
  issues.forEach(item => item.issues.forEach(issue => counts.set(issue, (counts.get(issue) || 0) + 1)))
  return <details className="grm-quality"><summary>Data quality review: {issues.length} assessment records need attention</summary><div className="grm-quality-content"><div className="grm-quality-tags">{[...counts].map(([label, count]) => <span key={label}>{label} <strong>{count}</strong></span>)}</div><ul>{issues.slice(0, 8).map(({ row, issues: labels }) => <li key={row.id}><strong>{row.studentName || row.studentId || 'Unknown student'} / {row.subjectCode || 'Unknown subject'}</strong><span>{labels.join(' · ')}</span></li>)}</ul>{issues.length > 8 && <p>Showing the first 8 of {issues.length} records requiring review.</p>}<p>Correct source records in Marks Management. These reports do not modify stored marks.</p></div></details>
}

export function PreviewComparison({ before, after }) {
  const changed = after.filter((row, index) => row.grade !== before[index]?.grade || row.status !== before[index]?.status)
  const incomplete = after.filter(row => row.status === 'Incomplete').length
  return <div className="grm-preview-review"><div><small>Preview impact</small><strong>{changed.length} grade/result changes</strong><span>{incomplete} incomplete assessments</span></div><details><summary>Compare saved results with preview</summary><div className="grm-table-scroll"><table className="erp-table"><thead><tr><th>Student / Subject</th><th>Saved grade</th><th>Preview grade</th><th>Saved result</th><th>Preview result</th></tr></thead><tbody>{after.slice(0, 10).map((row, index) => <tr key={row.id}><td>{row.studentName || row.studentId} / {row.subjectCode}</td><td>{before[index]?.grade || '-'}</td><td>{row.grade}</td><td>{before[index]?.status || '-'}</td><td>{row.status}</td></tr>)}</tbody></table></div><p>Comparison shows the first 10 assessments. Export the preview for all calculated records.</p></details></div>
}

export function StudentSemesterSummary({ rows }) {
  const groups = summarize(rows, 'semester')
  return <section className="grm-semester-overview"><h3>Semester performance</h3><div className="grm-table-scroll"><table className="erp-table"><thead><tr><th>Semester</th><th>Assessments</th><th>Passed</th><th>Failed</th><th>Pending</th><th>Weighted GPA</th></tr></thead><tbody>{groups.map(group => { const records = rows.filter(row => (row.semester || 'Unassigned') === group.group); const gpa = weightedGpa(records); return <tr key={group.group}><td>{group.group}</td><td>{group.subjects}</td><td>{group.passed}</td><td>{group.failed}</td><td>{group.pending}</td><td>{gpa === null ? '-' : gpa.toFixed(2)}</td></tr> })}</tbody></table></div><p>GPA uses available assessments, including repeat attempts. This is an informational calculation.</p></section>
}
