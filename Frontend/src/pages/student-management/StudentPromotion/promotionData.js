export const PROMOTION_STATE_KEY = 'college_student_promotion_state'
export const PROMOTION_HISTORY_KEY = 'college_student_promotion_history'
const failed = (courseCode, courseName, courseType) => ({ courseCode, courseName, courseType, credits: 4, grade: 'F' })
const subjects = failures => [...Array.from({ length: 5 }, (_, i) => ({ courseCode: `BT${101 + i}`, courseName: `Semester Subject ${i + 1}`, courseType: i === 4 ? 'ELECTIVE' : 'CORE', credits: 4, grade: 'B' })), ...failures]
export const mockStudents = [
  ['BT2026001','Aarav Sharma','CSE-26-001','CSE','Semester 2',7.2,22,[],[]],
  ['BT2026002','Diya Patel','CSE-26-002','CSE','Semester 2',6.1,18,[failed('CS201','Data Structures','CORE')],[]],
  ['BT2026003','Kabir Singh','ECE-26-003','ECE','Semester 3',3.8,20,[],[]],
  ['BT2026004','Meera Nair','CSE-26-004','CSE','Semester 4',7,24,[],['CS201 – Data Structures']],
  ['BT2026005','Riya Verma','EEE-26-005','EEE','Semester 1',null,null,[],[],false],
  ['BT2026006','Ishaan Rao','CSE-25-006','CSE','Semester 3',7.4,25,[],[],true,'Promoted'],
  ['BT2026007','Ananya Gupta','ME-23-007','Mechanical Engineering','Semester 8',7.1,162,[],[],true,'Degree Review'],
].map(([studentId,name,rollNumber,branch,currentSemester,cgpa,creditsEarned,failedSubjects,prerequisiteIssues,resultsAvailable=true,promotionStatus]) => ({ studentId,name,rollNumber,registrationNumber:`REG${studentId.slice(2)}`,admissionNumber:`ADM${studentId.slice(2)}`,email:`${name.split(' ')[0].toLowerCase()}@example.edu`,mobile:'9876543210',department:'Engineering',course:'B.Tech',branch,section:'A',academicYear:'2026-27',currentSemester,cgpa,sgpa:cgpa && cgpa + .2,creditsEarned,subjects:resultsAvailable ? subjects(failedSubjects) : null,failedSubjects,prerequisiteIssues,resultsAvailable,promotionStatus }))
export const mockHistory = [{ id:'PR-2025-001',studentId:'BT2026007',studentName:'Ananya Gupta',rollNumber:'ME-23-007',fromSemester:'Semester 2',toSemester:'Semester 3',academicYear:'2024-25',cgpa:7.1,creditsEarned:44,promotionDate:'2025-06-01T10:00:00.000Z',promotedBy:'Current Admin',mode:'Bulk',status:'Successful' }]
