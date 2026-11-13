import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizedCollegeIds, canSelectCollege, hasModuleAction, validateEffectiveAccess } from './collegeAuthorization.js'
import { canViewScreen, requiredActionForScreen } from './screenPermissions.js'

test('only backend-confirmed Super Admin has platform college scope', () => {
 assert.deepEqual(authorizedCollegeIds({ role: 'admin', primaryCollegeId: 7 }), ['7'])
 assert.equal(authorizedCollegeIds({ isSuperAdmin: true }), null)
 assert.equal(canSelectCollege({ isSuperAdmin: true }, '99'), true)
 assert.equal(canSelectCollege({ isSuperAdmin: true }, 'invalid'), false)
 assert.equal(canSelectCollege(null, '7'), false)
})
test('college accounts remain at their authoritative primary college', () => {
 const account = { primaryCollegeId: 7, mappedCollegeIds: [8, '8', 9, 0], isCollegeAdmin: true }
 assert.deepEqual(authorizedCollegeIds(account), ['7'])
 assert.equal(canSelectCollege(account, '8'), false)
 assert.equal(canSelectCollege(account, '10'), false)
 assert.deepEqual(authorizedCollegeIds({ ...account, isCollegeAdmin: false }), ['7'])
 assert.deepEqual(authorizedCollegeIds({ primaryCollegeId: null, collegeId: null }, '7'), [])
})
test('view and action grants remain separate; false strings and absent mappings deny', () => {
 const access = { permissions: { fees: { view: true, create: false, edit: true } } }
 assert.equal(hasModuleAction(access, 'fees'), true)
 assert.equal(hasModuleAction(access, 'fees', 'create'), false)
 assert.equal(hasModuleAction(access, 'fees', 'edit'), true)
 assert.equal(hasModuleAction({ permissions: { fees: { view: 'true' } } }, 'fees'), false)
 assert.equal(hasModuleAction({ isSuperAdmin: true }, null), false)
 assert.equal(hasModuleAction({ isSuperAdmin: true }, 'fees', 'unknown'), false)
})
test('college access validation rejects mismatches and malformed effective matrices', () => {
 assert.throws(() => validateEffectiveAccess({ collegeId: 8, permissions: {} }, '7'), /another college/)
 for (const input of [null, [], {}, { permissions: [] }]) assert.throws(() => validateEffectiveAccess(input))
 assert.deepEqual(validateEffectiveAccess({ collegeId: 7, permissions: {} }, '7'), { collegeId: 7, permissions: {} })
})
test('shared screen policy uses registry ownership and never a normalized admin blanket grant', () => {
 assert.equal(canViewScreen('/fees/structures', 'admin', {}), false)
 assert.equal(canViewScreen('/fees/structures', 'admin', { fees: { view: true } }), true)
 assert.equal(canViewScreen('/fees/structures', 'admin', {}, { isSuperAdmin: true }), true)
 assert.equal(canViewScreen('/unknown', 'admin', {}, { isSuperAdmin: true }), false)
 assert.equal(canViewScreen('/user-access', 'admin', { roles_permissions: { view: true } }), true)
 assert.equal(canViewScreen('/rooms/3', 'admin', { rooms: { view: true } }), true)
 assert.equal(canViewScreen('/my-profile', 'admin', {}), true)
})
test('obvious create/edit deep links use existing action permissions without changing URLs', () => {
 assert.equal(requiredActionForScreen('/courses/add'), 'create')
 assert.equal(requiredActionForScreen('/faculty/new?category=Teaching'), 'create')
 assert.equal(requiredActionForScreen('/courses/7/edit'), 'edit')
 assert.equal(requiredActionForScreen('/marks-management/edit-marks'), 'edit')
 assert.equal(requiredActionForScreen('/fees/structures/7/view'), 'view')
})

test('college creation and onboarding deep links require server-confirmed platform access',()=>{ const permissions={colleges:{view:true,create:true},roles_permissions:{view:true,create:true}}; assert.equal(canViewScreen('/college-institution-management/add','admin',permissions,{isCollegeAdmin:true}),false); assert.equal(canViewScreen('/client-onboarding','admin',permissions,{isCollegeAdmin:true}),false); assert.equal(canViewScreen('/college-institution-management/add','admin',permissions,{isSuperAdmin:true}),true); assert.equal(canViewScreen('/college-profile','admin',permissions,{isCollegeAdmin:true}),true); });
