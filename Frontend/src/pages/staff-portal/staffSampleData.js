export const STAFF_USER = {
  id: 'NTS-2022-048',
  name: 'sirisha',
  fullName: 'Sirisha K.',
  role: 'Non-Teaching Staff',
  designation: 'Lab Assistant',
  department: 'Chemistry Lab',
  shift: 'Morning shift (08:30 AM – 04:30 PM)',
  employmentType: 'Full Time · Permanent',
  joiningDate: '12-Jul-2022',
  reportingOfficer: 'Dr. K. V. Raman (HOD, Chemistry)',
  qualification: 'B.Sc. Chemistry, Diploma in Lab Safety',
  mobile: '9876543210',
  email: 'sirisha.staff@pirnav.edu',
  address: 'Flat 402, Sai Residency, Srinagar Colony, Hyderabad, Telangana - 500073',
  emergencyContactName: 'K. Venkatesh (Spouse)',
  emergencyContactNumber: '9848012345',
}

export const STAFF_PROFILE = {
  // Top card / Hero
  initials: (STAFF_USER.name || 'S').trim().charAt(0).toUpperCase(),
  name: 'sirisha',
  fullName: 'Sirisha K.',
  role: 'Non-Teaching Staff',
  designation: 'Lab Assistant',
  department: 'Chemistry Lab',
  shift: 'Morning shift (08:30 AM – 04:30 PM)',
  status: 'Active',

  // Read-only Employment details (Employee ID matches 2022 joining year)
  employeeId: 'NTS-2022-048',
  employmentType: 'Full Time · Permanent',
  joiningDate: '12-Jul-2022',
  reportingOfficer: 'Dr. K. V. Raman (HOD, Chemistry)',
  qualification: 'B.Sc. Chemistry, Diploma in Lab Safety',

  // Editable Contact information
  mobile: '9876543210',
  email: 'sirisha.staff@pirnav.edu',
  currentAddress: 'Flat 402, Sai Residency, Srinagar Colony, Hyderabad, Telangana - 500073',
  permanentAddress: 'H.No 3-45/A, Main Road, Kovvur, West Godavari, Andhra Pradesh - 534350',
  sameAsCurrent: false,
  emergencyContactName: 'K. Venkatesh',
  emergencyContactRelationship: 'Spouse',
  emergencyContactNumber: '9848012345',

  // Documents summary
  documents: [
    {
      id: 'DOC-01',
      name: 'ID Proof (Aadhaar / College ID)',
      type: 'National Identity Proof',
      fileSize: '1.4 MB',
      uploadDate: '15-Jul-2022',
      status: 'Verified',
    },
    {
      id: 'DOC-02',
      name: 'Appointment Letter & Service Order',
      type: 'Official Employment Contract',
      fileSize: '2.1 MB',
      uploadDate: '12-Jul-2022',
      status: 'Verified',
    },
    {
      id: 'DOC-03',
      name: 'Qualification Certificate & Lab Safety Diploma',
      type: 'Academic Credentials',
      fileSize: '3.8 MB',
      uploadDate: '10-Jul-2022',
      status: 'Verified',
    },
  ],
}

/* ==========================================================================
   Screen 3: Attendance Sample Data (2 Months: Oct 2026 & Sep 2026)
   October 2026 has: 19 Present, 1 Late, 1 Absent, 1 Leave.
   ========================================================================== */

