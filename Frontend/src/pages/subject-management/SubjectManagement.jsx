import { useEffect, useMemo, useState } from 'react'
import { FiAlertTriangle, FiBookOpen, FiCheckCircle, FiEdit2, FiEye, FiFileText, FiLayers, FiPlus, FiRotateCcw, FiSearch, FiX } from 'react-icons/fi'
import DashboardLayout from '../../layouts/DashboardLayout'
import EmptyState from '../../components/EmptyState'
import ExportMenu from '../../components/ExportMenu'
import FilterPanel from '../../components/FilterPanel'
import SearchableSelect from '../../components/SearchableSelect'
import StatusBadge from '../../components/StatusBadge'
import TableActionButton from '../../components/TableActionButton'
import TablePagination, { PAGE_SIZE } from '../../components/TablePagination'
import subjectService from '../../services/subjectService'
import academicService from '../../services/academicService'
import { showError, showSuccess } from '../../utils/toast'
import { useAcademic } from '../../context/AcademicContext'
import './SubjectManagement.css'

const blank = () => ({ academicYearId: '', courseId: '', branchId: '', semesterId: '', subjectCode: '', subjectName: '', subjectType: '', credits: '', status: 'Active', shortName: '', lectureHours: '', tutorialHours: '', practicalHours: '', internalMarks: '', externalMarks: '' })
const key = v => String(v ?? '')
const semNo = s => Number(s?.semesterNumber ?? String(s?.semesterName ?? s?.semester ?? s?.name ?? s?.id ?? '').match(/\d+/)?.[0] ?? 0)
const ACADEMIC_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
export const getAcademicLevelFromSemester = s => { const n = semNo(s); const year = Math.ceil(n / 2); return n > 0 ? `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year` : '' }
export const getSemestersForAcademicLevel = (list, level) => list.filter(s => getAcademicLevelFromSemester(s) === level)
const entityName = (list, value, fallback = '') => list.find(x => key(x.id) === key(value))?.name || fallback || '—'

