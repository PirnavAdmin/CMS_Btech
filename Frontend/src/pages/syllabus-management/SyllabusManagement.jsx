import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity, Archive, ArrowLeft, ArrowUpRight, BookOpenCheck, Check, CircleAlert,
  Clock3, Download, Eye, FileCheck2, FileText, Filter, Grid2X2, History, List, LoaderCircle,
  MoreHorizontal, Plus, RefreshCw, Search, ShieldCheck, Upload, X,
} from 'lucide-react'
import DashboardLayout from '../../layouts/DashboardLayout.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { useAcademic } from '../../context/AcademicContext.jsx'
import { useScreenAccess } from '../../auth/ScreenAccess.jsx'
import { subjectApi } from '../../api/apiEndpoints.js'
import { syllabusApi } from '../../services/syllabusApi.js'
import { showError, showSuccess } from '../../utils/toast.js'
import SyllabusFileDropzone from './SyllabusFileDropzone.jsx'
import { SYLLABUS_MAX_FILE_SIZE, classifySyllabusFile } from './syllabusFiles.js'
import { addDemoSubjects, addDemoSyllabi } from './syllabusDemoData.js'
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
const displayId = row => value(row, 'id', 'semesterId')
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
const derivedOptions = (records, fields) => {
  const unique = new Map()
  records.forEach(row => {
    const id = value(row, ...fields.ids)
    const label = value(row, ...fields.names)
    if (id !== '' && label !== '') unique.set(String(id), { id: String(id), label: String(label) })
    else if (label !== '') unique.set(String(label), { id: String(label), label: String(label) })
  })
  return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label))
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
  if (error?.status === 404) return 'Syllabus endpoints are not available on the backend yet. Review the documented API contract before enabling uploads.'
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
            <select required value={form.subjectId} onChange={set('subjectId')}><option value="">Choose a subject</option>{subjectOptions.filter(subject => !subject.isDemo).map(subject => <option key={value(subject, 'id', 'subjectId')} value={value(subject, 'id', 'subjectId')}>{value(subject, 'subjectCode', 'code')} · {value(subject, 'subjectName', 'name')}</option>)}</select>
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

function SyllabusCard({ semester, branch, records, subjectCount, unavailable, onUpload, onDetails, onArchive, onEdit, onPublish, canUpload, canEdit, canPublish, canArchive }) {
  const latest = [...records].sort((a, b) => String(value(b, 'updatedAt', 'lastUpdated') || '').localeCompare(String(value(a, 'updatedAt', 'lastUpdated') || '')))[0]
  const unavailableData = unavailable && !records.some(row => row.isDemo)
  const status = unavailableData ? 'Unavailable' : records.some(row => statusKey(row) === 'published') ? 'Published' : records.some(row => statusKey(row) === 'draft') ? 'Draft' : records.length ? statusText(latest) : 'Pending'
  const number = semNumber(semester)
  const level = value(semester, 'yearNumber', 'academicLevel') || (number ? Math.ceil(number / 2) : '')
  const docCount = unavailableData ? '—' : records.reduce((sum, row) => sum + (documentsOf(row).length || Number(value(row, 'documentCount', 'totalDocuments')) || 0), 0)
  const latestVersion = unavailableData ? '—' : latest ? value(latest, 'version', 'versionNumber') || '1.0' : '—'
  return <article className="syllabus-semester-card">
    <div className="syllabus-card__top">
      <span className="syllabus-card__icon"><BookOpenCheck size={18} /></span>
      <span className={'syllabus-status syllabus-status--' + status.toLowerCase()}><i />{status}</span>
      <details className="syllabus-more">
        <summary aria-label={'More actions for Semester ' + number}><MoreHorizontal size={20} /></summary>
        <div className="syllabus-more__menu">
          <button type="button" onClick={onDetails}><History size={15} /> View history</button>
          {canEdit && latest && !latest.isDemo && <button type="button" onClick={() => onEdit(latest)}><FileCheck2 size={15} /> Edit metadata</button>}
          {canPublish && latest && !latest.isDemo && statusKey(latest) === 'draft' && <button type="button" onClick={() => onPublish(latest)}><Check size={15} /> Publish latest</button>}
          {canArchive && latest && !latest.isDemo && statusKey(latest) !== 'archived' && <button type="button" className="is-danger" onClick={() => onArchive(latest)}><Archive size={15} /> Archive latest</button>}
        </div>
      </details>
    </div>
    <h3>{value(semester, 'semesterName', 'name') || 'Semester ' + number}</h3>
    <p className="syllabus-card__branch">{value(branch, 'name', 'branchName', 'code') || 'Branch not assigned'}</p>
    <p className="syllabus-card__subline">{level ? 'Year ' + level : 'Academic level configured'} <span>·</span> {number ? number % 2 ? 'Odd semester' : 'Even semester' : 'Term'}</p>
    <div className="syllabus-card__metrics">
      <div><strong>{subjectCount}</strong><span>Mapped subjects</span></div>
      <div><strong>{docCount}</strong><span>Documents</span></div>
      <div><strong>{latestVersion}</strong><span>Latest version</span></div>
    </div>
    <div className="syllabus-card__updated"><Clock3 size={14} /> Updated {unavailableData ? '—' : latest ? dateLabel(value(latest, 'updatedAt', 'lastUpdated', 'createdAt')) : '—'}</div>
    <footer>
      {canUpload && <button className="syllabus-btn syllabus-btn--primary" type="button" onClick={onUpload}><Upload size={15} /> Upload syllabus</button>}
      <button className="syllabus-btn syllabus-btn--secondary" type="button" onClick={onDetails}>View details <ArrowUpRight size={15} /></button>
    </footer>
  </article>
}

