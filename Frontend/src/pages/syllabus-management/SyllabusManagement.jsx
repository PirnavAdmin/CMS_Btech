import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity, Archive, ArrowLeft, BookOpenCheck, Check, CheckCircle2, Circle, CircleAlert, Filter, CalendarDays, Clock, Layers, Landmark, Network,
  Download, Eye, FileCheck2, FileText, History, LoaderCircle,
  Plus, RefreshCw, Search, ShieldCheck, Upload, X,
} from 'lucide-react'
import { FaBookOpen, FaGraduationCap } from 'react-icons/fa'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { subjectApi } from '../../api/apiEndpoints.js'
import { syllabusApi } from '../../services/syllabusApi.js'
import { showError, showSuccess } from '../../utils/toast.js'
import SyllabusFileDropzone from './SyllabusFileDropzone.jsx'
import { SYLLABUS_MAX_FILE_SIZE, classifySyllabusFile, fileIdentity, formatFileSize, validateSyllabusFile } from './syllabusFiles.js'
import SubjectContentEditor from './SubjectContentEditor.jsx'
import SubjectSyllabusTable from './SubjectSyllabusTable.jsx'
import { hasSubjectContent, readSubjectContent, serializeSubjectContent, validateSubjectContent, UPLOAD_ONLY_HEADER } from './subjectSyllabusContent.js'
import { getYearSyllabusCounts, useSyllabusYearOverview } from './syllabusYearOverview.js'
import { buildProgramSemesterCards } from './programSemesterCards.js'
import './SyllabusManagement.css'

const EMPTY_ROWS = Object.freeze([])
const EMPTY_FILTERS = Object.freeze({ academicYearId: '', program: '', courseId: '', departmentId: '', branchId: '', semesterId: '', batchId: '' })
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
const subjectIdOf = subject => value(subject, 'subjectId', 'id')
const mappedSubjectRows = response => rowsFrom(response).flatMap(subject => {
  const mappings = value(subject, 'mappings')
  return Array.isArray(mappings) && mappings.length ? mappings.map(mapping => ({ ...subject, ...mapping, subjectId: subjectIdOf(subject), mappingStatus: value(mapping, 'mappingStatus', 'status') })) : [subject]
})
const isActiveMapping = row => !['0', 'false', 'inactive'].includes(String(value(row, 'mappingStatus')).toLowerCase())
const uniqueSubjects = rows => [...new Map(rows.filter(subjectIdOf).map(subject => [String(subjectIdOf(subject)), subject])).values()]
const subjectRecords = (records, id) => records.filter(record => same(value(record, 'subjectId'), id))
const contentOf = record => value(record, 'description')
const isContentRecord = record => hasSubjectContent(contentOf(record))
const isActiveSubjectSyllabus = record => Boolean(value(record, 'subjectId')) && statusKey(record) !== 'archived' && isContentRecord(record)
const documentId = row => value(row, 'documentId', 'id')
const dateLabel = date => {
  if (!date) return '—'
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? String(date) : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}
const displayId = row => value(row, 'id', 'semesterId', 'branchId', 'courseId', 'departmentId', 'academicYearId')
const configuredRegulation = (semester, branch) => value(semester, 'regulationId', 'regulationCode', 'regulation') || value(branch, 'regulationId', 'regulationCode', 'regulation')
const branchIdOf = row => value(row, 'branchId') || value(row?.branch, 'id', 'branchId')
const courseIdOf = row => value(row, 'courseId') || value(row?.course, 'id', 'courseId')
const relationMatches = (row, field, selected) => {
  if (!selected) return true
  const id = value(row, field + 'Id') || value(row?.[field], 'id', field + 'Id')
  return !id || same(id, selected)
}
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
  content: readSubjectContent(),
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
  description: readSubjectContent(contentOf(record)).description || '',
  content: readSubjectContent(contentOf(record)),
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

function Field({ label, children, required = false, hint, className = '' }) {
  return <label className={className ? 'syllabus-field ' + className : 'syllabus-field'}>
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
}

function SyllabusModal({ open, mode, locked, subjectOnly, subjectLocked, onClose, form, setForm, academic, courses, branches, subjects, subjectsError, files, setFiles, errors, setErrors, onSave, saving, canPublish, canUpload, uploadTargets, onRetryFile, onCancelFile, onPreviewFile, onChooseSubject }) {
  const [showPreview, setShowPreview] = useState(false)
  if (!open) return null
  const years = academic.academicYears || academic.activeAcademicYears || []
  const sem = (academic.activeSemesters || []).find(item => same(displayId(item), form.semesterId))
  const course = courses.find(item => same(displayId(item), form.courseId))
  const branch = branches.find(item => same(displayId(item), form.branchId))
  const department = (academic.activeDepartments || []).find(item => same(displayId(item), form.departmentId))
  const uploading = mode === 'upload'
  const structured = !uploading && (subjectOnly || form.category === 'Subject-wise Syllabus')
  const mappedSubject = subjects.find(subject => same(value(subject, 'subjectId', 'id'), form.subjectId))
  const branchOptions = branches.filter(item => !form.courseId || !courseIdOf(item) || same(courseIdOf(item), form.courseId))
  const semesterOptions = (academic.activeSemesters || []).filter(item =>
    same(courseIdOf(item), form.courseId) && same(branchIdOf(item), form.branchId) &&
    (!form.academicYearId || !value(item, 'academicYearId') || same(value(item, 'academicYearId'), form.academicYearId)))
  const subjectOptions = uniqueSubjects(subjects.filter(item => isActiveMapping(item) && (!semId(item) || same(semId(item), form.semesterId)) && relationMatches(item, 'branch', form.branchId) && relationMatches(item, 'department', form.departmentId) && relationMatches(item, 'course', form.courseId)))
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.value }))
  const setCourse = event => {
    const courseId = event.target.value
    const selectedCourse = courses.find(item => same(displayId(item), courseId))
    setForm(current => ({ ...current, courseId, departmentId: String(value(selectedCourse, 'departmentId') || ''), branchId: '', semesterId: '', subjectId: '' }))
  }
  const setBranch = event => {
    const branchId = event.target.value
    const currentSemester = semesterOptions.find(item => same(displayId(item), form.semesterId))
    const keepSemester = currentSemester && same(branchIdOf(currentSemester), branchId)
    const selected = branchOptions.find(item => same(displayId(item), branchId))
    setForm(current => ({ ...current, branchId, departmentId: String(value(selected, 'departmentId') || value(course, 'departmentId') || ''), semesterId: keepSemester ? current.semesterId : '', subjectId: '' }))
  }
  return <div className="syllabus-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section className={'syllabus-modal' + (structured ? ' syllabus-modal--drawer' : '')} role="dialog" aria-modal="true" aria-labelledby="syllabus-modal-title">
      <header className="syllabus-modal__header">
        <span className="syllabus-modal__mark"><Upload size={20} /></span>
        <div><h2 id="syllabus-modal-title">{uploading ? 'Upload Syllabus' : form.id ? 'Edit syllabus details' : 'Add Syllabus'}</h2><p>{sem?.semesterName || sem?.name || 'Semester'} · {academic.selectedCollege?.name || 'Current college'}</p></div>
        <button type="button" className="syllabus-icon-button" onClick={onClose} disabled={saving} aria-label="Close syllabus dialog"><X size={19} /></button>
      </header>
      <form className="syllabus-form" onSubmit={event => { event.preventDefault(); onSave(false) }}>
        <div className="syllabus-form-context">
          {[[ 'Academic Year', value(years.find(item => same(displayId(item), form.academicYearId)), 'name', 'academicYearName') ], ['Program', programForCourse(course)], ['Course', value(course, 'name', 'courseName')], ['Department', value(department, 'name', 'departmentName')], ['Branch / Group', value(branch, 'name', 'branchName')], ['Semester', value(sem, 'semesterName', 'name') || (sem && 'Semester ' + semNumber(sem))]].map(([label, text]) => <span key={label}><small>{label}</small><strong>{text || '—'}</strong></span>)}
        </div>
        {errors.length > 0 && <div className="syllabus-form-alert" role="alert">{errors.map(error => <p key={error}>{error}</p>)}</div>}
        <div className="syllabus-form-grid">
          {!locked && <><Field label="Course" required>
            <select required value={form.courseId} onChange={setCourse}><option value="">Choose a course</option>{courses.map(item => <option key={displayId(item)} value={displayId(item)}>{value(item, 'name', 'courseName')}</option>)}</select>
          </Field>
          <Field label="Branch / specialization" required>
            <select required value={form.branchId} onChange={setBranch}><option value="">Choose a branch</option>{branchOptions.map(item => <option key={displayId(item)} value={displayId(item)}>{value(item, 'name', 'branchName', 'code')}</option>)}</select>
          </Field>
          <Field label="Semester" required>
            <select required value={form.semesterId} onChange={event => setForm(current => ({ ...current, semesterId: event.target.value, subjectId: '' }))}><option value="">Choose a semester</option>{semesterOptions.map(item => <option key={displayId(item)} value={displayId(item)}>{value(item, 'semesterName', 'name') || 'Semester ' + semNumber(item)}</option>)}</select>
          </Field>
          </>}
          {(!uploading || !form.id) && <Field label={uploading ? 'Syllabus record title' : 'Syllabus title'} required><input autoFocus required maxLength="160" value={form.title} onChange={set('title')} placeholder="e.g. Data Structures and Algorithms" /></Field>}
          {!subjectOnly && (!uploading || !form.id) && <Field label="Syllabus category" required>
            <select value={form.category} onChange={set('category')}>{categories.map(category => <option key={category}>{category}</option>)}</select>
          </Field>}
          {(!uploading || !form.id) && <Field label="Regulation"><input maxLength="100" value={form.regulationId} onChange={set('regulationId')} /></Field>}
          {(!uploading || subjectOnly) && <Field label="Subject Mapping" required={subjectOnly || form.category === 'Subject-wise Syllabus'} hint={subjectsError || undefined}>
            <select required={subjectOnly || form.category === 'Subject-wise Syllabus'} disabled={subjectLocked || saving || files.some(file => ['uploading', 'uploaded'].includes(file.status))} value={form.subjectId} onChange={event => onChooseSubject(event.target.value)}><option value="">Choose a subject</option>{subjectOptions.map(subject => <option key={subjectIdOf(subject)} value={subjectIdOf(subject)}>{value(subject, 'subjectCode', 'code')} · {value(subject, 'subjectName', 'name')}</option>)}</select>
          </Field>}
          {mappedSubject && <>
            {[[ 'Subject Code', value(mappedSubject, 'subjectCode', 'code') ], ['Subject Name', value(mappedSubject, 'subjectName', 'name')], ['Subject Type', value(mappedSubject, 'subjectType', 'category')], ['Credits', value(mappedSubject, 'credits', 'creditPoints')]].map(([label, data]) => <Field key={label} label={label}><input readOnly value={data} /></Field>)}
          </>}
          {(!uploading || !form.id) && <><Field label="Version" required><input required maxLength="30" value={form.version} onChange={set('version')} placeholder="1.0" /></Field>
          <Field label="Effective academic year" required>
            <select required value={form.effectiveAcademicYearId} onChange={set('effectiveAcademicYearId')}><option value="">Select year</option>{years.map(year => <option key={displayId(year)} value={displayId(year)}>{value(year, 'name', 'academicYearName')}</option>)}</select>
          </Field>
          <Field label="Effective date"><input type="date" value={form.effectiveDate} onChange={set('effectiveDate')} /></Field>
          {!structured && <Field label={uploading ? 'Document Description' : 'Description'}><textarea rows="2" maxLength="1000" value={form.description} onChange={set('description')} placeholder="Short description for students and faculty" /></Field>}
          <Field label="Revision notes"><textarea rows="2" maxLength="1000" value={form.revisionNotes} onChange={set('revisionNotes')} placeholder="What changed in this version?" /></Field></>}
        </div>
        {structured && <SubjectContentEditor content={form.content} disabled={saving} onChange={content => setForm(current => ({ ...current, content }))} />}
        {structured && showPreview && <section className="syllabus-content-preview" aria-label="Syllabus preview"><h3>{form.title || "Syllabus Preview"}</h3><pre>{serializeSubjectContent(form.content)}</pre></section>}
        {uploading && form.id && (uploadTargets.length > 1 ? <Field label="Syllabus record"><select value={form.id} disabled={saving || files.some(file => ['uploading', 'uploaded'].includes(file.status))} onChange={event => { const target = uploadTargets.find(record => same(recordId(record), event.target.value)); if (target) setForm(recordForm(target)) }}>{uploadTargets.map(record => <option key={recordId(record)} value={recordId(record)}>{value(record, 'title')} ({statusText(record)})</option>)}</select></Field> : <p><strong>Syllabus:</strong> {form.title}</p>)}
        {canUpload && (uploading || canPublish) && <SyllabusFileDropzone files={files} onChange={(next, rejected) => { setFiles(next); setErrors(rejected) }} disabled={saving} maxFileSize={SYLLABUS_MAX_FILE_SIZE} onRetry={onRetryFile} onCancel={onCancelFile} onPreview={onPreviewFile} editableTitles={uploading} />}
        <footer className="syllabus-modal__footer">
          <button className="syllabus-btn syllabus-btn--quiet" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <span className="syllabus-modal__footer-fill" />
          <button className="syllabus-btn syllabus-btn--secondary" type="submit" disabled={saving}>{saving && <LoaderCircle size={16} className="syllabus-spin" />} {uploading ? 'Upload Syllabus' : form.id ? 'Save Changes' : 'Save as Draft'}</button>
          {structured && <button type="button" className="syllabus-btn syllabus-btn--secondary" aria-expanded={showPreview} onClick={() => setShowPreview(current => !current)}>{showPreview ? 'Hide Preview' : 'Preview Syllabus'}</button>}
          {!uploading && canPublish && <button className="syllabus-btn syllabus-btn--primary" type="button" disabled={saving} onClick={() => onSave(true)}>{saving ? <LoaderCircle size={16} className="syllabus-spin" /> : <Upload size={16} />} Publish Syllabus</button>}
        </footer>
      </form>
    </section>
  </div>
}


