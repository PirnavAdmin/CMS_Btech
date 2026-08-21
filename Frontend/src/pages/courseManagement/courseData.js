const COURSES_KEY = 'btech-courses'
const BRANCHES_KEY = 'btech-branches'
const STRUCTURE_KEY = 'btech-course-structures'

const seedCourses = [{ id: 'course-btech', code: 'BTECH', name: 'Bachelor of Technology', shortName: 'B.Tech', type: 'Undergraduate', department: 'School of Engineering', durationValue: 4, durationUnit: 'Years', semesters: 8, academicSystem: 'Semester', qualification: 'Bachelor of Technology', description: 'Undergraduate engineering programme.', eligibility: '10+2 with Physics, Chemistry and Mathematics', status: 'Active', createdAt: '2026-01-10', updatedAt: '2026-01-10' }]
const seedBranches = [
  { id: 'branch-cse', courseId: 'course-btech', code: 'CSE', name: 'Computer Science and Engineering', shortName: 'CSE', department: 'Department of Technology', type: 'Core', durationValue: 4, durationUnit: 'Years', semesters: 8, intake: 60, academicYear: '2026-27', description: 'Computing and software engineering.', status: 'Active', createdAt: '2026-01-10', updatedAt: '2026-01-10' },
  { id: 'branch-ece', courseId: 'course-btech', code: 'ECE', name: 'Electronics and Communication Engineering', shortName: 'ECE', department: 'Department of Technology', type: 'Core', durationValue: 4, durationUnit: 'Years', semesters: 8, intake: 60, academicYear: '2026-27', description: 'Electronics and communication systems.', status: 'Active', createdAt: '2026-01-10', updatedAt: '2026-01-10' },
]

const read = (key, fallback) => { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : fallback }
const write = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); return value }
export const courseApi = {
  getCourses: () => Promise.resolve(read(COURSES_KEY, seedCourses)),
  getBranches: () => Promise.resolve(read(BRANCHES_KEY, seedBranches)),
  getStructures: () => Promise.resolve(read(STRUCTURE_KEY, {})),
  saveCourse: async (course) => { const rows = await courseApi.getCourses(); const now = new Date().toISOString().slice(0, 10); const saved = { ...course, id: course.id || crypto.randomUUID(), createdAt: course.createdAt || now, updatedAt: now }; write(COURSES_KEY, course.id ? rows.map((row) => row.id === course.id ? saved : row) : [...rows, saved]); return saved },
  saveBranch: async (branch) => { const rows = await courseApi.getBranches(); const now = new Date().toISOString().slice(0, 10); const saved = { ...branch, id: branch.id || crypto.randomUUID(), createdAt: branch.createdAt || now, updatedAt: now }; write(BRANCHES_KEY, branch.id ? rows.map((row) => row.id === branch.id ? saved : row) : [...rows, saved]); return saved },
  saveStructures: (value) => Promise.resolve(write(STRUCTURE_KEY, value)),
}
export const departments = ['School of Engineering', 'Department of Technology']
export const academicYears = ['2025-26', '2026-27', '2027-28']