function DocumentRow({ document, record, onPreview, onDownload, onEdit, onReplace, canDownload, canEdit }) {
  const id = value(document, 'documentId', 'id', 'fileId')
  const title = value(document, 'fileName', 'name', 'title', 'originalFileName') || 'Syllabus document'
  const contentType = String(value(document, 'contentType', 'mimeType', 'fileType') || title.split('.').pop() || '').toLowerCase()
  const extension = title.split('.').pop()?.toLowerCase()
  const previewable = document.isDemo || contentType.includes('pdf') || contentType.startsWith('image/') || contentType.startsWith('text/') || ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'csv'].includes(contentType) || ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'csv'].includes(extension)
  return <article className="syllabus-document-row">
    <span className="syllabus-document-row__icon"><FileText size={19} /></span>
    <div className="syllabus-document-row__main"><strong>{title}</strong><span>{classifySyllabusFile({ name: title })} · {value(document, 'size', 'fileSize') ? String(value(document, 'size', 'fileSize')) + ' bytes' : 'Document'} · {dateLabel(value(document, 'uploadedAt', 'createdAt'))}</span></div>
    <span className={'syllabus-status syllabus-status--' + statusKey(record)}><i />{statusText(record)}</span>
    <div className="syllabus-document-row__actions">
      {previewable && (canDownload || document.isDemo) && <button type="button" className="syllabus-view-action" onClick={() => onPreview(document)} aria-label={'View ' + title}><Eye size={15} />View</button>}
      {canDownload && <button type="button" onClick={() => onDownload(document)} aria-label={'Download ' + title}><Download size={16} /></button>}
      {canEdit && !record.isDemo && <><button type="button" onClick={() => onEdit(record)} aria-label={'Edit metadata for ' + title}><FileCheck2 size={16} /></button><button type="button" onClick={() => onReplace(record, document)} aria-label={'Replace ' + title}><RefreshCw size={16} /></button></>}
    </div>
    {previewable && !canDownload && !document.isDemo && <span className="syllabus-document-row__hint">Download permission required for preview</span>}
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
        <div className="syllabus-subject-reader__facts"><div><small>Subject type</small><strong>{value(subject, 'subjectType', 'category') || 'Configured subject'}</strong></div><div><small>Credits</small><strong>{value(subject, 'credits', 'creditPoints') || '—'}</strong></div><div><small>Record</small><strong>{subject.isDemo ? 'Sample preview' : value(subject, 'status') || 'Configured'}</strong></div></div>
        <section><h3>Subject overview</h3><p>{description || 'Detailed subject description has not been added to this curriculum record.'}</p></section>
        {units.length > 0 && <section><h3>Units and topics</h3><ol className="syllabus-subject-reader__units">{units.map((unit, index) => <li key={index}><strong>{typeof unit === 'object' ? value(unit, 'title', 'unitName', 'name') || `Unit ${index + 1}` : `Unit ${index + 1}`}</strong>{typeof unit === 'object' ? <><p>{value(unit, 'description', 'summary') || ''}</p>{listEntries(value(unit, 'topics', 'subTopics', 'content')).length > 0 && <ul>{listEntries(value(unit, 'topics', 'subTopics', 'content')).map((topic, topicIndex) => <li key={topicIndex}>{entryText(topic)}</li>)}</ul>}</> : <p>{entryText(unit)}</p>}</li>)}</ol></section>}
        {outcomes.length > 0 && <section><h3>Learning outcomes</h3><ul>{outcomes.map((outcome, index) => <li key={index}>{entryText(outcome)}</li>)}</ul></section>}
        {subject.isDemo && <div className="syllabus-demo-alert" role="note"><CircleAlert size={16} /><span>Sample curriculum text for preview only. Replace it with your approved subject syllabus.</span></div>}
      </div>
      <footer><button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={onClose}>Close</button></footer>
    </section>
  </div>
}

