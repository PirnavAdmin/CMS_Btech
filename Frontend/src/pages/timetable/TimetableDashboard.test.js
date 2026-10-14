import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { subjectRequirements, roomOptions, planningErrors, suitableRoom } from '../../utils/timetablePlanner.js'
import { same, conflictsFor } from '../../utils/timetableUtils.js'
import { academicLevel, scopeSections } from '../../services/timetable/timetableDomain.js'
const source = await readFile(new URL('./TimetableDashboard.jsx', import.meta.url), 'utf8')
const functions = source.slice(source.indexOf('function contextFor'), source.indexOf('export default function'))
const readiness = Function('subjectRequirements','roomOptions','planningErrors','suitableRoom','same','conflictsFor','academicLevel','scopeSections',functions + '; return readiness')(subjectRequirements,roomOptions,planningErrors,suitableRoom,same,conflictsFor,academicLevel,scopeSections)
const scope = {academicYearId:'1',departmentId:'2',courseId:'3',branchId:'4',semesterId:'5',sectionId:'6'}
const section={...scope,id:'6',name:'Section A',room:'Room 1'}
const sources={years:[{id:'1',startDate:'2026-01-01',endDate:'2026-12-31'}],departments:[{id:'2'}],courses:[{id:'3',departmentId:'2'}],branches:[{id:'4',courseId:'3',departmentId:'2'}],semesters:[{id:'5',semesterNumber:1,startDate:'2026-09-01',endDate:'2026-12-15'}],sections:[section],subjects:[{...scope,id:'7',name:'DBMS'}],faculty:[{id:'8',name:'Faculty A'}],allocations:[{...scope,subjectId:'7',facultyId:'8',periodsPerWeek:2}]}
const table={planning:{calendar:{startDate:'2026-09-01',endDate:'2026-12-15',workingDays:['MONDAY','TUESDAY'],reviewed:true,holidays:[]},periods:[{id:'p1',startTime:'09:00',endTime:'10:00',type:'class'},{id:'p2',startTime:'10:00',endTime:'11:00',type:'class'}],rooms:['text:room 1'],requirements:{}}}
test('readiness requires reviewed planning and real subject/faculty/room configuration',()=>{
 assert.equal(readiness(section,sources,[],table).ready,true)
 assert.equal(readiness(section,sources,[],null).ready,false)
 assert.equal(readiness(section,sources,[],{planning:{...table.planning,calendar:{...table.planning.calendar,reviewed:false}}}).ready,false)
 assert.equal(readiness(section,{...sources,allocations:[]},[],table).ready,false)
 assert.equal(readiness(section,{...sources,classrooms:[]},[],table).ready,false)
 assert.equal(readiness(section,sources,[],{planning:{...table.planning,periods:[]}}).ready,false)
})
test('saved frequency overrides are honored and conflicting entries require attention',()=>{
 const missing={...sources,allocations:[{...sources.allocations[0],periodsPerWeek:0}]}
 assert.equal(readiness(section,missing,[],table).ready,false)
 assert.equal(readiness(section,missing,[],{planning:{...table.planning,requirements:{7:{periodsPerWeek:2}}}}).ready,true)
 const entries=[{id:'a',sectionId:'6',facultyId:'8',classroom:'Room 1',dayOfWeek:'MONDAY',startTime:'09:00',endTime:'10:00'},{id:'b',sectionId:'99',facultyId:'8',classroom:'Other',dayOfWeek:'MONDAY',startTime:'09:00',endTime:'10:00'}]
 assert.equal(readiness(section,sources,entries,table).ready,false)
})
