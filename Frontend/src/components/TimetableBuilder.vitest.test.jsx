import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TimetableBuilder } from '../pages/timetable/TimetableManagement'
vi.mock('../components/SearchableSelect',()=>({default:({label,value,options=[],onChange,disabled})=><select aria-label={label} disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}><option value="">Select</option>{options.map(row=><option key={row.id??row.value} value={row.id??row.value}>{row.name??row.label}</option>)}</select>}))
const scope={academicYearId:'1',courseId:'2',departmentId:'8',branchId:'3',level:'1',semesterId:'4',sectionId:'5'}
const sources={years:[{id:'1',name:'2026',startDate:'2026-01-01',endDate:'2026-12-31'}],courses:[{id:'2',name:'B.Tech',departmentId:'8'}],departments:[{id:'8',name:'Engineering'}],branches:[{id:'3',name:'CSE',courseId:'2',departmentId:'8'}],semesters:[{id:'4',name:'Semester 1',academicYearId:'1',courseId:'2',branchId:'3',semesterNumber:1}],sections:[{...scope,id:'5',name:'Section A',room:'Room 1'}],subjects:[{...scope,id:'6',name:'Programming',subjectType:'Theory'}],faculty:[{id:'7',name:'Faculty One'}],allocations:[{...scope,id:'9',subjectId:'6',facultyId:'7',periodsPerWeek:1}],rooms:[]}
afterEach(cleanup)
async function setup(generate=vi.fn(async()=>true), records=sources){render(<TimetableBuilder defaultAcademicYearId="1" sources={records} entries={[]} tables={[]} busy={false} enabled refresh={vi.fn()} faculty={vi.fn()} generate={generate} saveSetup={vi.fn()} save={vi.fn()} remove={vi.fn()} validate={vi.fn()} publish={vi.fn()} reopen={vi.fn()}/>);for(const [label,value]of[['Course','2'],['Department','8'],['Branch','3'],['Academic Level','1'],['Semester','4']])fireEvent.change(screen.getByLabelText(label),{target:{value}});fireEvent.click(screen.getByRole('button',{name:'Continue',exact:true}));return generate}
test('builder creates a timetable only after academic selection and valid period dates',async()=>{
 const generate=await setup();expect(screen.getByRole('button',{name:'Continue to Subjects'}).disabled).toBe(false);fireEvent.click(screen.getByRole('button',{name:'Continue to Subjects'}));fireEvent.click(screen.getByRole('button',{name:'Generate Timetable'}));await waitFor(()=>expect(generate).toHaveBeenCalledWith(expect.objectContaining({scope:expect.objectContaining({courseId:'2',departmentId:'8',branchId:'3',semesterId:'4'}),selected:['5'],replace:false})))
})
test('builder rejects a reversed timetable date range without generation',async()=>{
 const generate=await setup(undefined,{...sources,years:[{...sources.years[0],startDate:'2026-12-15',endDate:'2026-09-01'}]});expect(screen.getByRole('button',{name:'Continue to Subjects'}).disabled).toBe(true);expect(generate).not.toHaveBeenCalled()
})
test('practical subjects require two consecutive periods', async () => {
  await setup(undefined, {
    ...sources,
    subjects: [...sources.subjects, { ...scope, id: '10', name: 'Programming Lab', subjectType: 'Practical' }],
  })
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Subjects' }))
  const lab = screen.getByLabelText('Consecutive periods for Programming Lab')
  expect(lab.value).toBe('2')
  expect(lab.disabled).toBe(true)
  expect(screen.getByLabelText('Consecutive periods for Programming').value).toBe('1')
})
test('editing saved period settings retains the defaults displayed by the form', () => {
  render(<TimetableBuilder sources={sources} entries={[]} tables={[]} busy={false} enabled
    initial={{ ...scope, configure: true, planning: {
      periods: [], rooms: ['text:room 1'], requirements: {},
      calendar: { startDate: '2026-01-01', endDate: '2026-12-31', workingDays: ['MONDAY'], holidays: [], reviewed: true },
    } }}
  />)
  fireEvent.change(screen.getByLabelText('Periods Per Day'), { target: { value: '6' } })
  fireEvent.change(screen.getByLabelText('Period Duration (minutes)'), { target: { value: '60' } })
  fireEvent.change(screen.getByLabelText(/Lunch \(minutes/), { target: { value: '60' } })
  expect(screen.getByLabelText('College Start Time').value).toBe('09:00')
  expect(screen.getByRole('button', { name: 'Continue to Subjects' }).disabled).toBe(false)
})
