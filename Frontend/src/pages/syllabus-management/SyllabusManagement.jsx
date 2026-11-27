import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity, Archive, ArrowLeft, BookOpenCheck, Check, CircleAlert,
  Download, Eye, FileCheck2, FileText, History, LoaderCircle,
  Plus, RefreshCw, Search, ShieldCheck, Upload, X,
} from 'lucide-react'
import { FaBookOpen, FaCalendarAlt, FaCheckCircle, FaClock, FaCopy, FaFileAlt, FaGraduationCap, FaSitemap, FaUniversity, FaUpload, FaUsers } from 'react-icons/fa'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { subjectApi } from '../../api/apiEndpoints.js'
import { syllabusApi } from '../../services/syllabusApi.js'
import { showError, showSuccess } from '../../utils/toast.js'
import SyllabusFileDropzone from './SyllabusFileDropzone.jsx'
import { SYLLABUS_MAX_FILE_SIZE, classifySyllabusFile, formatFileSize } from './syllabusFiles.js'
import './SyllabusManagement.css'

const value = (row, ...keys) => {
  for (const key of keys) {
    const result = row?.[key] ?? row?.[key[0]?.toUpperCase() + key.slice(1)]
    if (result !== undefined && result !== null && result !== '') return result
  }
  return ''
}
const same = (a, b) => String(a ?? '') === String(b ?? '')
const recordId = row => value(row, 'syllabusId', 'id', 'documentId')
const semId = row => value(row, 'semesterId') || value(row?.semester, 'id', 'semesterId')
const semNumber = row => Number(value(row, 'semesterNumber', 'number') || String(value(row, 'semesterName', 'name', 'semester')).match(/\d+/)?.[0] || 0)
const statusText = row => String(value(row, 'publicationStatus', 'status', 'state') || 'Pending').trim()
const statusKey = row => statusText(row).toLowerCase()
const rowsFrom = response => {
  if (Array.isArray(response)) return response
  for (const key of ['data', 'items', 'records', 'results', 'subjects', '$values']) {
    if (Array.isArray(response?.[key])) return response[key]
    if (Array.isArray(response?.data?.[key])) return response.data[key]
  }
  return []
}
const documentsOf = record => {
  const docs = value(record, 'documents', 'files', 'attachments')
  return Array.isArray(docs) ? docs : []
}
const dateLabel = date => {
  if (!date) return '—'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? String(date) : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}
const displayId = row => value(row, 'id', 'semesterId', 'branchId', 'courseId', 'departmentId', 'academicYearId')
const branchIdOf = row => value(row, 'branchId') || value(row?.branch, 'id', 'branchId')
const courseIdOf = row => value(row, 'courseId') || value(row?.course, 'id', 'courseId')
const relationMatches = (row, field, selected) => {
  if (!selected) return true
  const id = value(row, field + 'Id') || value(row?.[field], 'id', field + 'Id')
  return !id || same(id, selected)
}
const buildSemesterScopes = (semesterRows, branchRows) => semesterRows.flatMap(semester => {
  const directBranchId = branchIdOf(semester)
  if (directBranchId) {
    return [{ semester, branch: branchRows.find(branch => same(displayId(branch), directBranchId)) || semester.branch || null, branchId: String(directBranchId) }]
  }
  const semesterCourseId = courseIdOf(semester)
  const matches = branchRows.filter(branch => !semesterCourseId || !courseIdOf(branch) || same(courseIdOf(branch), semesterCourseId))
  return matches.length
    ? matches.map(branch => ({ semester, branch, branchId: String(displayId(branch) || '') }))
    : [{ semester, branch: null, branchId: '' }]
})
const blankForm = semester => ({
  id: '',
  semesterId: String(displayId(semester) || ''),
  academicYearId: '',
  courseId: '',
  departmentId: '',
  branchId: '',
  regulationId: '',
  batchId: '',
  title: '',
  category: 'Complete Semester Syllabus',
  subjectId: '',
  version: '1.0',
  effectiveAcademicYearId: '',
  effectiveDate: '',
  description: '',
  revisionNotes: '',
  status: 'Draft',
})
const recordForm = record => ({
  id: String(recordId(record) || ''),
  semesterId: String(semId(record) || ''),
  academicYearId: String(value(record, 'academicYearId') || ''),
  courseId: String(value(record, 'courseId') || ''),
  departmentId: String(value(record, 'departmentId') || ''),
  branchId: String(value(record, 'branchId') || ''),
  regulationId: String(value(record, 'regulationId', 'regulation') || ''),
  batchId: String(value(record, 'batchId', 'curriculumId', 'batch') || ''),
  title: String(value(record, 'title', 'syllabusTitle', 'name') || ''),
  category: String(value(record, 'category', 'syllabusCategory') || 'Complete Semester Syllabus'),
  subjectId: String(value(record, 'subjectId') || ''),
  version: String(value(record, 'version', 'versionNumber') || '1.0'),
  effectiveAcademicYearId: String(value(record, 'effectiveAcademicYearId') || ''),
  effectiveDate: String(value(record, 'effectiveDate') || '').slice(0, 10),
  description: String(value(record, 'description') || ''),
  revisionNotes: String(value(record, 'revisionNotes', 'changeNotes') || ''),
  status: statusText(record),
})
const categories = [
  'Complete Semester Syllabus', 'Subject-wise Syllabus', 'Laboratory Syllabus',
  'Elective Syllabus', 'Revised Syllabus', 'Course Structure',
]
const readableError = error => {
  if (error?.status === 413) return 'The server upload limit is lower than this file size. Ask the administrator to raise the limit or select a smaller file.'
  if (error?.status === 415) return 'The server rejected this document type (415).'
  return error?.message || 'The request could not be completed. Please retry.'
}

function Field({ label, children, required = false, hint }) {
  return <label className="syllabus-field">
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
}