function DetailWorkspace({ semester, branch, records, subjects, activeTab, setActiveTab, onBack, onModal, onPublish, onPreview, onDownload, onReplace, onViewSubject, canCreate, canEdit, canPublish, canDownload, extraRows, extraError, loadingExtra, loadExtra }) {
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
    <button type="button" className="syllabus-back-link" onClick={onBack}><ArrowLeft size={17} /> Back to semesters</button>
    <section className="syllabus-detail__hero">
      <div><span className="syllabus-eyebrow">SEMESTER WORKSPACE</span><h2>{value(semester, 'semesterName', 'name') || 'Semester ' + semNumber(semester)}{branch ? ' · ' + value(branch, 'name', 'branchName', 'code') : ''}</h2><p>Manage published syllabus files, subject mappings, revisions and audit activity for this branch.</p></div>
      <div className="syllabus-detail__actions">{canCreate && <button type="button" className="syllabus-btn syllabus-btn--secondary" onClick={() => onModal(null)}><Plus size={16} /> Add document</button>}{canPublish && records.some(row => statusKey(row) === 'draft') && <button type="button" className="syllabus-btn syllabus-btn--primary" onClick={() => onPublish(records.find(row => statusKey(row) === 'draft'))}><Check size={16} /> Publish draft</button>}</div>
    </section>
    <nav className="syllabus-tabs" aria-label="Semester syllabus sections">
      {tabs.map(([id, label, Icon]) => <button type="button" key={id} className={activeTab === id ? 'is-active' : ''} aria-current={activeTab === id ? 'page' : undefined} onClick={() => changeTab(id)}><Icon size={16} />{label}{id === 'documents' && <span>{allDocuments.length}</span>}</button>)}
    </nav>
    {activeTab === 'documents' && <section className="syllabus-detail-panel">
      <div className="syllabus-section-heading"><div><h3>Available syllabus files</h3><p>Documents and publication state for this semester.</p></div>{canCreate && <button className="syllabus-btn syllabus-btn--primary" type="button" onClick={() => onModal(null)}><Upload size={15} /> Upload document</button>}</div>
      {allDocuments.length ? <div className="syllabus-document-list">{allDocuments.map(({ record, document }, index) => <DocumentRow key={value(document, 'documentId', 'id') || recordId(record) + '-' + index} document={document} record={record} onPreview={onPreview} onDownload={onDownload} onEdit={onModal} onReplace={onReplace} canDownload={canDownload} canEdit={canEdit} />)}</div> : <div className="syllabus-empty syllabus-empty--compact"><FileText size={22} /><strong>No syllabus files yet</strong><span>Upload a document to start the semester’s syllabus record.</span></div>}
    </section>}
    {activeTab === 'subjects' && <section className="syllabus-detail-panel">
      <div className="syllabus-section-heading"><div><h3>Mapped subjects</h3><p>Subjects are scoped to this branch and semester; missing development entries are shown as samples.</p></div></div>
      {subjects.length ? <div className="syllabus-subject-list">{subjects.map((subject, index) => <article key={value(subject, 'id', 'subjectId') || index}><span className="syllabus-subject-code">{value(subject, 'subjectCode', 'code') || 'SUBJECT'}</span><div><strong>{value(subject, 'subjectName', 'name')}</strong><small>{value(subject, 'subjectType', 'category') || 'Configured subject'} · {value(subject, 'credits', 'creditPoints') || '—'} credits</small></div><span className={'syllabus-status syllabus-status--' + (subject.isDemo ? 'sample' : 'neutral')}><i />{value(subject, 'status') || 'Active'}</span><button type="button" className="syllabus-btn syllabus-btn--secondary syllabus-subject-view" onClick={() => onViewSubject(subject)}><Eye size={15} />View</button></article>)}</div> : <div className="syllabus-empty syllabus-empty--compact"><BookOpenCheck size={22} /><strong>No subject mappings returned</strong><span>Check that subjects are configured for this course and semester.</span></div>}
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
  const [filters, setFilters] = useState({ academicYearId: academic.selectedAcademicYearId || '', courseId: '', departmentId: '', branchId: '', regulationId: '', batchId: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [view, setView] = useState('grid')
  const [records, setRecords] = useState([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState('')
  const [usingDemoData, setUsingDemoData] = useState(false)
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
    setFilters(current => ({ ...current, courseId: '', departmentId: '', branchId: '', regulationId: '', batchId: '' }))
  }, [currentCollege])

  const years = academic.academicYears || academic.activeAcademicYears || []
  const departments = academic.activeDepartments || []
  const courses = academic.activeCourses || []
  const branches = academic.activeBranches || []
  const semesters = academic.activeSemesters || []
  const scopedCourses = courses.filter(course => !filters.departmentId || same(value(course, 'departmentId'), filters.departmentId))
  const scopedBranches = useMemo(() => branches.filter(branch => (!filters.courseId || !courseIdOf(branch) || same(courseIdOf(branch), filters.courseId)) && (!filters.departmentId || !value(branch, 'departmentId') || same(value(branch, 'departmentId'), filters.departmentId))), [branches, filters.courseId, filters.departmentId])
  const branchesForSemesterScopes = useMemo(() => scopedBranches.filter(branch => !filters.branchId || same(displayId(branch), filters.branchId)), [scopedBranches, filters.branchId])
  const selectedCourseRecord = courses.find(course => same(displayId(course), filters.courseId))
  const regulationSources = [
    ...(filters.courseId ? [selectedCourseRecord].filter(Boolean) : courses),
    ...branches.filter(branch => (!filters.courseId || same(value(branch, 'courseId'), filters.courseId)) && (!filters.branchId || same(displayId(branch), filters.branchId))),
    ...semesters.filter(semester => (!filters.courseId || relationMatches(semester, 'course', filters.courseId)) && (!filters.branchId || relationMatches(semester, 'branch', filters.branchId))),
  ]
  const batchSources = [
    ...regulationSources,
    ...semesters.filter(semester => (!filters.courseId || relationMatches(semester, 'course', filters.courseId)) && (!filters.branchId || relationMatches(semester, 'branch', filters.branchId))),
  ]
  const regulationOptions = derivedOptions(regulationSources, { ids: ['regulationId', 'regulationCode', 'regulation'], names: ['regulationName', 'regulationCode', 'regulation'] })
  const batchOptions = derivedOptions(batchSources, { ids: ['batchId', 'curriculumId', 'admissionBatchId', 'batch'], names: ['batchName', 'curriculumName', 'admissionBatchName', 'batch'] })
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
  const scopesForCurrentView = useMemo(() => semesterScopes.filter(scope =>
    (!routeSemesterId || same(displayId(scope.semester), routeSemesterId)) &&
    (!routeBranchId || same(scope.branchId, routeBranchId)) &&
    (!filters.branchId || same(scope.branchId, filters.branchId))), [semesterScopes, routeSemesterId, routeBranchId, filters.branchId])

  const fetchSyllabi = useCallback(async () => {
    const requestId = ++listRequest.current
    if (!currentCollege || !filters.academicYearId) {
      setRecords([])
      setRecordsError('')
      setUsingDemoData(false)
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
        regulationId: filters.regulationId,
        batchId: filters.batchId,
        semesterId: routeSemesterId || '',
      })
      if (requestId === listRequest.current) {
        const rows = import.meta.env.DEV ? addDemoSyllabi(response, scopesForCurrentView) : response
        setRecords(rows)
        setUsingDemoData(rows.some(row => row.isDemo))
      }
    } catch (error) {
      if (requestId === listRequest.current) {
        const rows = import.meta.env.DEV ? addDemoSyllabi([], scopesForCurrentView) : []
        setRecords(rows)
        setUsingDemoData(rows.length > 0)
        setRecordsError(readableError(error))
      }
    } finally {
      if (requestId === listRequest.current) setRecordsLoading(false)
    }
  }, [currentCollege, filters, routeSemesterId, routeBranchId, scopesForCurrentView])
  useEffect(() => { fetchSyllabi(); return () => { listRequest.current += 1 } }, [fetchSyllabi])

  useEffect(() => {
    let current = true
    const filterBranch = branches.find(branch => same(displayId(branch), filters.branchId))
    const subjectCourseId = filters.courseId || courseIdOf(selectedScope?.semester) || courseIdOf(selectedBranch) || courseIdOf(filterBranch)
    const sampleRows = () => import.meta.env.DEV ? addDemoSubjects([], scopesForCurrentView) : []
    if (!currentCollege || !filters.academicYearId || !subjectCourseId) {
      setSubjects(sampleRows())
      setSubjectsError('')
      return () => { current = false }
    }
    subjectApi.list({ collegeId: currentCollege, academicYearId: filters.academicYearId, courseId: subjectCourseId, branchId: routeBranchId || filters.branchId || undefined, semesterId: routeSemesterId || undefined })
      .then(response => { if (current) setSubjects(import.meta.env.DEV ? addDemoSubjects(rowsFrom(response), scopesForCurrentView) : rowsFrom(response)) })
      .catch(error => { if (current) { setSubjects(sampleRows()); setSubjectsError(readableError(error)) } })
    return () => { current = false }
  }, [currentCollege, filters.academicYearId, filters.courseId, filters.branchId, routeSemesterId, routeBranchId, branches, selectedScope, selectedBranch, scopesForCurrentView])

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
  const demoContentAvailable = records.some(row => row.isDemo) || subjects.some(subject => subject.isDemo)
  const visibleScopes = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return semesterScopes.filter(scope => {
      const { semester, branch } = scope
      const related = recordsForScope(scope)
      const state = recordsError && !related.some(row => row.isDemo) ? 'unavailable' : related.some(row => statusKey(row) === 'published') ? 'published' : related.some(row => statusKey(row) === 'draft') ? 'draft' : related.length ? statusKey(related[0]) : 'pending'
      const matchesStatus = statusFilter === 'All' || state === statusFilter.toLowerCase()
      const matchesSearch = !needle || [value(semester, 'semesterName', 'name'), semNumber(semester), value(semester, 'yearNumber', 'academicLevel'), value(branch, 'name', 'branchName', 'code')].some(item => String(item).toLowerCase().includes(needle))
      return matchesStatus && matchesSearch
    })
  }, [semesterScopes, recordsForScope, statusFilter, search, recordsError])
  const summary = useMemo(() => {
    const recordsByScope = semesterScopes.map(scope => recordsForScope(scope))
    return {
      semesters: semesterScopes.length,
      published: recordsByScope.filter(rows => rows.some(row => statusKey(row) === 'published')).length,
      drafts: records.filter(row => statusKey(row) === 'draft').length,
      pending: recordsByScope.filter(rows => rows.length === 0).length,
      documents: records.reduce((sum, row) => sum + (documentsOf(row).length || Number(value(row, 'documentCount', 'totalDocuments')) || 0), 0),
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
    next.regulationId = filters.regulationId
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
  const loadExtra = async tab => {
    const record = selectedScope
      ? recordsForScope(selectedScope)[0]
      : records.find(row => same(semId(row), routeSemesterId) && (!routeBranchId || same(branchIdOf(row), routeBranchId)))
    const id = record && recordId(record)
    if (!id) { setExtraRows([]); setExtraError('A syllabus record is required to load this information.'); return }
    if (record.isDemo) {
      setExtraRows(tab === 'versions' ? record.versions || [] : record.activity || [])
      setExtraError('')
      return
    }
    setLoadingExtra(true)
    setExtraError('')
    try { setExtraRows(await (tab === 'versions' ? syllabusApi.versions(id, { collegeId: currentCollege }) : syllabusApi.activity(id, { collegeId: currentCollege }))) }
    catch (error) { setExtraRows([]); setExtraError(readableError(error)) }
    finally { setLoadingExtra(false) }
  }
  const documentBlob = async (document, download) => {
    if (!canDownload && !document.isDemo) { showError('Your role does not have download permission.'); return }
    try {
      const id = value(document, 'documentId', 'id', 'fileId')
      const result = document.isDemo
        ? { blob: new Blob([document.sampleText || 'Sample syllabus preview.'], { type: 'text/plain;charset=utf-8' }), contentType: 'text/plain' }
        : await syllabusApi.downloadDocument(id, { collegeId: currentCollege })
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

  const pageHeader = <PageHeader
    className="syllabus-page-header"
    breadcrumb={[{ label: 'Home', link: '/dashboard' }, { label: 'Subjects & Curriculum' }, { label: 'Syllabus Management' }]}
    title="Syllabus Management"
    subtitle="Organize, revise and publish curriculum documents for every configured branch and semester."
    primaryAction={canCreate && !detailMode ? <button className="syllabus-btn syllabus-btn--primary" onClick={() => openCreate(null, branches.find(branch => same(displayId(branch), filters.branchId)))} disabled={!semesters.length}><Plus size={16} /> Upload syllabus</button> : null}
  />

  const renderDirectory = () => <>
    <section className="syllabus-filter-panel" aria-label="Academic filters">
      <div className="syllabus-filter-panel__heading"><div><Filter size={16} /><strong>Academic scope</strong></div><span>Selections are limited to the active college context.</span></div>
      <div className="syllabus-filter-grid">
        <Field label="Academic year" required><select value={filters.academicYearId} onChange={event => setFilters(current => ({ ...current, academicYearId: event.target.value }))}><option value="">Select academic year</option>{years.map(year => <option key={displayId(year)} value={displayId(year)}>{value(year, 'name', 'academicYearName')}</option>)}</select></Field>
        <Field label="Program / course"><select value={filters.courseId} onChange={event => setFilters(current => ({ ...current, courseId: event.target.value, branchId: '', regulationId: '', batchId: '' }))}><option value="">All programs</option>{scopedCourses.map(course => <option key={displayId(course)} value={displayId(course)}>{value(course, 'name', 'courseName')}</option>)}</select></Field>
        <Field label="Department"><select value={filters.departmentId} onChange={event => setFilters(current => ({ ...current, departmentId: event.target.value, courseId: '', branchId: '', regulationId: '', batchId: '' }))}><option value="">All departments</option>{departments.map(department => <option key={displayId(department)} value={displayId(department)}>{value(department, 'name', 'departmentName')}</option>)}</select></Field>
        <Field label="Branch / specialization"><select value={filters.branchId} onChange={event => setFilters(current => ({ ...current, branchId: event.target.value, regulationId: '', batchId: '' }))}><option value="">All branches</option>{scopedBranches.map(branch => <option key={displayId(branch)} value={displayId(branch)}>{value(branch, 'name', 'branchName', 'code')}</option>)}</select></Field>
        <Field label="Regulation"><select value={filters.regulationId} onChange={event => setFilters(current => ({ ...current, regulationId: event.target.value }))}><option value="">All regulations</option>{regulationOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>
        <Field label="Curriculum / batch"><select value={filters.batchId} onChange={event => setFilters(current => ({ ...current, batchId: event.target.value }))}><option value="">All curricula and batches</option>{batchOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>
      </div>
      {!canCreate && <div className="syllabus-inline-alert" role="status"><ShieldCheck size={16} /> Your role has view access only. Ask an administrator to grant the syllabus_management create permission to upload syllabus files.</div>}
      {!academic.selectedCollegeId && <div className="syllabus-inline-alert" role="status"><CircleAlert size={16} /> Select an authorized college in the global academic context to view its syllabus.</div>}
    </section>
    <section className="syllabus-kpi-grid" aria-label="Syllabus summary">
      {[
        ['Branch / semester pairs', summary.semesters, BookOpenCheck, 'syllabus-kpi--green'],
        ['Published pairs', summary.published, FileCheck2, 'syllabus-kpi--blue'],
        ['Draft syllabi', summary.drafts, FileText, 'syllabus-kpi--amber'],
        ['Pending pairs', summary.pending, Clock3, 'syllabus-kpi--violet'],
        ['Uploaded documents', summary.documents, Upload, 'syllabus-kpi--teal'],
      ].map(([label, count, Icon, tone]) => <article className={'syllabus-kpi ' + tone} key={label}><span><Icon size={19} /></span><div><strong>{recordsLoading ? <i className="syllabus-skeleton" /> : recordsError && !usingDemoData && label !== 'Branch / semester pairs' ? '—' : count}</strong><small>{label}</small></div></article>)}
    </section>
    <section className="syllabus-directory">
      <div className="syllabus-directory__toolbar">
        <div><h2>Branch &amp; semester syllabi</h2><p>{visibleScopes.length} of {semesterScopes.length} configured branch / semester pairs</p></div>
        <div className="syllabus-directory__tools">
          <label className="syllabus-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search semesters" aria-label="Search semesters" /></label>
          <select className="syllabus-status-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter publication status"><option>All</option><option>Sample</option><option>Published</option><option>Draft</option><option>Pending</option><option>Archived</option><option>Unavailable</option></select>
          <div className="syllabus-view-switch" aria-label="Semester display"><button type="button" className={view === 'grid' ? 'is-active' : ''} aria-label="Grid view" onClick={() => setView('grid')}><Grid2X2 size={16} /></button><button type="button" className={view === 'list' ? 'is-active' : ''} aria-label="List view" onClick={() => setView('list')}><List size={17} /></button></div>
          <button type="button" className="syllabus-icon-button" aria-label="Refresh syllabus list" onClick={fetchSyllabi}><RefreshCw size={16} /></button>
        </div>
      </div>
      {recordsError && <div className="syllabus-inline-alert syllabus-inline-alert--warning" role="status"><CircleAlert size={17} /><span>{recordsError}</span><button type="button" onClick={fetchSyllabi}>Retry</button></div>}
      {recordsLoading && <div className="syllabus-loading-grid" aria-label="Loading semester syllabi"><i /><i /><i /><i /></div>}
      {!recordsLoading && !visibleScopes.length && <div className="syllabus-empty"><BookOpenCheck size={28} /><h3>{semesterScopes.length ? 'No branch / semester pairs match these filters' : 'No semesters configured for this scope'}</h3><p>{semesterScopes.length ? 'Change your search or status filter to see other semesters.' : 'Configure active branches and semesters for the selected academic year and program. Cards are created from those configured records.'}</p></div>}
      {!recordsLoading && visibleScopes.length > 0 && <div className={view === 'grid' ? 'syllabus-card-grid' : 'syllabus-card-list'}>
        {visibleScopes.map(scope => <SyllabusCard key={(scope.branchId || 'unassigned') + ':' + displayId(scope.semester)} semester={scope.semester} branch={scope.branch} records={recordsForScope(scope)} subjectCount={subjectsForScope(scope).length} unavailable={Boolean(recordsError)} canUpload={canCreate} canEdit={canEdit} canPublish={canPublish} canArchive={canArchive} onUpload={() => openCreate(scope.semester, scope.branch)} onDetails={() => { setDetailTab('documents'); setExtraRows([]); setExtraError(''); navigate('/syllabus-management/' + encodeURIComponent(displayId(scope.semester)) + (scope.branchId ? '?branchId=' + encodeURIComponent(scope.branchId) : '')) }} onArchive={confirmArchive} onEdit={openEdit} onPublish={record => executeAction('publish', record)} />)}
      </div>}
      {subjectsError && <p className="syllabus-data-note" role="status">Subject totals may be unavailable: {subjectsError}</p>}
    </section>
  </>

  return <DashboardLayout>
    <main className="syllabus-page">
      {pageHeader}
      {demoContentAvailable && <div className="syllabus-demo-alert" role="status"><CircleAlert size={17} /><span>Sample syllabus documents and subject lists are shown for configured branch / semester pairs. They are local previews only; uploads, edits and publishing require the syllabus backend API.</span></div>}
      {detailMode && recordsError && <div className="syllabus-inline-alert syllabus-inline-alert--warning" role="status"><CircleAlert size={17} /><span>{recordsError}</span><button type="button" onClick={fetchSyllabi}>Retry</button></div>}
      {detailMode
        ? selectedSemester
          ? <DetailWorkspace semester={selectedSemester} branch={selectedBranch} records={selectedScope ? recordsForScope(selectedScope) : records.filter(record => same(semId(record), displayId(selectedSemester)))} subjects={selectedScope ? subjectsForScope(selectedScope) : subjects.filter(subject => !semId(subject) || same(semId(subject), displayId(selectedSemester)))} activeTab={detailTab} setActiveTab={setDetailTab} onBack={() => navigate('/syllabus-management')} onModal={record => record ? openEdit(record) : openCreate(selectedSemester, selectedBranch)} onPublish={record => executeAction('publish', record)} onPreview={document => documentBlob(document, false)} onDownload={document => documentBlob(document, true)} onReplace={onReplace} onViewSubject={setReadingSubject} canCreate={canCreate} canEdit={canEdit} canPublish={canPublish} canDownload={canDownload} extraRows={extraRows} extraError={extraError} loadingExtra={loadingExtra} loadExtra={loadExtra} />
          : <div className="syllabus-empty"><CircleAlert size={26} /><h3>Semester not found</h3><p>This semester is not in the current college and academic configuration.</p><Link className="syllabus-btn syllabus-btn--secondary" to="/syllabus-management">Back to Syllabus Management</Link></div>
        : renderDirectory()}
      {replaceProgress && <div className="syllabus-toast-status" role="status"><LoaderCircle size={16} className="syllabus-spin" />{replaceProgress}</div>}
    </main>
    <SyllabusModal open={modalOpen} onClose={closeModal} form={form} setForm={setForm} academic={academic} courses={courses} branches={branches} subjects={subjects} files={files} setFiles={setFiles} errors={formErrors} setErrors={setFormErrors} onSave={saveSyllabus} saving={saving} canPublish={canPublish} onRetryFile={retryFile} onCancelFile={cancelFile} />
    {readingSubject && <SubjectReader subject={readingSubject} semester={selectedSemester} branch={selectedBranch} onClose={() => setReadingSubject(null)} />}
    {preview && <div className="syllabus-preview-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setPreview(null) }}><section className="syllabus-preview" role="dialog" aria-modal="true" aria-label={'Preview ' + preview.name}><header><strong>{preview.name}</strong><button type="button" className="syllabus-icon-button" onClick={() => setPreview(null)} aria-label="Close preview"><X size={18} /></button></header>{preview.type.startsWith('image/') ? <img src={preview.url} alt={preview.name} /> : preview.type.includes('pdf') || preview.name.toLowerCase().endsWith('.pdf') || preview.type.startsWith('text/') ? <iframe src={preview.url} title={preview.name} /> : <div className="syllabus-empty"><FileText size={25} /><h3>Preview unavailable</h3><p>This format must be downloaded to open.</p></div>}</section></div>}
    {confirmation && <div className="syllabus-modal-backdrop" role="presentation"><section className="syllabus-confirm" role="alertdialog" aria-modal="true" aria-labelledby="syllabus-confirm-title"><span><Archive size={20} /></span><h2 id="syllabus-confirm-title">Archive this syllabus?</h2><p>Archived documents are no longer shown as active to students and faculty. The record and its versions remain available for audit.</p><footer><button className="syllabus-btn syllabus-btn--quiet" type="button" onClick={() => setConfirmation(null)}>Cancel</button><button className="syllabus-btn syllabus-btn--danger" type="button" onClick={async () => { const record = confirmation.record; setConfirmation(null); await executeAction('archive', record, true) }}>Archive syllabus</button></footer></section></div>}
  </DashboardLayout>
}
