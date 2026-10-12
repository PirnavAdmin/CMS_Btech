import { useEffect, useState } from 'react'
import { FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { gradeResultModelModule as consolidatedDependency21 } from "../../../components/components.jsx";
const {  validateBands  } = consolidatedDependency21;

import './GradePolicyEditor.css'

const empty = { grade: '', min: '', max: '', points: '', pass: true }
export default function GradePolicyEditor({ bands, onSave }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState([])
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    const escape = event => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])
  const submit = event => {
    event.preventDefault()
    const row = { ...form, grade: form.grade.trim().toUpperCase(), min: Number(form.min), max: Number(form.max), points: Number(form.points) }
    if (!row.grade || row.min < 0 || row.max > 100 || row.min >= row.max || row.points < 0 || row.points > 10 || draft.some((item, index) => index !== editing && item.grade.toUpperCase() === row.grade)) {
      setError('Enter a unique grade, a valid 0–100 range and 0–10 points.'); return
    }
    setDraft(current => editing === null ? [...current, row] : current.map((item, index) => index === editing ? row : item))
    setForm(null); setEditing(null); setError('')
  }
  const save = () => {
    const issue = validateBands(draft)
    if (issue) { setError(issue); return }
    try { onSave(draft); setOpen(false) } catch (reason) { setError(reason.message || 'Unable to save policy.') }
  }
  return <>
    <div className="grade-editor-launch"><button type="button" onClick={() => { setDraft(bands.map(row => ({ ...row }))); setForm(null); setError(''); setOpen(true) }}><FiPlus aria-hidden="true" /> Manage Grades</button></div>
    {open && <div className="grade-editor-backdrop" onClick={() => setOpen(false)}>
      <section className="grade-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="grade-editor-title" onClick={event => event.stopPropagation()}>
        <header><div><h3 id="grade-editor-title">Grade scale configuration</h3><p>Add, edit or remove grade bands, then save the policy.</p></div><button type="button" aria-label="Close grade editor" onClick={() => setOpen(false)}><FiX /></button></header>
        <div className="grade-editor-body">
          <div className="grade-editor-toolbar"><strong>{draft.length} grade bands</strong><button type="button" onClick={() => { setEditing(null); setForm({ ...empty }); setError('') }}><FiPlus /> Add Grade</button></div>
          {error && <p className="grade-editor-error" role="alert">{error}</p>}
          {form && <form className="grade-editor-form" onSubmit={submit}>
            { [['grade', 'Grade'], ['min', 'Minimum %'], ['max', 'Maximum %'], ['points', 'Grade points']].map(([key, label]) => <label key={key}>{label}<input required type={key === 'grade' ? 'text' : 'number'} min="0" max={key === 'points' ? '10' : '100'} step="any" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
            <label>Result<select value={String(form.pass)} onChange={event => setForm({ ...form, pass: event.target.value === 'true' })}><option value="true">Pass</option><option value="false">Fail</option></select></label>
            <div><button type="submit">{editing === null ? 'Add Grade' : 'Update Grade'}</button><button type="button" onClick={() => setForm(null)}>Cancel</button></div>
          </form>}
          <div className="grade-editor-table"><table><thead><tr><th>Grade</th><th>Minimum %</th><th>Maximum %</th><th>Points</th><th>Result</th><th>Actions</th></tr></thead><tbody>
            {draft.map((row, index) => <tr key={index}><td><strong>{row.grade}</strong></td><td>{row.min}</td><td>{row.max}</td><td>{row.points}</td><td>{row.pass ? 'Pass' : 'Fail'}</td><td><button type="button" aria-label={`Edit grade ${row.grade}`} title="Edit grade" onClick={() => { setEditing(index); setForm({ ...row }); setError('') }}><FiEdit2 /></button><button type="button" aria-label={`Delete grade ${row.grade}`} title="Delete grade" onClick={() => { setDraft(draft.filter((_, i) => i !== index)); setForm(null); setError('') }}><FiTrash2 /></button></td></tr>)}
          </tbody></table></div>
          <p>Ranges must cover 0–100% without gaps or overlaps. Maximum is excluded except at 100%.</p>
        </div>
        <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={Boolean(form)} onClick={save}>Save Policy</button></footer>
      </section>
    </div>}
  </>
}
