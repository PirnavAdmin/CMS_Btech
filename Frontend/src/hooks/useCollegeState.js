import { useMemo, useState } from 'react'
import { useAcademic } from '../context/AcademicContext'
export default function useCollegeState(initial = [], related) {
  const [rows, setRows] = useState(initial)
  const { scopeRecords } = useAcademic()
  const { faculty, students, subjects, groups } = related || {}
  const visible = useMemo(() => scopeRecords(rows, { faculty: faculty || [], students: students || [], subjects: subjects || [], groups: groups || [] }), [rows, scopeRecords, faculty, students, subjects, groups])
  return [visible, setRows]
}