function SyllabusModal({ open, onClose, form, setForm, academic, courses, branches, subjects, files, setFiles, errors, setErrors, onSave, saving, canPublish, onRetryFile, onCancelFile }) {
  if (!open) return null
  const years = academic.academicYears || academic.activeAcademicYears || []
  const sem = (academic.activeSemesters || []).find(item => same(displayId(item), form.semesterId))
  const course = courses.find(item => same(displayId(item), form.courseId))
  const branch = branches.find(item => same(displayId(item), form.branchId))
  const branchOptions = branches.filter(item => !form.courseId || !courseIdOf(item) || same(courseIdOf(item), form.courseId))
  const semesterOptions = (academic.activeSemesters || []).filter(item =>
    relationMatches(item, 'course', form.courseId) && relationMatches(item, 'branch', form.branchId) &&
    (!form.academicYearId || !value(item, 'academicYearId') || same(value(item, 'academicYearId'), form.academicYearId)))
  const subjectOptions = subjects.filter(item => (!semId(item) || same(semId(item), form.semesterId)) && relationMatches(item, 'branch', form.branchId))
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }))
  const setCourse = event => {
    const courseId = event.target.value
    const selectedCourse = courses.find(item => same(displayId(item), courseId))
    setForm(current => ({ ...current, courseId, departmentId: String(value(selectedCourse, 'departmentId') || current.departmentId || ''), branchId: '', semesterId: '' }))
  }
  const setBranch = event => {
    const branchId = event.target.value
    const currentSemester = semesterOptions.find(item => same(displayId(item), form.semesterId))
    const keepSemester = currentSemester && relationMatches(currentSemester, 'branch', branchId)
    setForm(current => ({ ...current, branchId, semesterId: keepSemester ? current.semesterId : '' }))
  }
  return <div className="syllabus-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section className="syllabus-modal" role="dialog" aria-modal="true" aria-labelledby="syllabus-modal-title">
      <header className="syllabus-modal__header">
        <span className="syllabus-modal__mark"><Upload size={20} /></span>
        <div><h2 id="syllabus-modal-title">{form.id ? 'Edit syllabus details' : 'Upload syllabus'}</h2><p>{sem?.semesterName || sem?.name || 'Semester'} · {academic.selectedCollege?.name || 'Current college'}</p></div>
        <button type="button" className="syllabus-icon-button" onClick={onClose} disabled={saving} aria-label="Close upload dialog"><X size={19} /></button>
      </header>
      <form className="syllabus-form" onSubmit={event => { event.preventDefault(); onSave(false) }}>
        <div className="syllabus-form-context"><span><small>Program</small><strong>{value(course, 'name', 'courseName') || '—'}</strong></span><span><small>Branch</small><strong>{value(branch, 'name', 'branchName') || '—'}</strong></span><span><small>Academic year</small><strong>{years.find(item => same(displayId(item), form.academicYearId))?.name || form.academicYearId || '—'}</strong></span><span><small>Semester</small><strong>{sem?.semesterName || sem?.name || '—'}</strong></span></div>
        {errors.length > 0 && <div className="syllabus-form-alert" role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
        <div className="syllabus-form-grid">
          <Field label="Program / course" required>
            <select required value={form.courseId} onChange={setCourse}><option value="">Choose a program</option>{courses.map(item => <option key={displayId(item)} value={displayId(item)}>{value(item, 'name', 'courseName')}</option>)}</select>
          </Field>
          <Field label="Branch / specialization" required>
            <select required value={form.branchId} onChange={setBranch}><option value="">Choose a branch</option>{branchOptions.map(item => <option key={displayId(item)} value={displayId(item)}>{value(item, 'name', 'branchName', 'code')}</option>)}</select>
          </Field>
          <Field label="Semester" required>
            <select required value={form.semesterId} onChange={set('semesterId')}><option value="">Choose a semester</option>{semesterOptions.map(item => <option key={displayId(item)} value={displayId(item)}>{value(item, 'semesterName', 'name') || 'Semester ' + semNumber(item)}</option>)}</select>
          </Field>
          <Field label="Syllabus title" required><input autoFocus required maxLength="160" value={form.title} onChange={set('title')} placeholder="e.g. Data Structures and Algorithms" /></Field>
          <Field label="Syllabus category" required>
            <select value={form.category} onChange={set('category')}>{categories.map(category => <option key={category}>{category}</option>)}</select>
          </Field>
          {form.category === 'Subject-wise Syllabus' && <Field label="Subject" required>
            <select required value={form.subjectId} onChange={set('subjectId')}><option value="">Choose a subject</option>{subjectOptions.map(subject => <option key={value(subject, 'id', 'subjectId')} value={value(subject, 'id', 'subjectId')}>{value(subject, 'subjectCode', 'code')} · {value(subject, 'subjectName', 'name')}</option>)}</select>
          </Field>}
          <Field label="Version" required><input required maxLength="30" value={form.version} onChange={set('version')} placeholder="1.0" /></Field>
          <Field label="Effective academic year" required>
            <select required value={form.effectiveAcademicYearId} onChange={set('effectiveAcademicYearId')}><option value="">Select year</option>{years.map(year => <option key={displayId(year)} value={displayId(year)}>{value(year, 'name', 'academicYearName')}</option>)}</select>
          </Field>
          <Field label="Effective date"><input type="date" value={form.effectiveDate} onChange={set('effectiveDate')} /></Field>
          <Field label="Description"><textarea rows="2" maxLength="1000" value={form.description} onChange={set('description')} placeholder="Short description for students and faculty" /></Field>
          <Field label="Revision notes"><textarea rows="2" maxLength="1000" value={form.revisionNotes} onChange={set('revisionNotes')} placeholder="What changed in this version?" /></Field>
        </div>
        <div className="syllabus-modal__upload-title"><strong>Documents</strong><small>Allowed files up to 25 MB each</small></div>
        <SyllabusFileDropzone files={files} onChange={(next, rejected) => { setFiles(next); setErrors(rejected) }} disabled={saving} maxFileSize={SYLLABUS_MAX_FILE_SIZE} onRetry={onRetryFile} onCancel={onCancelFile} />
        <footer className="syllabus-modal__footer">
          <button className="syllabus-btn syllabus-btn--quiet" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <span className="syllabus-modal__footer-fill" />
          <button className="syllabus-btn syllabus-btn--secondary" type="submit" disabled={saving}>{saving && <LoaderCircle size={16} className="syllabus-spin" />} Save as Draft</button>
          {canPublish && <button className="syllabus-btn syllabus-btn--primary" type="button" disabled={saving} onClick={() => onSave(true)}>{saving ? <LoaderCircle size={16} className="syllabus-spin" /> : <Upload size={16} />} Upload &amp; Publish</button>}
        </footer>
      </form>
    </section>
  </div>
}


function branchLabel(scope) {
  return value(scope.branch, 'name', 'branchName', 'code') || 'Unassigned branch'
}

function BranchDirectory({ groups, selected, onSelect }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const query = search.trim().toLowerCase()
  return <aside className="syllabus-branch-directory">
    <h2>Departments &amp; Branches</h2>
    <label className="syllabus-search"><Search size={16} aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Department..." aria-label="Search departments and branches" /></label>
    <div className="syllabus-tree-controls"><button type="button" onClick={() => setExpanded(new Set(groups.keys()))}>Expand All</button><span aria-hidden="true">|</span><button type="button" onClick={() => setExpanded(new Set())}>Collapse All</button></div>
    {[...groups].map(([departmentKey, { department, branches }], index) => {
      const matches = [...branches].filter(([, scopes]) => department.toLowerCase().includes(query) || branchLabel(scopes).toLowerCase().includes(query))
      if (!matches.length) return null
      const open = query ? true : expanded ? expanded.has(departmentKey) : index === 0 || branches.has(selected)
      const scopes = [...branches.values()].flatMap(item => item.scopes)
      return <div key={departmentKey} className="syllabus-tree-group">
        <button type="button" aria-expanded={open} onClick={() => {
          const next = new Set(expanded ?? [...groups].filter(([, group], i) => i === 0 || group.branches.has(selected)).map(([name]) => name))
          if (open) next.delete(departmentKey)
          else next.add(departmentKey)
          setExpanded(next)
        }}><span className="syllabus-tree-toggle" aria-hidden="true">{open ? '-' : '+'}</span><strong title={department}>{department}</strong><span className="syllabus-tree-count">{scopes.filter(scope => scope.created).length}/{scopes.length}</span></button>
        {open && <ul>{matches.map(([key, items]) => <li key={key}><button type="button" aria-current={selected === key ? 'true' : undefined} onClick={() => onSelect(key)}>{items.scopes.some(scope => scope.created) ? <FaCheckCircle aria-hidden="true" /> : <FaClock aria-hidden="true" />}<span>{branchLabel(items)}</span></button></li>)}</ul>}
      </div>
    })}
    {!groups.size && <p>No departments or branches match the current filters.</p>}
  </aside>
}

function DocumentRow({ document, record, onPreview, onDownload, onEdit, onReplace, canDownload, canEdit }) {
  const id = value(document, 'documentId', 'id', 'fileId')
  const title = value(document, 'fileName', 'name', 'title', 'originalFileName') || 'Syllabus document'
  const contentType = String(value(document, 'contentType', 'mimeType', 'fileType') || title.split('.').pop() || '').toLowerCase()
  const extension = title.split('.').pop()?.toLowerCase()
  const previewable = contentType.includes('pdf') || contentType.startsWith('image/') || contentType.startsWith('text/') || ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'csv'].includes(contentType) || ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'csv'].includes(extension)
  return <article className="syllabus-document-row">
    <span className="syllabus-document-row__icon"><FileText size={19} /></span>
    <div className="syllabus-document-row__main"><strong>{title}</strong><span>{classifySyllabusFile({ name: title })} · {value(document, 'size', 'fileSize') ? String(value(document, 'size', 'fileSize')) + ' bytes' : 'Document'} · {dateLabel(value(document, 'uploadedAt', 'createdAt'))}</span></div>
    <span className={'syllabus-status syllabus-status--' + statusKey(record)}><i />{statusText(record)}</span>
    <div className="syllabus-document-row__actions">
      {previewable && canDownload && <button type="button" className="syllabus-view-action" onClick={() => onPreview(document)} aria-label={'View ' + title}><Eye size={15} />View</button>}
      {canDownload && <button type="button" onClick={() => onDownload(document)} aria-label={'Download ' + title}><Download size={16} /></button>}
      {canEdit && <><button type="button" onClick={() => onEdit(record)} aria-label={'Edit metadata for ' + title}><FileCheck2 size={16} /></button><button type="button" onClick={() => onReplace(record, document)} aria-label={'Replace ' + title}><RefreshCw size={16} /></button></>}
    </div>
    {previewable && !canDownload && <span className="syllabus-document-row__hint">Download permission required for preview</span>}
    <input className="syllabus-visually-hidden" type="file" data-replace-input={id} />
  </article>
}

const listEntries = raw => Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/\r?\n/).map(item => item.trim()).filter(Boolean) : []
const entryText = entry => typeof entry === 'string' ? entry : String(value(entry, 'title', 'unitName', 'name', 'topic', 'description') || '')

