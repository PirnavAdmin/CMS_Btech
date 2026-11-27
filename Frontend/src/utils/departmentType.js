export const COURSE_DEPARTMENT = 'COURSE'
export const NON_COURSE_DEPARTMENT = 'NON_COURSE'

export const departmentTypeOf = row => row?.departmentType ?? row?.DepartmentType ?? COURSE_DEPARTMENT
export const isCourseDepartment = row => departmentTypeOf(row) === COURSE_DEPARTMENT

export const departmentTypeLabels = {
  [COURSE_DEPARTMENT]: 'Course Departments',
  [NON_COURSE_DEPARTMENT]: 'Non-Course Departments',
}

