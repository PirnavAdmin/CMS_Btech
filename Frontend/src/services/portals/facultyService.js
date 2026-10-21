import { portalService } from './serviceProvider.js'
export const facultyService = Object.fromEntries(['getSnapshot', 'submitAttendance', 'submitMarks', 'addMaterial', 'removeMaterial', 'requestLeave', 'cancelLeave', 'markNotificationRead', 'updateProfile'].map(method => [method, (...args) => portalService()[method](...args)]))
facultyService.getAssignedStudents = async () => (await facultyService.getSnapshot()).students
facultyService.getSubjects = async () => (await facultyService.getSnapshot()).subjects