function SubjectReader({ subject, semester, branch, onClose }) {
  const units = listEntries(value(subject, 'units', 'syllabusUnits', 'topics'))
  const outcomes = listEntries(value(subject, 'learningOutcomes', 'outcomes', 'courseOutcomes'))
  const description = value(subject, 'description', 'subjectDescription', 'courseDescription')
  return <div className="syllabus-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="syllabus-subject-reader" role="dialog" aria-modal="true" aria-labelledby="syllabus-subject-reader-title">
      <header><div><span>{value(subject, 'subjectCode', 'code') || 'SUBJECT'}</span><h2 id="syllabus-subject-reader-title">{value(subject, 'subjectName', 'name') || 'Subject details'}</h2><p>{value(branch, 'name', 'branchName', 'code') || 'Branch'} · {value(semester, 'semesterName', 'name') || 'Semester ' + semNumber(semester)}</p></div><button type="button" className="syllabus-icon-button" onClick={onClose} aria-label="Close subject reader"><X size={18} /></button></header>
      <div className="syllabus-subject-reader__body">
        <div className="syllabus-subject-reader__facts"><div><small>Subject type</small><strong>{value(subject, 'subjectType', 'category') || 'Configured subject'}</strong></div><div><small>Credits</small><strong>{value(subject, 'credits', 'creditPoints') || '—'}</strong></div><div><small>Record</small><strong>{value(subject, 'status') || 'Configured'}</strong></div></div>
        <section><h3>Subject overview</h3><p>{description || 'Detailed subject description has not been added to this curriculum record.'}</p></section>
        {units.length > 0 && <section><h3>Units and topics</h3><ol className="syllabus-subject-reader__units">{units.map((unit, index) => <li key={index}><strong>{typeof unit === 'object' ? value(unit, 'title', 'unitName', 'name') || `Unit ${index + 1}` : `Unit ${index + 1}`}</strong>{typeof unit === 'object' ? <><p>{value(unit, 'description', 'summary') || ''}</p>{listEntries(value(unit, 'topics', 'subTopics', 'content')).length > 0 && <ul>{listEntries(value(unit, 'topics', 'subTopics', 'content')).map((topic, topicIndex) => <li key={topicIndex}>{entryText(topic)}</li>)}</ul>}</> : <p>{entryText(unit)}</p>}</li>)}</ol></section>}
        {outcomes.length > 0 && <section><h3>Learning outcomes</h3><ul>{outcomes.map((outcome, index) => <li key={index}>{entryText(outcome)}</li>)}</ul></section>}
      </div>
      <footer><button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={onClose}>Close</button></footer>
    </section>
  </div>
}

function DetailWorkspace({ embedded = false, semester, branch, records, subjects, activeTab, setActiveTab, onBack, onModal, onPublish, onPreview, onDownload, onReplace, onViewSubject, canCreate, canEdit, canPublish, canDownload, extraRows, extraError, loadingExtra, loadExtra }) {
  const tabs = [
    ['documents', 'Syllabus Documents', FileText],
    ['subjects', 'Subject-wise Syllabus', BookOpenCheck],
    ['curriculum', 'Curriculum & Credits', ShieldCheck],
    ['versions', 'Version History', History],
    ['activity', 'Activity Logs', Activity],
  ]
  const changeTab = tab => {
    setActiveTab(tab)
    if (['versions', 'activity'].includes(tab)) loadExtra(tab)
  }
  const allDocuments = records.flatMap(record => documentsOf(record).map(document => ({ record, document })))
  return <div className="syllabus-detail">
    {!embedded && <><button type="button" className="syllabus-back-link" onClick={onBack}><ArrowLeft size={17} /> Back to semesters</button>
    <section className="syllabus-detail__hero">
      <div><span className="syllabus-eyebrow">SEMESTER WORKSPACE</span><h2>{value(semester, 'semesterName', 'name') || 'Semester ' + semNumber(semester)}{branch ? ' · ' + value(branch, 'name', 'branchName', 'code') : ''}</h2><p>Manage published syllabus files, subject mappings, revisions and audit activity for this branch.</p></div>
      <div className="syllabus-detail__actions">{canCreate && <button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={() => onModal(null)}><Plus size={16} /> Add document</button>}{canPublish && records.some(row => statusKey(row) === 'draft') && <button type="button" className="syllabus-btn syllabus-btn--primary" onClick={() => onPublish(records.find(row => statusKey(row) === 'draft'))}><Check size={16} /> Publish draft</button>}</div>
    </section>
    <nav className="syllabus-tabs" aria-label="Semester syllabus sections">
      {tabs.map(([id, label, Icon]) => <button type="button" key={id} className={activeTab === id ? 'is-active' : ''} aria-current={activeTab === id ? 'page' : undefined} onClick={() => changeTab(id)}><Icon size={16} />{label}{id === 'documents' && <span>{allDocuments.length}</span>}</button>)}
    </nav></>}
    {activeTab === 'documents' && <section className="syllabus-detail-panel">
      <div className="syllabus-section-heading"><div><h3>Available syllabus files</h3><p>Documents and publication state for this semester.</p></div>{canCreate && <button className="syllabus-btn syllabus-btn--primary" type="button" onClick={() => onModal(null)}><Upload size={15} /> Upload document</button>}</div>
      {allDocuments.length ? <div className="syllabus-document-list">{allDocuments.map(({ record, document }, index) => <DocumentRow key={value(document, 'documentId', 'id') || recordId(record) + '-' + index} document={document} record={record} onPreview={onPreview} onDownload={onDownload} onEdit={onModal} onReplace={onReplace} canDownload={canDownload} canEdit={canEdit} />)}</div> : <div className="syllabus-empty syllabus-empty--compact"><FileText size={22} /><strong>No syllabus files yet</strong><span>Upload a document to start the semester’s syllabus record.</span></div>}
    </section>}
    {activeTab === 'subjects' && <section className="syllabus-detail-panel">
      <div className="syllabus-section-heading"><div><h3>Mapped subjects</h3><p>Subjects are scoped to this branch and semester.</p></div></div>
      {subjects.length ? <div className="syllabus-subject-list">{subjects.map((subject, index) => <article key={value(subject, 'id', 'subjectId') || index}><span className="syllabus-subject-code">{value(subject, 'subjectCode', 'code') || 'SUBJECT'}</span><div><strong>{value(subject, 'subjectName', 'name')}</strong><small>{value(subject, 'subjectType', 'category') || 'Configured subject'} · {value(subject, 'credits', 'creditPoints') || '—'} credits</small></div><span className="syllabus-status syllabus-status--neutral"><i />{value(subject, 'status') || 'Active'}</span><button type="button" className="syllabus-btn syllabus-btn--secondary syllabus-subject-view" onClick={() => onViewSubject(subject)}><Eye size={15} />View</button></article>)}</div> : <div className="syllabus-empty syllabus-empty--compact"><BookOpenCheck size={22} /><strong>No subject mappings returned</strong><span>Check that subjects are configured for this course and semester.</span></div>}
    </section>}
    {activeTab === 'curriculum' && <section className="syllabus-detail-panel"><div className="syllabus-section-heading"><div><h3>Curriculum &amp; credits</h3><p>Read-only academic structure for the selected semester.</p></div></div><div className="syllabus-curriculum-grid">
      {[['Semester', value(semester, 'semesterName', 'name') || 'Semester ' + semNumber(semester)], ['Semester number', semNumber(semester) || '—'], ['Academic level', value(semester, 'yearNumber', 'academicLevel') || (semNumber(semester) ? 'Year ' + Math.ceil(semNumber(semester) / 2) : '—')], ['Semester type', semNumber(semester) ? semNumber(semester) % 2 ? 'Odd' : 'Even' : '—'], ['Mapped subjects', subjects.length], ['Configured credits', value(semester, 'totalCredits', 'credits') || '—']].map(([label, item]) => <div key={label}><small>{label}</small><strong>{item}</strong></div>)}
    </div></section>}
    {['versions', 'activity'].includes(activeTab) && <section className="syllabus-detail-panel">
      <div className="syllabus-section-heading"><div><h3>{activeTab === 'versions' ? 'Version history' : 'Recent activity'}</h3><p>{activeTab === 'versions' ? 'Published revisions remain available as version records.' : 'Administrative events for this semester syllabus.'}</p></div><button type="button" className="syllabus-btn syllabus-btn--quiet" onClick={() => loadExtra(activeTab)}><RefreshCw size={15} /> Refresh</button></div>
      {loadingExtra ? <div className="syllabus-loading-line"><LoaderCircle size={18} className="syllabus-spin" /> Loading {activeTab}…</div> : extraError ? <div className="syllabus-form-alert" role="status">{extraError}</div> : extraRows.length ? <div className="syllabus-history-list">{extraRows.map((row, index) => <article key={value(row, 'id', 'versionId', 'activityId') || index}><span>{activeTab === 'versions' ? <History size={17} /> : <Activity size={17} />}</span><div><strong>{value(row, 'title', 'version', 'action', 'eventName') || 'Syllabus update'}</strong><small>{value(row, 'description', 'notes', 'userName', 'actor') || statusText(row)} · {dateLabel(value(row, 'createdAt', 'publishedAt', 'timestamp'))}</small></div></article>)}</div> : <div className="syllabus-empty syllabus-empty--compact"><History size={22} /><strong>No {activeTab === 'versions' ? 'versions' : 'activity'} available</strong><span>The backend has not returned any records.</span></div>}
    </section>}
  </div>
}

