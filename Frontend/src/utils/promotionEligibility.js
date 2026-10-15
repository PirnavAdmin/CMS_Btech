export const semester = value => Number(String(value || '').match(/\d+/)?.[0]) || 0
export const targetSemester = value => semester(value) === 8 ? 'Degree Completion Review' : semester(value) ? `Semester ${semester(value) + 1}` : 'Not available'
export const requiredCgpa = value => semester(value) === 1 ? 3 : semester(value) === 2 ? 3.5 : 4
export const evaluate = student => {
  if (student.promotionStatus === 'Promoted') return { status:'promoted',label:'Already Promoted',tone:'success',reason:'This student has already been promoted for the current academic mapping.' }
  if (semester(student.currentSemester) === 8) return { status:'degree',label:'Eligible for Degree Completion Review',tone:'success',reason:'Final semester requires degree-completion review, not promotion.' }
  if (!student.resultsAvailable || student.cgpa == null || student.creditsEarned == null) return { status:'pending',label:'Pending Academic Review',tone:'warning',reason:'Semester results or academic credits are unavailable.' }
  if (student.prerequisiteIssues.length) return { status:'ineligible',label:'Not Eligible',tone:'danger',reason:'A target-semester prerequisite has not been cleared.' }
  if (student.cgpa < requiredCgpa(student.currentSemester)) return { status:'ineligible',label:'Not Eligible',tone:'danger',reason:`CGPA ${student.cgpa.toFixed(2)} is below the required ${requiredCgpa(student.currentSemester).toFixed(2)}.` }
  if (student.failedSubjects.length) return { status:'pending',label:'Pending Academic Review',tone:'warning',reason:'Backlogs require an institution-specific academic decision.' }
  return { status:'eligible',label:'Eligible',tone:'success',reason:'Eligible for promotion. Academic requirements are satisfied.' }
}
export const backlogAction = item => item.courseType === 'CORE' ? 'Repeat Required' : 'Equivalent/Similar Elective may be permitted'
