import { portalService } from './serviceProvider.js'
export const adminService = Object.fromEntries(['getSnapshot', 'createUser', 'updateUser', 'assignRole', 'updateUserStatus', 'resetPassword', 'assignFaculty', 'removeAssignment', 'loadSamples'].map(method => [method, (...args) => portalService()[method](...args)]))
