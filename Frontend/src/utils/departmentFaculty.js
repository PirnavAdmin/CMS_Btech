import { createCollegeScope } from './collegeScope.js'

// Department names can be repeated across colleges; resolve ownership by IDs.
export const facultyForCollege = (faculty, collegeId, departments = []) =>
  createCollegeScope(collegeId, { departments })(faculty)
