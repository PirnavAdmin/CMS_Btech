import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findModuleForPath } from '../../config/moduleRegistry.js'
import { buildBillingAccounts, daysUntil, filterBillingAccounts, summarizeBillingAccounts } from './accountsBillingData.js'

const now = new Date(2026, 10, 19, 12)

const organizations = [
  { collegeId: 1, collegeName: 'North College', collegeCode: 'NC' },
  { collegeId: 2, collegeName: 'Trial College', collegeCode: 'TC' },
  { collegeId: 3, collegeName: 'Expired College', collegeCode: 'EC' },
]

const subscriptions = [
  { subscriptionId: 11, organizationId: 1, planName: 'Growth', billingCycle: 'Yearly', price: 12000, maximumUsers: 100, status: 'Active', startDate: '2026-01-01', endDate: '2026-11-22' },
  { subscriptionId: 12, organizationId: 2, planName: 'Starter', billingCycle: 'Monthly', price: 0, maximumUsers: 20, status: 'Trial', startDate: '2026-11-01', endDate: '2026-12-01' },
  { subscriptionId: 13, organizationId: 3, planName: 'Basic', billingCycle: 'Monthly', price: 500, maximumUsers: 10, status: 'Active', startDate: '2026-01-01', endDate: '2026-11-18' },
]

describe('accounts billing data', () => {
  it('registers the dashboard as a guarded platform-only module', () => {
    const module = findModuleForPath('/accounts-billing')
    assert.equal(module?.id, 'accounts_billing')
    assert.equal(module?.scope, 'platform')
    assert.equal(module?.authorization, 'super-admin-route-and-api-guard')
  })

  it('calculates calendar-day expiry and account usage from source records', () => {
    assert.equal(daysUntil('2026-11-22', now), 3)
    const accounts = buildBillingAccounts(organizations, subscriptions, [
      { userId: 1, collegeId: 1, roleName: 'Student', accountStatus: 'Active' },
      { userId: 2, collegeId: 1, roleName: 'Faculty', accountStatus: 'Active' },
      { userId: 3, collegeId: 1, roleName: 'College Admin', accountStatus: 'Active', fullName: 'Ada Admin', email: 'ada@example.edu' },
      { userId: 4, collegeId: 1, roleName: 'Student', status: 1, accountStatus: 'Pending Invitation' },
    ], now)

    assert.deepEqual({
      name: accounts[0].name,
      daysRemaining: accounts[0].daysRemaining,
      activeUserCount: accounts[0].activeUserCount,
      studentCount: accounts[0].studentCount,
      facultyCount: accounts[0].facultyCount,
      usagePercentage: accounts[0].usagePercentage,
      paymentStatus: accounts[0].paymentStatus,
      storageUsage: accounts[0].storageUsage,
    }, {
      name: 'North College', daysRemaining: 3, activeUserCount: 3, studentCount: 1,
      facultyCount: 1, usagePercentage: 3, paymentStatus: 'Not tracked', storageUsage: null,
    })
    assert.deepEqual({ name: accounts[0].admin.name, email: accounts[0].admin.email }, { name: 'Ada Admin', email: 'ada@example.edu' })
    assert.equal(accounts[1].subscription.status, 'Trial')
    assert.equal(accounts[2].subscription.status, 'Expired')
  })

  it('summarizes real subscription states without inventing financial values', () => {
    const summary = summarizeBillingAccounts(buildBillingAccounts(organizations, subscriptions, [], now), now)
    assert.deepEqual({
      totalAccounts: summary.totalAccounts,
      activeSubscriptions: summary.activeSubscriptions,
      trials: summary.trials,
      expiring7: summary.expiring7,
      expiring30: summary.expiring30,
      expired: summary.expired,
    }, { totalAccounts: 3, activeSubscriptions: 1, trials: 1, expiring7: 1, expiring30: 1, expired: 1 })
    assert.equal(summary.pendingPayments, null)
    assert.equal(summary.outstandingAmount, null)
    assert.equal(summary.revenue, null)
  })

  it('filters and sorts account rows using the selected criteria', () => {
    const accounts = buildBillingAccounts(organizations, subscriptions, [], now)
    assert.deepEqual(filterBillingAccounts(accounts, { status: 'Expired' }).map(account => account.code), ['EC'])
    assert.deepEqual(filterBillingAccounts(accounts, { expiry: '7' }).map(account => account.code), ['NC'])
    assert.deepEqual(filterBillingAccounts(accounts, { search: 'starter' }).map(account => account.name), ['Trial College'])
    assert.deepEqual(filterBillingAccounts(accounts, { sort: 'expiry', direction: 'asc' }).map(account => account.code), ['EC', 'NC', 'TC'])
  })
})
