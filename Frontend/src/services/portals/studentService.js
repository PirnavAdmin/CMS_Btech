import { portalService } from './serviceProvider.js'
export const studentService = Object.fromEntries(['getSnapshot', 'markNotificationRead', 'updateProfile'].map(method => [method, (...args) => portalService()[method](...args)]))
studentService.getAttendance = async () => (await studentService.getSnapshot()).attendance
studentService.getResults = async () => (await studentService.getSnapshot()).results