export default function SubjectManagement() {
  const { selectedCollegeId, selectedAcademicYearId, selectedAcademicYear } = useAcademic()
  const [subjects, setSubjects] = useState([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(1)
  const [masters, setMasters] = useState({ years: [], courses: [], branches: [], semesters: [] })
  const [filters, updateFilters] = useState({ search: '', academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', subjectType: '', status: '' })
  const [form, setForm] = useState(blank), [editing, setEditing] = useState(null), [editorOpen, setEditorOpen] = useState(false), [viewing, setViewing] = useState(null), [saving, setSaving] = useState(false), [recentId, setRecentId] = useState('')
  const [confirmingSubject, setConfirmingSubject] = useState(null), [statusSaving, setStatusSaving] = useState(false)
  const setFilters = next => { setPage(1); updateFilters(next) }
  const loadSubjects = async () => { setLoading(true); setLoadError(''); try { setSubjects(await subjectService.getSubjects()) } catch (e) { setLoadError(e.message || 'Unable to load subjects.') } finally { setLoading(false) } }
  useEffect(() => { loadSubjects() }, [])
  useEffect(() => { let active = true; Promise.all([academicService.getAcademicYears(), academicService.getCourses(), academicService.getBranches(), academicService.getSemesters()]).then(([years, courses, branches, semesters]) => active && setMasters({ years, courses, branches, semesters })).catch(() => active && showError('Academic mapping options could not be loaded.')); return () => { active = false } }, [])
  const scopedCourses = masters.courses
  const branches = courseId => masters.branches.filter(b => (!courseId || key(b.courseId) === key(courseId)))
  const semesters = (courseId, branchId) => masters.semesters.filter(s => (!courseId || !s.courseId || key(s.courseId) === key(courseId)) && (!branchId || !s.branchId || key(s.branchId) === key(branchId)))
  const filterSemesters = semesters(filters.courseId, filters.branchId), formSemesters = semesters(form.courseId, form.branchId)
  const levels = list => [...new Set(list.map(getAcademicLevelFromSemester).filter(Boolean))]
  const types = useMemo(() => [...new Set(subjects.map(s => s.subjectType).filter(Boolean))], [subjects])
  const mapping = s => ({ year: entityName(masters.years, s.academicYearId, s.academicYear), course: entityName(masters.courses, s.courseId, s.course), branch: entityName(masters.branches, s.branchId, s.branch), semester: entityName(masters.semesters, s.semesterId, s.semester) })
  
  const scopedSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchesYear = !selectedAcademicYearId || !s.academicYearId || key(s.academicYearId) === key(selectedAcademicYearId)
      const course = masters.courses.find(c => key(c.id) === key(s.courseId))
      const branch = masters.branches.find(b => key(b.id) === key(s.branchId))
      const itemCollegeId = s.collegeId || course?.collegeId || branch?.collegeId
      const matchesCollege = !selectedCollegeId || !itemCollegeId || key(itemCollegeId) === key(selectedCollegeId)
      return matchesYear && matchesCollege
    })
  }, [subjects, selectedAcademicYearId, selectedCollegeId, masters.courses, masters.branches])

  const records = useMemo(() => scopedSubjects.filter(s => { const q = filters.search.trim().toLowerCase(), n = semNo(s); return (!q || `${s.subjectCode} ${s.subjectName}`.toLowerCase().includes(q)) && (!filters.academicYearId || key(s.academicYearId) === key(filters.academicYearId)) && (!filters.courseId || key(s.courseId) === key(filters.courseId)) && (!filters.branchId || key(s.branchId) === key(filters.branchId)) && (!filters.semesterId || key(s.semesterId) === key(filters.semesterId)) && (!filters.level || getAcademicLevelFromSemester({ semesterNumber: n }) === filters.level) && (!filters.subjectType || s.subjectType === filters.subjectType) && (!filters.status || s.status === filters.status) }).sort((left, right) => key(left.id) === key(recentId) ? -1 : key(right.id) === key(recentId) ? 1 : 0), [scopedSubjects, filters, recentId])
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const kpis = useMemo(() => ({ total: records.length, active: records.filter(s => String(s.status).toLowerCase() === 'active').length, theory: records.filter(s => /theory/i.test(s.subjectType)).length, lab: records.filter(s => /lab|practical/i.test(s.subjectType)).length, credits: records.reduce((n, s) => n + Number(s.credits || 0), 0) }), [records])
  const changeFilter = (field, value) => setFilters(old => field === 'courseId' ? { ...old, courseId: value, branchId: '', level: '', semesterId: '' } : field === 'branchId' ? { ...old, branchId: value, level: '', semesterId: '' } : field === 'level' ? { ...old, level: value, semesterId: '' } : { ...old, [field]: value })
  const changeForm = (field, value) => setForm(old => field === 'courseId' ? { ...old, courseId: value, branchId: '', semesterId: '' } : field === 'branchId' ? { ...old, branchId: value, semesterId: '' } : { ...old, [field]: value })
  const formLevel = getAcademicLevelFromSemester(formSemesters.find(s => key(s.id) === key(form.semesterId)) || { semester: form.semester })
  const openAdd = () => { const activeYear = masters.years.find(year => year.isCurrent || String(year.status).toLowerCase() === 'active' || String(year.status).toLowerCase() === 'current'); setEditing(null); setForm({ ...blank(), academicYearId: selectedAcademicYearId || (activeYear ? key(activeYear.id) : '') }); setEditorOpen(true) }
  const closeEditor = () => { setEditing(null); setForm(blank()); setEditorOpen(false) }
  const openEdit = s => { setViewing(null); setEditing(s); setForm({ ...blank(), ...s, academicYearId: key(s.academicYearId), courseId: key(s.courseId), branchId: key(s.branchId), semesterId: key(s.semesterId) }); setEditorOpen(true) }
  const save = async e => { e.preventDefault(); if (!form.subjectCode.trim() || !form.subjectName.trim() || !form.academicYearId || !form.courseId || !form.branchId || !form.semesterId) return showError('Complete the academic mapping, subject code, and subject name.'); const selectedCourse = masters.courses.find(course => key(course.id) === key(form.courseId)); const selectedBranch = branches(form.courseId).find(branch => key(branch.id) === key(form.branchId)); if (!selectedCourse || !selectedBranch) return showError('Select a valid course and a branch belonging to that course.'); const numericFields = [['Credits', form.credits], ['Lecture hours', form.lectureHours], ['Tutorial hours', form.tutorialHours], ['Practical hours', form.practicalHours], ['Internal marks', form.internalMarks], ['External marks', form.externalMarks]]; if (numericFields.some(([, value]) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))) return showError('Credits, hours, and marks must be non-negative numbers.'); if (subjects.some(s => key(s.id) !== key(editing?.id) && s.subjectCode?.toLowerCase() === form.subjectCode.trim().toLowerCase())) return showError('Subject code already exists.'); const semester = formSemesters.find(s => key(s.id) === key(form.semesterId)); if (!semester) return showError('Select a valid semester for this course and branch.'); const payload = { ...form, credits: Number(form.credits || 0), semester: semester.semesterName || semester.name || `Semester ${semNo(semester)}`, academicYear: entityName(masters.years, form.academicYearId), course: entityName(masters.courses, form.courseId), branch: entityName(masters.branches, form.branchId) }; setSaving(true); try { if (editing) { await subjectService.updateSubject(editing.id, payload); showSuccess('Subject updated successfully') } else { const created = await subjectService.createSubject(payload); setRecentId(created?.id || ''); setPage(1); showSuccess('Subject created successfully') } closeEditor(); await loadSubjects() } catch (err) { showError(err.message || 'Failed to save subject.') } finally { setSaving(false) } }
  const updateStatus = async s => {
    const status = String(s.status).toLowerCase() === 'active' ? 'Inactive' : 'Active'
    if (status === 'Inactive') { setConfirmingSubject(s); return }
    await persistStatus(s, status)
  }
  const persistStatus = async (subject, status) => {
    setStatusSaving(true)
    try {
      await subjectService.updateSubject(subject.id, { ...subject, status })
      showSuccess(`Subject ${status.toLowerCase()}d successfully`)
      setConfirmingSubject(null)
      await loadSubjects()
    } catch (err) { showError(err.message || 'Unable to update status.') }
    finally { setStatusSaving(false) }
  }
  const columns = [{ label: 'Subject Code', value: 'subjectCode' }, { label: 'Subject Name', value: 'subjectName' }, { label: 'Academic Year', value: s => mapping(s).year }, { label: 'Course', value: s => mapping(s).course }, { label: 'Branch', value: s => mapping(s).branch }, { label: 'Academic Level', value: s => getAcademicLevelFromSemester(s) }, { label: 'Semester', value: s => mapping(s).semester }, { label: 'Subject Type', value: 'subjectType' }, { label: 'Credits', value: 'credits' }, { label: 'Status', value: 'status' }]
  const activeFilterText = [filters.academicYearId && entityName(masters.years, filters.academicYearId), filters.courseId && entityName(masters.courses, filters.courseId), filters.branchId && entityName(masters.branches, filters.branchId), filters.level, filters.semesterId && entityName(masters.semesters, filters.semesterId)].filter(Boolean)
  const detailSections = s => { const m = mapping(s); return [{ title: 'Subject Information', rows: [['Subject Code', s.subjectCode], ['Subject Name', s.subjectName], ['Type', s.subjectType], ['Credits', s.credits], ['Status', s.status]] }, { title: 'Academic Mapping', rows: [['Academic Year', m.year], ['Course', m.course], ['Branch', m.branch], ['Academic Level', getAcademicLevelFromSemester({ semester: m.semester })], ['Semester', m.semester]] }, { title: 'Academic Configuration', rows: [['Lecture Hours', s.lectureHours], ['Tutorial Hours', s.tutorialHours], ['Practical Hours', s.practicalHours], ['Internal Marks', s.internalMarks], ['External Marks', s.externalMarks]].filter(([, v]) => v !== '' && v != null) }].filter(x => x.rows.length) }
  if (open) {
    return (
      <DashboardLayout>
        <main className="sm-screen">
          <header className="sm-header">
            <div>
              <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={closeEditor} style={{ marginBottom: '10px' }}>
                <FiRotateCcw /> Back to Subject Directory
              </button>
              <h1>{editing ? `Edit ${editing.subjectCode}` : 'Add Subject'}</h1>
              <p>Map the subject to a valid academic program and semester.</p>
            </div>
          </header>
          <Editor
            form={form}
            editing={editing}
            masters={{ ...masters, courses: scopedCourses }}
            branches={branches(form.courseId)}
            semesters={formSemesters}
            levels={ACADEMIC_LEVELS}
            typeOptions={types}
            formLevel={formLevel}
            change={changeForm}
            close={closeEditor}
            save={save}
            saving={saving}
          />
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="sm-screen">
        <header className="sm-header">
          <div>
            <h1>Subject Management</h1>
            <p>Configure and manage subjects across academic programs and semesters.</p>
          </div>
          <div className="sm-actions">
            <ExportMenu rows={records} columns={columns} filename="subject-directory" title="Subject Directory" scope="All matching subjects" />
            <button className="sm-btn sm-btn--primary" onClick={openAdd}><FiPlus /> Add Subject</button>
          </div>
        </header>
        <section className="sm-kpi-grid">
          {[[FiBookOpen, 'Total Subjects', kpis.total, 'blue'], [FiCheckCircle, 'Active Subjects', kpis.active, 'green'], [FiFileText, 'Theory Subjects', kpis.theory, 'purple'], [FiLayers, 'Practical / Lab', kpis.lab, 'amber'], [FiBookOpen, 'Total Credits', kpis.credits, 'cyan']].map(([Icon, label, value, color]) => (
            <div className="sm-kpi-card" key={label}>
              <div className={`sm-kpi-icon sm-kpi-icon--${color}`}><Icon /></div>
              <div className="sm-kpi-content"><small>{label}</small><strong>{value}</strong></div>
            </div>
          ))}
        </section>
        <section className="sm-card">
          <div className="sm-directory-title">
            <div>
              <h2>Subject Directory</h2>
              <p>{loading ? 'Loading subjects…' : `${records.length} subjects found`}</p>
            </div>
            {activeFilterText.length > 0 && (
              <div className="sm-filter-context">
                {activeFilterText.join(' / ')}{' '}
                <button onClick={() => setFilters({ search: '', academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', subjectType: '', status: '' })}>
                  <FiRotateCcw /> Clear filters
                </button>
              </div>
            )}
          </div>
          <FilterPanel
            active={Boolean(filters.search || activeFilterText.length || filters.subjectType || filters.status)}
            onClear={() => setFilters({ search: '', academicYearId: '', courseId: '', branchId: '', level: '', semesterId: '', subjectType: '', status: '' })}
            className="sm-filter-panel"
          >
            <div className="sm-filter-grid">
              <label className="sm-search-wrap">
                <FiSearch aria-hidden="true" />
                <input aria-label="Search subjects" value={filters.search} onChange={e => changeFilter('search', e.target.value)} placeholder="Search subject code or name" />
              </label>
              <Select label="Academic Year" value={filters.academicYearId} options={masters.years} onChange={v => changeFilter('academicYearId', v)} />
              <Select label="Course" value={filters.courseId} options={scopedCourses} onChange={v => changeFilter('courseId', v)} />
              <Select label="Branch" value={filters.branchId} options={branches(filters.courseId)} onChange={v => changeFilter('branchId', v)} disabled={!filters.courseId} />
              <Select label="Academic Level" value={filters.level} options={levels(filterSemesters)} onChange={v => changeFilter('level', v)} disabled={!filters.branchId} />
              <Select label="Semester" value={filters.semesterId} options={getSemestersForAcademicLevel(filterSemesters, filters.level)} onChange={v => changeFilter('semesterId', v)} disabled={!filters.level} semester />
              <Select label="Subject Type" value={filters.subjectType} options={types} onChange={v => changeFilter('subjectType', v)} />
              <Select label="Status" value={filters.status} options={['Active', 'Inactive']} onChange={v => changeFilter('status', v)} />
            </div>
          </FilterPanel>
          <div className="sm-table-wrap">
            {loading ? (
              <div className="sm-loading">Loading subject directory…</div>
            ) : loadError ? (
              <div className="sm-error">
                {loadError}
                <button className="sm-btn sm-btn--secondary" onClick={loadSubjects}>Retry</button>
              </div>
            ) : !records.length ? (
              <EmptyState
                title={filters.search ? `No subjects found for “${filters.search}”.` : activeFilterText.length ? 'No subjects match the selected academic filters.' : 'No subjects configured'}
                description={activeFilterText.length ? 'Clear filters or choose another academic mapping.' : 'No subjects have been configured yet.'}
                action="Add Subject"
                onAction={openAdd}
              />
            ) : (
              <table className="sm-table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Academic Mapping</th>
                    <th>Academic Level</th>
                    <th>Semester</th>
                    <th>Type</th>
                    <th>Credits</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map(s => {
                    const m = mapping(s);
                    return (
                      <tr key={s.id}>
                        <td><span className="sm-code-badge">{s.subjectCode}</span></td>
                        <td><strong>{s.subjectName}</strong>{s.shortName && <small>{s.shortName}</small>}</td>
                        <td>{m.course}<small>• {m.branch}</small></td>
                        <td>{getAcademicLevelFromSemester({ semester: m.semester }) || '—'}</td>
                        <td>{m.semester}</td>
                        <td>{s.subjectType && <span className={`sm-type-tag ${/lab|practical/i.test(s.subjectType) ? 'sm-type-tag--lab' : 'sm-type-tag--theory'}`}>{s.subjectType}</span>}</td>
                        <td><span className="sm-credit-badge">{s.credits}</span></td>
                        <td><StatusBadge value={s.status} /></td>
                        <td>
                          <div className="sm-row-actions">
                            <button className="sm-icon-btn" title="View" onClick={() => setViewing(s)}><FiEye /></button>
                            <button className="sm-icon-btn" title="Edit" onClick={() => openEdit(s)}><FiEdit2 /></button>
                            <TableActionButton type={String(s.status).toLowerCase() === 'active' ? 'deactivate' : 'activate'} ariaLabel={`${String(s.status).toLowerCase() === 'active' ? 'Deactivate' : 'Activate'} ${s.subjectCode}`} onClick={() => updateStatus(s)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {!loading && !loadError && records.length > 0 && <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />}
        </section>
        {confirmingSubject && <StatusConfirmation subject={confirmingSubject} saving={statusSaving} close={() => setConfirmingSubject(null)} confirm={() => persistStatus(confirmingSubject, 'Inactive')} />}
        {viewing && <Details subject={viewing} sections={detailSections(viewing)} close={() => setViewing(null)} edit={() => openEdit(viewing)} />}
      </main>
    </DashboardLayout>
  );
}
function Select({ label, value, options, onChange, disabled, semester = false, hideSearch = false }) { return <SearchableSelect placement="bottom" hideSearch={hideSearch} label={label} value={value} options={options} onChange={onChange} placeholder={label} disabled={disabled} getOptionLabel={semester ? s => s.semesterName || s.name || `Semester ${semNo(s)}` : undefined} /> }
function Field({ label, children }) { return <div className="sm-field"><label>{label}</label>{children}</div> }
function Input({ label, value, change, type = 'text' }) { return <Field label={label}><input type={type} min={type === 'number' ? '0' : undefined} value={value ?? ''} onChange={e => change(e.target.value)} /></Field> }
function StatusConfirmation({ subject, saving, close, confirm }) { return <div className="sm-modal-backdrop" onMouseDown={saving ? undefined : close}><section className="sm-modal sm-modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="sm-status-confirm-title" onMouseDown={event => event.stopPropagation()}><div className="sm-confirm-icon"><FiAlertTriangle /></div><h2 id="sm-status-confirm-title">Deactivate Subject?</h2><p><strong>{subject.subjectName} ({subject.subjectCode})</strong> will be marked inactive and will no longer be available for new academic use. Continue?</p><div className="sm-modal-footer"><button type="button" className="sm-btn sm-btn--secondary" disabled={saving} onClick={close}>Cancel</button><button type="button" className="sm-btn sm-btn--danger" disabled={saving} onClick={confirm}>{saving ? 'Deactivating…' : 'Confirm Deactivate'}</button></div></section></div> }

function Editor({ form, editing, masters, branches, semesters, levels, typeOptions, formLevel: initialLevel, change: updateForm, close, save, saving }) {
  const [formLevel, setFormLevel] = useState(initialLevel);
  const [activeTab, setActiveTab] = useState('mapping');
  const change = (field, value) => {
    if (field === 'courseId' || field === 'branchId') setFormLevel('');
    updateForm(field, value);
  };
  const selectedCourse = masters.courses.find(course => key(course.id) === key(form.courseId));
  const selectedBranch = branches.find(branch => key(branch.id) === key(form.branchId));
  const selected = semesters.find(s => key(s.id) === key(form.semesterId));
  const selectLevel = v => {
    setFormLevel(v);
    const first = getSemestersForAcademicLevel(semesters, v)[0];
    change('semesterId', first ? key(first.id) : '');
  };

  const tabs = [
    { id: 'mapping', label: '1. Academic Mapping' },
    { id: 'info', label: '2. Subject Details' },
    { id: 'config', label: '3. Hours & Marks' },
  ];
  const stepIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="erp-two-column-layout">
      <div className="erp-card-main">
        <div className="erp-tabs-bar">
          {tabs.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              className={`erp-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{idx + 1}</span> {t.label.replace(/^\d+\.\s*/, '')}
            </button>
          ))}
        </div>

        <form className="erp-form-scroll-body" onSubmit={save}>
          {activeTab === 'mapping' && (
            <section>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--erp-text-main, #0f172a)' }}>Academic Mapping</h3>
              <div className="sm-form-grid-2">
                <Field label={<>Course <span className="sm-required">*</span></>}>
                  <Select label="Course" value={form.courseId} options={masters.courses} onChange={v => change('courseId', v)} />
                </Field>
                <Field label="Course Code">
                  <div className="sm-active-year-field" style={{ minHeight: '38px', display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px', fontSize: '0.88rem', color: '#64748b' }}>
                    {selectedCourse?.code || 'Auto-filled'}
                  </div>
                </Field>
                <Field label={<>Branch <span className="sm-required">*</span></>}>
                  <Select label="Branch" value={form.branchId} options={branches} onChange={v => change('branchId', v)} disabled={!form.courseId} />
                </Field>
                <Field label="Branch Code">
                  <div className="sm-active-year-field" style={{ minHeight: '38px', display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px', fontSize: '0.88rem', color: '#64748b' }}>
                    {selectedBranch?.code || 'Auto-filled'}
                  </div>
                </Field>
                <Field label={<>Academic Level <span className="sm-required">*</span></>}>
                  <Select label="Academic Level" value={formLevel} options={levels} onChange={selectLevel} disabled={!form.branchId} />
                </Field>
                <Field label={<>Semester <span className="sm-required">*</span></>}>
                  <Select label="Semester" hideSearch value={form.semesterId} options={getSemestersForAcademicLevel(semesters, formLevel)} onChange={v => change('semesterId', v)} disabled={!form.branchId || !formLevel} semester />
                </Field>
              </div>
            </section>
          )}

          {activeTab === 'info' && (
            <section>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--erp-text-main, #0f172a)' }}>Subject Information</h3>
              <div className="sm-form-grid-2">
                <Input label={<>Subject Name <span className="sm-required">*</span></>} value={form.subjectName} change={v => change('subjectName', v)} />
                <Input label={<>Subject Code <span className="sm-required">*</span></>} value={form.subjectCode} change={v => change('subjectCode', v)} />
                <Field label="Subject Type">
                  <Select label="Subject Type" value={form.subjectType} options={typeOptions} onChange={v => change('subjectType', v)} disabled={!typeOptions.length} />
                </Field>
                <Input label="Credits" type="number" value={form.credits} change={v => change('credits', v)} />
                <Input label="Short Name" value={form.shortName} change={v => change('shortName', v)} />
                <Field label="Status">
                  <Select label="Status" value={form.status} options={['Active', 'Inactive']} onChange={v => change('status', v)} />
                </Field>
              </div>
            </section>
          )}

          {activeTab === 'config' && (
            <section>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--erp-text-main, #0f172a)' }}>Hours & Marks Configuration</h3>
              <div className="sm-form-grid-3">
                <Input label="Lecture Hours" type="number" value={form.lectureHours} change={v => change('lectureHours', v)} />
                <Input label="Tutorial Hours" type="number" value={form.tutorialHours} change={v => change('tutorialHours', v)} />
                <Input label="Practical Hours" type="number" value={form.practicalHours} change={v => change('practicalHours', v)} />
                <Input label="Internal Marks" type="number" value={form.internalMarks} change={v => change('internalMarks', v)} />
                <Input label="External Marks" type="number" value={form.externalMarks} change={v => change('externalMarks', v)} />
              </div>
            </section>
          )}

          <div className="erp-actions-bar" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {stepIndex > 0 ? (
              <button
                type="button"
                className="cm-button secondary erp-btn erp-btn--secondary"
                onClick={() => setActiveTab(tabs[stepIndex - 1].id)}
              >
                &larr; Previous
              </button>
            ) : (
              <button
                type="button"
                className="cm-button secondary erp-btn erp-btn--secondary"
                onClick={close}
              >
                Cancel
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {stepIndex < tabs.length - 1 ? (
                <button
                  type="button"
                  className="cm-button erp-btn erp-btn--primary"
                  onClick={() => setActiveTab(tabs[stepIndex + 1].id)}
                >
                  Continue &rarr;
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="cm-button erp-btn erp-btn--primary"
                >
                  {saving ? 'Saving…' : editing ? 'Update Subject' : 'Create Subject'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <aside className="preview-card" aria-label="Subject live preview">
        <header className="preview-top-bar">
          <span className="preview-live-tag">
            <span className="live-dot" /> LIVE PREVIEW
          </span>
          <span className="preview-sync-hint">Real-time sync</span>
        </header>

        <div className="preview-body-container">
          {(() => {
            const yearName = entityName(masters.years, form.academicYearId, '')
            const courseName = selectedCourse ? `${selectedCourse.name}${selectedCourse.code ? ` (${selectedCourse.code})` : ''}` : ''
            const branchName = selectedBranch ? `${selectedBranch.name}${selectedBranch.code ? ` (${selectedBranch.code})` : ''}` : ''
            const semName = [formLevel, selected?.semesterName || selected?.name].filter(Boolean).join(' - ')

            const sections = [
              {
                title: 'Academic Mapping',
                fields: [
                  ['Academic Year', yearName],
                  ['Course', courseName],
                  ['Branch', branchName],
                  ['Level & Semester', semName],
                ],
              },
              {
                title: 'Subject Details',
                fields: [
                  ['Subject Code', form.subjectCode],
                  ['Subject Name', form.subjectName],
                  ['Short Name', form.shortName],
                  ['Subject Type', form.subjectType],
                  ['Credits', form.credits !== '' ? `${form.credits} Credits` : ''],
                  ['Status', form.status || 'Active'],
                ],
              },
              {
                title: 'Hours & Marks Configuration',
                fields: [
                  ['Lecture Hours', form.lectureHours !== '' && form.lectureHours != null ? `${form.lectureHours} hrs` : ''],
                  ['Tutorial Hours', form.tutorialHours !== '' && form.tutorialHours != null ? `${form.tutorialHours} hrs` : ''],
                  ['Practical Hours', form.practicalHours !== '' && form.practicalHours != null ? `${form.practicalHours} hrs` : ''],
                  ['Internal Marks', form.internalMarks !== '' && form.internalMarks != null ? String(form.internalMarks) : ''],
                  ['External Marks', form.externalMarks !== '' && form.externalMarks != null ? String(form.externalMarks) : ''],
                ],
              },
            ].map(sec => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '—'),
            })).filter(sec => sec.fields.length > 0)

            if (sections.length === 0) {
              return (
                <div className="preview-empty-hint">
                  <span>Enter details in the form to preview here in real time.</span>
                </div>
              )
            }

            return (
              <>
                <div className="preview-hero" style={{ marginBottom: '14px' }}>
                  <div className="preview-hero-badge">
                    {form.subjectCode ? form.subjectCode.slice(0, 4).toUpperCase() : 'SUB'}
                  </div>
                  <div className="preview-hero-details">
                    <h3 className="preview-course-title" style={{ margin: 0 }}>{form.subjectName || 'Subject Preview'}</h3>
                    <p className="preview-course-meta" style={{ margin: '2px 0 0', color: '#64748B', fontSize: '0.78rem' }}>
                      {[form.subjectCode, form.subjectType, form.credits !== '' && `${form.credits} Credits`, form.status || 'Active'].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>
                {sections.map(sec => (
                  <div key={sec.title} className="preview-section-group" style={{ marginBottom: '12px' }}>
                    <span className="preview-section-title">{sec.title}</span>
                    <div className="preview-kv-grid">
                      {sec.fields.map(([label, text]) => (
                        <div key={label} className="preview-kv-item">
                          <span className="kv-label">{label}</span>
                          <strong className="kv-val" title={String(text).trim()}>{String(text).trim()}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )
          })()}
        </div>
      </aside>
    </div>
  );
}

function Details({ subject, sections, close, edit }) { return <div className="sm-modal-backdrop" onMouseDown={close}><div className="sm-modal sm-modal--details" onMouseDown={e => e.stopPropagation()}><div className="sm-modal-header"><div><span className="sm-code-badge">{subject.subjectCode}</span><h2>{subject.subjectName}</h2><StatusBadge value={subject.status} /></div><button className="sm-icon-btn" onClick={close}><FiX /></button></div><div className="sm-modal-body">{sections.map(section => <section className="sm-details-section" key={section.title}><h3>{section.title}</h3>{section.rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>)}</div><div className="sm-modal-footer"><ExportMenu mode="single" title={`${subject.subjectCode} — Subject Details`} filename={`subject-${subject.subjectCode}`} recordSections={sections} /><button className="sm-btn sm-btn--primary" onClick={edit}>Edit Subject</button></div></div></div> }
