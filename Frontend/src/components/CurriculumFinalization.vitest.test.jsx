import {afterEach,beforeEach,test,expect,vi} from 'vitest'
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import {WeeklyRequirement} from '../pages/timetable/TimetableManagement'
import {updateWeeklyRequirement} from '../services/timetable/timetableWorkflowService'
vi.mock('../services/timetable/timetableWorkflowService',async original=>({...await original(),updateWeeklyRequirement:vi.fn()}))
vi.mock('../utils/toast',()=>({showToast:vi.fn()}))
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();updateWeeklyRequirement.mockResolvedValue({})})
const allocation={id:'41',facultyId:'7',sectionId:'5',periodsPerWeek:2}
test('weekly requirement acknowledgement survives refresh failure without repeating the write',async()=>{
 const refresh=vi.fn().mockRejectedValueOnce(Error('Refresh offline')).mockResolvedValue()
 render(<WeeklyRequirement allocation={allocation} refresh={refresh}/>);fireEvent.change(screen.getByRole('spinbutton'),{target:{value:'3'}});fireEvent.submit(screen.getByRole('button',{name:'Save'}).closest('form'));await screen.findByText('Refresh offline');expect(screen.getByRole('spinbutton').disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Retry requirement refresh'}));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));expect(updateWeeklyRequirement).toHaveBeenCalledTimes(1);expect(updateWeeklyRequirement).toHaveBeenCalledWith(allocation,'3')
})
test('weekly requirement failures preserve input and allow corrected retry',async()=>{
 updateWeeklyRequirement.mockRejectedValueOnce(Error('Write denied')).mockResolvedValue({});render(<WeeklyRequirement allocation={allocation} refresh={vi.fn()}/>);fireEvent.change(screen.getByRole('spinbutton'),{target:{value:'4'}});fireEvent.submit(screen.getByRole('button').closest('form'));await screen.findByText('Write denied');expect(screen.getByRole('spinbutton').value).toBe('4');fireEvent.submit(screen.getByRole('button').closest('form'));await waitFor(()=>expect(updateWeeklyRequirement).toHaveBeenCalledTimes(2))
})
test('weekly requirement readonly and invalid values cannot write',()=>{
 const view=render(<WeeklyRequirement allocation={allocation} refresh={vi.fn()} disabled/>);fireEvent.submit(screen.getByRole('button').closest('form'));expect(updateWeeklyRequirement).not.toHaveBeenCalled();view.rerender(<WeeklyRequirement allocation={allocation} refresh={vi.fn()}/>);fireEvent.change(screen.getByRole('spinbutton'),{target:{value:'1.5'}});fireEvent.submit(screen.getByRole('button').closest('form'));expect(screen.getByRole('alert').textContent).toContain('positive whole');expect(updateWeeklyRequirement).not.toHaveBeenCalled()
})
