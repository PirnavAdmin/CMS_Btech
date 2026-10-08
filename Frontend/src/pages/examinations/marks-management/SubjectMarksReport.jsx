import { useEffect, useMemo, useRef, useState } from 'react'
import { FiBookOpen, FiSearch } from 'react-icons/fi'
import DashboardLayout from '../../../layouts/DashboardLayout'
import PageHeader from '../../../components/PageHeader'
import MarksModuleNav from './MarksModuleNav'
import FilterPanel from '../../../components/FilterPanel'
import ExportMenu from '../../../components/ExportMenu'
import TablePagination from '../../../components/TablePagination'
import EmptyState from '../../../components/EmptyState'
import resultsService from '../../../services/resultsService'
import academicService from '../../../services/academicService'
import { getExamTypes } from '../../../services/examService'
import studentService from '../../../services/studentService'
import subjectService from '../../../services/subjectService'
import './SubjectMarksReport.css'

const PAGE_SIZE = 10
const clean = value => String(value ?? '').trim()
const norm = value => clean(value).toLowerCase()
const first = (...values) => values.find(value => value !== undefined && value !== null && clean(value) !== '')
const display = value => value && typeof value === 'object' ? first(value.name, value.label, value.title, value.value, value.semesterName, '') : value
const getId = student => clean(first(student?.studentId, student?.id))
const getName = student => clean(first(student?.fullName, student?.personal?.fullName, student?.studentName, student?.name, 'Student'))
const getReg = student => clean(first(student?.registrationNumber, student?.application?.registrationNumber, student?.academic?.registrationNumber, student?.academic?.rollNumber, student?.rollNumber, ''))
const keyFor = (code, name) => norm(first(code, name, 'unknown'))
const columns = [['studentName','Student Name'],['registrationNumber','Registration Number'],['academicYear','Academic Year'],['course','Course'],['branch','Branch'],['semester','Semester'],['section','Section'],['subjectCode','Subject Code'],['subjectName','Subject'],['examType','Exam Type'],['assessmentType','Assessment Type'],['examDate','Exam Date'],['maxInternal','Max Internal'],['internalMarks','Internal Marks'],['maxExternal','Max External'],['externalMarks','External Marks'],['maximumMarks','Maximum Marks'],['passingMarks','Passing Marks'],['totalMarks','Total Marks'],['grade','Grade'],['gradePoint','Grade Point'],['status','Result']].map(([key,label]) => ({ key, value:key, label }))

