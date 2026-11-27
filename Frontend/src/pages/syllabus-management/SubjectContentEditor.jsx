import { useId } from 'react'
import { contentFields, unitFields, outcomeFields, CONTENT_LIMIT, serializeSubjectContent } from './subjectSyllabusContent.js'

function TextField({ field, values, onChange, required = false }) {
  const [key, label] = field
  const props = { value: values[key] ?? '', onChange: event => onChange({ ...values, [key]: event.target.value }), required }
  return <label className="syllabus-field"><span>{label}</span>
    {key === 'hours' ? <input {...props} type="number" min="0" step="any" /> :
      ['title', 'code', 'authors', 'publisher', 'edition'].includes(key) ? <input {...props} /> : <textarea {...props} rows="2" />}
  </label>
}

export default function SubjectContentEditor({ content, onChange, disabled }) {
  const editorId = useId()
  const changeList = (key, items) => onChange({ ...content, [key]: items })
  const addItem = key => changeList(key, [...content[key], { editorKey: crypto.randomUUID() }])
  const updateItem = (key, index, item) => changeList(key, content[key].map((current, position) => position === index ? item : current))
  const removeItem = (key, index) => changeList(key, content[key].filter((_, position) => position !== index))
  const moveUnit = (index, direction) => {
    const units = [...content.units]
    const target = index + direction
    if (target < 0 || target >= units.length) return
    ;[units[index], units[target]] = [units[target], units[index]]
    changeList('units', units)
  }
  return <fieldset className="syllabus-content-editor" disabled={disabled}>
    <legend>Syllabus content</legend>
    <div className="syllabus-form-grid">{contentFields.slice(0, 4).map(field => <TextField key={field[0]} field={field} values={content} onChange={onChange} />)}</div>
    <section><h3>Units</h3>
      {content.units.map((unit, index) => <details key={unit.editorKey || editorId + '-unit-' + index} open>
        <summary>Unit {index + 1}{unit.title && ' – ' + unit.title}</summary>
        <div className="syllabus-form-grid">{unitFields.map(field => <TextField key={field[0]} field={field} values={unit} required={field[0] === 'title'} onChange={next => updateItem('units', index, next)} />)}</div>
        <div className="syllabus-editor-actions">
          <button className="syllabus-btn syllabus-btn--secondary" type="button" disabled={index === 0} onClick={() => moveUnit(index, -1)}>Move up</button>
          <button className="syllabus-btn syllabus-btn--secondary" type="button" disabled={index === content.units.length - 1} onClick={() => moveUnit(index, 1)}>Move down</button>
          <button className="syllabus-btn syllabus-btn--quiet" type="button" onClick={() => removeItem('units', index)}>Remove Unit</button>
        </div>
      </details>)}
      <button className="syllabus-btn syllabus-btn--secondary" type="button" onClick={() => addItem('units')}>Add Unit</button>
    </section>
    <section><h3>Course outcomes</h3>
      {content.outcomes.map((outcome, index) => <div className="syllabus-outcome-row" key={outcome.editorKey || editorId + '-outcome-' + index}>
        {outcomeFields.map(field => <TextField key={field[0]} field={field} values={outcome} required onChange={next => updateItem('outcomes', index, next)} />)}
        <button className="syllabus-btn syllabus-btn--quiet" type="button" onClick={() => removeItem('outcomes', index)}>Remove Outcome</button>
      </div>)}
      <button className="syllabus-btn syllabus-btn--secondary" type="button" onClick={() => addItem('outcomes')}>Add Outcome</button>
    </section>
    <section><h3>Learning resources</h3><div className="syllabus-form-grid">{contentFields.slice(4).map(field => <TextField key={field[0]} field={field} values={content} onChange={onChange} />)}</div></section>
    <small>{serializeSubjectContent(content).length.toLocaleString()} / {CONTENT_LIMIT.toLocaleString()} characters</small>
  </fieldset>
}