function programForCourse(course) {
  if (!course) return null
  const names = ['name', 'courseName', 'shortName', 'courseShortName', 'courseCode', 'code', 'courseType', 'type']
    .map(key => value(course, key)).join(' ')
  if (/\bb[.\s-]*tech(?:nology)?\b|bachelor of technology/i.test(names)) return 'B.Tech'
  return /\b(diploma|certificate)\b/i.test(names) ? null : 'Degree'
}

export default function SyllabusManagement() {
  const academic = useAcademic()
  const { canAction } = useScreenAccess()
  const navigate = useNavigate()
  const { semesterId: routeSemesterId } = useParams()
  const [searchParams] = useSearchParams()
  const routeBranchId = searchParams.get('branchId') || ''
  const canCreate = canAction('/syllabus-management', 'create')
  const canEdit = canAction('/syllabus-management', 'edit')
  const canPublish = canEdit
  const canDownload = canAction('/syllabus-management', 'export')
  const canArchive = canAction('/syllabus-management', 'delete')
  const [filters, setFilters] = useState({ academicYearId: academic.selectedAcademicYearId || '', courseId: '', departmentId: '', branchId: '', subjectId: '', batchId: '' })
  const [selectedProgram, setSelectedProgram] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [workspaceBranch, setWorkspaceBranch] = useState('')
  const [workspaceSemester, setWorkspaceSemester] = useState('')
  const [workspaceTab, setWorkspaceTab] = useState('overview')
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState('')
  const [subjects, setSubjects] = useState([])
  const [subjectsError, setSubjectsError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(blankForm(null))
  const [files, setFiles] = useState([])
  const [formErrors, setFormErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [detailTab, setDetailTab] = useState('documents')
  const [extraRows, setExtraRows] = useState([])
  const [extraError, setExtraError] = useState('')
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [preview, setPreview] = useState(null)
  const [readingSubject, setReadingSubject] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [replaceProgress, setReplaceProgress] = useState('')
  const fileOperations = useRef(new Map())
  const listRequest = useRef(0)
  const historyRequest = useRef(0)
  const currentCollege = String(academic.selectedCollegeId || '')
  useEffect(() => {
    if (!modalOpen && !preview && !readingSubject) return undefined
    const onKeyDown = event => {
      if (event.key !== 'Escape') return
      if (preview) setPreview(null)
      else if (readingSubject) setReadingSubject(null)
      else if (!saving) { setModalOpen(false); setFormErrors([]) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, preview, readingSubject, saving])

  useEffect(() => {
    setFilters(current => ({ ...current, academicYearId: current.academicYearId || academic.selectedAcademicYearId || '' }))
  }, [academic.selectedAcademicYearId])
  useEffect(() => {
    setFilters(current => ({ ...current, courseId: '', departmentId: '', branchId: '', subjectId: '', batchId: '' }))
  }, [currentCollege])

  const years = academic.academicYears || academic.activeAcademicYears || []
  const departments = academic.activeDepartments || []
  const courses = academic.activeCourses || []
  const branches = academic.activeBranches || []
  const semesters = academic.activeSemesters || []
  const program = selectedProgram || (courses.some(course => programForCourse(course) === 'Degree') && !courses.some(course => programForCourse(course) === 'B.Tech') ? 'Degree' : 'B.Tech')
  const courseIds = new Set(courses.filter(course => programForCourse(course) === program).map(course => String(displayId(course))))
  const inProgram = courseId => courseIds.has(String(courseId))
  const programCourses = courses.filter(course => inProgram(displayId(course)))
  const filteredCourses = programCourses.filter(course => !filters.courseId || same(displayId(course), filters.courseId))
  const programBranches = branches.filter(branch => filteredCourses.some(course => same(displayId(course), courseIdOf(branch))))
  const programDepartmentIds = new Set([
    ...filteredCourses.map(course => value(course, 'departmentId')),
    ...programBranches.map(branch => value(branch, 'departmentId') || value(courses.find(course => same(displayId(course), courseIdOf(branch))), 'departmentId')),
  ].filter(Boolean).map(String))
  const scopedBranches = useMemo(() => branches.filter(branch => (!filters.courseId || !courseIdOf(branch) || same(courseIdOf(branch), filters.courseId)) && (!filters.departmentId || !value(branch, 'departmentId') || same(value(branch, 'departmentId'), filters.departmentId))), [branches, filters.courseId, filters.departmentId])
  const branchesForSemesterScopes = useMemo(() => scopedBranches.filter(branch => !filters.branchId || same(displayId(branch), filters.branchId)), [scopedBranches, filters.branchId])
  const scopedSemesters = useMemo(() => semesters.filter(semester =>
    relationMatches(semester, 'course', filters.courseId) &&
    (!filters.courseId || !branchIdOf(semester) || branchesForSemesterScopes.some(branch => same(displayId(branch), branchIdOf(semester)))) &&
    relationMatches(semester, 'branch', filters.branchId) &&
    (!filters.academicYearId || !value(semester, 'academicYearId') || same(value(semester, 'academicYearId'), filters.academicYearId)) &&
    (!filters.departmentId || !value(semester, 'departmentId') || same(value(semester, 'departmentId'), filters.departmentId))
  ).sort((a, b) => semNumber(a) - semNumber(b)), [semesters, filters, branchesForSemesterScopes])
  const semesterScopes = useMemo(() => buildSemesterScopes(scopedSemesters, branchesForSemesterScopes), [scopedSemesters, branchesForSemesterScopes])
  const selectedScope = semesterScopes.find(scope => same(displayId(scope.semester), routeSemesterId) && (!routeBranchId || same(scope.branchId, routeBranchId)))
    || (!routeBranchId ? semesterScopes.find(scope => same(displayId(scope.semester), routeSemesterId)) : undefined)
  const selectedSemester = routeBranchId ? selectedScope?.semester : selectedScope?.semester || scopedSemesters.find(semester => same(displayId(semester), routeSemesterId)) || semesters.find(semester => same(displayId(semester), routeSemesterId))
  const selectedBranch = selectedScope?.branch || branches.find(branch => same(displayId(branch), routeBranchId)) || null
  const detailMode = Boolean(routeSemesterId)
  const fetchSyllabi = useCallback(async () => {
    const requestId = ++listRequest.current
    if (!currentCollege || !filters.academicYearId) {
      setRecords([])
      setRecordsError('')
      setRecordsLoading(false)
      return
    }
    setRecordsLoading(true)
    setRecordsError('')
    try {
      const response = await syllabusApi.list({
        collegeId: currentCollege,
        academicYearId: filters.academicYearId,
        courseId: filters.courseId,
        departmentId: filters.departmentId,
        branchId: routeBranchId || filters.branchId,
        batchId: filters.batchId,
        semesterId: routeSemesterId || '',
      })
      if (requestId === listRequest.current) {

        setRecords(response)
      }
    } catch (error) {
      if (requestId === listRequest.current) {

        setRecords([])
        setRecordsError(readableError(error))
      }
    } finally {
      if (requestId === listRequest.current) setRecordsLoading(false)
    }
  }, [currentCollege, filters, routeSemesterId, routeBranchId])
  useEffect(() => { fetchSyllabi(); return () => { listRequest.current += 1 } }, [fetchSyllabi])

  const recordsForScope = useCallback(scope => records.filter(record => {
    if (!same(semId(record), displayId(scope.semester))) return false
    const recordBranchId = branchIdOf(record)
    return scope.branchId ? same(recordBranchId, scope.branchId) : !recordBranchId
  }), [records])
  const subjectsForScope = useCallback(scope => subjects.filter(subject => {
    if (semId(subject) && !same(semId(subject), displayId(scope.semester))) return false
    const subjectBranchId = branchIdOf(subject)
    return !subjectBranchId || !scope.branchId || same(subjectBranchId, scope.branchId)
  }), [subjects])
  const programScopes = semesterScopes.filter(({ semester, branch, branchId }) => inProgram(branchId ? courseIdOf(branch || branches.find(item => same(displayId(item), branchId))) : courseIdOf(semester)))
  const stateForScope = related => recordsError ? 'unavailable' : related.some(row => statusKey(row) === 'published') ? 'published' : related.some(row => statusKey(row) === 'draft') ? 'draft' : related.length ? statusKey(related[0]) : 'pending'
  const visibleScopes = (() => {
    const needle = search.trim().toLowerCase()
    return programScopes.filter(scope => {
      const { semester, branch } = scope
      const related = recordsForScope(scope)
      const state = stateForScope(related)
      const matchesStatus = statusFilter === 'All' || state === statusFilter.toLowerCase()
      const matchesSearch = !needle || [value(semester, 'semesterName', 'name'), semNumber(semester), value(semester, 'yearNumber', 'academicLevel'), value(branch, 'name', 'branchName', 'code')].some(item => String(item).toLowerCase().includes(needle))
      const matchesSubject = !filters.subjectId || subjectsForScope(scope).some(subject => same(value(subject, 'subjectId', 'id'), filters.subjectId))
      return matchesStatus && matchesSearch && matchesSubject
    })
  })()
  const summary = useMemo(() => {
    const recordsByScope = semesterScopes.map(scope => recordsForScope(scope))
    return {
      published: records.filter(row => statusKey(row) === 'published').length,
      drafts: records.filter(row => statusKey(row) === 'draft').length,
      pending: recordsByScope.filter(rows => rows.length === 0).length,
    }
  }, [semesterScopes, recordsForScope, records])

  const openCreate = (semester, branchRecord) => {
    const semesterCourseId = courseIdOf(semester)
    const semesterBranchId = branchIdOf(semester) || displayId(branchRecord) || filters.branchId
    const branch = branches.find(row => same(displayId(row), semesterBranchId))
    const course = courses.find(row => same(displayId(row), semesterCourseId || filters.courseId))
    const semesterYearId = value(semester, 'academicYearId') || value(semester?.academicYear, 'academicYearId', 'id')
    const next = blankForm(semester)
    next.academicYearId = String(semesterYearId || filters.academicYearId)
    next.effectiveAcademicYearId = String(semesterYearId || filters.academicYearId)
    next.courseId = String(semesterCourseId || courseIdOf(branch) || filters.courseId)
    next.departmentId = String(value(semester, 'departmentId') || value(branch, 'departmentId') || value(course, 'departmentId') || filters.departmentId)
    next.branchId = String(semesterBranchId || '')
    next.batchId = filters.batchId
    setForm(next)
    setFiles([])
    setFormErrors([])
    setModalOpen(true)
  }
  const openEdit = record => {
    if (!record) return
    setForm(recordForm(record))
    setFiles([])
    setFormErrors([])
    setModalOpen(true)
  }
  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setFormErrors([])
  }

  const setFileStatus = (key, updates) => setFiles(current => current.map(item => item.key === key ? { ...item, ...updates } : item))
  const uploadFile = async (item, syllabusId, replacingId) => {
    setFileStatus(item.key, { status: 'uploading', progress: 0, message: '' })
    const task = syllabusApi.uploadDocument(syllabusId, item.file, progress => setFileStatus(item.key, { progress }), replacingId)
    fileOperations.current.set(item.key, task)
    try {
      await task.promise
      setFileStatus(item.key, { status: 'uploaded', progress: 100 })
      fileOperations.current.delete(item.key)
      return true
    } catch (error) {
      fileOperations.current.delete(item.key)
      if (error.name === 'AbortError') setFileStatus(item.key, { status: 'cancelled', progress: 0, message: '' })
      else setFileStatus(item.key, { status: 'failed', progress: 0, message: readableError(error) })
      if (error.name !== 'AbortError') showError(readableError(error))
      return false
    }
  }
  const retryFile = key => {
    if (!form.id) { setFormErrors(['Save the syllabus details first. Then retry this document upload.']); return }
    const item = files.find(file => file.key === key)
    if (item) uploadFile(item, form.id)
  }
  const cancelFile = key => fileOperations.current.get(key)?.cancel()

  const saveSyllabus = async publishAfter => {
    if (saving) return
    if (!(form.id ? canEdit : canCreate)) { showError('Your role does not have permission to save syllabus details.'); return }
    const required = [['Syllabus title', form.title], ['Program / course', form.courseId], ['Branch / specialization', form.branchId], ['Semester', form.semesterId], ['Effective academic year', form.effectiveAcademicYearId], ['Version', form.version]]
    const missing = required.filter(([, field]) => !String(field || '').trim()).map(([name]) => name)
    if (form.category === 'Subject-wise Syllabus' && !form.subjectId) missing.push('Subject')
    if (missing.length) { setFormErrors(['Complete the required fields: ' + missing.join(', ') + '.']); return }
    const existingRecord = records.find(record => same(recordId(record), form.id))
    if (publishAfter && files.length === 0 && documentsOf(existingRecord).length === 0) {
      setFormErrors(['Add at least one syllabus document before publishing.'])
      return
    }
    if (publishAfter && !canPublish) { showError('Your role cannot publish syllabus documents.'); return }
    if (publishAfter && !window.confirm('Publish this syllabus? Eligible faculty and students will see the published version.')) return
    setSaving(true)
    setFormErrors([])
    try {
      const payload = {
        collegeId: currentCollege,
        academicYearId: Number(form.academicYearId || filters.academicYearId),
        courseId: Number(form.courseId || filters.courseId),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        branchId: form.branchId ? Number(form.branchId) : null,
        semesterId: Number(form.semesterId),
        regulationId: form.regulationId || null,
        batchId: form.batchId || null,
        title: form.title.trim(),
        category: form.category,
        subjectId: form.subjectId ? Number(form.subjectId) : null,
        version: form.version.trim(),
        effectiveAcademicYearId: Number(form.effectiveAcademicYearId),
        effectiveDate: form.effectiveDate || null,
        description: form.description.trim() || null,
        revisionNotes: form.revisionNotes.trim() || null,
      }
      let id = form.id
      if (id) await syllabusApi.update(id, payload)
      else {
        const created = await syllabusApi.create({ ...payload, status: 'Draft' })
        id = value(created, 'syllabusId', 'id')
        if (!id) throw new Error('The syllabus service did not return a record ID, so document uploads cannot continue safely.')
        setForm(current => ({ ...current, id: String(id) }))
      }
      let uploadFailed = false
      for (const item of files.filter(file => ['queued', 'failed', 'cancelled'].includes(file.status))) {
        if (!(await uploadFile(item, id))) uploadFailed = true
      }
      if (uploadFailed) {
        setForm(current => ({ ...current, id: String(id) }))
        setFormErrors(['Some files did not upload. Use Retry on each failed document. The syllabus metadata is saved as a draft.'])
        return
      }
      if (publishAfter) await syllabusApi.publish(id, { collegeId: currentCollege })
      showSuccess(publishAfter ? 'Syllabus uploaded and published.' : 'Syllabus saved as draft.')
      setModalOpen(false)
      await fetchSyllabi()
    } catch (error) {
      setFormErrors([readableError(error)])
      showError(readableError(error))
    } finally { setSaving(false) }
  }

  const executeAction = async (kind, record, confirmed = false) => {
    if (!record || !recordId(record)) return
    const label = kind === 'publish' ? 'Publish this syllabus? Eligible faculty and students will be able to view it.' : 'Archive this syllabus? It will be removed from active availability.'
    if (!confirmed && !window.confirm(label)) return
    try {
      if (kind === 'publish') await syllabusApi.publish(recordId(record), { collegeId: currentCollege })
      else await syllabusApi.archive(recordId(record), { collegeId: currentCollege })
      showSuccess(kind === 'publish' ? 'Syllabus published.' : 'Syllabus archived.')
      await fetchSyllabi()
    } catch (error) { showError(readableError(error)) }
  }
  const loadExtra = async (tab, workspaceRecord) => {
    const request = ++historyRequest.current
    setLoadingExtra(false)
    const record = workspaceRecord !== undefined ? workspaceRecord : (selectedScope
      ? recordsForScope(selectedScope)[0]
      : records.find(row => same(semId(row), routeSemesterId) && (!routeBranchId || same(branchIdOf(row), routeBranchId))))
    const id = record && recordId(record)
    if (!id) { setExtraRows([]); setExtraError('A syllabus record is required to load this information.'); return }
    setLoadingExtra(true)
    setExtraError('')
    try {
      const rows = await (tab === 'versions' ? syllabusApi.versions(id, { collegeId: currentCollege }) : syllabusApi.activity(id, { collegeId: currentCollege }))
      if (request === historyRequest.current) setExtraRows(rows)
    } catch (error) {
      if (request === historyRequest.current) { setExtraRows([]); setExtraError(readableError(error)) }
    } finally {
      if (request === historyRequest.current) setLoadingExtra(false)
    }
  }
  const documentBlob = async (document, download) => {
    if (!canDownload) { showError('Your role does not have download permission.'); return }
    try {
      const id = value(document, 'documentId', 'id', 'fileId')
      const result = await syllabusApi.downloadDocument(id, { collegeId: currentCollege })
      const objectUrl = URL.createObjectURL(result.blob)
      const name = value(document, 'fileName', 'originalFileName', 'name') || 'syllabus-document'
      if (download) {
        const anchor = window.document.createElement('a')
        anchor.href = objectUrl
        anchor.download = name
        anchor.click()
        URL.revokeObjectURL(objectUrl)
      } else setPreview({ url: objectUrl, type: result.contentType, name })
    } catch (error) { showError(readableError(error)) }
  }
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url) }, [preview])
  const onReplace = async (record, document) => {
    if (!canEdit) { showError('Your role cannot replace syllabus documents.'); return }
    const input = window.document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const { validateSyllabusFile } = await import('./syllabusFiles.js')
      const error = validateSyllabusFile(file, SYLLABUS_MAX_FILE_SIZE)
      if (error) { showError(error); return }
      setReplaceProgress('Replacing ' + value(document, 'fileName', 'name') + '…')
      const replaceLabel = value(document, 'fileName', 'name') || file.name
      const task = syllabusApi.uploadDocument(recordId(record), file, progress => setReplaceProgress('Replacing ' + replaceLabel + ' · ' + progress + '%'), value(document, 'documentId', 'id', 'fileId'))
      try { await task.promise; showSuccess('Document replaced. The previous version is retained in history.'); await fetchSyllabi() }
      catch (failure) { showError(readableError(failure)) }
      finally { setReplaceProgress('') }
    }
    input.click()
  }
  const confirmArchive = record => setConfirmation({ kind: 'archive', record })

  const openUpload = () => openCreate(null, branches.find(branch => same(displayId(branch), filters.branchId)))
  const dashboardStats = [
    ['Total Programs', courses.length, 'Configured', FaGraduationCap],
    ['Total Departments', departments.length, 'Across Programs', FaUniversity],
    ['Total Courses / Branches', branches.length || courses.length, 'Branches & Groups', FaSitemap],
    ['Total Semesters', semesters.length, 'Configured', FaCalendarAlt],
    ['Published Syllabi', summary.published, 'Live', FaCheckCircle, 'published'],
    ['Draft Syllabi', summary.drafts, 'In Progress', FaFileAlt, 'draft'],
    ['Pending Syllabi', summary.pending, 'Not Created', FaClock, 'pending'],
  ]

  const pageHeader = detailMode ? <PageHeader
    className="syllabus-page-header"
    breadcrumb={[{ label: 'Home', link: '/dashboard' }, { label: 'Subjects & Curriculum' }, { label: 'Syllabus Management' }]}
    title="Syllabus Management"
    subtitle="Organize, revise and publish curriculum documents for every configured branch and semester."
  /> : <>
    <header className="syllabus-overview-header">
      <div className="syllabus-overview-heading">
        <FaBookOpen aria-hidden="true" />
        <div>
          <h1>Syllabus Management</h1>
          <p>Create, manage and publish academic syllabus across programs, departments and semesters.</p>
        </div>
      </div>
      <div className="syllabus-overview-actions" role="group" aria-label="Syllabus actions">
        <button type="button" className="syllabus-btn" disabled title="Common syllabus is unavailable"><FaUsers aria-hidden="true" /> Common Syllabus</button>
        <button type="button" className="syllabus-btn" disabled title="Syllabus copying is unavailable"><FaCopy aria-hidden="true" /> Copy Syllabus</button>
        <button type="button" className="syllabus-btn" onClick={openUpload} disabled={!canCreate || !semesters.length} title={!canCreate ? "Create permission required" : undefined}><FaUpload aria-hidden="true" /> Bulk Upload</button>
        <button type="button" className="syllabus-btn syllabus-overview-create" onClick={openUpload} disabled={!canCreate || !semesters.length} title={!canCreate ? "Create permission required" : undefined}><Plus aria-hidden="true" /> Create Syllabus</button>
      </div>
    </header>
    <section className="syllabus-kpi-grid" aria-label="Syllabus summary">
      {dashboardStats.map(([label, count, caption, Icon, status]) => (
        <article className="syllabus-kpi" data-status={status} key={label}>
          <Icon aria-hidden="true" />
          <div>
            <span>{label}</span>
            <strong>{status && recordsLoading ? <i className="syllabus-skeleton" /> : status && recordsError ? '\u2014' : count}</strong>
            <small>{caption}</small>
          </div>
        </article>
      ))}
    </section>
  </>

  const clearFilters = () => {
    setFilters({ academicYearId: academic.selectedAcademicYearId || '', courseId: '', departmentId: '', branchId: '', subjectId: '', batchId: '' })
    setStatusFilter('All')
    setSearch('')
  }


  const branchGroups = new Map()
  const workspaceBranches = new Map()
  const addWorkspaceBranch = (branchKey, branch, course, semester) => {
    const departmentId = value(branch, 'departmentId') || value(semester, 'departmentId') || value(course, 'departmentId')
    const department = value(departments.find(item => same(displayId(item), departmentId)), 'name', 'departmentName') || value(branch, 'departmentName') || 'Unassigned department'
    const departmentKey = String(departmentId || department)
    const group = branchGroups.get(departmentKey) || { department, branches: new Map() }
    const entry = { branch, department, scopes: [] }
    group.branches.set(branchKey, entry)
    branchGroups.set(departmentKey, group)
    workspaceBranches.set(branchKey, entry)
    return entry
  }
  for (const branch of programBranches) {
    const course = courses.find(item => same(displayId(item), courseIdOf(branch)))
    const departmentId = value(branch, 'departmentId') || value(course, 'departmentId')
    const branchId = String(displayId(branch))
    if (filters.departmentId && !same(departmentId, filters.departmentId)) continue
    if (filters.branchId && !same(branchId, filters.branchId)) continue
    addWorkspaceBranch(branchId, branch, course)
  }
  const matchingScopes = new Set(visibleScopes)
  for (const scope of programScopes) {
    const course = courses.find(item => same(displayId(item), courseIdOf(scope.branch) || courseIdOf(scope.semester)))
    const branchKey = scope.branchId || 'course:' + displayId(course)
    const entry = workspaceBranches.get(branchKey) || addWorkspaceBranch(branchKey, scope.branch, course, scope.semester)
    const related = recordsForScope(scope)
    entry.scopes.push({ ...scope, key: branchKey + ':' + displayId(scope.semester), department: entry.department, records: related, matchesFilters: matchingScopes.has(scope), created: related.length > 0, state: stateForScope(related) })
  }
  const defaultBranchKey = [...workspaceBranches].find(([, entry]) => entry.scopes.some(scope => scope.matchesFilters))?.[0] ?? workspaceBranches.keys().next().value
  const activeBranchKey = workspaceBranches.has(workspaceBranch) ? workspaceBranch : defaultBranchKey
  const activeBranch = workspaceBranches.get(activeBranchKey)
  const branchScopes = activeBranch?.scopes || []
  const browsingFiltersActive = Boolean(search.trim() || filters.subjectId || statusFilter !== 'All')
  const navigableScopes = browsingFiltersActive ? branchScopes.filter(scope => scope.matchesFilters) : branchScopes
  const semestersByYear = new Map()
  for (const scope of navigableScopes) {
    const year = Number(value(scope.semester, 'yearNumber')) || Math.max(1, Math.ceil(semNumber(scope.semester) / 2))
    if (!semestersByYear.has(year)) semestersByYear.set(year, [])
    semestersByYear.get(year).push(scope)
  }
  const publishedCount = branchScopes.filter(scope => scope.state === 'published').length
  const activeScope = navigableScopes.find(scope => scope.key === workspaceSemester) || navigableScopes[0]
  const activeWorkspaceTab = activeScope?.key === workspaceSemester ? workspaceTab : filters.subjectId ? 'subjects' : 'overview'
  const activeRecord = activeScope && ([...activeScope.records].sort((a, b) => String(value(b, 'updatedAt', 'createdAt')).localeCompare(String(value(a, 'updatedAt', 'createdAt'))))[0] || null)
  const mappedSubjects = activeScope ? subjectsForScope(activeScope) : []
  const activeSubjects = filters.subjectId ? mappedSubjects.filter(subject => same(value(subject, 'subjectId', 'id'), filters.subjectId)) : mappedSubjects
  const subjectOptions = new Map()
  for (const scope of activeBranch?.scopes || []) {
    for (const subject of subjectsForScope(scope)) {
      const id = value(subject, 'subjectId', 'id')
      if (id) subjectOptions.set(String(id), value(subject, 'subjectName', 'name', 'subjectCode') || String(id))
    }
  }
  const activeDocuments = activeScope ? activeScope.records.flatMap(documentsOf) : []
  const previewDocument = activeDocuments.find(document => canDownload && ['PDF', 'Image', 'Text'].includes(classifySyllabusFile({ name: value(document, 'fileName', 'originalFileName', 'name') })))
  const downloadDocument = canDownload ? activeDocuments[0] : null
  const activeCourse = courses.find(item => same(displayId(item), courseIdOf(activeScope?.semester) || courseIdOf(activeBranch?.branch)))
  const branchDuration = value(activeBranch?.branch, 'duration', 'durationYears') || value(activeCourse, 'durationYears', 'durationInYears', 'duration')
  const yearLabel = value(years.find(year => same(displayId(year), filters.academicYearId)), 'name', 'academicYearName') || '\u2014'
  const subjectTarget = Number(value(activeScope?.semester, 'totalSubjects', 'subjectCount') || value(activeRecord, 'totalSubjects'))
  const subjectProgress = subjectTarget > 0 ? Math.min(100, Math.round(mappedSubjects.length / subjectTarget * 100)) : null
  const totalCredits = value(activeScope?.semester, 'totalCredits', 'credits') || (activeSubjects.some(subject => value(subject, 'credits', 'creditPoints') !== '') ? activeSubjects.reduce((total, subject) => total + (Number(value(subject, 'credits', 'creditPoints')) || 0), 0) : '')

  const workspaceCourseId = detailMode ? '' : displayId(activeCourse)
  const workspaceBranchId = detailMode ? '' : displayId(activeBranch?.branch)
  useEffect(() => {
    let current = true
    setSubjects([])
    const filterBranch = branches.find(branch => same(displayId(branch), filters.branchId))
    const subjectCourseId = filters.courseId || courseIdOf(selectedScope?.semester) || courseIdOf(selectedBranch) || courseIdOf(filterBranch) || workspaceCourseId
    if (!currentCollege || !filters.academicYearId || !subjectCourseId) {
      setSubjectsError('')
      return () => { current = false }
    }
    subjectApi.list({ collegeId: currentCollege, academicYearId: filters.academicYearId, courseId: subjectCourseId, branchId: routeBranchId || filters.branchId || workspaceBranchId || undefined, semesterId: routeSemesterId || undefined })
      .then(response => { if (current) setSubjects(rowsFrom(response)) })
      .catch(error => { if (current) { setSubjectsError(readableError(error)) } })
    return () => { current = false }
  }, [currentCollege, filters.academicYearId, filters.courseId, filters.branchId, routeSemesterId, routeBranchId, branches, selectedScope, selectedBranch, workspaceCourseId, workspaceBranchId])

  const renderDirectory = () => <>
    <section className="syllabus-filters" aria-label="Academic filters">
      <div className="syllabus-programs" role="group" aria-label="Program">
        {['B.Tech', 'Degree'].map(item => (
          <button key={item} className="syllabus-btn" type="button" aria-pressed={program === item} onClick={() => {
            if (program === item) return
            setSelectedProgram(item)
            setWorkspaceBranch('')
            setWorkspaceSemester('')
            setWorkspaceTab('overview')
            setFilters(current => ({ ...current, courseId: '', departmentId: '', branchId: '', subjectId: '' }))
          }}>{item}</button>
        ))}
      </div>
      <div className="syllabus-filter-grid">
        <Field label="Academic Year"><select value={filters.academicYearId} onChange={event => setFilters(current => ({ ...current, academicYearId: event.target.value, subjectId: '' }))}><option value="">Select academic year</option>{years.map(year => <option key={displayId(year)} value={displayId(year)}>{value(year, 'name', 'academicYearName')}</option>)}</select></Field>
        <Field label="Course"><select value={filters.courseId} onChange={event => setFilters(current => ({ ...current, courseId: event.target.value, departmentId: '', branchId: '', subjectId: '' }))}><option value="">All courses</option>{programCourses.map(course => <option key={displayId(course)} value={displayId(course)}>{value(course, 'name', 'courseName', 'code', 'courseCode')}</option>)}</select></Field>
        <Field label="Department"><select value={filters.departmentId} onChange={event => setFilters(current => ({ ...current, departmentId: event.target.value, branchId: '', subjectId: '' }))}><option value="">All departments</option>{departments.filter(department => programDepartmentIds.has(String(displayId(department)))).map(department => <option key={displayId(department)} value={displayId(department)}>{value(department, 'name', 'departmentName')}</option>)}</select></Field>
        <Field label="Branch"><select value={filters.branchId} onChange={event => setFilters(current => ({ ...current, branchId: event.target.value, subjectId: '' }))}><option value="">All branches</option>{scopedBranches.filter(branch => inProgram(courseIdOf(branch))).map(branch => <option key={displayId(branch)} value={displayId(branch)}>{value(branch, 'name', 'branchName', 'code')}</option>)}</select></Field>
        <Field label="Subjects"><select value={filters.subjectId} onChange={event => { setFilters(current => ({ ...current, subjectId: event.target.value })); setWorkspaceSemester(''); setWorkspaceTab(event.target.value ? 'subjects' : 'overview') }}><option value="">All subjects</option>{[...subjectOptions].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
        <Field label="Syllabus Status"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="All">All Status</option><option>Published</option><option>Draft</option><option>Pending</option><option>Archived</option><option>Unavailable</option></select></Field>
        <label className="syllabus-search"><Search size={17} aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search..." aria-label="Search semesters" /></label>
        <button className="syllabus-btn syllabus-clear-filters" type="button" onClick={clearFilters}><RefreshCw size={15} aria-hidden="true" />Clear Filters</button>
      </div>
    </section>
      {!canCreate && <div className="syllabus-inline-alert" role="status"><ShieldCheck size={16} /> Your role has view access only. Ask an administrator to grant the syllabus_management create permission to upload syllabus files.</div>}
      {!academic.selectedCollegeId && <div className="syllabus-inline-alert" role="status"><CircleAlert size={16} /> Select an authorized college in the global academic context to view its syllabus.</div>}

    <div className="syllabus-branch-workspace">
      <BranchDirectory key={program} groups={branchGroups} selected={activeBranchKey} onSelect={key => { setWorkspaceBranch(key); setWorkspaceSemester(''); setWorkspaceTab('overview'); if (filters.subjectId) setFilters(current => ({ ...current, subjectId: '' })) }} />
      <section className="syllabus-branch-content" aria-label="Branch semester workspace">
        {recordsError && <div className="syllabus-inline-alert syllabus-inline-alert--warning" role="status"><CircleAlert size={17} /><span>{recordsError}</span><button type="button" onClick={fetchSyllabi}>Retry</button></div>}
        {recordsLoading && <div className="syllabus-loading-line" role="status"><LoaderCircle size={17} className="syllabus-spin" /> Loading syllabi?</div>}
        {branchScopes.length > 0 ? <>
          <div className="syllabus-branch-context">
            <div><FaUniversity aria-hidden="true" /> <b>Program:</b> {program} <span>|</span> <b>Department:</b> {activeBranch.department} <span>|</span> <b>Branch:</b> {branchLabel(activeBranch)} <span>|</span> <b>Regulation:</b> {value(activeRecord, 'regulationName', 'regulationCode') || '\u2014'} <span>|</span> <b>Academic Year:</b> {yearLabel}</div>
            <div><b>Duration:</b> {branchDuration ? branchDuration + ' Years' : '\u2014'} <span>|</span> <b>Total Semesters:</b> {branchScopes.length}</div>
          </div>
          <div className="syllabus-branch-stats" aria-label="Branch summary">
            {[
              ['Total Semesters', branchScopes.length, FaCalendarAlt, 'configured'],
              ['Created', branchScopes.filter(scope => scope.created).length, FaCheckCircle, 'created'],
              ['Published', publishedCount, FaCheckCircle, 'published'],
              ['Draft', branchScopes.filter(scope => scope.state === 'draft').length, FaFileAlt, 'draft'],
              ['Pending', branchScopes.filter(scope => !scope.created).length, FaClock, 'pending'],
            ].map(([label, count, Icon, tone]) => <div key={label} data-tone={tone}><Icon aria-hidden="true" /><div>{label}<strong>{recordsError && tone !== 'configured' ? '\u2014' : count}</strong></div></div>)}
          </div>
          <div className="syllabus-coverage">
            <div><h2>Semester navigation</h2><span>{recordsLoading ? 'Loading publication data?' : recordsError ? 'Publication progress unavailable' : <>{publishedCount} of {branchScopes.length} semesters published</>}</span></div>
            {!recordsError && !recordsLoading && <progress max={branchScopes.length} value={publishedCount} aria-label="Published semesters" />}
            <button type="button" className="syllabus-icon-button" onClick={fetchSyllabi} disabled={recordsLoading} title="Refresh syllabi" aria-label="Refresh syllabi"><RefreshCw size={16} /></button>
          </div>
          <nav className="syllabus-year-groups" aria-label="Semesters by year">
            {[...semestersByYear].map(([year, scopes]) => <div key={year} role="group" aria-label={'Year ' + year}>
              <h3>Year {year}</h3>
              <div>{scopes.map(scope => <button type="button" key={scope.key} aria-current={scope.key === activeScope?.key ? 'true' : undefined} onClick={() => { setWorkspaceSemester(scope.key); setWorkspaceTab(filters.subjectId ? 'subjects' : 'overview') }}>
                <strong>{semNumber(scope.semester) ? 'Semester ' + semNumber(scope.semester) : value(scope.semester, 'semesterName', 'name') || 'Semester'}</strong>
                <span className={'syllabus-status syllabus-status--' + scope.state}><i />{scope.state[0].toUpperCase() + scope.state.slice(1)}</span>
              </button>)}</div>
            </div>)}
          </nav>
          {activeScope ? <section className="syllabus-semester-workspace">
            <header className="syllabus-semester-heading">
              <div><h2>Semester {semNumber(activeScope.semester)} - {yearLabel} ({semNumber(activeScope.semester) % 2 ? 'Odd' : 'Even'} Semester)</h2><span className={'syllabus-status syllabus-status--' + activeScope.state}><i />{activeScope.state[0].toUpperCase() + activeScope.state.slice(1)}</span></div>
              <div><small>Last Updated: {dateLabel(value(activeRecord, 'updatedAt', 'lastUpdated', 'createdAt'))}</small>
                <button type="button" disabled={!previewDocument} onClick={() => documentBlob(previewDocument, false)}>View</button>
                <button type="button" disabled={!downloadDocument} onClick={() => documentBlob(downloadDocument, true)}>Download</button>
                <details key={activeScope.key}><summary>More</summary><div>
                  {canCreate && <button type="button" onClick={() => openCreate(activeScope.semester, activeScope.branch)}>Add document</button>}
                  {canEdit && activeRecord && <button type="button" onClick={() => openEdit(activeRecord)}>Edit metadata</button>}
                  {canPublish && activeRecord && statusKey(activeRecord) === 'draft' && <button type="button" onClick={() => executeAction('publish', activeRecord)}>Publish</button>}
                  {canArchive && activeRecord && statusKey(activeRecord) !== 'archived' && <button type="button" onClick={() => confirmArchive(activeRecord)}>Archive</button>}
                  <button type="button" onClick={() => navigate('/syllabus-management/' + encodeURIComponent(displayId(activeScope.semester)) + (activeScope.branchId ? '?branchId=' + encodeURIComponent(activeScope.branchId) : ''))}>Open full workspace</button>
                </div></details>
              </div>
            </header>
            <nav className="syllabus-workspace-tabs" aria-label="Semester sections">
              {[['overview', 'Overview'], ['subjects', 'Mapped Subjects'], ['documents', 'Documents'], ['versions', 'Version History']].map(([tab, label]) => <button type="button" key={tab} aria-current={activeWorkspaceTab === tab ? 'true' : undefined} onClick={() => {
                setWorkspaceSemester(activeScope.key)
                setWorkspaceTab(tab)
                if (tab === 'versions') { setExtraRows([]); loadExtra(tab, activeRecord) }
              }}>{label}</button>)}
            </nav>
            {activeWorkspaceTab === 'overview' ? <div className="syllabus-semester-overview">
              <div className="syllabus-overview-book"><FaBookOpen aria-hidden="true" /></div>
              <dl>{[
                ['Syllabus Title', value(activeRecord, 'title', 'syllabusTitle')],
                ['Total Subjects', activeSubjects.length],
                ['Total Credits', totalCredits],
                ['Description', value(activeRecord, 'description', 'notes')],
              ].map(([label, data]) => <div key={label}><dt>{label}</dt><dd>{data === '' ? '\u2014' : data}</dd></div>)}</dl>
              <div className="syllabus-overview-documents">
                <strong>Subjects Progress</strong>
                {subjectProgress === null ? <p>{activeSubjects.length} mapped (target unavailable)</p> : <div className="syllabus-progress"><progress max="100" value={subjectProgress} aria-label="Subjects progress" /><b>{subjectProgress}%</b></div>}
                <strong>Documents ({activeDocuments.length})</strong>
                {activeDocuments.length ? <ul>{activeDocuments.map((document, index) => {
                  const name = value(document, 'fileName', 'originalFileName', 'name') || 'Syllabus document'
                  const size = value(document, 'size', 'fileSize', 'sizeBytes')
                  return <li key={value(document, 'documentId', 'id') || index}><FaFileAlt data-type={classifySyllabusFile({ name })} aria-hidden="true" /><span title={name}>{name}</span><small>{size ? formatFileSize(size) : '?'}</small><button type="button" disabled={!canDownload} aria-label={'Download ' + name} onClick={() => documentBlob(document, true)}><Download size={15} /></button></li>
                })}</ul> : <p>No documents available.</p>}
              </div>
            </div> : <DetailWorkspace embedded semester={activeScope.semester} branch={activeScope.branch} records={activeScope.records} subjects={activeSubjects} activeTab={activeWorkspaceTab} onModal={record => record ? openEdit(record) : openCreate(activeScope.semester, activeScope.branch)} onPreview={document => documentBlob(document, false)} onDownload={document => documentBlob(document, true)} onReplace={onReplace} onViewSubject={setReadingSubject} canCreate={canCreate} canEdit={canEdit} canDownload={canDownload} extraRows={extraRows} extraError={extraError} loadingExtra={loadingExtra} loadExtra={tab => loadExtra(tab, activeRecord)} />}
          </section> : <div className="syllabus-empty syllabus-empty--compact"><Search size={22} /><strong>No semesters match the current filters</strong><button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={() => { setSearch(''); setStatusFilter('All'); setFilters(current => ({ ...current, subjectId: '' })) }}>Reset semester filters</button></div>}
        </> : !recordsLoading && <div className="syllabus-empty"><BookOpenCheck size={28} /><h3>No semesters match the current filters</h3></div>}
        {subjectsError && <p className="syllabus-data-note" role="status">Subject totals may be unavailable: {subjectsError}</p>}
      </section>
    </div>
  </>

  return <DashboardLayout hideBreadcrumb={!detailMode}>
    <main className="syllabus-page">
      {pageHeader}
      {detailMode && recordsError && <div className="syllabus-inline-alert syllabus-inline-alert--warning" role="status"><CircleAlert size={17} /><span>{recordsError}</span><button type="button" onClick={fetchSyllabi}>Retry</button></div>}
      {detailMode
        ? selectedSemester
          ? <DetailWorkspace semester={selectedSemester} branch={selectedBranch} records={selectedScope ? recordsForScope(selectedScope) : records.filter(record => same(semId(record), displayId(selectedSemester)))} subjects={selectedScope ? subjectsForScope(selectedScope) : subjects.filter(subject => !semId(subject) || same(semId(subject), displayId(selectedSemester)))} activeTab={detailTab} setActiveTab={setDetailTab} onBack={() => navigate('/syllabus-management')} onModal={record => record ? openEdit(record) : openCreate(selectedSemester, selectedBranch)} onPublish={record => executeAction('publish', record)} onPreview={document => documentBlob(document, false)} onDownload={document => documentBlob(document, true)} onReplace={onReplace} onViewSubject={setReadingSubject} canCreate={canCreate} canEdit={canEdit} canPublish={canPublish} canDownload={canDownload} extraRows={extraRows} extraError={extraError} loadingExtra={loadingExtra} loadExtra={loadExtra} />
          : <div className="syllabus-empty"><CircleAlert size={26} /><h3>Semester not found</h3><p>This semester is not in the current college and academic configuration.</p><Link className="syllabus-btn syllabus-btn--secondary" to="/syllabus-management">Back to Syllabus Management</Link></div>
        : renderDirectory()}
      {replaceProgress && <div className="syllabus-toast-status" role="status"><LoaderCircle size={16} className="syllabus-spin" />{replaceProgress}</div>}
    </main>
    <SyllabusModal open={modalOpen} onClose={closeModal} form={form} setForm={setForm} academic={academic} courses={courses} branches={branches} subjects={subjects} files={files} setFiles={setFiles} errors={formErrors} setErrors={setFormErrors} onSave={saveSyllabus} saving={saving} canPublish={canPublish} onRetryFile={retryFile} onCancelFile={cancelFile} />
    {readingSubject && <SubjectReader subject={readingSubject} semester={detailMode ? selectedSemester : activeScope?.semester} branch={detailMode ? selectedBranch : activeScope?.branch} onClose={() => setReadingSubject(null)} />}
    {preview && <div className="syllabus-preview-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreview(null) }}><section className="syllabus-preview" role="dialog" aria-modal="true" aria-label={'Preview ' + preview.name}><header><strong>{preview.name}</strong><button type="button" className="syllabus-icon-button" onClick={() => setPreview(null)} aria-label="Close preview"><X size={18} /></button></header>{preview.type.startsWith('image/') ? <img src={preview.url} alt={preview.name} /> : preview.type.includes('pdf') || preview.name.toLowerCase().endsWith('.pdf') || preview.type.startsWith('text/') ? <iframe src={preview.url} title={preview.name} /> : <div className="syllabus-empty"><FileText size={25} /><h3>Preview unavailable</h3><p>This format must be downloaded to open.</p></div>}</section></div>}
    {confirmation && <div className="syllabus-modal-backdrop" role="presentation"><section className="syllabus-confirm" role="alertdialog" aria-modal="true" aria-labelledby="syllabus-confirm-title"><span><Archive size={20} /></span><h2 id="syllabus-confirm-title">Archive this syllabus?</h2><p>Archived documents are no longer shown as active to students and faculty. The record and its versions remain available for audit.</p><footer><button className="syllabus-btn syllabus-btn--quiet" type="button" onClick={() => setConfirmation(null)}>Cancel</button><button className="syllabus-btn syllabus-btn--danger" type="button" onClick={async () => { const record = confirmation.record; setConfirmation(null); await executeAction('archive', record, true) }}>Archive syllabus</button></footer></section></div>}
  </DashboardLayout>
}
