// Examination records, timetable and invigilation schedule
export const examsList = [
  {
    id: 'exam-1',
    name: 'Mid-Semester Examination 2026',
    type: 'Internal Assessment',
    startDate: '2026-11-10',
    endDate: '2026-11-18',
    status: 'Scheduled',
    academicYear: '2026–2027',
    semester: 'Semester III & V',
  },
  {
    id: 'exam-2',
    name: 'End-Semester Theory Examinations (Regular)',
    type: 'Semester Final',
    startDate: '2026-12-15',
    endDate: '2026-12-30',
    status: 'Draft',
    academicYear: '2026–2027',
    semester: 'All Semesters',
  },
]

export const examSchedule = [
  {
    id: 'sch-1',
    examId: 'exam-1',
    date: '2026-11-10',
    time: '10:00 AM - 12:00 PM',
    subjectCode: 'CS301',
    subjectName: 'Data Structures & Algorithms',
    semester: 'Semester III',
    department: 'CSE',
    room: 'LH-201, LH-202, LH-203',
    invigilator: 'Dr. Ananya Rao & Prof. Kiran Patel',
  },
  {
    id: 'sch-2',
    examId: 'exam-1',
    date: '2026-11-12',
    time: '10:00 AM - 12:00 PM',
    subjectCode: 'CS302',
    subjectName: 'Database Management Systems',
    semester: 'Semester III',
    department: 'CSE',
    room: 'LH-201, LH-202',
    invigilator: 'Prof. S. R. Joshi & Dr. Deepa Sharma',
  },
  {
    id: 'sch-3',
    examId: 'exam-1',
    date: '2026-11-16',
    time: '02:00 PM - 04:00 PM',
    subjectCode: 'CS501',
    subjectName: 'Web Technologies & Cloud Computing',
    semester: 'Semester V',
    department: 'CSE',
    room: 'LH-305, LH-306',
    invigilator: 'Dr. Ananya Rao & Prof. P. V. Raman',
  },
]

export const invigilationDuties = [
  {
    id: 'inv-1',
    examName: 'Mid-Semester Examination 2026',
    date: '2026-11-10',
    session: 'Morning (10:00 AM - 12:00 PM)',
    hallNumber: 'LH-201 Ramanujan Hall',
    course: 'B.Tech CSE Sem 3',
    subject: 'CS301 - Data Structures & Algorithms',
    totalStudents: 32,
    coInvigilator: 'Prof. Kiran Patel (ECE Dept)',
    reportingTime: '09:30 AM',
    status: 'Confirmed',
  },
  {
    id: 'inv-2',
    examName: 'Mid-Semester Examination 2026',
    date: '2026-11-16',
    session: 'Afternoon (02:00 PM - 04:00 PM)',
    hallNumber: 'LH-305 APJ Kalam Block',
    course: 'B.Tech CSE Sem 5',
    subject: 'CS501 - Web Technologies & Cloud Computing',
    totalStudents: 30,
    coInvigilator: 'Prof. P. V. Raman (IT Dept)',
    reportingTime: '01:30 PM',
    status: 'Confirmed',
  },
]

export const examRules = [
  'Faculty invigilators must report to the Examination Control Office 30 minutes before commencement.',
  'Verify student identity using official College Photo ID cards and Hall Tickets.',
  'Strict prohibition on electronic gadgets, smart watches, and unauthorized material inside exam halls.',
  'Attendance sheets must be signed by each candidate and verified with answer booklet barcodes.',
  'All sealed answer scripts must be deposited in the Examination Strong Room immediately post session.',
]
