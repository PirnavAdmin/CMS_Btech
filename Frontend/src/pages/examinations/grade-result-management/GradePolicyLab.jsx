import { useState } from 'react'
import { FiCheckCircle, FiInfo, FiTrendingUp } from 'react-icons/fi'
import { gradeFor, validateBands } from './gradeResultModel'
import './GradePolicyLab.css'
const format = value => Number(value.toFixed(2)).toString()
export default function GradePolicyLab({ bands, savedBands }) {
  const [score, setScore] = useState('75')
  const [maximum, setMaximum] = useState('100')
  const issue = validateBands(bands)
  const valid = score.trim() !== '' && maximum.trim() !== '' && Number.isFinite(Number(score)) && Number.isFinite(Number(maximum)) && Number(maximum) > 0 && Number(score) >= 0 && Number(score) <= Number(maximum)
  const percentage = valid ? Number(score) / Number(maximum) * 100 : null
  const grade = !issue && valid ? gradeFor(percentage, bands) : null
  const sorted = issue ? [] : [...bands].sort((a, b) => Number(a.min) - Number(b.min))
  const next = grade ? sorted.find(band => Number(band.min) >= Number(grade.max) && Number(band.points) > Number(grade.points)) : null
  const passBand = sorted.find(band => band.pass)
  const savedGrade = valid && !validateBands(savedBands) ? gradeFor(percentage, savedBands) : null
  const unsaved = JSON.stringify(bands) !== JSON.stringify(savedBands)
  return <section className="grm-policy-lab">
    <div className="grm-lab-header"><div><small>POLICY PREVIEW</small><h3>Grade policy lab</h3><p>Test a score and understand exactly how your grading rules apply.</p></div><span className="grm-lab-state"><FiCheckCircle />{unsaved ? 'Editor changes pending' : 'Saved policy in sync'}</span></div>
    <div className="grm-policy-layout"><section className="grm-lab-section"><div className="grm-lab-heading"><span>01</span><div><h4>Test student marks</h4><p>Percentage = obtained marks / maximum marks x 100</p></div></div>
      <div className="grm-simulator-inputs"><label>Marks obtained<input type="number" min="0" max={Number(maximum) > 0 ? maximum : undefined} step="any" value={score} onChange={event => setScore(event.target.value)} /></label><label>Maximum marks<input type="number" min="0.01" step="any" value={maximum} onChange={event => setMaximum(event.target.value)} /></label></div>
      <div className="grm-lab-examples"><span>Try a score:</span>{[40, 75, 90, 100].map(value => <button key={value} type="button" disabled={!(Number(maximum) > 0)} onClick={() => setScore(String(Number(maximum) * value / 100))}>{value}%</button>)}</div>
      <div className="grm-simulator-output grm-lab-result" role="status" aria-live="polite">{issue ? <p>Complete a valid policy to calculate the grade.</p> : !valid ? <p>Enter marks between zero and the maximum. Maximum marks must be positive.</p> : <><div className="grm-lab-grade"><small>GRADE</small><strong>{grade?.grade || '-'}</strong></div><div><b>{percentage.toFixed(2)}%</b><span>{format(Number(score))} out of {format(Number(maximum))} marks</span><span>{grade?.pass ? 'Passed' : 'Failed'} / {grade?.points ?? '-'} grade points</span></div></>}</div>
      {grade && <div className="grm-lab-guidance"><div><FiInfo /><span>Matched band: <strong>{grade.grade}</strong> / {grade.min}% to {grade.max}%{Number(grade.max) === 100 ? ' inclusive' : ', upper limit excluded'}.</span></div>{next ? <div><FiTrendingUp /><span>Reach <strong>{next.grade}</strong> at {format(Number(next.min) / 100 * Number(maximum))} marks: <strong>{format(Math.max(0, Number(next.min) / 100 * Number(maximum) - Number(score)))} more marks</strong>.</span></div> : <div><FiCheckCircle /><span>No higher grade-point band remains above this score.</span></div>}</div>}
      {unsaved && savedGrade && <div className="grm-lab-comparison"><span>Saved policy at this score</span><strong>{savedGrade.grade} / {savedGrade.points} points / {savedGrade.pass ? 'Passed' : 'Failed'}</strong><small>Save your edited policy to use it in Result Generation.</small></div>}
    </section><section className="grm-lab-section"><div className="grm-lab-heading"><span>02</span><div><h4>Understand grade ranges</h4><p>{issue ? 'Resolve policy issues to view coverage.' : `${bands.length} bands / full coverage${passBand ? ` / passing begins at ${passBand.min}%` : ' / no passing bands'}`}</p></div></div>
      {issue ? <p className="grm-policy-issue">{issue}</p> : <><div className="grm-policy-scale" aria-label="Grade percentage bands">{sorted.map(band => <div key={band.grade} style={{ flexGrow: Number(band.max) - Number(band.min) }} className={`${band.pass ? 'is-pass' : 'is-fail'} ${grade?.grade === band.grade ? 'is-current' : ''}`} title={`${band.grade}: ${band.min}% to ${band.max}%`}><span>{band.grade}</span></div>)}</div><div className="grm-scale-labels"><span>0%</span><span>50%</span><span>100%</span></div><div className="grm-lab-ranges"><div className="grm-lab-range-head"><span>Grade</span><span>Percentage range</span><span>Points</span></div>{sorted.map(band => <div key={band.grade} className={`grm-lab-range-row ${grade?.grade === band.grade ? 'is-current' : ''}`}><span>{band.grade}{grade?.grade === band.grade && <small>Current</small>}</span><span>{band.min}% &le; score {Number(band.max) === 100 ? '\u2264' : '<'} {band.max}%</span><strong>{band.points}</strong></div>)}</div></>}
    </section></div><div className="grm-lab-footnote"><FiInfo /><span>Simulator uses current editor values. Result Generation uses the saved local policy. Preview does not change official results.</span></div>
  </section>
}