export default function SubjectMarksReport() {
  const [students,setStudents] = useState([]), [sheets,setSheets] = useState([]), [subjectCatalog,setSubjectCatalog] = useState([]), [lookupOptions,setLookupOptions] = useState({ academicYears: [], courses: [], branches: [], examTypes: [] }), [loading,setLoading] = useState(true), [loadError,setLoadError] = useState('')
  const [subject,setSubject] = useState(''), [subjectQuery,setSubjectQuery] = useState(''), [subjectOpen,setSubjectOpen] = useState(false), [query,setQuery] = useState(''), [year,setYear] = useState(''), [course,setCourse] = useState(''), [branch,setBranch] = useState(''), [semester,setSemester] = useState(''), [exam,setExam] = useState(''), [page,setPage] = useState(1)
  useEffect(() => { let active=true; Promise.allSettled([studentService.getAllProfiles(),resultsService.getResults(),subjectService.getSubjects({liveOnly:true}),subjectService.getSubjects()]).then(([studentsResult,sheetsResult,liveSubjects,localSubjects]) => { if(!active)return; if(studentsResult.status==='fulfilled')setStudents(Array.isArray(studentsResult.value)?studentsResult.value:[]); if(sheetsResult.status==='fulfilled')setSheets(Array.isArray(sheetsResult.value)?sheetsResult.value:[]); const catalogs=[liveSubjects,localSubjects].filter(item=>item.status==='fulfilled').flatMap(item=>Array.isArray(item.value)?item.value:[]); setSubjectCatalog(catalogs); const errors=[studentsResult,sheetsResult].filter(item=>item.status==='rejected'&&!/record not found/i.test(item.reason?.message||'')); if(errors.length)setLoadError(errors.map(item=>item.reason?.message).filter(Boolean).join(' ')||'Some marks data could not be loaded.'); setLoading(false) }); return()=>{active=false} },[])
  useEffect(() => {
    let active = true
    Promise.allSettled([
      academicService.getAcademicYears(false),
      academicService.getCourses({}, false),
      academicService.getBranches(null, false),
      Promise.resolve(getExamTypes()),
    ]).then(([years, courses, branches, exams]) => {
      if (!active) return
      setLookupOptions({
        academicYears: years.status === 'fulfilled' && Array.isArray(years.value) ? years.value : [],
        courses: courses.status === 'fulfilled' && Array.isArray(courses.value) ? courses.value : [],
        branches: branches.status === 'fulfilled' && Array.isArray(branches.value) ? branches.value : [],
        examTypes: exams.status === 'fulfilled' && Array.isArray(exams.value) ? exams.value : [],
      })
    })
    return () => { active = false }
  }, [])
  const studentMap = useMemo(() => { const map=new Map(); students.forEach(s=>[getId(s),getReg(s)].filter(Boolean).forEach(id=>map.set(norm(id),s))); return map },[students])
  const subjects = useMemo(() => { const map=new Map(); [...subjectCatalog,...sheets].forEach(s=>{const code=clean(first(s.subjectCode,s.code,'')), name=clean(first(s.subjectName,s.subject,s.name,s.label,'')), key=keyFor(code,name); if(key!=='unknown'&&!map.has(key))map.set(key,{key,code,name})}); return [...map.values()].sort((a,b)=>(a.name||a.code).localeCompare(b.name||b.code)) },[subjectCatalog,sheets])
  const selected=subjects.find(s=>s.key===subject)
  const subjectPicker=useRef(null)
  const subjectLabel=s=>[s.code,s.name].filter(Boolean).join(' · ')
  const visibleSubjects=subjects.filter(s=>!subjectQuery.trim()||subjectLabel(s).toLowerCase().includes(subjectQuery.trim().toLowerCase()))
  useEffect(()=>{if(!subjectOpen)return undefined;const dismiss=e=>{if(!subjectPicker.current?.contains(e.target))setSubjectOpen(false)};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss)},[subjectOpen])
  const rows=useMemo(()=>{if(!selected)return[];return sheets.flatMap((sheet,si)=>{const code=clean(first(sheet.subjectCode,sheet.code,'')),name=clean(first(sheet.subjectName,sheet.subject,''));if(keyFor(code,name)!==selected.key)return[];return(Array.isArray(sheet.records)?sheet.records:[]).map((record,ri)=>{const student=studentMap.get(norm(first(record.studentId,record.studentProfileId,record.profileId,record.registrationNumber,record.rollNumber,record.student?.studentId,record.student?.id,'')))||record.student||{};const internal=first(record.internalMarks,record.internal,record.internalScore,''),external=first(record.externalMarks,record.external,record.externalScore,''),total=first(record.totalMarks,record.marksObtained,record.obtainedMarks,internal!==''&&external!==''?Number(internal)+Number(external):'');const maxInternal=first(sheet.maxInternal,sheet.maximumInternalMarks,sheet.internalMaxMarks,record.maxInternal,''),maxExternal=first(sheet.maxExternal,sheet.maximumExternalMarks,sheet.externalMaxMarks,record.maxExternal,'');return{id:String(first(record.studentId,record.id,record.registrationNumber,si+'-'+ri))+'-'+si+'-'+ri,studentName:getName(student)!=='Student'?getName(student):first(record.studentName,record.name,record.student?.name,'Student'),registrationNumber:getReg(student)||first(record.registrationNumber,record.rollNumber,record.enrollmentNo,''),academicYear:display(first(sheet.academicYear,sheet.academicYearName,student.academic?.academicYear,'')),course:display(first(sheet.course,sheet.courseName,student.academic?.course,'')),branch:display(first(sheet.branch,sheet.branchName,student.academic?.branch,'')),semester:display(first(sheet.semester,sheet.semesterName,student.academic?.semester,'')),section:display(first(sheet.section,sheet.sectionName,student.academic?.section,'')),subjectCode:code,subjectName:name,examType:first(sheet.examType,sheet.examName,sheet.examinationName,record.examType,''),assessmentType:first(sheet.assessmentType,record.assessmentType,''),examDate:first(sheet.examDate,sheet.examinationDate,sheet.date,record.examDate,''),maxInternal,internalMarks:internal,maxExternal,externalMarks:external,maximumMarks:first(sheet.maximumMarks,sheet.maxMarks,record.maximumMarks,maxInternal!==''&&maxExternal!==''?Number(maxInternal)+Number(maxExternal):''),passingMarks:first(sheet.passingMarks,sheet.minimumPassingMarks,record.passingMarks,''),totalMarks:total,grade:first(record.grade,record.resultGrade,''),gradePoint:first(record.gradePoint,record.points,''),status:first(record.status,record.resultStatus,'')}})})},[sheets,selected,studentMap])
  const optionsFor = key => {
    if (key === 'semester') return Array.from({ length: 8 }, (_, index) => 'Semester ' + (index + 1))
    const values = rows.map(row => row[key])
    const add = value => { const label = clean(display(value)); if (label) values.push(label) }
    if (key === 'academicYear') {
      lookupOptions.academicYears.forEach(item => add(first(item.name, item.academicYearName, item.label, '')))
      students.forEach(student => add(first(student.academic?.academicYear, student.academicYear, '')))
      sheets.forEach(sheet => add(first(sheet.academicYear, sheet.academicYearName, '')))
    }
    if (key === 'course') {
      lookupOptions.courses.forEach(item => add(first(item.name, item.courseName, item.label, '')))
      students.forEach(student => add(first(student.academic?.course, student.academic?.courseName, student.course, '')))
      sheets.forEach(sheet => add(first(sheet.course, sheet.courseName, '')))
    }
    if (key === 'branch') {
      lookupOptions.branches.forEach(item => add(first(item.name, item.branchName, item.label, '')))
      students.forEach(student => add(first(student.academic?.branch, student.academic?.branchName, student.branch, '')))
      sheets.forEach(sheet => add(first(sheet.branch, sheet.branchName, '')))
    }
    if (key === 'examType') {
      lookupOptions.examTypes.forEach(item => add(first(item.name, item.examType, item.examTypeName, item.label, item, '')))
      sheets.forEach(sheet => {
      add(first(sheet.examType, sheet.examName, sheet.examinationName, ''))
      ;(Array.isArray(sheet.records) ? sheet.records : []).forEach(record => add(first(record.examType, record.assessmentType, '')))
      })
    }
    return [...new Set(values.map(value => clean(display(value))).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }
  const filtered=useMemo(()=>rows.filter(r=>{const q=query.trim().toLowerCase();return(!q||[r.studentName,r.registrationNumber,r.examType,r.assessmentType].join(' ').toLowerCase().includes(q))&&(!year||r.academicYear===year)&&(!course||r.course===course)&&(!branch||r.branch===branch)&&(!semester||clean(r.semester).toLowerCase().replace(/^semester\s*/,'')===semester.toLowerCase().replace(/^semester\s*/,''))&&(!exam||r.examType===exam)}),[rows,query,year,course,branch,semester,exam])
  const clear=()=>{setQuery('');setYear('');setCourse('');setBranch('');setSemester('');setExam('');setPage(1)}
  const numeric=filtered.map(r=>Number(r.totalMarks)).filter(Number.isFinite), avg=numeric.length?(numeric.reduce((a,b)=>a+b,0)/numeric.length).toFixed(1):'—', outcomes=filtered.map(r=>{const status=norm(r.status);if(status.includes('fail')||status.includes('not pass'))return false;if(status.includes('pass'))return true;const threshold=Number(r.passingMarks),marks=Number(r.totalMarks);return r.passingMarks!==''&&Number.isFinite(threshold)&&Number.isFinite(marks)?marks>=threshold:null}).filter(value=>value!==null), passed=outcomes.filter(Boolean).length, passRate=outcomes.length?Math.round(passed/outcomes.length*100)+'%':'—'
  const active=Boolean(query||year||course||branch||semester||exam), visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  return <DashboardLayout><section className="marks-management-subject-marks-report"><PageHeader title="Subject Marks Report" breadcrumb={[{label:'Marks Management',link:'/marks-management'},'Subject Marks Report']}/><MarksModuleNav/><article className="erp-card subject-marks-report-card"><header className="erp-card-header subject-marks-report-card__header"><div><h2 className="erp-card-title">Subject Marks Report</h2><p className="erp-card-subtitle">Review and export student performance for a subject across examinations.</p></div>{selected&&<span className="subject-marks-report-count">{filtered.length} {filtered.length===1?'record':'records'}</span>}</header>
  <div className="subject-marks-report-picker" ref={subjectPicker}><FiBookOpen aria-hidden="true"/><div className="subject-marks-report-subject-field"><label htmlFor="subject-marks-subject-search">Subject</label><div className="subject-marks-report-subject-search"><FiSearch aria-hidden="true"/><input id="subject-marks-subject-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded={subjectOpen} aria-controls="subject-marks-subject-options" placeholder={loading?'Loading subjects…':'Search or select a subject'} value={subjectOpen?subjectQuery:(selected?subjectLabel(selected):subjectQuery)} disabled={loading||!subjects.length} onFocus={()=>{setSubjectQuery('');setSubjectOpen(true)}} onClick={()=>{if(!subjectOpen){setSubjectQuery('');setSubjectOpen(true)}}} onChange={e=>{setSubjectQuery(e.target.value);setSubjectOpen(true)}} onKeyDown={e=>{if(e.key==='Escape')setSubjectOpen(false);if(e.key==='Enter'&&visibleSubjects.length){e.preventDefault();const choice=visibleSubjects[0];setSubject(choice.key);setSubjectQuery(subjectLabel(choice));setSubjectOpen(false);clear()}}}/></div>{subjectOpen&&<ul className="subject-marks-report-subject-options" id="subject-marks-subject-options" role="listbox" aria-label="Subjects">{visibleSubjects.length?visibleSubjects.map(s=><li key={s.key} role="option" aria-selected={s.key===subject}><button type="button" onClick={()=>{setSubject(s.key);setSubjectQuery(subjectLabel(s));setSubjectOpen(false);clear()}}>{s.code&&<strong>{s.code}</strong>}<span>{s.name||s.code}</span></button></li>):<li className="subject-marks-report-no-subjects">No subjects match this search.</li>}</ul>}</div></div>
  {selected&&<><div className="subject-marks-report-summary"><div><small>Subject</small><strong>{selected.name||selected.code}</strong></div><div><small>Students with marks</small><strong>{filtered.length}</strong></div><div><small>Average marks</small><strong>{avg}</strong></div><div><small>Pass rate</small><strong>{passRate}</strong></div></div>
  <FilterPanel active={active} onClear={clear} className="subject-marks-report-filters" actions={<ExportMenu rows={filtered} columns={columns} title="Subject Marks Report" filename={'subject-marks-'+(selected.code||selected.name||'report')} scope="All matching marks" allowEmpty/>}><div className="subject-marks-report-search-wrap"><label className="subject-marks-report-search"><FiSearch aria-hidden="true"/><input type="search" aria-label="Search subject marks" placeholder="Search student or exam" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label></div>
  <label className="subject-marks-report-filter"><span>Academic Year</span><select value={year} onChange={e=>{setYear(e.target.value);setPage(1)}}><option value="">All academic years</option>{optionsFor('academicYear').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Course</span><select value={course} onChange={e=>{setCourse(e.target.value);setPage(1)}}><option value="">All courses</option>{optionsFor('course').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Branch</span><select value={branch} onChange={e=>{setBranch(e.target.value);setPage(1)}}><option value="">All branches</option>{optionsFor('branch').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Semester</span><select value={semester} onChange={e=>{setSemester(e.target.value);setPage(1)}}><option value="">All semesters</option>{optionsFor('semester').map(v=><option key={v}>{v}</option>)}</select></label><label className="subject-marks-report-filter"><span>Exam Type</span><select value={exam} onChange={e=>{setExam(e.target.value);setPage(1)}}><option value="">All exam types</option>{optionsFor('examType').map(v=><option key={v}>{v}</option>)}</select></label></FilterPanel></>}
  {loadError&&<p className="subject-marks-report-error" role="alert">{loadError}</p>}{loading&&<p className="subject-marks-report-loading" role="status">Loading subjects and examination records...</p>}{!loading&&!selected&&!subjects.length&&<EmptyState title="No subject marks found" description="Published result sheets will appear here once they are available."/>}{selected&&!loading&&!filtered.length&&<EmptyState title={active?'No matching marks':'No examination marks found'} description={active?'Adjust or clear the filters to see more records.':'There are no published marks records for this subject yet.'}/>}
  {selected&&!loading&&filtered.length>0&&<div className="subject-marks-report-table-wrap"><table className="erp-table subject-marks-report-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.id}>{columns.map(c=><td key={c.key}>{clean(row[c.key])||'—'}</td>)}</tr>)}</tbody></table></div>}{selected&&filtered.length>PAGE_SIZE&&<TablePagination currentPage={page} totalPages={Math.ceil(filtered.length/PAGE_SIZE)} onPageChange={setPage}/>}</article></section></DashboardLayout>
}
