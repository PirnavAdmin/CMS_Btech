import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { TimetableWorkspace, ScheduleDialog, FacultyTimetable } from '../pages/timetable/TimetableManagement'
const scope={academicYearId:'1',courseId:'2',branchId:'3',semesterId:'4',sectionId:'5'}
const sources={years:[{id:'1',name:'2026'}],courses:[{id:'2',name:'B.Tech'}],branches:[{id:'3',name:'CSE'}],semesters:[{id:'4',name:'Semester 1'}],sections:[{...scope,id:'5',name:'Section A',room:'Room 1'}],subjects:[{...scope,id:'6',name:'Programming',subjectName:'Programming',subjectCode:'CS101',subjectType:'Theory',lectureHours:1}],faculty:[{id:'7',name:'Faculty One'}],allocations:[{...scope,subjectId:'6',facultyId:'7',periodsPerWeek:1}],rooms:[]}
const planning={calendar:{startDate:'2026-09-01',endDate:'2026-12-15',workingDays:['MONDAY'],reviewed:true,holidays:[]},periods:[{id:'p1',name:'Period 1',startTime:'09:00',endTime:'10:00',type:'class'}],rooms:['text:room 1'],requirements:{}}
const entry={...scope,id:'21',timetableId:'11',subjectId:'6',facultyId:'7',dayOfWeek:'MONDAY',startTime:'09:00',endTime:'10:00',classroom:'Room 1',entryType:'Theory'}
const table={...scope,id:'11',name:'Engineering Schedule',publicationStatus:'draft',revision:1,entries:[entry],planning}
afterEach(cleanup)
function workspace(props={}){return render(<TimetableWorkspace table={table} tables={[table]} sources={sources} entries={[entry]} section={vi.fn()} faculty={vi.fn()} generate={vi.fn()} regenerate={vi.fn()} save={vi.fn()} remove={vi.fn()} validate={vi.fn(async()=>[])} publish={vi.fn(async()=>true)} reopen={vi.fn()} {...props}/>)}
test('publication requires validation of the current revision and explicit confirmation',async()=>{
 const publish=vi.fn(async()=>true);workspace({publish});expect(screen.getByRole('button',{name:'Publish',exact:true}).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Validate',exact:true}));await screen.findByRole('dialog',{name:'Validation result'});fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Close details'}));expect(screen.getByRole('button',{name:'Publish',exact:true}).disabled).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Publish',exact:true}));expect(publish).not.toHaveBeenCalled();fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirm Publish Timetable'}));await waitFor(()=>expect(publish).toHaveBeenCalledWith([table]))
})
test('blocking validation keeps publication unavailable',async()=>{
 workspace({validate:vi.fn(async()=>[{sectionId:'5',reason:'Faculty conflict',blocking:true}])});fireEvent.click(screen.getByRole('button',{name:'Validate',exact:true}));await screen.findByText('VALIDATION FAILED',{selector:'h3'});expect(screen.getByRole('button',{name:'Publish',exact:true}).disabled).toBe(true)
})
test('published schedules preserve history with read-only entry details',()=>{
 render(<ScheduleDialog initial={entry} table={{...table,publicationStatus:'published'}} sources={sources} entries={[entry]} save={vi.fn()} remove={vi.fn()} close={vi.fn()} readOnly/>);expect(screen.getByRole('dialog',{name:'Schedule details'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Save Draft Entry'})).toBeNull();expect(screen.queryByRole('button',{name:'Remove class'})).toBeNull()
})
test('schedule API failure preserves entry fields for corrected retry',async()=>{
 const save=vi.fn().mockRejectedValueOnce(new Error('Entry save denied')).mockResolvedValue({}),close=vi.fn();render(<ScheduleDialog initial={entry} table={table} sources={sources} entries={[entry]} save={save} remove={vi.fn()} close={close}/>);fireEvent.submit(screen.getByRole('button',{name:'Save Draft Entry'}).closest('form'));await screen.findByText('Entry save denied');expect(close).not.toHaveBeenCalled();fireEvent.submit(screen.getByRole('button',{name:'Save Draft Entry'}).closest('form'));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));expect(close).toHaveBeenCalledTimes(1)
})

test('schedule removal requires confirmation and retains the backend entry ID',async()=>{
 const remove=vi.fn(async()=>({})),close=vi.fn();render(<ScheduleDialog initial={entry} table={table} sources={sources} entries={[entry]} save={vi.fn()} remove={remove} close={close}/>);fireEvent.click(screen.getByRole('button',{name:'Remove class'}));expect(remove).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm removal'}));await waitFor(()=>expect(remove).toHaveBeenCalledWith('21'));expect(close).toHaveBeenCalledTimes(1)
})
test('faculty overlap blocks a draft entry and never invokes save',()=>{
 const save=vi.fn(),occupied={...entry,id:'22',timetableId:'12',sectionId:'99'};render(<ScheduleDialog initial={entry} table={table} sources={sources} entries={[entry,occupied]} save={save} remove={vi.fn()} close={vi.fn()}/>);expect(screen.getByRole('button',{name:'Save Draft Entry'}).disabled).toBe(true);fireEvent.submit(screen.getByRole('button',{name:'Save Draft Entry'}).closest('form'));expect(save).not.toHaveBeenCalled()
})
test('changing timetable revision invalidates an earlier successful publication review',async()=>{
 const view=workspace();fireEvent.click(screen.getByRole('button',{name:'Validate',exact:true}));await screen.findByRole('dialog');fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Close details'}));expect(screen.getByRole('button',{name:'Publish',exact:true}).disabled).toBe(false);const changed={...table,revision:2};view.rerender(<TimetableWorkspace table={changed} tables={[changed]} sources={sources} entries={[entry]} section={vi.fn()} faculty={vi.fn()} generate={vi.fn()} regenerate={vi.fn()} save={vi.fn()} remove={vi.fn()} validate={vi.fn()} publish={vi.fn()} reopen={vi.fn()}/>);expect(screen.getByRole('button',{name:'Publish',exact:true}).disabled).toBe(true)
})

test('faculty schedule only displays published entries for the chosen date and faculty',()=>{
 const published={...table,publicationStatus:'published'};const row={...entry,publicationStatus:'published',status:'Active',subjectName:'Programming',facultyName:'Faculty One'};const inspect=vi.fn();render(<FacultyTimetable facultyId="7" sources={{...sources,departments:[]}} tables={[published]} entries={[row,{...row,id:'22',facultyId:'99'}]} inspect={inspect}/>);fireEvent.change(screen.getByLabelText('Schedule date'),{target:{value:'2026-09-07'}});fireEvent.click(screen.getByRole('button',{name:/09:00.*Programming/}));expect(inspect).toHaveBeenCalledWith(expect.objectContaining({id:'21'}));fireEvent.change(screen.getByLabelText('Schedule date'),{target:{value:'2026-09-08'}});expect(screen.getByText(/No published classes/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Week',exact:true}));expect(screen.getByRole('table')).toBeTruthy()
})