function branchLabel(scope) {
  return value(scope.branch, 'name', 'branchName', 'code') || 'Unassigned branch'
}


function DocumentRow({ document, record, subject, onPreview, onDownload, onEdit, onReplace, canDownload, canEdit }) {
  const id = value(document, 'documentId', 'id', 'fileId')
  const title = value(document, 'fileName', 'name', 'title', 'originalFileName') || 'Syllabus document'
  const contentType = String(value(document, 'contentType', 'mimeType', 'fileType') || title.split('.').pop() || '').toLowerCase()
  const extension = title.split('.').pop()?.toLowerCase()
  const previewable = contentType.includes('pdf') || contentType.startsWith('image/') || contentType.startsWith('text/') || ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'csv'].includes(contentType) || ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'csv'].includes(extension)
  return <article className="syllabus-document-row">
    <span className="syllabus-document-row__icon"><FileText size={19} /></span>
    <div className="syllabus-document-row__main"><strong>{title}</strong><span>{classifySyllabusFile({ name: title })} · {value(document, 'size', 'fileSize') ? formatFileSize(value(document, 'size', 'fileSize')) : 'Document'} · {dateLabel(value(document, 'uploadedAt', 'createdAt'))}</span></div>
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

function DetailWorkspace({ embedded = false, subjectPanel, semester, branch, records, subjects, activeTab, setActiveTab, onBack, onModal, onPublish, onPreview, onDownload, onReplace, onViewSubject, canCreate, canEdit, canPublish, canDownload, extraRows, extraError, loadingExtra, loadExtra }) {
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
      {records.length > 1 && <ul className="syllabus-record-list" aria-label="Syllabus records">
        {records.map(record => <li key={recordId(record)}>
          <div><strong>{value(record, 'title', 'syllabusTitle')}</strong><small>{statusText(record)} ? Version {value(record, 'version', 'versionNumber') || '?'}</small></div>
          {canEdit && statusKey(record) !== 'archived' && <button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={() => onModal(record)}>Edit</button>}
        </li>)}
      </ul>}
      {allDocuments.length ? <div className="syllabus-document-list">{allDocuments.map(({ record, document }, index) => <DocumentRow key={value(document, 'documentId', 'id') || recordId(record) + '-' + index} document={document} record={record} subject={subjects.find(subject => same(subjectIdOf(subject), value(record, 'subjectId')))} onPreview={onPreview} onDownload={onDownload} onEdit={onModal} onReplace={onReplace} canDownload={canDownload} canEdit={canEdit} />)}</div> : <div className="syllabus-empty syllabus-empty--compact"><FileText size={22} /><strong>No syllabus files yet</strong><span>Upload a document to start the semester’s syllabus record.</span></div>}
    </section>}
    {activeTab === 'subjects' && (subjectPanel || <section className="syllabus-detail-panel">
      <div className="syllabus-section-heading"><div><h3>Mapped subjects</h3><p>Subjects are scoped to this branch and semester.</p></div></div>
      {subjects.length ? <div className="syllabus-subject-list">{subjects.map((subject, index) => <article key={value(subject, 'id', 'subjectId') || index}><span className="syllabus-subject-code">{value(subject, 'subjectCode', 'code') || 'SUBJECT'}</span><div><strong>{value(subject, 'subjectName', 'name')}</strong><small>{value(subject, 'subjectType', 'category') || 'Configured subject'} · {value(subject, 'credits', 'creditPoints') || '—'} credits</small></div><span className="syllabus-status syllabus-status--neutral"><i />{value(subject, 'status') || 'Active'}</span><button type="button" className="syllabus-btn syllabus-btn--secondary syllabus-subject-view" onClick={() => onViewSubject(subject)}><Eye size={15} />View</button></article>)}</div> : <div className="syllabus-empty syllabus-empty--compact"><BookOpenCheck size={22} /><strong>No subject mappings returned</strong><span>Check that subjects are configured for this course and semester.</span></div>}
    </section>)}
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
  const { canAction, loading: accessLoading } = useScreenAccess()
  const navigate = useNavigate()
  const { semesterId: routeSemesterId } = useParams()
  const [searchParams] = useSearchParams()
  const routeBranchId = searchParams.get('branchId') || ''
  const canCreate = canAction('/syllabus-management', 'create')
  const canEdit = canAction('/syllabus-management', 'edit')
  const canPublish = canCreate
  const canUpload = canCreate
  const canDownload = canAction('/syllabus-management', 'export')
  const canArchive = canCreate && canAction('/syllabus-management', 'delete')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterDraft, setFilterDraft] = useState(EMPTY_FILTERS)
  const [workspaceTab, setWorkspaceTab] = useState('subjects')
  const [recordResult, setRecordResult] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const [summaryRevision, setSummaryRevision] = useState(0)
  const [showCommon, setShowCommon] = useState(false)
  const [bulkRequest, setBulkRequest] = useState(0)
  const [bulkSelection, setBulkSelection] = useState(0)
  const [subjectResult, setSubjectResult] = useState(null)
  const [modalSubjectResult, setModalSubjectResult] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [subjectOnly, setSubjectOnly] = useState(false)
  const [subjectLocked, setSubjectLocked] = useState(false)
  const [modalRevision, setModalRevision] = useState(0)
  const [failedUploads, setFailedUploads] = useState({})
  const [subjectView, setSubjectView] = useState(null)
  const batchCreated = useRef(new Map())
  const batchUploaded = useRef(new Set())
  const [uploadTargets, setUploadTargets] = useState(EMPTY_ROWS)
  const semesterWorkspace = useRef(null)
  const [lockedContext, setLockedContext] = useState(false)
  const modalCollege = useRef('')
  const writeInProgress = useRef(false)
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
  const currentRecordKey = useRef('')
  const historyRequest = useRef(0)
  const historySelection = useRef(null)
  const currentCollege = String(academic.selectedCollegeId || '')
  useEffect(() => {
    if (!modalOpen && !preview && !readingSubject && !subjectView && !showCommon) return undefined
    const onKeyDown = event => {
      if (event.key !== 'Escape') return
      if (preview) setPreview(null)
      else if (subjectView) setSubjectView(null)
      else if (showCommon) setShowCommon(false)
      else if (readingSubject) setReadingSubject(null)
      else if (!saving && !fileOperations.current.size) { setModalOpen(false); setFormErrors([]) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, preview, readingSubject, subjectView, showCommon, saving])


  const years = academic.academicYears || academic.activeAcademicYears || []
  const departments = academic.activeDepartments || []
  const courses = academic.activeCourses || []
  const branches = academic.activeBranches || []
  const semesters = academic.activeSemesters || []
  const defaultProgram = (courses.some(course => programForCourse(course) === 'Degree') && !courses.some(course => programForCourse(course) === 'B.Tech') ? 'Degree' : 'B.Tech')
  const program = filters.program || defaultProgram
  const detailMode = Boolean(routeSemesterId)
  const departmentForBranch = branch => value(branch, 'departmentId') || value(courses.find(course => same(displayId(course), courseIdOf(branch))), 'departmentId')
  const optionsForFilters = (selection, track) => {
    const courseIds = new Set(courses.filter(course => programForCourse(course) === track).map(course => String(displayId(course))))
    const programBranches = branches.filter(branch => courseIds.has(String(courseIdOf(branch))))
    const availableDepartments = departments.filter(department => programBranches.some(branch => same(departmentForBranch(branch), displayId(department))))
    const availableBranches = programBranches.filter(branch => selection.departmentId && same(departmentForBranch(branch), selection.departmentId))
    const branch = availableBranches.find(item => same(displayId(item), selection.branchId))
    const configured = branch ? semesters.filter(semester =>
      same(branchIdOf(semester), displayId(branch)) && same(courseIdOf(semester), courseIdOf(branch)) && relationMatches(semester, 'academicYear', selection.academicYearId)) : []
    return { departments: availableDepartments, branches: availableBranches, branch, slots: buildProgramSemesterCards(track, configured.map(semester => ({ semester })), semNumber) }
  }
  const getDefaults = program => {
    const year = years.find(item => same(displayId(item), academic.selectedAcademicYearId)) || years[0]
    const initial = { ...EMPTY_FILTERS, academicYearId: String(displayId(year) || ''), program }
    for (const department of optionsForFilters(initial, program).departments) {
      const departmentId = String(displayId(department))
      for (const branch of optionsForFilters({ ...initial, departmentId }, program).branches) {
        const branchId = String(displayId(branch))
        const semester = optionsForFilters({ ...initial, departmentId, branchId }, program).slots.find(slot => slot.scope)?.scope.semester
        if (semester) return { ...initial, departmentId, branchId, semesterId: String(displayId(semester)), courseId: String(courseIdOf(branch)) }
      }
    }
    return initial
  }
  const defaults = getDefaults(defaultProgram)
  const initialFilterKey = JSON.stringify([currentCollege, defaults])
  const filterCollege = useRef('')
  const initialized = useRef(false)
  useEffect(() => {
    const [college, initial] = JSON.parse(initialFilterKey)
    const changedCollege = !same(filterCollege.current, college)
    if (changedCollege) {
      filterCollege.current = college
      initialized.current = false
      setShowCommon(false)
    }
    if (detailMode) return
    if (!initialized.current && (changedCollege || initial.academicYearId)) {
      setFilters(initial)
      setFilterDraft(initial)
      initialized.current = Boolean(initial.semesterId)
    }
  }, [initialFilterKey, detailMode])
  const currentDraft = filterDraft.program ? filterDraft : { ...filterDraft, program: defaultProgram }
  const filterOptions = optionsForFilters(currentDraft, currentDraft.program)
  const draftSemester = filterOptions.slots.find(slot => slot.scope && same(displayId(slot.scope.semester), currentDraft.semesterId))?.scope.semester
  const filterIsValid = Boolean(!academic.loading && currentCollege && years.some(year => same(displayId(year), currentDraft.academicYearId)) && filterOptions.branch && draftSemester)
  const selectedSemester = semesters.find(semester => same(displayId(semester), routeSemesterId || filters.semesterId))
  const selectedBranch = branches.find(branch => same(displayId(branch), routeBranchId || filters.branchId || (detailMode ? branchIdOf(selectedSemester) : '')))
  const selectedScope = selectedSemester && selectedBranch && same(branchIdOf(selectedSemester), displayId(selectedBranch))
    ? { semester: selectedSemester, branch: selectedBranch, branchId: String(displayId(selectedBranch)) } : null
  const requestBranchId = routeBranchId || filters.branchId
  const requestSemesterId = routeSemesterId || filters.semesterId
  const { courseId, departmentId, batchId } = filters
  const academicYearId = filters.academicYearId || (detailMode ? academic.selectedAcademicYearId : '')
  const overviewYear = !detailMode && same(filterCollege.current, currentCollege) ? academicYearId : ''
  const overview = useSyllabusYearOverview(currentCollege, overviewYear, summaryRevision, subjectApi, syllabusApi, readableError)
  const recordKey = JSON.stringify([currentCollege, academicYearId, program, courseId, departmentId, requestBranchId, batchId, requestSemesterId, refreshIndex])
  const canLoadRecords = Boolean(currentCollege && academicYearId && requestSemesterId && (detailMode || (requestBranchId && same(filterCollege.current, currentCollege))))
  const records = recordResult?.key === recordKey ? recordResult.rows : EMPTY_ROWS
  const recordsError = recordResult?.key === recordKey ? recordResult.error : ''
  const recordsLoading = canLoadRecords && (recordResult?.key !== recordKey || recordResult.loading)

  const fetchSyllabi = useCallback(async (background = false) => {
    if (currentRecordKey.current !== recordKey) return
    const requestId = ++listRequest.current
    if (!canLoadRecords) return
    if (background !== true) setRecordResult({ key: recordKey, rows: EMPTY_ROWS, error: '', loading: true })
    try {
      const rows = await syllabusApi.list({
        collegeId: currentCollege, academicYearId, courseId, departmentId,
        branchId: requestBranchId, batchId, semesterId: requestSemesterId,
      })
      if (requestId === listRequest.current) setRecordResult({ key: recordKey, rows, error: '', loading: false })
    } catch (error) {
      if (requestId === listRequest.current) setRecordResult({ key: recordKey, rows: EMPTY_ROWS, error: readableError(error), loading: false })
    }
  }, [recordKey, canLoadRecords, currentCollege, academicYearId, courseId, departmentId, requestBranchId, batchId, requestSemesterId, refreshIndex])
  useEffect(() => {
    currentRecordKey.current = recordKey
    fetchSyllabi()
    return () => { currentRecordKey.current = ''; listRequest.current += 1 }
  }, [fetchSyllabi, recordKey])

  const refreshAfterWrite = async () => {
    setSummaryRevision(revision => revision + 1)
    await fetchSyllabi(true)
  }

  const recordsForScope = useCallback(scope => records.filter(record => {
    if (!same(semId(record), displayId(scope.semester))) return false
    if (!relationMatches(record, 'course', courseIdOf(scope.branch) || courseIdOf(scope.semester))) return false
    if (!relationMatches(record, 'academicYear', academicYearId)) return false
    const recordBranchId = branchIdOf(record)
    return scope.branchId ? same(recordBranchId, scope.branchId) : !recordBranchId
  }), [records, academicYearId])
  const subjectCourseId = courseId || courseIdOf(selectedBranch) || courseIdOf(selectedSemester)
  const subjectBranchId = requestBranchId || displayId(selectedBranch)
  const subjectKey = JSON.stringify([currentCollege, academicYearId, subjectCourseId, subjectBranchId, requestSemesterId, refreshIndex])
  const canLoadSubjects = canLoadRecords && Boolean(subjectCourseId)
  const semesterSubjects = uniqueSubjects(subjectResult?.key === subjectKey ? subjectResult.rows.filter(subject => isActiveMapping(subject) && relationMatches(subject, 'college', currentCollege) && relationMatches(subject, 'semester', requestSemesterId) && relationMatches(subject, 'branch', subjectBranchId) && relationMatches(subject, 'course', subjectCourseId) && relationMatches(subject, 'academicYear', academicYearId)) : EMPTY_ROWS)
  const semesterSubjectsError = subjectResult?.key === subjectKey ? subjectResult.error : ''
  const semesterSubjectsLoading = canLoadSubjects && subjectResult?.key !== subjectKey
  useEffect(() => {
    if (!canLoadSubjects) return undefined
    let current = true
    subjectApi.list({ collegeId: currentCollege, academicYearId, courseId: subjectCourseId, branchId: subjectBranchId || undefined, semesterId: requestSemesterId })
      .then(result => { if (current) setSubjectResult({ key: subjectKey, rows: mappedSubjectRows(result), error: '' }) })
      .catch(error => { if (current) setSubjectResult({ key: subjectKey, rows: EMPTY_ROWS, error: readableError(error) }) })
    return () => { current = false }
  }, [canLoadSubjects, subjectKey, currentCollege, academicYearId, subjectCourseId, subjectBranchId, requestSemesterId, refreshIndex])

  const openCreate = (semester, branchRecord, mode = 'add', subject = null) => {
    setModalRevision(current => current + 1)
    setSubjectOnly(Boolean(subject))
    setSubjectLocked(Boolean(subjectIdOf(subject)))
    modalCollege.current = currentCollege
    setModalMode(mode)
    setUploadTargets(EMPTY_ROWS)
    setLockedContext(Boolean(semester))
    const semesterCourseId = courseIdOf(semester)
    const semesterBranchId = branchIdOf(semester) || displayId(branchRecord) || filters.branchId
    const branch = branches.find(row => same(displayId(row), semesterBranchId))
    const course = courses.find(row => same(displayId(row), semesterCourseId || courseIdOf(branch) || filters.courseId))
    const semesterYearId = value(semester, 'academicYearId') || value(semester?.academicYear, 'academicYearId', 'id')
    const next = blankForm(semester)
    next.academicYearId = String(semesterYearId || academicYearId)
    next.effectiveAcademicYearId = String(semesterYearId || academicYearId)
    next.courseId = String(semesterCourseId || courseIdOf(branch) || filters.courseId)
    next.departmentId = String(value(semester, 'departmentId') || value(branch, 'departmentId') || value(course, 'departmentId') || filters.departmentId)
    next.branchId = String(semesterBranchId || '')
    next.batchId = filters.batchId
    next.regulationId = String(configuredRegulation(semester, branch) || '')
    if (subject) { next.category = 'Subject-wise Syllabus'; next.subjectId = String(subjectIdOf(subject) || '') }
    setForm(next)
    setFiles([])
    setFormErrors([])
    setModalOpen(true)
  }
  const openEdit = (record, mode = 'add') => {
    if (!record) return
    setModalRevision(current => current + 1)
    setSubjectOnly(Boolean(value(record, 'subjectId')))
    setSubjectLocked(Boolean(value(record, 'subjectId')))
    modalCollege.current = currentCollege
    setModalMode(mode)
    setUploadTargets(EMPTY_ROWS)
    setLockedContext(true)
    setForm(recordForm(record))
    setFiles([])
    setFormErrors([])
    setModalOpen(true)
  }
  const closeModal = () => {
    if (saving || fileOperations.current.size) return
    setModalOpen(false)
    setFormErrors([])
  }

  const setFileStatus = (key, updates) => setFiles(current => current.map(item => item.key === key ? { ...item, ...updates } : item))
  const uploadFile = async (item, syllabusId, replacingId) => {
    setFileStatus(item.key, { status: 'uploading', progress: 0, message: '' })
    const title = String(item.title || '').trim().replace(/[\\/:*?"<>|]/g, '-')
    const extension = item.file.name.match(/\.[^.]+$/)?.[0] || ''
    const file = modalMode === 'upload' && title ? new File([item.file], title + extension, { type: item.file.type, lastModified: item.file.lastModified }) : item.file
    const task = syllabusApi.uploadDocument(syllabusId, file, progress => setFileStatus(item.key, { progress }), replacingId, currentCollege)
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
    if (item && canUpload && same(modalCollege.current, currentCollege) && !writeInProgress.current && !fileOperations.current.has(key)) {
      const identity = JSON.stringify([currentCollege, String(form.academicYearId), String(form.branchId), String(form.semesterId), String(form.subjectId)])
      uploadFile(item, form.id).then(ok => {
        setFailedUploads(current => ({ ...current, [identity]: !ok }))
        return refreshAfterWrite()
      })
    }
  }
  const cancelFile = key => fileOperations.current.get(key)?.cancel()

  const saveSyllabus = async publishAfter => {
    if (writeInProgress.current || fileOperations.current.size || !same(modalCollege.current, currentCollege)) return
    const uploading = modalMode === 'upload'
    if (!(uploading ? canUpload : form.id ? canEdit : canCreate)) { showError('Your role does not have permission to save syllabus details.'); return }
    if (uploading && !files.length) { setFormErrors(['Choose at least one syllabus document.']); return }
    const required = [['Syllabus title', form.title], ['Program / course', form.courseId], ['Branch / specialization', form.branchId], ['Semester', form.semesterId], ['Effective academic year', form.effectiveAcademicYearId], ['Version', form.version]]
    const missing = required.filter(([, field]) => !String(field || '').trim()).map(([name]) => name)
    if ((subjectOnly || form.category === 'Subject-wise Syllabus') && !form.subjectId) missing.push('Subject')
    if (missing.length && !(uploading && form.id)) { setFormErrors(['Complete the required fields: ' + missing.join(', ') + '.']); return }
    if (!form.id && form.subjectId && !(modalSubjectResult?.key === modalSubjectKey && modalSubjectResult.rows.some(subject => same(subjectIdOf(subject), form.subjectId) && relationMatches(subject, 'semester', form.semesterId) && relationMatches(subject, 'branch', form.branchId) && relationMatches(subject, 'course', form.courseId)))) {
      setFormErrors(['Select an existing subject mapped to this semester.'])
      return
    }
    const structured = !uploading && (subjectOnly || form.category === 'Subject-wise Syllabus')
    const contentError = structured && validateSubjectContent(form.content)
    if (contentError) { setFormErrors([contentError]); return }
    const identity = JSON.stringify([currentCollege, form.academicYearId, form.branchId, form.semesterId, form.subjectId])
    const existingRecord = records.find(record => same(recordId(record), form.id))
    const duplicate = !form.id && records.some(record => statusKey(record) !== 'archived' && [
      ['academicYearId', form.academicYearId], ['courseId', form.courseId], ['departmentId', form.departmentId],
      ['branchId', form.branchId], ['semesterId', form.semesterId], ['category', form.category],
      ['subjectId', form.subjectId], ['regulationId', form.regulationId], ['batchId', form.batchId], ['version', form.version.trim()],
    ].every(([field, expected]) => same(value(record, field), expected)))
    if (duplicate) { setFormErrors(['This syllabus version already exists for the selected academic context. Open the existing syllabus to edit or upload files.']); return }
    if (files.length && !canUpload) { setFormErrors(['Your role cannot upload syllabus documents.']); return }
    if (publishAfter && files.length === 0 && documentsOf(existingRecord).length === 0) {
      setFormErrors(['Publishing requires an uploaded document. Save as draft or attach a document before publishing.'])
      return
    }
    if (publishAfter && !canPublish) { showError('Your role cannot publish syllabus documents.'); return }
    if (publishAfter && !window.confirm('Publish this syllabus? Eligible faculty and students will see the published version.')) return
    let savedChanges = false
    writeInProgress.current = true
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
        description: structured ? serializeSubjectContent(form.content) : uploading && form.subjectId ? [UPLOAD_ONLY_HEADER, form.description.trim()].filter(Boolean).join('\n') : form.description.trim() || null,
        revisionNotes: form.revisionNotes.trim() || null,
      }
      let id = form.id
      if (id && !uploading) {
        await syllabusApi.update(id, payload)
        savedChanges = true
      }
      if (!id) {
        const created = await syllabusApi.create({ ...payload, status: 'Draft' })
        savedChanges = true
        id = value(created, 'syllabusId', 'id')
        if (!id) throw new Error('The syllabus service did not return a record ID, so document uploads cannot continue safely.')
        setForm(current => ({ ...current, id: String(id) }))
      }
      let uploadFailed = false
      for (const item of files.filter(file => ['queued', 'failed', 'cancelled'].includes(file.status))) {
        if (await uploadFile(item, id)) savedChanges = true
        else uploadFailed = true
      }
      if (form.subjectId && files.length) setFailedUploads(current => ({ ...current, [identity]: uploadFailed }))
      if (uploadFailed) {
        setForm(current => ({ ...current, id: String(id) }))
        setFormErrors(['Some files did not upload. Use Retry on each failed document. The syllabus metadata is saved as a draft.'])
        await refreshAfterWrite()
        return
      }
      if (publishAfter) await syllabusApi.publish(id, { collegeId: currentCollege })
      showSuccess(publishAfter ? 'Syllabus published.' : uploading ? 'Syllabus documents uploaded.' : 'Syllabus saved.')
      setModalOpen(false)
      await refreshAfterWrite()
    } catch (error) {
      setFormErrors([readableError(error)])
      showError(readableError(error))
      if (savedChanges) await refreshAfterWrite()
    } finally { writeInProgress.current = false; setSaving(false) }
  }

  const executeAction = async (kind, record, confirmed = false) => {
    if (!record || !recordId(record) || !(kind === 'publish' ? canPublish : canArchive)) return
    const label = kind === 'publish' ? 'Publish this syllabus? Eligible faculty and students will be able to view it.' : 'Archive this syllabus? It will be removed from active availability.'
    if (!confirmed && !window.confirm(label)) return
    try {
      if (kind === 'publish') await syllabusApi.publish(recordId(record), { collegeId: currentCollege })
      else await syllabusApi.archive(recordId(record), { collegeId: currentCollege })
      showSuccess(kind === 'publish' ? 'Syllabus published.' : 'Syllabus archived.')
      await refreshAfterWrite()
    } catch (error) { showError(readableError(error)) }
  }
  const loadExtra = async (tab, workspaceRecord) => {
    const request = ++historyRequest.current
    const isCurrent = () => request === historyRequest.current && currentRecordKey.current === recordKey
    setLoadingExtra(false)
    const record = workspaceRecord !== undefined ? workspaceRecord : (selectedScope
      ? recordsForScope(selectedScope)[0]
      : records.find(row => same(semId(row), routeSemesterId) && (!routeBranchId || same(branchIdOf(row), routeBranchId))))
    const entries = (Array.isArray(record) ? record : [record]).filter(recordId)
    if (!entries.length) { setExtraRows([]); setExtraError('A syllabus record is required to load this information.'); return }
    setLoadingExtra(true)
    setExtraError('')
    try {
      const responses = await Promise.all(entries.map(entry => (tab === 'versions' ? syllabusApi.versions : syllabusApi.activity)(recordId(entry), { collegeId: currentCollege })))
      const rows = responses.flat().sort((left, right) => String(value(right, 'createdAt')).localeCompare(String(value(left, 'createdAt'))))
      if (isCurrent()) setExtraRows(rows)
    } catch (error) {
      if (isCurrent()) { setExtraRows([]); setExtraError(readableError(error)) }
    } finally {
      if (isCurrent()) setLoadingExtra(false)
    }
  }
  const documentBlob = async (document, download) => {
    if (!canDownload) { showError('Your role does not have download permission.'); return false }
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
      return true
    } catch (error) { showError(readableError(error)); return false }
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
      const error = validateSyllabusFile(file, SYLLABUS_MAX_FILE_SIZE)
      if (error) { showError(error); return }
      setReplaceProgress('Replacing ' + value(document, 'fileName', 'name') + '…')
      const replaceLabel = value(document, 'fileName', 'name') || file.name
      const task = syllabusApi.uploadDocument(recordId(record), file, progress => setReplaceProgress('Replacing ' + replaceLabel + ' · ' + progress + '%'), value(document, 'documentId', 'id', 'fileId'))
      try { await task.promise; showSuccess('Document replaced. The previous version is retained in history.'); await refreshAfterWrite() }
      catch (failure) { showError(readableError(failure)) }
      finally { setReplaceProgress('') }
    }
    input.click()
  }
  const confirmArchive = record => setConfirmation({ kind: 'archive', record })

  const chooseModalSubject = subjectId => {
    const sameContext = record => same(semId(record), form.semesterId) && same(branchIdOf(record), form.branchId) && same(value(record, 'academicYearId'), form.academicYearId) && same(courseIdOf(record), form.courseId) && (!form.regulationId || same(value(record, 'regulationId'), form.regulationId))
    const available = subjectId ? subjectRecords(records.filter(sameContext), subjectId).filter(record => statusKey(record) !== 'archived') : EMPTY_ROWS
    const target = available.find(record => statusKey(record) === 'draft') || available[0]
    if (target && (subjectOnly || modalMode === 'upload')) {
      setForm(recordForm(target))
      setUploadTargets(available)
    } else {
      setForm(current => ({ ...current, id: '', subjectId, category: subjectOnly || subjectId ? 'Subject-wise Syllabus' : current.category, title: '', content: readSubjectContent(), description: '' }))
      setUploadTargets(EMPTY_ROWS)
    }
    setFormErrors([])
  }
  const activeScope = !detailMode && canLoadRecords && selectedScope ? {
    ...selectedScope,
    records: recordsForScope(selectedScope),
    department: value(departments.find(department => same(displayId(department), departmentId)), 'name', 'departmentName'),
  } : null
  const activeWorkspaceTab = workspaceTab === 'overview' ? 'subjects' : workspaceTab
  const activeRecord = activeScope?.records[0]
  const activeDocuments = activeScope?.records.flatMap(documentsOf) || EMPTY_ROWS
  const yearLabel = value(years.find(year => same(displayId(year), academicYearId)), 'name', 'academicYearName') || '\u2014'
  const switchFilters = next => {
    setShowCommon(false)
    setSubjectView(null)
    setWorkspaceTab('subjects')
    setBulkSelection(0)
    setBulkRequest(0)
    setExtraRows([])
    setExtraError('')
    historyRequest.current += 1
    historySelection.current = null
    if (JSON.stringify(next) === JSON.stringify(filters)) setRefreshIndex(current => current + 1)
    else setFilters(next)
  }

  const modalSubjectKey = JSON.stringify([currentCollege, form.academicYearId, form.courseId, form.departmentId, form.branchId, form.semesterId])
  useEffect(() => {
    if (!modalOpen || !same(modalCollege.current, currentCollege) || (modalMode === 'upload' && !subjectOnly) || !currentCollege || !form.academicYearId || !form.courseId || !form.branchId || !form.semesterId) return undefined
    let current = true
    subjectApi.list({ collegeId: currentCollege, academicYearId: form.academicYearId, courseId: form.courseId, departmentId: form.departmentId || undefined, branchId: form.branchId, semesterId: form.semesterId })
      .then(result => { if (current) setModalSubjectResult({ key: modalSubjectKey, rows: mappedSubjectRows(result), error: '' }) })
      .catch(error => { if (current) setModalSubjectResult({ key: modalSubjectKey, rows: EMPTY_ROWS, error: readableError(error) }) })
    return () => { current = false }
  }, [modalOpen, modalMode, subjectOnly, modalSubjectKey, currentCollege, form.academicYearId, form.courseId, form.departmentId, form.branchId, form.semesterId])
  const openSemesterWorkspace = (scope, tab, record) => {
    setWorkspaceTab(tab)
    if (tab === 'versions') {
      historySelection.current = { key: scopeIdentity(scope), records: record || scope.records }
      setExtraRows([])
      loadExtra(tab, historySelection.current.records)
    }
  }


  const scopeIdentity = scope => JSON.stringify([currentCollege, academicYearId, scope.branchId, displayId(scope.semester)])
  const subjectIdentity = (scope, id) => JSON.stringify([currentCollege, String(academicYearId), String(scope.branchId), String(displayId(scope.semester)), String(id)])
  const makeSubjectRows = (scope, mapped) => uniqueSubjects(mapped).map(subject => {
    const id = String(subjectIdOf(subject))
    const matches = subjectRecords(scope.records, id)
    const current = matches.filter(record => statusKey(record) !== 'archived')
    const content = current.find(record => isContentRecord(record) && statusKey(record) === 'published') || current.find(isContentRecord)
    const target = content || current[0]
    const archive = matches.find(record => statusKey(record) === 'archived')
    const documents = [...new Map(matches.flatMap(documentsOf).map(document => [String(value(document, 'documentId', 'id')), document])).values()]
    return {
      id, subject, content, target, archive, sourceRecords: matches, documents, unavailable: Boolean(recordsError),
      code: value(subject, 'subjectCode', 'code') || '—',
      name: value(subject, 'subjectName', 'name') || '—',
      type: value(subject, 'subjectType', 'type') || '—',
      credits: value(subject, 'credits', 'creditPoints') || (value(subject, 'credits', 'creditPoints') === 0 ? 0 : '—'),
      status: recordsError ? 'Unavailable' : content ? statusText(content) : archive && !target ? 'Archived' : 'Pending',
      documentFailed: Boolean(failedUploads[subjectIdentity(scope, id)]),
      updated: dateLabel(value(target || archive, 'updatedAt', 'publishedAt', 'createdAt')),
      publishable: Boolean(content && statusKey(content) === 'draft' && documentsOf(content).length),
    }
  })

  const runSubjectBatch = async (scope, mode, row, entry, onProgress) => {
    if (currentRecordKey.current !== recordKey) throw new Error('The academic context changed. Open the batch for the new selection.')
    if (row.unavailable) throw new Error('Syllabus data is unavailable. Refresh and retry.')
    const permitted = { create: canCreate, upload: canUpload, download: canDownload, publish: canPublish }
    if (!permitted[mode]) throw new Error('Your role does not allow this action.')
    if (mode === 'download') {
      if (!row.documents.length) throw new Error('No documents available.')
      for (const document of row.documents) {
        if (!(await documentBlob(document, true))) throw new Error('A document could not be downloaded.')
      }
      return
    }
    if (mode === 'publish') {
      if (!row.publishable) throw new Error('A draft with syllabus content and a document is required.')
      await syllabusApi.publish(recordId(row.content), { collegeId: currentCollege })
      return
    }
    if (mode === 'create' && row.content) throw new Error('Syllabus content already exists.')
    const identity = subjectIdentity(scope, row.id)
    const regulationId = value(row.target, 'regulationId') || configuredRegulation(scope.semester, scope.branch) || null
    const draftKey = JSON.stringify([identity, regulationId])
    let id = recordId(row.target) || batchCreated.current.get(draftKey)
    const newTitle = mode === 'create' ? entry.title.trim() : (row.name + ' Syllabus').slice(0, 160)
    const payload = {
      collegeId: currentCollege,
      academicYearId: Number(academicYearId), effectiveAcademicYearId: Number(academicYearId),
      courseId: Number(courseIdOf(scope.branch) || courseIdOf(scope.semester)),
      departmentId: Number(value(scope.branch, 'departmentId') || value(scope.semester, 'departmentId') || departmentForBranch(scope.branch)) || null,
      branchId: Number(scope.branchId), semesterId: Number(displayId(scope.semester)),
      subjectId: Number(row.id), category: 'Subject-wise Syllabus',
      title: newTitle, version: value(row.target, 'version') || '1.0',
      regulationId,
      batchId: value(row.target, 'batchId') || null,
      effectiveDate: value(row.target, 'effectiveDate') || null,
      revisionNotes: value(row.target, 'revisionNotes') || null,
      description: mode === 'create' ? serializeSubjectContent({ ...readSubjectContent(), description: entry.description || '' }) : UPLOAD_ONLY_HEADER,
    }
    if (mode === 'create' && id) {
      if (!canEdit) throw new Error('Edit permission is required to add content to the existing document record.')
      await syllabusApi.update(id, payload)
    } else if (!id) {
      const created = await syllabusApi.create(payload)
      id = recordId(created)
      if (!id) throw new Error('The server did not return a syllabus ID. Refresh before retrying.')
      batchCreated.current.set(draftKey, id)
    }
    if (mode === 'upload') {
      const failures = []
      for (const [index, file] of entry.files.entries()) {
        if (currentRecordKey.current !== recordKey) throw new Error('The academic context changed. Reopen the batch before continuing.')
        const uploadKey = JSON.stringify([currentCollege, id, fileIdentity(file)])
        if (batchUploaded.current.has(uploadKey)) continue
        onProgress?.(file.name, index + 1, 0)
        try {
          await syllabusApi.uploadDocument(id, file, percent => onProgress?.(file.name, index + 1, percent), undefined, currentCollege).promise
          batchUploaded.current.add(uploadKey)
        } catch (error) {
          failures.push(file.name + ': ' + readableError(error))
        }
      }
      setFailedUploads(previous => ({ ...previous, [identity]: failures.length > 0 }))
      if (failures.length) throw new Error(failures.join(' '))
    }
  }

  const renderSubjectTable = (scope, mapped, loading, error, presentation) => {
    const rows = makeSubjectRows(scope, mapped)
    return <SubjectSyllabusTable key={scopeIdentity(scope) + ':' + refreshIndex} {...presentation} rows={rows} hasMappings={mapped.length > 0} loading={loading} error={error} onRetry={() => setRefreshIndex(current => current + 1)}
      canCreate={canCreate} canEdit={canEdit} canUpload={canUpload} canDownload={canDownload} canPublish={canPublish} canArchive={canArchive}
      onCreate={row => row.target ? openEdit(row.target) : openCreate(scope.semester, scope.branch, 'add', row.subject)}
      onUpload={row => row.target ? openEdit(row.target, 'upload') : openCreate(scope.semester, scope.branch, 'upload', row.subject)}
      onView={row => setSubjectView(row)}
      onEdit={row => openEdit(row.content)}
      onDownload={documentBlob}
      onDocument={document => documentBlob(document, !/\.(pdf|txt|csv|png|jpg|jpeg)$/i.test(value(document, 'fileName', 'name')))}
      onReplace={row => onReplace(row.target, documentsOf(row.target)[0])}
      onPublish={row => executeAction('publish', row.content)}
      onArchive={row => confirmArchive(row.target)}
      onHistory={row => { if (detailMode) { historySelection.current = { key: scopeIdentity(scope), records: row.sourceRecords }; setDetailTab('versions'); loadExtra('versions', row.sourceRecords) } else openSemesterWorkspace(scope, 'versions', row.sourceRecords) }}
      onBatch={(mode, row, entry, onProgress) => runSubjectBatch(scope, mode, row, entry, onProgress)}
      onBatchComplete={refreshAfterWrite} />
  }

  const renderFocusedSemester = () => {
    const semesterNumber = semNumber(activeScope.semester)
    const title = 'Semester ' + semesterNumber + ' – ' + ({ subjects: 'Subjects', documents: 'Syllabus Documents', versions: 'History & Versions' }[activeWorkspaceTab] || 'Subjects') + ' (' + branchLabel(activeScope) + ')'
    const heading = <h1><FaBookOpen aria-hidden="true" />{title}</h1>
    const tabs = <nav className="syllabus-focused-tabs" aria-label="Semester sections">
      {[
        ['subjects', 'Subjects', null, semesterSubjectsLoading || semesterSubjectsError ? null : semesterSubjects.length],
        ['documents', 'Syllabus Documents', FileText, recordsLoading || recordsError ? null : activeDocuments.length],
        ['versions', 'History & Versions', History, null],
      ].map(([tab, label, Icon, count]) => <button key={tab} type="button" aria-current={activeWorkspaceTab === tab ? 'page' : undefined} onClick={() => { setBulkSelection(0); setBulkRequest(0); openSemesterWorkspace(activeScope, tab) }}>{Icon && <Icon size={14} aria-hidden="true" />}{label}{count !== null && ' (' + count + ')'}</button>)}
    </nav>
    const regulation = value(activeScope.semester, 'regulationName', 'regulationCode', 'regulationId') || value(activeScope.branch, 'regulationName', 'regulationCode', 'regulationId') || value(activeRecord, 'regulationName', 'regulationCode', 'regulationId') || '—'
    return <section className="syllabus-focused-semester" ref={semesterWorkspace} aria-label="Semester subject workspace">
      <div className="syllabus-focused-context">
        <span><FaGraduationCap aria-hidden="true" /> <b>{program}</b></span>
        <span><b>Department:</b> {activeScope.department}</span>
        <span><b>Branch:</b> {branchLabel(activeScope)}</span>
        <span><b>Semester:</b> {semesterNumber}</span>
        <span><b>Regulation:</b> {regulation}</span>
        <span><b>Academic Year:</b> {yearLabel}</span>
      </div>
      {recordsError && <div className="syllabus-inline-alert" role="alert">{recordsError} <button type="button" onClick={() => switchFilters(filters)}>Retry</button></div>}
      {activeWorkspaceTab === 'subjects' ? renderSubjectTable(activeScope, semesterSubjects, semesterSubjectsLoading || recordsLoading, semesterSubjectsError, { heading, tabs, onBulkSelection: setBulkSelection, bulkRequest }) :
        <div className="syllabus-subject-workspace">
          <div className="syllabus-subject-toolbar">{heading}</div>
          {tabs}
          <DetailWorkspace embedded semester={activeScope.semester} branch={activeScope.branch} records={activeScope.records} subjects={semesterSubjects} activeTab={activeWorkspaceTab} onModal={record => record ? openEdit(record) : openCreate(activeScope.semester, activeScope.branch)} onPreview={document => documentBlob(document, false)} onDownload={document => documentBlob(document, true)} onReplace={onReplace} canCreate={canCreate} canEdit={canEdit} canDownload={canDownload} extraRows={extraRows} extraError={extraError} loadingExtra={loadingExtra} loadExtra={tab => loadExtra(tab, historySelection.current?.key === scopeIdentity(activeScope) ? historySelection.current.records : activeScope.records)} />
        </div>}
    </section>
  }


  const summaryConfiguration = [
    ['Programs', courses, FaGraduationCap, 'violet'],
    ['Departments', departments, Landmark, 'indigo'],
    ['Branches / Groups', branches, Network, 'violet'],
    ['Semesters', semesters, CalendarDays, 'violet'],
  ]
  const yearMappings = useMemo(() => overview.subjects?.rows ? mappedSubjectRows(overview.subjects.rows).filter(row => (
    relationMatches(row, 'academicYear', overviewYear) && relationMatches(row, 'college', currentCollege)
    && isActiveMapping(row)
  )) : null, [overview.subjects?.rows, overviewYear, currentCollege])
  const semesterIndex = useMemo(() => new Map(semesters.map(semester => [String(displayId(semester)), semester])), [semesters])
  const mappingKey = useCallback(row => {
    const subjectId = subjectIdOf(row)
    const semesterId = semId(row)
    if (!subjectId || !semesterId) return ''
    const semester = semesterIndex.get(String(semesterId))
    return JSON.stringify([String(subjectId), String(courseIdOf(row) || courseIdOf(semester)), String(branchIdOf(row) || branchIdOf(semester)), String(semesterId)])
  }, [semesterIndex])
  const yearCounts = useMemo(() => getYearSyllabusCounts({
    mappings: yearMappings, records: overview.records?.rows, academicYearId: overviewYear, collegeId: currentCollege,
    keyFor: mappingKey, isActiveContent: isActiveSubjectSyllabus, documentsOf, documentId, value,
  }), [yearMappings, overview.records?.rows, overviewYear, currentCollege, mappingKey])
  const summaryCards = [
    ...summaryConfiguration.map(([label, rows, Icon, tone]) => ({
      label, Icon, tone, loading: Boolean(academic.loading && currentCollege),
      count: overviewYear && !academic.error ? new Set(rows.filter(row => relationMatches(row, 'academicYear', overviewYear) && relationMatches(row, 'college', currentCollege)).map(displayId).filter(Boolean).map(String)).size : null,
    })),
    { label: 'Subjects', Icon: Layers, tone: 'green', count: yearCounts.subjects, loading: overview.enabled && !overview.subjects },
    { label: 'Syllabus Created', Icon: CheckCircle2, tone: 'green', count: yearCounts.created, loading: overview.enabled && !overview.subjects?.error && !overview.records?.error && (!overview.subjects || !overview.records) },
    { label: 'Uploaded Documents', Icon: FileText, tone: 'amber', count: yearCounts.documents, loading: overview.enabled && !overview.records },
    { label: 'Pending', Icon: Clock, tone: 'amber', count: yearCounts.pending, loading: overview.enabled && !overview.subjects?.error && !overview.records?.error && (!overview.subjects || !overview.records) },
  ]
  const summaryErrors = [...new Set([academic.error, overview.subjects?.error, overview.records?.error].filter(Boolean))]
  const commonMappings = new Map()
  if (showCommon && yearMappings) {
    for (const mapping of yearMappings) {
      const id = subjectIdOf(mapping)
      if (!id || !branchIdOf(mapping) || !semId(mapping)) continue
      if (!commonMappings.has(String(id))) commonMappings.set(String(id), [])
      const group = commonMappings.get(String(id))
      if (!group.some(item => mappingKey(item) === mappingKey(mapping))) group.push(mapping)
    }
  }
  const commonGroups = Array.from(commonMappings.values()).filter(group => new Set(group.map(item => String(branchIdOf(item)))).size > 1 || group.some(item => [true, 1, '1', 'true'].includes(value(item, 'isCommonSubject', 'commonSubject', 'isCommon'))))
  const renderOverview = () => <>
    <header className="syllabus-summary-header">
      <div className="syllabus-summary-title"><FaBookOpen aria-hidden="true" /><div><h1>Syllabus Management</h1><p>Create &amp; manage syllabus and upload syllabus documents for existing subjects.</p></div></div>
      <div className="syllabus-summary-tools">
        <button type="button" className="syllabus-btn syllabus-btn--secondary" disabled={!overviewYear} onClick={() => setShowCommon(true)}><Layers size={15} />Common Syllabus</button>
        <button type="button" className="syllabus-btn syllabus-btn--secondary" disabled={!canUpload || !activeScope || !bulkSelection || recordsLoading || Boolean(recordsError)} title={!bulkSelection ? 'Select subjects in the table to upload files' : undefined} onClick={() => setBulkRequest(request => request + 1)}><Upload size={15} />Bulk Upload</button>
        <button type="button" className="syllabus-btn syllabus-btn--secondary" disabled title="Syllabus templates are unavailable in the current service"><FileText size={15} />Syllabus Templates</button>
      </div>
    </header>
    <section className="syllabus-year-summary" aria-label="Academic year syllabus summary">
      {summaryCards.map(({ label, Icon, tone, count, loading }) => <article key={label} data-tone={tone} aria-busy={Boolean(loading)}>
        <span className="syllabus-year-summary-icon"><Icon size={20} aria-hidden="true" /></span>
        <div><span>{label}</span><strong aria-label={loading ? 'Loading' : count == null ? 'Unavailable' : undefined}>{loading ? <i className="syllabus-skeleton" /> : count == null ? '—' : count.toLocaleString()}</strong></div>
      </article>)}
    </section>
    {summaryErrors.length > 0 && <div className="syllabus-inline-alert syllabus-inline-alert--warning" role="alert">
      <CircleAlert size={16} aria-hidden="true" /><span>{summaryErrors.map(error => error.message || error).join(' ')}</span><button type="button" onClick={() => { if (academic.error) academic.refreshHierarchy?.(); setSummaryRevision(revision => revision + 1) }}>Retry summary</button>
    </div>}
    {!accessLoading && activeScope && !canCreate && !canEdit && !canUpload && <div className="syllabus-inline-alert syllabus-view-only" role="status"><ShieldCheck size={15} aria-hidden="true" />View-only access. Syllabus changes require additional permissions.</div>}
  </>

  const renderCommon = () => <div className="syllabus-modal-backdrop"><section className="syllabus-modal" role="dialog" aria-modal="true" aria-label="Common Syllabus">
    <header className="syllabus-modal__header"><span className="syllabus-modal__mark"><Layers size={20} /></span><div><h2>Common Syllabus</h2><p>{yearLabel}</p></div><button type="button" className="syllabus-icon-button" aria-label="Close common syllabus" onClick={() => setShowCommon(false)}><X size={18} /></button></header>
    <div className="syllabus-form">
      {overview.subjects?.error ? <div className="syllabus-inline-alert" role="alert">{overview.subjects.error}<button type="button" onClick={() => setSummaryRevision(revision => revision + 1)}>Retry</button></div>
        : !overview.subjects ? <div className="syllabus-loading-line" role="status"><LoaderCircle size={16} className="syllabus-spin" />Loading common subjects</div>
        : commonGroups.length === 0 ? <p>No common subject mappings were found for this academic year.</p>
        : <ul className="syllabus-common-list">{commonGroups.map(group => <li key={subjectIdOf(group[0])}><strong>{value(group[0], 'subjectCode', 'code')} &middot; {value(group[0], 'subjectName', 'name')}</strong><ul>{group.map(mapping => {
          const branch = branches.find(item => same(displayId(item), branchIdOf(mapping)))
          const department = departments.find(item => same(displayId(item), departmentForBranch(branch)))
          const semester = semesterIndex.get(String(semId(mapping)))
          const state = !overview.records ? 'Loading' : overview.records.error ? 'Unavailable' : overview.records.rows.some(record => value(record, 'subjectId') && mappingKey(record) === mappingKey(mapping) && statusKey(record) !== 'archived' && isContentRecord(record)) ? 'Syllabus created' : 'Pending'
          const mappingCourse = courses.find(item => same(displayId(item), courseIdOf(mapping) || courseIdOf(branch)))
          const mappingProgram = programForCourse(mappingCourse)
          const mappingFilters = { ...EMPTY_FILTERS, program: mappingProgram, academicYearId: overviewYear, departmentId: String(displayId(department)), branchId: String(displayId(branch)), courseId: String(displayId(mappingCourse)), semesterId: String(displayId(semester)) }
          const canOpen = mappingProgram && department && branch && semester && same(branchIdOf(semester), displayId(branch)) && same(courseIdOf(semester), displayId(mappingCourse)) && relationMatches(semester, 'academicYear', overviewYear)
          return <li key={mappingKey(mapping)}>{value(department, 'name', 'departmentName') || value(mapping, 'departmentName', 'department') || '—'} &middot; {value(branch, 'name', 'branchName') || value(mapping, 'branchName', 'branch') || '—'} &middot; {value(semester, 'semesterName', 'name') || value(mapping, 'semesterName', 'semester') || '—'} <small>{state}</small>{canOpen && <button type="button" className="syllabus-btn syllabus-btn--quiet" onClick={() => { setFilterDraft(mappingFilters); switchFilters(mappingFilters) }}>Open mapping</button>}</li>
        })}</ul></li>)}</ul>}
      <p>Shared syllabus reuse is unavailable. Each mapping keeps its own syllabus records.</p>
    </div>
  </section></div>

  const renderFilters = () => <form className="syllabus-reference-filter" aria-label="Filter and manage syllabus" onSubmit={event => {
    event.preventDefault()
    if (filterIsValid) switchFilters({ ...currentDraft, courseId: String(courseIdOf(filterOptions.branch)) })
  }}>
    <h2><Filter size={19} aria-hidden="true" />Filter &amp; Manage Syllabus</h2>
    <div className="syllabus-reference-filter-row">
      <div className="syllabus-reference-programs" role="group" aria-label="Program">
        {['B.Tech', 'Degree'].map(item => <button key={item} type="button" aria-pressed={currentDraft.program === item} onClick={() => { if (currentDraft.program !== item) setFilterDraft({ ...currentDraft, program: item, departmentId: '', branchId: '', semesterId: '' }) }}><Circle size={16} aria-hidden="true" />{item}</button>)}
      </div>
      <Field label="Academic Year" required><select required value={currentDraft.academicYearId} onChange={event => setFilterDraft({ ...currentDraft, academicYearId: event.target.value, departmentId: '', branchId: '', semesterId: '' })}><option value="">Select year</option>{years.map(year => <option key={displayId(year)} value={displayId(year)}>{value(year, 'name', 'academicYearName')}</option>)}</select></Field>
      <Field label="Department" required className="syllabus-reference-department"><select required value={currentDraft.departmentId} onChange={event => setFilterDraft({ ...currentDraft, departmentId: event.target.value, branchId: '', semesterId: '' })}><option value="">Select department</option>{filterOptions.departments.map(department => <option key={displayId(department)} value={displayId(department)}>{value(department, 'name', 'departmentName')}</option>)}</select></Field>
      <Field label="Branch" required><select required value={currentDraft.branchId} disabled={!currentDraft.departmentId} onChange={event => setFilterDraft({ ...currentDraft, branchId: event.target.value, semesterId: '' })}><option value="">Select branch</option>{filterOptions.branches.map(branch => <option key={displayId(branch)} value={displayId(branch)}>{value(branch, 'name', 'branchName')}</option>)}</select></Field>
      <Field label="Semester" required><select required value={currentDraft.semesterId} disabled={!filterOptions.branch} onChange={event => setFilterDraft({ ...currentDraft, semesterId: event.target.value })}><option value="">Select semester</option>{filterOptions.slots.map(({ number, scope }) => <option key={number} value={scope ? displayId(scope.semester) : 'unconfigured-' + number} disabled={!scope}>Semester {number}{!scope && ' (not configured)'}</option>)}</select></Field>
      <button type="submit" className="syllabus-btn syllabus-btn--primary" disabled={!filterIsValid}><Search size={17} />Apply Filters</button>
      <button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={() => { setFilterDraft(defaults); switchFilters(defaults) }}><RefreshCw size={16} />Reset</button>
    </div>
    {filterOptions.branch && filterOptions.slots.every(item => !item.scope) && <p className="syllabus-data-note">No semesters are configured for this branch and academic year.</p>}
  </form>

  return <DashboardLayout hideBreadcrumb={!detailMode}>
    <main className="syllabus-page">
      {detailMode && recordsError && <div className="syllabus-inline-alert syllabus-inline-alert--warning" role="status"><CircleAlert size={17} /><span>{recordsError}</span><button type="button" onClick={fetchSyllabi}>Retry</button></div>}
      {detailMode
        ? selectedSemester
          ? <DetailWorkspace subjectPanel={detailTab === 'subjects' && selectedScope ? renderSubjectTable({ ...selectedScope, records: recordsForScope(selectedScope) }, semesterSubjects, semesterSubjectsLoading || recordsLoading, semesterSubjectsError) : null} semester={selectedSemester} branch={selectedBranch} records={selectedScope ? recordsForScope(selectedScope) : records.filter(record => same(semId(record), displayId(selectedSemester)))} subjects={semesterSubjects} activeTab={detailTab} setActiveTab={setDetailTab} onBack={() => navigate('/syllabus-management')} onModal={record => record ? openEdit(record) : openCreate(selectedSemester, selectedBranch)} onPublish={record => executeAction('publish', record)} onPreview={document => documentBlob(document, false)} onDownload={document => documentBlob(document, true)} onReplace={onReplace} onViewSubject={setReadingSubject} canCreate={canCreate} canEdit={canEdit} canPublish={canPublish} canDownload={canDownload} extraRows={extraRows} extraError={extraError} loadingExtra={loadingExtra} loadExtra={tab => loadExtra(tab, tab === 'versions' && selectedScope && historySelection.current?.key === scopeIdentity(selectedScope) ? historySelection.current.records : undefined)} />
          : <div className="syllabus-empty"><CircleAlert size={26} /><h3>Semester not found</h3><p>This semester is not in the current college and academic configuration.</p><Link className="syllabus-btn syllabus-btn--secondary" to="/syllabus-management">Back to Syllabus Management</Link></div>
        : <>{renderOverview()}{renderFilters()}{activeScope ? renderFocusedSemester() : <div className="syllabus-empty syllabus-empty--compact"><BookOpenCheck size={25} /><strong>{currentCollege ? 'Select an academic context and apply filters.' : 'Select an authorized college to manage syllabi.'}</strong></div>}</>}
      {replaceProgress && <div className="syllabus-toast-status" role="status"><LoaderCircle size={16} className="syllabus-spin" />{replaceProgress}</div>}
    </main>
    <SyllabusModal key={modalRevision} subjectOnly={subjectOnly} subjectLocked={subjectLocked} open={modalOpen && same(modalCollege.current, currentCollege)} mode={modalMode} locked={lockedContext} canUpload={canUpload} uploadTargets={uploadTargets} onClose={closeModal} form={form} setForm={setForm} academic={academic} courses={lockedContext ? courses : courses.filter(course => programForCourse(course) === program)} branches={branches} subjects={modalSubjectResult?.key === modalSubjectKey ? modalSubjectResult.rows : EMPTY_ROWS} subjectsError={modalSubjectResult?.key === modalSubjectKey ? modalSubjectResult.error : ''} files={files} setFiles={setFiles} errors={formErrors} setErrors={setFormErrors} onSave={saveSyllabus} saving={saving} canPublish={canPublish} onRetryFile={retryFile} onCancelFile={cancelFile} onChooseSubject={chooseModalSubject} onPreviewFile={file => setPreview({ url: URL.createObjectURL(file), name: file.name, type: file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : /\.(txt|csv)$/i.test(file.name) ? 'text/plain' : '') })} />
    {!detailMode && showCommon && renderCommon()}
    {subjectView && <div className="syllabus-modal-backdrop"><section className="syllabus-modal" role="dialog" aria-modal="true" aria-label="View Syllabus"><header className="syllabus-modal__header"><div><h2>{subjectView.name}</h2><p>{subjectView.code} &middot; {subjectView.status}</p></div><button type="button" className="syllabus-icon-button" onClick={() => setSubjectView(null)} aria-label="Close syllabus"><X size={18} /></button></header><div className="syllabus-form syllabus-content-preview"><h3>{value(subjectView.content, 'title')}</h3>{subjectView.content && <pre>{contentOf(subjectView.content) || 'No syllabus description provided.'}</pre>}<ul>{subjectView.documents.map(document => <li key={value(document, 'documentId', 'id')}>{value(document, 'fileName', 'name')}{canDownload && <button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={() => documentBlob(document, true)}>Download</button>}</li>)}</ul></div></section></div>}
    {readingSubject && <SubjectReader subject={readingSubject} semester={detailMode ? selectedSemester : activeScope?.semester} branch={detailMode ? selectedBranch : activeScope?.branch} onClose={() => setReadingSubject(null)} />}
    {preview && <div className="syllabus-preview-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreview(null) }}><section className="syllabus-preview" role="dialog" aria-modal="true" aria-label={'Preview ' + preview.name}><header><strong>{preview.name}</strong><button type="button" className="syllabus-icon-button" onClick={() => setPreview(null)} aria-label="Close preview"><X size={18} /></button></header>{preview.type.startsWith('image/') ? <img src={preview.url} alt={preview.name} /> : preview.type.includes('pdf') || preview.name.toLowerCase().endsWith('.pdf') || preview.type.startsWith('text/') ? <iframe src={preview.url} title={preview.name} /> : <div className="syllabus-empty"><FileText size={25} /><h3>Preview unavailable</h3><p>This format must be downloaded to open.</p></div>}</section></div>}
    {confirmation && <div className="syllabus-modal-backdrop" role="presentation"><section className="syllabus-confirm" role="alertdialog" aria-modal="true" aria-labelledby="syllabus-confirm-title"><span><Archive size={20} /></span><h2 id="syllabus-confirm-title">Archive this syllabus?</h2><p>Archived documents are no longer shown as active to students and faculty. The record and its versions remain available for audit.</p><footer><button className="syllabus-btn syllabus-btn--quiet" type="button" onClick={() => setConfirmation(null)}>Cancel</button><button className="syllabus-btn syllabus-btn--danger" type="button" onClick={async () => { const record = confirmation.record; setConfirmation(null); await executeAction('archive', record, true) }}>Archive syllabus</button></footer></section></div>}
  </DashboardLayout>
}