export const MONTHLY_ATTENDANCE_DATA = {
  '2026-10': {
    monthKey: '2026-10',
    monthLabel: 'October 2026',
    year: 2026,
    monthIndex: 9, // 0-based for October
    totalDays: 31,
    firstDayOfWeek: 4, // 2026-10-01 is Thursday (0=Sun, 1=Mon... 4=Thu)
    counts: {
      present: 19,
      late: 1,
      absent: 1,
      leave: 1,
      holiday: 2,
      weeklyOff: 4,
    },
    records: [
      { date: '2026-10-01', day: 'Thursday', dayNum: 1, checkIn: '08:25 AM', checkOut: '04:35 PM', hours: '8h 10m', status: 'Present', remarks: 'Regular morning shift completed in Chemistry Lab 102' },
      { date: '2026-10-02', day: 'Friday', dayNum: 2, checkIn: '—', checkOut: '—', hours: '—', status: 'Holiday', remarks: 'National Holiday (Mahatma Gandhi Jayanti)' },
      { date: '2026-10-03', day: 'Saturday', dayNum: 3, checkIn: '08:28 AM', checkOut: '04:30 PM', hours: '8h 02m', status: 'Present', remarks: 'Weekend practical session assistance' },
      { date: '2026-10-04', day: 'Sunday', dayNum: 4, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-10-05', day: 'Monday', dayNum: 5, checkIn: '08:26 AM', checkOut: '04:32 PM', hours: '8h 06m', status: 'Present', remarks: 'Equipment setup & acid dilution session' },
      { date: '2026-10-06', day: 'Tuesday', dayNum: 6, checkIn: '08:29 AM', checkOut: '04:31 PM', hours: '8h 02m', status: 'Present', remarks: 'Organic chemistry lab preparation' },
      { date: '2026-10-07', day: 'Wednesday', dayNum: 7, checkIn: '08:22 AM', checkOut: '04:34 PM', hours: '8h 12m', status: 'Present', remarks: 'Lab inventory check' },
      { date: '2026-10-08', day: 'Thursday', dayNum: 8, checkIn: '—', checkOut: '—', hours: '0h', status: 'Absent', remarks: 'Unplanned absence / Biometric punching unrecorded' },
      { date: '2026-10-09', day: 'Friday', dayNum: 9, checkIn: '08:27 AM', checkOut: '04:33 PM', hours: '8h 06m', status: 'Present', remarks: 'Weekly chemical waste disposal logging' },
      { date: '2026-10-10', day: 'Saturday', dayNum: 10, checkIn: '08:30 AM', checkOut: '04:30 PM', hours: '8h 00m', status: 'Present', remarks: 'Glassware sterilization and inventory' },
      { date: '2026-10-11', day: 'Sunday', dayNum: 11, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-10-12', day: 'Monday', dayNum: 12, checkIn: '08:24 AM', checkOut: '04:35 PM', hours: '8h 11m', status: 'Present', remarks: 'Physical chemistry equipment calibration' },
      { date: '2026-10-13', day: 'Tuesday', dayNum: 13, checkIn: '08:28 AM', checkOut: '04:30 PM', hours: '8h 02m', status: 'Present', remarks: 'Student practical demonstration assistance' },
      { date: '2026-10-14', day: 'Wednesday', dayNum: 14, checkIn: '08:52 AM', checkOut: '04:35 PM', hours: '7h 43m', status: 'Late', remarks: 'Delayed by 22 mins · Campus transit bus delay · Approved by HOD' },
      { date: '2026-10-15', day: 'Thursday', dayNum: 15, checkIn: '08:26 AM', checkOut: '04:36 PM', hours: '8h 10m', status: 'Present', remarks: 'Reagent stock replenishment' },
      { date: '2026-10-16', day: 'Friday', dayNum: 16, checkIn: '08:29 AM', checkOut: '04:32 PM', hours: '8h 03m', status: 'Present', remarks: 'Regular shift completed' },
      { date: '2026-10-17', day: 'Saturday', dayNum: 17, checkIn: '08:25 AM', checkOut: '04:30 PM', hours: '8h 05m', status: 'Present', remarks: 'Weekend stock audit' },
      { date: '2026-10-18', day: 'Sunday', dayNum: 18, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-10-19', day: 'Monday', dayNum: 19, checkIn: '—', checkOut: '—', hours: '0h', status: 'Leave', remarks: 'Casual Leave (Family emergency) · Approved by Registrar' },
      { date: '2026-10-20', day: 'Tuesday', dayNum: 20, checkIn: '—', checkOut: '—', hours: '—', status: 'Holiday', remarks: 'Institutional Holiday (Dussehra / Vijayadashami)' },
      { date: '2026-10-21', day: 'Wednesday', dayNum: 21, checkIn: '08:26 AM', checkOut: '04:35 PM', hours: '8h 09m', status: 'Present', remarks: 'Post-holiday lab sanitation and startup' },
      { date: '2026-10-22', day: 'Thursday', dayNum: 22, checkIn: '08:24 AM', checkOut: '04:33 PM', hours: '8h 09m', status: 'Present', remarks: 'Spectrophotometer maintenance assistance' },
      { date: '2026-10-23', day: 'Friday', dayNum: 23, checkIn: '08:27 AM', checkOut: '04:34 PM', hours: '8h 07m', status: 'Present', remarks: 'Practical exam preparation' },
      { date: '2026-10-24', day: 'Saturday', dayNum: 24, checkIn: '08:29 AM', checkOut: '04:31 PM', hours: '8h 02m', status: 'Present', remarks: 'Weekend shift duties' },
      { date: '2026-10-25', day: 'Sunday', dayNum: 25, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-10-26', day: 'Monday', dayNum: 26, checkIn: '08:25 AM', checkOut: '04:35 PM', hours: '8h 10m', status: 'Present', remarks: 'Analytical balance calibration' },
      { date: '2026-10-27', day: 'Tuesday', dayNum: 27, checkIn: '08:28 AM', checkOut: '04:32 PM', hours: '8h 04m', status: 'Present', remarks: "Today's shift completed · Biometric verified" },
    ],
  },

  '2026-09': {
    monthKey: '2026-09',
    monthLabel: 'September 2026',
    year: 2026,
    monthIndex: 8, // 0-based for September
    totalDays: 30,
    firstDayOfWeek: 2, // 2026-09-01 is Tuesday (2=Tue)
    counts: {
      present: 22,
      late: 0,
      absent: 0,
      leave: 1,
      holiday: 3,
      weeklyOff: 4,
    },
    records: [
      { date: '2026-09-01', day: 'Tuesday', dayNum: 1, checkIn: '08:26 AM', checkOut: '04:30 PM', hours: '8h 04m', status: 'Present', remarks: 'Monthly lab stock audit' },
      { date: '2026-09-02', day: 'Wednesday', dayNum: 2, checkIn: '08:28 AM', checkOut: '04:32 PM', hours: '8h 04m', status: 'Present', remarks: 'Chemical reagent setup' },
      { date: '2026-09-03', day: 'Thursday', dayNum: 3, checkIn: '08:24 AM', checkOut: '04:31 PM', hours: '8h 07m', status: 'Present', remarks: 'Glassware inspection' },
      { date: '2026-09-04', day: 'Friday', dayNum: 4, checkIn: '08:25 AM', checkOut: '04:35 PM', hours: '8h 10m', status: 'Present', remarks: 'Practical lab support' },
      { date: '2026-09-05', day: 'Saturday', dayNum: 5, checkIn: '—', checkOut: '—', hours: '—', status: 'Holiday', remarks: 'Campus Event Holiday (Teachers Day Celebrations)' },
      { date: '2026-09-06', day: 'Sunday', dayNum: 6, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-09-07', day: 'Monday', dayNum: 7, checkIn: '08:27 AM', checkOut: '04:33 PM', hours: '8h 06m', status: 'Present', remarks: 'Acid storage review' },
      { date: '2026-09-08', day: 'Tuesday', dayNum: 8, checkIn: '08:23 AM', checkOut: '04:30 PM', hours: '8h 07m', status: 'Present', remarks: 'Organic lab prep' },
      { date: '2026-09-09', day: 'Wednesday', dayNum: 9, checkIn: '08:29 AM', checkOut: '04:34 PM', hours: '8h 05m', status: 'Present', remarks: 'Safety protocol checks' },
      { date: '2026-09-10', day: 'Thursday', dayNum: 10, checkIn: '08:26 AM', checkOut: '04:30 PM', hours: '8h 04m', status: 'Present', remarks: 'Equipment inspection' },
      { date: '2026-09-11', day: 'Friday', dayNum: 11, checkIn: '—', checkOut: '—', hours: '0h', status: 'Leave', remarks: 'Sick Leave (Medical consultation) · Approved' },
      { date: '2026-09-12', day: 'Saturday', dayNum: 12, checkIn: '08:28 AM', checkOut: '04:30 PM', hours: '8h 02m', status: 'Present', remarks: 'Weekend stock log' },
      { date: '2026-09-13', day: 'Sunday', dayNum: 13, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-09-14', day: 'Monday', dayNum: 14, checkIn: '08:25 AM', checkOut: '04:32 PM', hours: '8h 07m', status: 'Present', remarks: 'Biometric verified' },
      { date: '2026-09-15', day: 'Tuesday', dayNum: 15, checkIn: '08:27 AM', checkOut: '04:35 PM', hours: '8h 08m', status: 'Present', remarks: 'Chemical dilution assistance' },
      { date: '2026-09-16', day: 'Wednesday', dayNum: 16, checkIn: '—', checkOut: '—', hours: '—', status: 'Holiday', remarks: 'Public Holiday (Milad-un-Nabi)' },
      { date: '2026-09-17', day: 'Thursday', dayNum: 17, checkIn: '—', checkOut: '—', hours: '—', status: 'Holiday', remarks: 'State Holiday (Ganesh Nimajjanam)' },
      { date: '2026-09-18', day: 'Friday', dayNum: 18, checkIn: '08:24 AM', checkOut: '04:30 PM', hours: '8h 06m', status: 'Present', remarks: 'Lab sanitation completed' },
      { date: '2026-09-19', day: 'Saturday', dayNum: 19, checkIn: '08:30 AM', checkOut: '04:30 PM', hours: '8h 00m', status: 'Present', remarks: 'Weekend shift' },
      { date: '2026-09-20', day: 'Sunday', dayNum: 20, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-09-21', day: 'Monday', dayNum: 21, checkIn: '08:26 AM', checkOut: '04:33 PM', hours: '8h 07m', status: 'Present', remarks: 'Practical exam assistance' },
      { date: '2026-09-22', day: 'Tuesday', dayNum: 22, checkIn: '08:29 AM', checkOut: '04:31 PM', hours: '8h 02m', status: 'Present', remarks: 'Instrument calibration' },
      { date: '2026-09-23', day: 'Wednesday', dayNum: 23, checkIn: '08:25 AM', checkOut: '04:35 PM', hours: '8h 10m', status: 'Present', remarks: 'Regular duty' },
      { date: '2026-09-24', day: 'Thursday', dayNum: 24, checkIn: '08:27 AM', checkOut: '04:32 PM', hours: '8h 05m', status: 'Present', remarks: 'Store inventory update' },
      { date: '2026-09-25', day: 'Friday', dayNum: 25, checkIn: '08:23 AM', checkOut: '04:30 PM', hours: '8h 07m', status: 'Present', remarks: 'Lab safety drill prep' },
      { date: '2026-09-26', day: 'Saturday', dayNum: 26, checkIn: '08:28 AM', checkOut: '04:30 PM', hours: '8h 02m', status: 'Present', remarks: 'Weekend supervision' },
      { date: '2026-09-27', day: 'Sunday', dayNum: 27, checkIn: '—', checkOut: '—', hours: '—', status: 'Weekly off', remarks: 'Sunday Institutional Off' },
      { date: '2026-09-28', day: 'Monday', dayNum: 28, checkIn: '08:25 AM', checkOut: '04:34 PM', hours: '8h 09m', status: 'Present', remarks: 'Regular shift' },
      { date: '2026-09-29', day: 'Tuesday', dayNum: 29, checkIn: '08:26 AM', checkOut: '04:31 PM', hours: '8h 05m', status: 'Present', remarks: 'Chemical logging' },
      { date: '2026-09-30', day: 'Wednesday', dayNum: 30, checkIn: '08:24 AM', checkOut: '04:35 PM', hours: '8h 11m', status: 'Present', remarks: 'Monthly register closing' },
    ],
  },
}

// Compute percentage dynamically from counts
export function computeAttendanceStats(counts) {
  const present = counts?.present || 0
  const late = counts?.late || 0
  const absent = counts?.absent || 0
  const leave = counts?.leave || 0
  const totalWorkingDays = present + late + absent + leave

  // Under Digital Campus attendance rules, present + late are attended sessions
  const attended = present + late
  const percentage = totalWorkingDays > 0 ? ((attended / totalWorkingDays) * 100).toFixed(1) + '%' : '0.0%'
  const subtext = `${present} Present · ${late} Late · ${absent} Absent · ${leave} Leave`
  return { totalWorkingDays, attended, percentage, subtext, present, late, absent, leave }
}

// Ensure the Dashboard uses October 2026 counts (19 Present, 1 Late, 1 Absent, 1 Leave)
export function getDashboardMetrics() {
  const currentMonthData = MONTHLY_ATTENDANCE_DATA['2026-10']
  const attendance = computeAttendanceStats(currentMonthData.counts)

  return [
    {
      key: 'duties',
      title: "Today's Duties",
      value: '3',
      unit: 'Scheduled',
      subtext: '2 Completed · 1 In progress',
      icon: 'FiClock',
      tone: 'blue',
      link: '/staff-portal/duty-roster',
    },
    {
      key: 'tasks',
      title: 'Pending Tasks',
      value: '4',
      unit: 'Tasks',
      subtext: '2 High priority · 2 Normal',
      icon: 'FiCheckCircle',
      tone: 'orange',
      link: '/staff-portal/tasks',
    },
    {
      key: 'leave',
      title: 'Leave Balance',
      value: '14',
      unit: 'Days left',
      subtext: 'Casual: 6 · Sick: 5 · Earned: 3',
      icon: 'FiCalendar',
      tone: 'teal',
      link: '/staff-portal/leave',
    },
    {
      key: 'attendance',
      title: "This Month's Attendance",
      value: attendance.percentage,
      unit: 'Present',
      subtext: `${attendance.present} Present · ${attendance.late} Late · ${attendance.absent} Absent · ${attendance.leave} Leave`,
      icon: 'FiUserCheck',
      tone: 'green',
      link: '/staff-portal/my-attendance',
    },
  ]
}

export const DASHBOARD_METRICS = getDashboardMetrics()

export const TODAY_DUTIES = [
  {
    id: 'DUTY-01',
    time: '08:30 AM – 10:30 AM',
    title: 'Chemistry Lab 1 Preparation & Reagent Setup',
    room: 'Chemistry Lab 102 (Science Block)',
    inCharge: 'Dr. K. V. Raman',
    status: 'Completed',
    tag: 'Lab Prep',
  },
  {
    id: 'DUTY-02',
    time: '11:00 AM – 01:30 PM',
    title: 'Practical Session Assistance - Organic Synthesis',
    room: 'Chemistry Lab 102 · Section B',
    inCharge: 'Prof. S. Meenakshi',
    status: 'In Progress',
    tag: 'Class Assistance',
  },
  {
    id: 'DUTY-03',
    time: '02:30 PM – 04:00 PM',
    title: 'Stock Audit & Chemical Waste Disposal Log',
    room: 'Central Chemical Store (Basement B-04)',
    inCharge: 'Store Superintendent',
    status: 'Upcoming',
    tag: 'Inventory',
  },
]

export const RECENT_NOTICES = [
  {
    id: 'NOT-101',
    title: 'Annual Campus Fire & Chemical Safety Drill Exercise',
    date: 'Today, 09:15 AM',
    department: 'Campus Safety Cell',
    priority: 'High',
    preview: 'Mandatory participation for all non-teaching lab technical personnel this Friday at 3:00 PM in Central Quadrangle.',
  },
  {
    id: 'NOT-102',
    title: 'Biometric Attendance Punch-in Device Firmware Update',
    date: 'Yesterday, 04:30 PM',
    department: 'IT & Infrastructure',
    priority: 'Normal',
    preview: 'Morning grace period will be extended by 10 minutes throughout this week due to terminal upgrade testing.',
  },
  {
    id: 'NOT-103',
    title: 'Staff Health Screening Camp & Mediclaim Renewal',
    date: '25 Oct 2026',
    department: 'Staff Welfare Committee',
    priority: 'Info',
    preview: 'Free health camp for non-teaching staff scheduled for Nov 2-3 at the campus health centre. Register at HR.',
  },
]

export const UPCOMING_MEETINGS = [
  {
    id: 'EVT-201',
    title: 'Non-Teaching Staff Monthly Operations Review',
    day: '28',
    month: 'OCT',
    time: '10:00 AM – 11:30 AM',
    room: 'Conference Room B (Admin Block)',
    organizer: 'Registrar Office',
    type: 'Meeting',
  },
  {
    id: 'EVT-202',
    title: 'Hazardous Material Handling & First-Aid Workshop',
    day: '30',
    month: 'OCT',
    time: '02:00 PM – 04:30 PM',
    room: 'Science Seminar Hall 2',
    organizer: 'Lab Safety Committee',
    type: 'Training',
  },
  {
    id: 'EVT-203',
    title: 'Annual Sports Meet Staff Volunteer Coordination',
    day: '04',
    month: 'NOV',
    time: '03:30 PM – 04:30 PM',
    room: 'Indoor Sports Complex Board Room',
    organizer: 'Physical Education Dept',
    type: 'Event',
  },
]
