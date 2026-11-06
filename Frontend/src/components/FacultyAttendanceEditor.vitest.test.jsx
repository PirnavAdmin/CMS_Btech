import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { FacultyAttendanceEditor } from '../pages/faculty/FacultyManagement'
const record={id:21,status:'Not Marked',date:'2026-11-05',faculty:{id:9,fullName:'Faculty One',employeeId:'EMP000009',collegeId:7,department:'Engineering'}}
afterEach(cleanup)
test('attendance editor uses native dialog and requires actual check-in/out values',()=>{
 const save=vi.fn();render(<FacultyAttendanceEditor record={record} onClose={()=>{}} onSave={save} onReset={()=>{}}/>);const dialog=screen.getByRole('dialog',{name:'Mark Faculty Attendance'});fireEvent.submit(within(dialog).getByRole('button',{name:'Save Attendance'}).closest('form'));expect(screen.getByText('Check In is required for this attendance status.')).toBeTruthy();expect(save).not.toHaveBeenCalled();expect(screen.queryByDisplayValue('09:00')).toBeNull()
})
test('busy attendance editor prevents Escape close and repeated writes',()=>{
 const save=vi.fn(),close=vi.fn();render(<FacultyAttendanceEditor busy record={record} onClose={close} onSave={save} onReset={()=>{}}/>);const dialog=screen.getByRole('dialog');fireEvent(dialog,new Event('cancel',{cancelable:true}));expect(close).not.toHaveBeenCalled();expect(within(dialog).getByRole('button',{name:'Save Attendance'}).closest('fieldset').disabled).toBe(true);fireEvent.submit(within(dialog).getByRole('button',{name:'Save Attendance'}).closest('form'));expect(save).not.toHaveBeenCalled()
})
test('attendance dialog cancellation preserves records without a write',()=>{
 const close=vi.fn(),save=vi.fn();render(<FacultyAttendanceEditor record={record} onClose={close} onSave={save} onReset={()=>{}}/>);fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));expect(close).toHaveBeenCalledTimes(1);expect(save).not.toHaveBeenCalled()
})
