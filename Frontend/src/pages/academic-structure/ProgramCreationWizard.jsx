import { useRef, useState } from 'react'
import ViewDialog from '../../components/ViewDialog'
import { DepartmentManagement } from '../admin-management/AdminManagement'
import { useScreenAccess } from '../../auth/ScreenAccess'
import { createCourse, updateCourse, getCourses, createBranch, updateBranch, getBranches, getDepartments, getSemesters, createSemester, updateSemester } from '../../auth/collegeApi'
import { semesterStructure } from '../../services/branchSemesterWorkflow'
import { deriveLifecycleStatus } from '../../utils/semesterUtils'
import { belongsToCollege, entityId, records, saveSemesterSchedules, validateSemesterSchedules, scheduleYear } from './programCreation'
import './ProgramCreationWizard.css'

const steps = ['Program Details', 'Department', 'Branch', 'Semester Schedule', 'Review & Submit']
const codeOf = (row, kind) => String(row[kind + 'Code'] ?? row.code ?? '').trim().toUpperCase()
const nameOf = (row, kind) => row[kind + 'Name'] ?? row.name ?? ''
const message = error => error?.response?.data?.message || error.message || 'Unable to save. Your entries are retained.'

export default function ProgramCreationWizard({ collegeId, departments: initialDepartments, courses, academicYears, selectedAcademicYearId, onClose, onComplete, currentCollege }) {
  const { canAction } = useScreenAccess()
  const [step, setStep] = useState(0)
  const [program, setProgram] = useState({ name: '', code: '', durationYears: '', totalSemesters: '', type: '', status: '' })
  const [programChoice, setProgramChoice] = useState('')
  const existingChoice = programChoice && programChoice !== 'new'
  const [departmentId, setDepartmentId] = useState('')
  const [departments, setDepartments] = useState(initialDepartments)
  const [addingDepartment, setAddingDepartment] = useState(false)
  const [branches, setBranches] = useState([])
  const [branch, setBranch] = useState({ name: '', code: '', departmentId: '', status: '' })
  const [editingBranch, setEditingBranch] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const courseId = useRef(null)
  const attemptedCourse = useRef(false)
  const attemptedBranches = useRef(new Set())
  const branchIds = useRef(new Map())
  const savedProgramPayload = useRef('')
  const savedBranchPayloads = useRef(new Map())
  const body = useRef(null)
  const years = academicYears.filter(row => belongsToCollege(row, collegeId))
  const mappedBranches = branches.map(row => ({ ...row, terms: row.terms.map(term => ({ ...term,
    academicYearId: scheduleYear(term, years, selectedAcademicYearId), status: term.startDate && term.endDate ? '1' : '0',
  })) }))
  const assertScope = () => { if (String(currentCollege.current) !== String(collegeId)) throw new Error('College changed. Return to the original college to finish this program.') }
  const run = async action => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { assertScope(); await action() } catch (reason) { setError(message(reason)) } finally { lock.current = false; setBusy(false) }
  }
  const go = value => { setStep(value); setError(''); if (body.current) body.current.scrollTop = 0 }
  const validateProgram = () => {
    if (!program.name.trim() || !program.code.trim() || !program.type || !program.status) throw new Error('Enter the program name, code, academic level and status.')
    semesterStructure(program)
    if (courses.some(row => belongsToCollege(row, collegeId) && codeOf(row, 'course') === program.code.trim().toUpperCase() && String(entityId(row, 'course')) !== String(courseId.current))) throw new Error('This program code already exists for this college. Edit the saved program to add branches.')
  }
  const saveProgram = async () => {
    validateProgram()
    if (!departmentId) throw new Error('Select a department before continuing.')
    const payload = { courseName: program.name.trim(), courseCode: program.code.trim().toUpperCase(), collegeId: Number(collegeId),
      departmentId: branches.some(row => String(row.departmentId) !== String(departmentId)) ? null : Number(departmentId), durationYears: Number(program.durationYears), totalSemesters: Number(program.totalSemesters),
      courseType: program.type, status: program.status === 'Active' ? 1 : 0, eligibility: null, description: null }
    // Reconcile a lost response before retrying a create.
    const latest = records(await getCourses()).filter(row => belongsToCollege(row, collegeId))
    const matching = latest.find(row => codeOf(row, 'course') === payload.courseCode)
    if (existingChoice) {
      const saved = latest.find(row => String(entityId(row, 'course')) === String(courseId.current))
      if (!saved) throw new Error('The selected program is no longer available.')
      const savedDepartment = saved.departmentId ?? saved.DepartmentId
      if (savedDepartment && (String(savedDepartment) !== String(departmentId) || branches.some(row => String(row.departmentId) !== String(savedDepartment)))) {
        if (!canAction('/courses', 'edit')) throw new Error('Permission to update the program is required to assign branches across departments. Your entries are retained.')
        // A null course-level department is the existing API's shared-program
        // mapping. Department ownership stays on each branch; preserve the
        // saved program identity and metadata when enabling that mapping.
        await updateCourse(courseId.current, {
          collegeId: Number(collegeId), departmentId: null,
          courseName: nameOf(saved, 'course'), courseCode: codeOf(saved, 'course'),
          courseShortName: saved.courseShortName ?? saved.shortName ?? null,
          courseType: saved.courseType ?? saved.type ?? null,
          durationYears: Number(saved.durationYears ?? saved.durationValue ?? saved.duration),
          totalSemesters: Number(saved.totalSemesters ?? saved.semesters),
          eligibility: saved.eligibility ?? null, description: saved.description ?? null,
          status: saved.status,
        })
        assertScope()
        const verified = records(await getCourses()).find(row => String(entityId(row, 'course')) === String(courseId.current))
        if (!verified || (verified.departmentId ?? verified.DepartmentId)) throw new Error('The shared program mapping could not be verified. Your department and branch entries are retained; retry to check the saved program.')
      }
      return
    }
    if (!courseId.current && matching) {
      if (!attemptedCourse.current) throw new Error('This program code already exists. Open its saved configuration.')
      courseId.current = entityId(matching, 'course')
    }
    if (courseId.current) {
      if (savedProgramPayload.current !== JSON.stringify(payload)) {
        if (!canAction('/courses', 'edit')) throw new Error('You do not have permission to update this program.')
        await updateCourse(courseId.current, payload)
      }
    }
    else {
      if (!canAction('/courses', 'create')) throw new Error('You do not have permission to create this program.')
      attemptedCourse.current = true
      const response = await createCourse(payload)
      const result = response?.data?.data ?? response?.data ?? response
      courseId.current = entityId(result, 'course')
      if (!courseId.current) {
        const saved = records(await getCourses()).find(row => belongsToCollege(row, collegeId) && codeOf(row, 'course') === payload.courseCode)
        courseId.current = entityId(saved, 'course')
      }
      if (!courseId.current) throw new Error('Program submitted, but its saved ID is unavailable. Retry to verify it without creating another program.')
    }
    savedProgramPayload.current = JSON.stringify(payload)
    assertScope()
  }
  const addBranch = () => {
    if (!branch.name.trim() || !branch.code.trim() || !branch.status) return setError('Enter a branch name, code and status.')
    const code = branch.code.trim().toUpperCase()
    if (branches.some(row => row.code === code && row.key !== editingBranch)) return setError('That branch code is already in this program.')
    if (editingBranch) setBranches(rows => rows.map(row => row.key === editingBranch ? { ...row, ...branch, code, name: branch.name.trim(), departmentId: branch.departmentId || departmentId } : row))
    else setBranches(rows => [...rows, { ...branch, key: code, code, name: branch.name.trim(), departmentId: branch.departmentId || departmentId, terms: semesterStructure(program).map(term => ({ ...term, academicYearId: '', startDate: '', endDate: '', status: '0' })) }])
    setEditingBranch(null)
    setBranch({ name: '', code: '', departmentId, status: '' }); setError('')
  }
  const persistBranches = async () => {
    if (branch.name.trim() || branch.code.trim()) throw new Error('Add the entered branch to the list before continuing.')
    if (!branches.length) throw new Error('Add at least one branch.')
    for (const item of branches) {
      assertScope()
      const latest = records(await getBranches())
      const matching = latest.find(row => String(row.courseId) === String(courseId.current) && codeOf(row, 'branch') === item.code)
      let id = branchIds.current.get(item.key)
      if (!id && matching) {
        if (!attemptedBranches.current.has(item.key)) throw new Error(item.code + ': this branch already exists.')
        id = entityId(matching, 'branch'); branchIds.current.set(item.key, id)
      }
      const payload = { courseId: Number(courseId.current), departmentId: Number(item.departmentId), branchName: item.name, branchCode: item.code,
        duration: Number(program.durationYears), totalSemesters: Number(program.totalSemesters), status: item.status === 'Active' ? 1 : 0, specialization: null }
      if (id) {
        if (savedBranchPayloads.current.get(item.key) !== JSON.stringify(payload)) {
          if (!canAction('/branches', 'edit')) throw new Error('You do not have permission to update branches.')
          await updateBranch(id, payload)
        }
      } else {
        if (!canAction('/branches', 'create')) throw new Error('You do not have permission to create branches.')
        attemptedBranches.current.add(item.key)
        const response = await createBranch(payload)
        id = entityId(response?.data?.data ?? response?.data ?? response, 'branch')
        if (!id) id = entityId(records(await getBranches()).find(row => String(row.courseId) === String(courseId.current) && codeOf(row, 'branch') === item.code), 'branch')
        if (!id) throw new Error(item.code + ': saved branch ID could not be verified. Retry to check it.')
        branchIds.current.set(item.key, id)
      }
      savedBranchPayloads.current.set(item.key, JSON.stringify(payload))
      setBranches(rows => rows.map(row => row.key === item.key ? { ...row, id } : row))
    }
    assertScope()
  }
  const scheduleError = async () => {
    const rows = records(await getSemesters())
    const validation = validateSemesterSchedules(mappedBranches, years, rows)
    if (validation) throw new Error(validation)
  }
  const next = () => run(async () => {
    if (step === 0) validateProgram()
    if (step === 1) await saveProgram()
    if (step === 2) { await saveProgram(); await persistBranches() }
    if (step === 3) await scheduleError()
    if (step === 4) {
      await scheduleError()
      await saveSemesterSchedules({ courseId: courseId.current, branches: mappedBranches, list: getSemesters, assertScope,
        create: payload => { if (!canAction('/semester-management', 'create')) throw new Error('Semester creation is not permitted.'); return createSemester(payload) },
        update: (id, payload) => { if (!canAction('/semester-management', 'edit')) throw new Error('Semester updates are not permitted.'); return updateSemester(id, payload) },
        confirmOverwrite: () => window.confirm('Replace the dates of this saved semester schedule?') })
      assertScope(); await onComplete(); return
    }
    go(step + 1)
  })
  const field = (label, value, change, options = {}) => <label>{label}<input {...options} value={value} onChange={event => change(event.target.value)} /></label>
  const select = (label, value, change, children) => <label>{label}<select value={value} onChange={event => change(event.target.value)}><option value="">Select {label.toLowerCase()}</option>{children}</select></label>
  const departmentOptions = departments.map(row => <option key={entityId(row, 'department')} value={entityId(row, 'department')}>{nameOf(row, 'department')}</option>)
  const updateTerm = (key, number, changes) => setBranches(rows => rows.map(row => row.key === key ? { ...row, terms: row.terms.map(term => term.semesterNumber === number ? { ...term, ...changes } : term) } : row))
  return <>
    <ViewDialog title="Add Program" subtitle="Configure the program, departments, branches and semester dates." className="program-creation-dialog" maxWidth="940px" showExport={false} busy={busy} bodyRef={body}
      onClose={() => { if (!busy && (!courseId.current || window.confirm('Leave this setup? Saved program and branch records will remain available in Programs.'))) onClose() }}
      footerContent={<><span>Step {step + 1} of 5</span><div className="shared-view-dialog__footer-actions"><button className="erp-btn erp-btn--secondary" disabled={busy || step === 0} onClick={() => go(step - 1)}>Back</button><button className="erp-btn erp-btn--primary" disabled={busy} onClick={next}>{busy ? 'Saving…' : step === 4 ? 'Submit Program' : 'Save & Continue'}</button></div></>}>
      <ol className="program-creation-steps" aria-label="Program setup steps">{steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
      {error && <p role="alert" className="program-creation-error">{error}</p>}
      <fieldset disabled={busy} className="program-creation-fields">
      <legend>{steps[step]}</legend>
      {step === 0 && <div className="program-creation-grid">
        <label>Program Name<select value={programChoice} disabled={branches.length > 0 || Boolean(courseId.current) && !existingChoice} onChange={event => {
          const choice = event.target.value; setProgramChoice(choice)
          if (choice === 'new' || !choice) { courseId.current = null; setProgram({ name: '', code: '', durationYears: '', totalSemesters: '', type: '', status: '' }); setDepartmentId(''); return }
          const saved = courses.find(row => String(entityId(row, 'course')) === choice)
          courseId.current = entityId(saved, 'course')
          setProgram({ name: nameOf(saved, 'course'), code: codeOf(saved, 'course'), durationYears: saved.durationYears ?? saved.duration ?? '', totalSemesters: saved.totalSemesters ?? '', type: saved.courseType ?? '', status: saved.status === true || ['1', 'active'].includes(String(saved.status).toLowerCase()) ? 'Active' : 'Inactive' })
          setDepartmentId(String(saved.departmentId || ''))
        }}><option value="">Select program</option><option value="new">+ Create New Program</option>{courses.filter(row => belongsToCollege(row, collegeId)).map(row => <option key={entityId(row, 'course')} value={entityId(row, 'course')}>{nameOf(row, 'course')} ({codeOf(row, 'course')})</option>)}</select></label>
        {programChoice === 'new' && field('New Program Name', program.name, name => setProgram({ ...program, name }))}
        {field('Program Code', program.code, code => setProgram({ ...program, code }), { disabled: Boolean(existingChoice) })}
        {field('Duration in Years', program.durationYears, durationYears => setProgram({ ...program, durationYears }), { type: 'number', min: 1, disabled: Boolean(existingChoice) || branches.length > 0 })}
        {field('Total Semesters', program.totalSemesters, totalSemesters => setProgram({ ...program, totalSemesters }), { type: 'number', min: 1, max: 100, disabled: Boolean(existingChoice) || branches.length > 0 })}
        {existingChoice ? <>{field('Academic Level', program.type, () => {}, { readOnly: true })}{field('Status', program.status, () => {}, { readOnly: true })}</> : <>
          {select('Academic Level', program.type, type => setProgram({ ...program, type }), <><option value="Undergraduate">Undergraduate (UG)</option><option value="Postgraduate">Postgraduate (PG)</option><option value="Diploma">Diploma</option><option value="Doctorate">Doctorate</option></>)}
          {select('Status', program.status, status => setProgram({ ...program, status }), <><option>Active</option><option>Inactive</option></>)}
        </>}
      </div>}
      {step === 1 && <><div className="program-creation-grid">{select('Department', departmentId, value => { if (value === '__new') setAddingDepartment(true); else setDepartmentId(value) }, <>{departmentOptions}{canAction('/department-management', 'create') && <option value="__new">+ Add New Department</option>}</>)}</div>
        {departmentId && <p>Head / In-Charge: {departments.find(row => String(entityId(row, 'department')) === String(departmentId))?.hodName || departments.find(row => String(entityId(row, 'department')) === String(departmentId))?.hod || 'Not assigned'}</p>}</>}
      {step === 2 && <><div className="program-creation-grid">
        {field('Branch Name', branch.name, name => setBranch({ ...branch, name }))}{field('Branch Code', branch.code, code => setBranch({ ...branch, code }))}
        {select('Branch Department', branch.departmentId || departmentId, value => setBranch({ ...branch, departmentId: value }), departmentOptions)}
        {select('Branch Status', branch.status, status => setBranch({ ...branch, status }), <><option>Active</option><option>Inactive</option></>)}
        {field('Branch Duration (Years)', program.durationYears, () => {}, { readOnly: true })}
        {field('Branch Semester Count', program.totalSemesters, () => {}, { readOnly: true })}
      </div><p>{program.durationYears} years · {program.totalSemesters} semesters per branch</p><button type="button" className="erp-btn erp-btn--secondary" onClick={addBranch}>{editingBranch ? 'Save Branch' : 'Add Branch'}</button>
      <ul className="program-creation-branches">{branches.map(row => <li key={row.key}><strong>{row.name} ({row.code})</strong><span>{nameOf(departments.find(dept => String(entityId(dept, 'department')) === String(row.departmentId)) || {}, 'department')} · {row.status}{row.id ? ' · Saved' : ''}</span><button type="button" className="erp-btn erp-btn--secondary" onClick={() => { setEditingBranch(row.key); setBranch({ name: row.name, code: row.code, departmentId: row.departmentId, status: row.status }) }}>Edit</button>{!row.id && <button type="button" className="erp-btn erp-btn--secondary" onClick={() => setBranches(rows => rows.filter(item => item.key !== row.key))}>Remove</button>}</li>)}</ul></>}
      {(step === 3 || step === 4) && <>
        {step === 4 && <p><strong>{program.name} ({program.code})</strong> · {program.type} · {program.durationYears} years · {program.status}. Department: {nameOf(departments.find(row => String(entityId(row, 'department')) === String(departmentId)) || {}, 'department')}</p>}
        {step === 3 && <p className="program-creation-note">Enter dates from your academic calendar. Leave both dates blank to schedule later. Automatic date generation requires calendar scheduling rules that the current API does not supply.</p>}
        {mappedBranches.map(row => <section className="program-creation-schedule" key={row.key}><h3>{row.name} · {row.code}</h3>
          {step === 4 && <p>{nameOf(departments.find(dept => String(entityId(dept, 'department')) === String(row.departmentId)) || {}, 'department')} · {row.status} · {row.terms.length} semesters · Head: {(() => { const dept = departments.find(dept => String(entityId(dept, 'department')) === String(row.departmentId)); return dept?.hodName || dept?.hod || (dept?.hodUserId ? 'User #' + dept.hodUserId : 'Not assigned') })()}</p>}
          {row.terms.map(term => <div key={term.semesterNumber} className="program-creation-term">
            {step === 3 ? <>
              {field('Semester ' + term.semesterNumber, term.semesterName, semesterName => updateTerm(row.key, term.semesterNumber, { semesterName }))}
              {field('Start Date', term.startDate, startDate => updateTerm(row.key, term.semesterNumber, { startDate }), { type: 'date' })}
              {field('End Date', term.endDate, endDate => updateTerm(row.key, term.semesterNumber, { endDate }), { type: 'date' })}
              {field('Status', term.startDate && term.endDate && term.startDate < term.endDate ? deriveLifecycleStatus(term) : 'Schedule Not Configured', () => {}, { readOnly: true })}
            </> : <><strong>{term.semesterName}</strong><span>{term.startDate || '—'} → {term.endDate || '—'}</span><span>{term.startDate && term.endDate && term.startDate < term.endDate ? deriveLifecycleStatus(term) : 'Schedule Not Configured'}</span></>}
          </div>)}
        </section>)}
      </>}
      </fieldset>
    </ViewDialog>
    {addingDepartment && <DepartmentManagement inlineCreate onDismiss={() => setAddingDepartment(false)} onCreated={id => {
      // Close only the child dialog. Parent program/branch state stays mounted.
      if (id) setDepartmentId(String(id))
      setAddingDepartment(false)
      run(async () => { const rows = records(await getDepartments()).filter(row => belongsToCollege(row, collegeId)); assertScope(); setDepartments(rows); if (!id) throw new Error('Department saved. Select it from the refreshed list.') })
    }} />}
  </>
}
