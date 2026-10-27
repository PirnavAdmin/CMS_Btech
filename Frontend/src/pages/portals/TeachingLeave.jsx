import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiInfo,
  FiPaperclip,
  FiPlus,
  FiPrinter,
  FiSearch,
  FiUser,
  FiUsers,
  FiX
} from 'react-icons/fi'
import { PortalDialog } from '../../components/portals/PortalUI.jsx'
import { getAuthStorage } from '../../auth/auth.js'
import { teachingService as service } from '../../services/portals/teachingService.js'
import './teaching-leave.css'

// Default College Leave Types (Synchronized with Admin Portal)
const DEFAULT_LEAVE_TYPES = [
  { id: 'lt-cl', name: 'Casual Leave', code: 'CL', payCategory: 'Paid Leave', entitlement: 12, maxConsecutive: 3, description: 'For personal and unforeseen domestic commitments' },
  { id: 'lt-sl', name: 'Sick / Medical Leave', code: 'SL', payCategory: 'Paid Leave', entitlement: 10, maxConsecutive: 7, description: 'Medical illness or health recuperation (Doc required if > 2 days)' },
  { id: 'lt-el', name: 'Earned Leave', code: 'EL', payCategory: 'Paid Leave', entitlement: 15, maxConsecutive: 15, description: 'Annual accumulated leave quota (Min 7 days advance notice)' },
  { id: 'lt-od', name: 'On-Duty (OD) / Academic Leave', code: 'OD', payCategory: 'Paid Leave', entitlement: 10, maxConsecutive: 5, description: 'Conferences, workshops, PhD reviews, and university exam duties' },
  { id: 'lt-lop', name: 'Loss of Pay (LOP)', code: 'LOP', payCategory: 'Unpaid Leave', entitlement: 0, maxConsecutive: 30, description: 'Leave without pay when all regular quotas are exhausted' }
]

// Default College Leave Policy 2026-27 (Synchronized with Admin Faculty Leave Policy)
const DEFAULT_ACTIVE_POLICY = {
  id: 'lp-2026-27',
  name: 'Faculty Annual Leave Policy 2026-27 (Active)',
  academicYear: '2026-27',
  applicableTo: 'Teaching Faculty',
  from: '2026-06-01',
  to: '2027-05-31',
  status: 'Active',
  guidelines: [
    'Casual Leave (CL) can be availed up to 3 consecutive working days at a time.',
    'For Sick / Medical Leave (SL) exceeding 2 continuous days, a medical practitioner certificate is compulsory.',
    'On-Duty (OD) requires an official conference invitation, workshop letter, or university order attached.',
    'Teaching faculty must ensure Alternate Class Arrangement is documented for all assigned classroom and lab periods.',
    'Leave requests should be submitted at least 24 hours in advance, except in medical emergency cases.'
  ]
}

// Initial realistic leave applications for Dr. Kavya Sharma (EEE Dept)
const INITIAL_LEAVE_REQUESTS = [
  {
    id: 'REQ-2026-881',
    typeId: 'lt-cl',
    typeName: 'Casual Leave',
    typeCode: 'CL',
    policyId: 'lp-2026-27',
    policyName: 'Faculty Annual Leave Policy 2026-27',
    appliedDate: '2026-10-12',
    from: '2026-10-14',
    to: '2026-10-14',
    days: 1,
    isHalfDay: false,
    session: 'Full Day',
    reason: 'Family religious ceremony and personal commitments at home.',
    substituteFaculty: 'Prof. Rajesh Kumar (Assistant Professor · EEE)',
    workloadArrangement: 'Period 3 (Circuit Theory - Section A) & Period 5 (Lab Batch 2)',
    documentName: '',
    status: 'Approved',
    approvedBy: 'Dr. S. K. Rao (HOD - Electrical Engineering)',
    remarks: 'Approved. Alternate class arrangement verified.',
    timeline: [
      { step: 'Application Submitted', date: '2026-10-12 11:30 AM', actor: 'Dr. Kavya Sharma', status: 'done' },
      { step: 'Alternate Arrangement Verified', date: '2026-10-12 02:15 PM', actor: 'Prof. Rajesh Kumar', status: 'done' },
      { step: 'HOD Recommendation & Approval', date: '2026-10-13 10:00 AM', actor: 'Dr. S. K. Rao (HOD)', status: 'done' }
    ]
  },
  {
    id: 'REQ-2026-882',
    typeId: 'lt-sl',
    typeName: 'Sick / Medical Leave',
    typeCode: 'SL',
    policyId: 'lp-2026-27',
    policyName: 'Faculty Annual Leave Policy 2026-27',
    appliedDate: '2026-09-17',
    from: '2026-09-18',
    to: '2026-09-18',
    days: 1,
    isHalfDay: false,
    session: 'Full Day',
    reason: 'Acute fever, severe migraine, and doctor prescription rest.',
    substituteFaculty: 'Dr. Ananya Sen (Associate Professor · EEE)',
    workloadArrangement: 'Period 2 (Power Systems Lecture) rescheduled to library study.',
    documentName: 'medical_prescription_sep18.pdf',
    status: 'Approved',
    approvedBy: 'Dr. S. K. Rao (HOD - Electrical Engineering)',
    remarks: 'Medical certificate accepted. Leave regularized.',
    timeline: [
      { step: 'Emergency Request Logged', date: '2026-09-17 08:15 AM', actor: 'Dr. Kavya Sharma', status: 'done' },
      { step: 'Medical Certificate Uploaded', date: '2026-09-19 09:30 AM', actor: 'Dr. Kavya Sharma', status: 'done' },
      { step: 'Approved by HOD', date: '2026-09-19 11:45 AM', actor: 'Dr. S. K. Rao (HOD)', status: 'done' }
    ]
  },
  {
    id: 'REQ-2026-883',
    typeId: 'lt-od',
    typeName: 'On-Duty (OD) / Academic Leave',
    typeCode: 'OD',
    policyId: 'lp-2026-27',
    policyName: 'Faculty Annual Leave Policy 2026-27',
    appliedDate: '2026-10-02',
    from: '2026-10-08',
    to: '2026-10-08',
    days: 1,
    isHalfDay: false,
    session: 'Full Day',
    reason: 'Keynote Paper Presentation at the IEEE National Renewable Energy Symposium.',
    substituteFaculty: 'Prof. S. N. Murthy (Assistant Professor · EEE)',
    workloadArrangement: 'Period 1 (Electrical Machines) & Period 4 (Tutorials) swapped with Friday.',
    documentName: 'ieee_symposium_invitation.pdf',
    status: 'Approved',
    approvedBy: 'Prof. K. Venkatesh (Dean Academics)',
    remarks: 'Approved under Faculty Academic Development policy with attendance credit.',
    timeline: [
      { step: 'Application with Invitation Letter', date: '2026-10-02 04:00 PM', actor: 'Dr. Kavya Sharma', status: 'done' },
      { step: 'HOD Endorsement', date: '2026-10-03 11:20 AM', actor: 'Dr. S. K. Rao (HOD)', status: 'done' },
      { step: 'Sanctioned by Dean Academics', date: '2026-10-04 03:30 PM', actor: 'Prof. K. Venkatesh', status: 'done' }
    ]
  },
  {
    id: 'REQ-2026-884',
    typeId: 'lt-cl',
    typeName: 'Casual Leave',
    typeCode: 'CL',
    policyId: 'lp-2026-27',
    policyName: 'Faculty Annual Leave Policy 2026-27',
    appliedDate: '2026-10-25',
    from: '2026-11-04',
    to: '2026-11-04',
    days: 1,
    isHalfDay: false,
    session: 'Full Day',
    reason: 'Personal administrative work at Government Sub-Registrar Office.',
    substituteFaculty: 'Prof. Rajesh Kumar (Assistant Professor · EEE)',
    workloadArrangement: 'Period 2 (Circuit Theory) covered by Prof. Rajesh Kumar.',
    documentName: '',
    status: 'Pending',
    approvedBy: '',
    remarks: 'Awaiting HOD approval during weekly departmental review.',
    timeline: [
      { step: 'Application Submitted', date: '2026-10-25 10:15 AM', actor: 'Dr. Kavya Sharma', status: 'done' },
      { step: 'Class Adjustment Acknowledged', date: '2026-10-25 01:00 PM', actor: 'Prof. Rajesh Kumar', status: 'done' },
      { step: 'Pending HOD Approval', date: 'In Progress', actor: 'Dr. S. K. Rao (HOD)', status: 'pending' }
    ]
  }
]

const STORAGE_KEY = 'btech_teaching_leave_records_v1'

const loadStoredRequests = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load leave requests from localStorage:', err)
  }
  return INITIAL_LEAVE_REQUESTS
}

const saveStoredRequests = requests => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  } catch (err) {
    console.error('Failed to save leave requests to localStorage:', err)
  }
}

// Helpers for dates and day counting
const pad = n => String(n).padStart(2, '0')
const parseDate = str => new Date(`${str}T00:00:00`)
const formatDateFormatted = str => {
  if (!str) return '—'
  const d = parseDate(str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Calculate working days skipping Sundays and 2nd/4th Saturdays
const calculateWorkingDays = (fromStr, toStr, isHalfDay) => {
  if (!fromStr || !toStr) return 0
  const from = parseDate(fromStr)
  const to = parseDate(toStr)
  if (to < from) return 0

  let workingDays = 0
  const curr = new Date(from)
  while (curr <= to) {
    const dayOfWeek = curr.getDay() // 0 = Sun, 6 = Sat
    const isSunday = dayOfWeek === 0
    const isSaturday = dayOfWeek === 6
    const satCount = isSaturday ? Math.ceil(curr.getDate() / 7) : 0
    const isOff = isSunday || (isSaturday && (satCount === 2 || satCount === 4))

    if (!isOff) {
      workingDays++
    }
    curr.setDate(curr.getDate() + 1)
  }

  if (isHalfDay && fromStr === toStr && workingDays === 1) {
    return 0.5
  }
  return workingDays
}

export default function TeachingLeave({ data, summaryTarget }) {
  const [requests, setRequests] = useState(loadStoredRequests)
  const [leaveTypes, setLeaveTypes] = useState(DEFAULT_LEAVE_TYPES)
  const [policies, setPolicies] = useState([DEFAULT_ACTIVE_POLICY])
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'Pending' | 'Approved' | 'Rejected'
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState('2026-27')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [cancelModalItem, setCancelModalItem] = useState(null)
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [toast, setToast] = useState('')
  const [formBusy, setFormBusy] = useState(false)

  // Empty application form state
  const todayStr = '2026-10-27'
  const [form, setForm] = useState({
    typeId: 'lt-cl',
    policyId: 'lp-2026-27',
    from: todayStr,
    to: todayStr,
    isHalfDay: false,
    session: 'Full Day', // 'Full Day' | 'First Half (FN)' | 'Second Half (AN)'
    reason: '',
    substituteFaculty: 'Prof. Rajesh Kumar (Assistant Professor · EEE)',
    workloadArrangement: '',
    documentName: ''
  })
  const [formErrors, setFormErrors] = useState({})

  const showToastMsg = msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  // Load live options from backend if available, fallback smoothly
  useEffect(() => {
    let isMounted = true
    service.leaveOptions()
      .then(res => {
        if (!isMounted) return
        if (Array.isArray(res?.types) && res.types.length > 0) {
          setLeaveTypes(res.types)
        }
        if (Array.isArray(res?.policies) && res.policies.length > 0) {
          setPolicies(res.policies)
        }
      })
      .catch(() => {
        // Fallback to active college leave policies silently
      })
    return () => { isMounted = false }
  }, [])

  // Faculty details
  const facultyName = data?.me?.fullName || getAuthStorage()?.getItem('btech-user-name') || 'Dr. Kavya Sharma'
  const facultyDept = data?.me?.department || 'Electrical & Electronics Engineering'
  const facultyEmpId = data?.me?.employeeId || 'EMP-2024-8842'

  // Computed Leave Balances for 2026-27
  const balances = useMemo(() => {
    return leaveTypes.map(lt => {
      const typeRequests = requests.filter(r => r.typeId === lt.id || r.typeCode === lt.code || r.typeName === lt.name)
      const used = typeRequests.filter(r => r.status === 'Approved').reduce((acc, r) => acc + (Number(r.days) || 0), 0)
      const pending = typeRequests.filter(r => r.status === 'Pending').reduce((acc, r) => acc + (Number(r.days) || 0), 0)
      const entitled = lt.entitlement || 0
      const available = Math.max(0, entitled - used - pending)

      return {
        ...lt,
        entitled,
        used,
        pending,
        available
      }
    })
  }, [leaveTypes, requests])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalEntitled = balances.reduce((sum, b) => sum + b.entitled, 0)
    const totalUsed = balances.reduce((sum, b) => sum + b.used, 0)
    const totalPending = balances.reduce((sum, b) => sum + b.pending, 0)
    const totalAvailable = balances.reduce((sum, b) => sum + b.available, 0)
    const pendingCount = requests.filter(r => r.status === 'Pending').length

    return {
      totalEntitled,
      totalUsed,
      totalPending,
      totalAvailable,
      pendingCount
    }
  }, [balances, requests])

  // Working days count for active form
  const formCalculatedDays = useMemo(() => {
    return calculateWorkingDays(form.from, form.to, form.halfDay)
  }, [form.from, form.to, form.halfDay])

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests
      .filter(r => {
        if (activeTab !== 'ALL' && r.status !== activeTab) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          const matchesId = (r.id || '').toLowerCase().includes(q)
          const matchesType = (r.typeName || '').toLowerCase().includes(q)
          const matchesReason = (r.reason || '').toLowerCase().includes(q)
          const matchesSub = (r.substituteFaculty || '').toLowerCase().includes(q)
          if (!matchesId && !matchesType && !matchesReason && !matchesSub) return false
        }
        return true
      })
      .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate))
  }, [requests, activeTab, search])

  // Form Validation
  const validateForm = () => {
    const errs = {}
    if (!form.typeId) errs.typeId = 'Please select a leave category'
    if (!form.from) errs.from = 'Start date is required'
    if (!form.to) errs.to = 'End date is required'
    if (form.from && form.to && form.to < form.from) {
      errs.to = 'End date cannot be prior to start date'
    }
    if (formCalculatedDays <= 0) {
      errs.to = 'Selected dates fall entirely on holidays / weekly offs'
    }

    const selectedBal = balances.find(b => b.id === form.typeId || b.code === form.typeId)
    if (selectedBal && selectedBal.code !== 'LOP' && formCalculatedDays > selectedBal.available) {
      errs.typeId = `Insufficient balance. Available: ${selectedBal.available} day(s), Requested: ${formCalculatedDays} day(s)`
    }

    if (!form.reason.trim() || form.reason.trim().length < 10) {
      errs.reason = 'Please provide a clear reason of at least 10 characters'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Handle Submit Application
  const handleSubmitApplication = async e => {
    e.preventDefault()
    if (!validateForm()) return

    setFormBusy(true)
    const selectedTypeObj = leaveTypes.find(t => t.id === form.typeId) || DEFAULT_LEAVE_TYPES[0]
    const selectedPolicyObj = policies.find(p => p.id === form.policyId) || DEFAULT_ACTIVE_POLICY

    const newRequest = {
      id: `REQ-2026-${Math.floor(885 + Math.random() * 900)}`,
      typeId: selectedTypeObj.id,
      typeName: selectedTypeObj.name,
      typeCode: selectedTypeObj.code,
      policyId: selectedPolicyObj.id,
      policyName: selectedPolicyObj.name,
      appliedDate: todayStr,
      from: form.from,
      to: form.to,
      days: formCalculatedDays,
      isHalfDay: Boolean(form.halfDay),
      session: form.halfDay ? form.session : 'Full Day',
      reason: form.reason.trim(),
      substituteFaculty: form.substituteFaculty.trim() || 'Prof. Rajesh Kumar (EEE)',
      workloadArrangement: form.workloadArrangement.trim() || 'Class schedules covered by alternate faculty',
      documentName: form.documentName || '',
      status: 'Pending',
      approvedBy: '',
      remarks: 'Application logged. Awaiting HOD review.',
      timeline: [
        { step: 'Application Submitted', date: `${todayStr} 10:30 AM`, actor: facultyName, status: 'done' },
        { step: 'Alternate Arrangement Verified', date: `${todayStr} 11:00 AM`, actor: form.substituteFaculty.split('(')[0].trim(), status: 'done' },
        { step: 'Pending HOD / Principal Approval', date: 'In Progress', actor: 'HOD Electrical Engineering', status: 'pending' }
      ]
    }

    // Try sending to backend if available
    try {
      await service.requestLeave({
        typeId: newRequest.typeId,
        policyId: newRequest.policyId,
        from: newRequest.from,
        to: newRequest.to,
        reason: newRequest.reason
      }).catch(() => {
        // Safe mock local fallback
      })
    } catch {
      // Ignored
    }

    const updatedList = [newRequest, ...requests]
    setRequests(updatedList)
    saveStoredRequests(updatedList)

    setFormBusy(false)
    setShowApplyModal(false)
    setForm({
      typeId: 'lt-cl',
      policyId: 'lp-2026-27',
      from: todayStr,
      to: todayStr,
      isHalfDay: false,
      session: 'Full Day',
      reason: '',
      substituteFaculty: 'Prof. Rajesh Kumar (Assistant Professor · EEE)',
      workloadArrangement: '',
      documentName: ''
    })
    setFormErrors({})
    showToastMsg(`Leave application ${newRequest.id} submitted successfully! Status: Pending Approval.`)
  }

  // Handle Cancel Request
  const handleConfirmCancel = () => {
    if (!cancelModalItem) return
    const updated = requests.map(r => {
      if (r.id === cancelModalItem.id) {
        return {
          ...r,
          status: 'Cancelled',
          remarks: 'Cancelled by faculty member',
          timeline: [
            ...r.timeline,
            { step: 'Application Cancelled', date: `${todayStr} 04:00 PM`, actor: facultyName, status: 'cancelled' }
          ]
        }
      }
      return r
    })
    setRequests(updated)
    saveStoredRequests(updated)
    setCancelModalItem(null)
    showToastMsg(`Leave request ${cancelModalItem.id} cancelled. ${cancelModalItem.days} day(s) restored to your available balance.`)
  }

  // Export CSV Statement
  const handleExportCsv = () => {
    const filename = `faculty-leave-statement-${selectedYear}.csv`
    const headers = ['Request ID', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Reason', 'Alternate Faculty', 'Approved By / Remarks']
    const cell = v => `"${String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`

    const rows = filteredRequests.map(r => [
      r.id,
      r.typeName,
      r.from,
      r.to,
      r.days,
      r.status,
      r.reason,
      r.substituteFaculty,
      r.remarks || r.approvedBy || ''
    ].map(cell).join(','))

    const csvContent = [headers.map(cell).join(','), ...rows].join('\r\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToastMsg('Leave statement CSV exported.')
  }

  const summary = (
        <div className="tl-kpi-grid">
          <div className="tl-kpi-box">
            <div className="tl-kpi-icon tone-blue">
              <FiCalendar aria-hidden="true" />
            </div>
            <div className="tl-kpi-info">
              <small>Annual quota (days)</small>
              <strong>{summaryMetrics.totalEntitled}</strong>
              <span>Standard faculty allotment</span>
            </div>
          </div>

          <div className="tl-kpi-box highlight-green">
            <div className="tl-kpi-icon tone-green">
              <FiCheckCircle aria-hidden="true" />
            </div>
            <div className="tl-kpi-info">
              <small>Available (days)</small>
              <strong className="text-green">{summaryMetrics.totalAvailable}</strong>
              <span>Ready to avail</span>
            </div>
          </div>

          <div className="tl-kpi-box">
            <div className="tl-kpi-icon tone-purple">
              <FiClock aria-hidden="true" />
            </div>
            <div className="tl-kpi-info">
              <small>Used (days)</small>
              <strong>{summaryMetrics.totalUsed}</strong>
              <span>Sanctioned this session</span>
            </div>
          </div>

          <div className="tl-kpi-box">
            <div className="tl-kpi-icon tone-amber">
              <FiAlertCircle aria-hidden="true" />
            </div>
            <div className="tl-kpi-info">
              <small>Pending requests</small>
              <strong className="text-amber">{summaryMetrics.pendingCount}</strong>
              <span>Awaiting HOD decision</span>
            </div>
          </div>
        </div>

  )

  return (
    <div className="tl-container">
      {summaryTarget && createPortal(summary, summaryTarget)}
      {/* Toast Notification */}
      {toast && (
        <div className="tl-toast" role="status">
          <FiCheckCircle aria-hidden="true" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Profile & KPI Summary Header */}
      <section className="tl-summary-card">
        <div className="tl-summary-hero">
          <div className="tl-faculty-identity">
            <div className="tl-faculty-avatar" aria-hidden="true">
              {facultyName.split(' ').map(p => p[0]).slice(0, 2).join('')}
            </div>
            <div className="tl-faculty-meta">
              <div className="tl-faculty-title-row">
                <h2>{facultyName}</h2>
                <span className="tl-badge-verified">Verified Teaching Faculty</span>
              </div>
              <p className="tl-faculty-sub">
                <span>{facultyDept}</span>
                <span className="tl-dot">·</span>
                <span className="tl-empid">{facultyEmpId}</span>
                <span className="tl-dot">·</span>
                <span className="tl-year-tag">Academic Year {selectedYear}</span>
              </p>
            </div>
          </div>

          <div className="tl-hero-actions">
            <button
              type="button"
              className="tl-btn-apply"
              onClick={() => {
                setFormErrors({})
                setShowApplyModal(true)
              }}
            >
              <FiPlus aria-hidden="true" />
              <span>Apply For Leave</span>
            </button>
          </div>
        </div>

        {!summaryTarget && summary}
      </section>

      {/* Quota Category Cards (Casual, Sick, Earned, On-Duty) */}
      <section className="tl-quotas-section">
        <div className="tl-section-header">
          <div>
            <h3>Leave Categories & Quota Breakdown</h3>
            <p>Active entitlements according to College Leave Policy 2026-27.</p>
          </div>
          <button
            type="button"
            className="tl-btn-guidelines"
            onClick={() => setShowGuidelines(!showGuidelines)}
          >
            <FiInfo aria-hidden="true" />
            <span>{showGuidelines ? 'Hide Policy Rules' : 'View Policy Rules'}</span>
            {showGuidelines ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>

        {/* Collapsible Guidelines Box */}
        {showGuidelines && (
          <div className="tl-guidelines-box">
            <div className="tl-guidelines-head">
              <FiFileText aria-hidden="true" />
              <strong>College Leave Policy Guidelines · Academic Year 2026-27</strong>
            </div>
            <ul>
              {DEFAULT_ACTIVE_POLICY.guidelines.map((rule, idx) => (
                <li key={idx}>
                  <FiCheck aria-hidden="true" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="tl-quota-cards-grid">
          {balances.map(b => {
            const pctUsed = b.entitled > 0 ? Math.min(100, (b.used / b.entitled) * 100) : 0
            const pctPending = b.entitled > 0 ? Math.min(100 - pctUsed, (b.pending / b.entitled) * 100) : 0

            return (
              <div key={b.id} className="tl-quota-card">
                <div className="tl-quota-top">
                  <div>
                    <span className={`tl-code-pill code-${b.code.toLowerCase()}`}>{b.code}</span>
                    <strong className="tl-quota-name">{b.name}</strong>
                  </div>
                  <span className="tl-avail-count">{b.available} Left</span>
                </div>

                <div className="tl-quota-bar-bg" title={`Used: ${b.used}, Pending: ${b.pending}, Available: ${b.available}`}>
                  <div className="tl-quota-bar-fill used" style={{ width: `${pctUsed}%` }} />
                  <div className="tl-quota-bar-fill pending" style={{ width: `${pctPending}%` }} />
                </div>

                <div className="tl-quota-breakdown">
                  <span>Used: <strong>{b.used}</strong></span>
                  <span>Pending: <strong>{b.pending}</strong></span>
                  <span>Total: <strong>{b.entitled}</strong></span>
                </div>

                <div className="tl-quota-footer">
                  <small className="tl-quota-desc">{b.description}</small>
                  <button
                    type="button"
                    className="tl-btn-quick-apply"
                    onClick={() => {
                      setForm(prev => ({ ...prev, typeId: b.id }))
                      setFormErrors({})
                      setShowApplyModal(true)
                    }}
                    title={`Apply for ${b.name}`}
                  >
                    Apply {b.code}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Leave Applications Management Card */}
      <section className="tl-main-card">
        {/* Navigation Tabs and Quick Actions */}
        <div className="tl-nav-bar">
          <div className="tl-tabs" role="tablist">
            {[
              { id: 'ALL', label: 'All Applications', count: requests.length },
              { id: 'Pending', label: 'Pending Review', count: requests.filter(r => r.status === 'Pending').length },
              { id: 'Approved', label: 'Approved Leaves', count: requests.filter(r => r.status === 'Approved').length },
              { id: 'Cancelled', label: 'Cancelled / Rejected', count: requests.filter(r => ['Cancelled', 'Rejected'].includes(r.status)).length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`tl-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="tl-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="tl-export-actions">
            <button
              type="button"
              className="tl-btn-ghost"
              onClick={() => window.print()}
              title="Print Leave Statement"
            >
              <FiPrinter aria-hidden="true" />
              <span>Print</span>
            </button>
            <button
              type="button"
              className="tl-btn-ghost"
              onClick={handleExportCsv}
              title="Download CSV Statement"
            >
              <FiDownload aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Toolbar */}
        <div className="tl-toolbar">
          <div className="tl-search-wrap">
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by reason, leave type or substitute faculty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search applications"
            />
          </div>

          <div className="tl-toolbar-right">
            <select
              className="tl-select"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              aria-label="Filter by Academic Year"
            >
              <option value="2026-27">Academic Year 2026-27</option>
              <option value="2025-26">Academic Year 2025-26</option>
            </select>

            <span className="tl-count-pill">
              Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        {/* Requests Table */}
        <div className="tl-table-wrap">
          <table className="tl-table">
            <thead>
              <tr>
                <th scope="col">Application ID</th>
                <th scope="col">Leave Category</th>
                <th scope="col">Duration & Dates</th>
                <th scope="col">Reason & Substitute Faculty</th>
                <th scope="col">Applied On</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map(row => {
                  const isPending = row.status === 'Pending'
                  const isApproved = row.status === 'Approved'
                  const isCancelled = row.status === 'Cancelled'
                  const isRejected = row.status === 'Rejected'

                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="tl-id-cell">{row.id}</span>
                      </td>

                      <td>
                        <span className={`tl-type-pill type-${row.typeCode.toLowerCase()}`}>
                          {row.typeName}
                        </span>
                      </td>

                      <td>
                        <div className="tl-duration-cell">
                          <strong>
                            {row.days} {row.days === 1 ? 'Day' : 'Days'} {row.isHalfDay && <small className="tl-half-tag">({row.session})</small>}
                          </strong>
                          <span>{formatDateFormatted(row.from)} {row.from !== row.to && `– ${formatDateFormatted(row.to)}`}</span>
                        </div>
                      </td>

                      <td>
                        <div className="tl-reason-cell">
                          <p className="tl-reason-text">{row.reason}</p>
                          {row.substituteFaculty && (
                            <small className="tl-sub-tag">
                              <FiUser aria-hidden="true" /> Alt: {row.substituteFaculty.split('(')[0].trim()}
                            </small>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="tl-applied-cell">{formatDateFormatted(row.appliedDate)}</span>
                      </td>

                      <td>
                        <span className={`tl-status-chip status-${row.status.toLowerCase()}`}>
                          {isPending && <FiClock aria-hidden="true" />}
                          {isApproved && <FiCheckCircle aria-hidden="true" />}
                          {isCancelled && <FiX aria-hidden="true" />}
                          {isRejected && <FiAlertCircle aria-hidden="true" />}
                          <span>{row.status}</span>
                        </span>
                      </td>

                      <td>
                        <div className="tl-row-actions">
                          <button
                            type="button"
                            className="tl-btn-icon"
                            onClick={() => setSelectedDetail(row)}
                            title="View Application Details & Approval Flow"
                          >
                            <FiEye aria-hidden="true" />
                            <span>Details</span>
                          </button>

                          {isPending && (
                            <button
                              type="button"
                              className="tl-btn-icon danger"
                              onClick={() => setCancelModalItem(row)}
                              title="Cancel this pending leave application"
                            >
                              <FiX aria-hidden="true" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="tl-empty">
                    <FiCalendar aria-hidden="true" />
                    <strong>No leave applications found</strong>
                    <p>There are no leave requests matching your current filter or search criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ==========================================================================
          MODALS / DIALOGS
          ========================================================================== */}

      {/* Apply For Leave Modal */}
      {showApplyModal && (
        <PortalDialog
          title="Apply For Faculty Leave"
          onClose={() => !formBusy && setShowApplyModal(false)}
        >
          <form className="tl-apply-form" onSubmit={handleSubmitApplication}>
            <div className="tl-dialog-subtitle">
              <span>{facultyName} · {facultyDept}</span>
              <span className="tl-policy-tag">{DEFAULT_ACTIVE_POLICY.name}</span>
            </div>

            {/* Leave Category Selector */}
            <div className="tl-form-group">
              <label>Leave Category *</label>
              <select
                value={form.typeId}
                onChange={e => setForm({ ...form, typeId: e.target.value })}
                required
              >
                {balances.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) — {b.available} Days Available
                  </option>
                ))}
              </select>
              {formErrors.typeId && <span className="tl-field-error">{formErrors.typeId}</span>}
            </div>

            {/* Date Range Fields */}
            <div className="tl-form-row">
              <div className="tl-form-group">
                <label>From Date *</label>
                <input
                  type="date"
                  value={form.from}
                  onChange={e => setForm({ ...form, from: e.target.value })}
                  required
                />
                {formErrors.from && <span className="tl-field-error">{formErrors.from}</span>}
              </div>

              <div className="tl-form-group">
                <label>To Date *</label>
                <input
                  type="date"
                  min={form.from}
                  value={form.to}
                  onChange={e => setForm({ ...form, to: e.target.value })}
                  required
                />
                {formErrors.to && <span className="tl-field-error">{formErrors.to}</span>}
              </div>
            </div>

            {/* Half Day Option */}
            {form.from === form.to && (
              <div className="tl-half-day-box">
                <label className="tl-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.halfDay}
                    onChange={e => setForm({ ...form, halfDay: e.target.checked })}
                  />
                  <span>Apply as Half-Day Leave (0.5 working day)</span>
                </label>

                {form.halfDay && (
                  <div className="tl-session-options">
                    <label>
                      <input
                        type="radio"
                        name="session"
                        value="First Half (FN)"
                        checked={form.session === 'First Half (FN)'}
                        onChange={e => setForm({ ...form, session: e.target.value })}
                      />
                      <span>First Half (FN) - Morning Periods</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="session"
                        value="Second Half (AN)"
                        checked={form.session === 'Second Half (AN)'}
                        onChange={e => setForm({ ...form, session: e.target.value })}
                      />
                      <span>Second Half (AN) - Afternoon / Labs</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Days Calculation Preview Card */}
            <div className="tl-calc-box">
              <div>
                <span>Calculated Working Days:</span>
                <p className="tl-calc-hint">Sundays and 2nd/4th Saturdays are automatically excluded</p>
              </div>
              <strong className="tl-calc-val">{formCalculatedDays} Day(s)</strong>
            </div>

            {/* Substitute Faculty (Teaching specific feature) */}
            <div className="tl-form-group">
              <label>Alternate Teaching Arrangement (Substitute Faculty) *</label>
              <input
                type="text"
                placeholder="e.g. Prof. Rajesh Kumar (Assistant Professor · EEE)"
                value={form.substituteFaculty}
                onChange={e => setForm({ ...form, substituteFaculty: e.target.value })}
                required
              />
              <span className="tl-field-hint">Colleagues nominated to handle classes during your leave.</span>
            </div>

            {/* Workload Handover Details */}
            <div className="tl-form-group">
              <label>Class / Lab Workload Handover Details (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Period 2 Circuit Theory Lecture & Period 4 Simulation Lab"
                value={form.workloadArrangement}
                onChange={e => setForm({ ...form, workloadArrangement: e.target.value })}
              />
            </div>

            {/* Reason */}
            <div className="tl-form-group">
              <label>Reason for Leave *</label>
              <textarea
                rows={3}
                placeholder="Provide a clear explanation for this leave application..."
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                required
              />
              {formErrors.reason && <span className="tl-field-error">{formErrors.reason}</span>}
            </div>

            {/* Attachment File Input */}
            <div className="tl-form-group">
              <label>Supporting Document (Medical Cert / Invitation - Optional)</label>
              <div className="tl-file-picker">
                <FiPaperclip aria-hidden="true" />
                <span>{form.documentName || 'Choose PDF or image file (optional)'}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={e => setForm({ ...form, documentName: e.target.files[0]?.name || '' })}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="portal-actions">
              <button
                type="button"
                disabled={formBusy}
                onClick={() => setShowApplyModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary"
                disabled={formBusy}
              >
                {formBusy ? 'Submitting...' : 'Submit Leave Application'}
              </button>
            </div>
          </form>
        </PortalDialog>
      )}

      {/* View Details Modal */}
      {selectedDetail && (
        <PortalDialog
          title={`Leave Application · ${selectedDetail.id}`}
          onClose={() => setSelectedDetail(null)}
        >
          <div className="tl-detail-content">
            <div className="tl-detail-banner">
              <div>
                <span className={`tl-type-pill type-${selectedDetail.typeCode.toLowerCase()}`}>
                  {selectedDetail.typeName}
                </span>
                <h3>{selectedDetail.days} Day(s) Leave</h3>
                <p className="tl-detail-dates">
                  {formatDateFormatted(selectedDetail.from)} {selectedDetail.from !== selectedDetail.to && `– ${formatDateFormatted(selectedDetail.to)}`}
                  {selectedDetail.isHalfDay && ` (${selectedDetail.session})`}
                </p>
              </div>
              <span className={`tl-status-chip status-${selectedDetail.status.toLowerCase()}`}>
                {selectedDetail.status}
              </span>
            </div>

            <dl className="tl-detail-grid">
              <div>
                <dt>Faculty Name</dt>
                <dd>{facultyName} ({facultyEmpId})</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{facultyDept}</dd>
              </div>
              <div>
                <dt>Applied On</dt>
                <dd>{formatDateFormatted(selectedDetail.appliedDate)}</dd>
              </div>
              <div>
                <dt>Policy Applied</dt>
                <dd>{selectedDetail.policyName}</dd>
              </div>
              <div className="tl-span-2">
                <dt>Reason for Leave</dt>
                <dd className="tl-detail-reason">{selectedDetail.reason}</dd>
              </div>
              <div className="tl-span-2">
                <dt>Alternate Teaching Arrangement</dt>
                <dd>{selectedDetail.substituteFaculty || 'None specified'}</dd>
              </div>
              {selectedDetail.workloadArrangement && (
                <div className="tl-span-2">
                  <dt>Class Handover Notes</dt>
                  <dd>{selectedDetail.workloadArrangement}</dd>
                </div>
              )}
              {selectedDetail.documentName && (
                <div className="tl-span-2">
                  <dt>Attached Document</dt>
                  <dd className="tl-doc-line">
                    <FiPaperclip aria-hidden="true" />
                    <span>{selectedDetail.documentName}</span>
                  </dd>
                </div>
              )}
              {selectedDetail.remarks && (
                <div className="tl-span-2">
                  <dt>Department Decision Remarks</dt>
                  <dd className="tl-remarks-box">{selectedDetail.remarks}</dd>
                </div>
              )}
            </dl>

            {/* Approval Workflow Timeline */}
            <div className="tl-timeline-wrap">
              <h4>Approval Workflow Timeline</h4>
              <ol className="tl-timeline">
                {(selectedDetail.timeline || []).map((step, idx) => (
                  <li key={idx} className={step.status}>
                    <div className="tl-timeline-dot" />
                    <div className="tl-timeline-body">
                      <strong>{step.step}</strong>
                      <span className="tl-timeline-meta">{step.actor} · {step.date}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="portal-actions">
              <button type="button" onClick={() => setSelectedDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </PortalDialog>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalItem && (
        <PortalDialog
          title="Cancel Leave Application?"
          onClose={() => setCancelModalItem(null)}
        >
          <div className="tl-cancel-dialog">
            <FiAlertCircle className="tl-cancel-icon" aria-hidden="true" />
            <p>
              Are you sure you want to cancel leave application <strong>{cancelModalItem.id}</strong> ({cancelModalItem.typeName} for {cancelModalItem.days} day(s))?
            </p>
            <p className="tl-cancel-note">
              The <strong>{cancelModalItem.days} day(s)</strong> will be immediately restored to your available {cancelModalItem.typeName} balance.
            </p>

            <div className="portal-actions">
              <button type="button" onClick={() => setCancelModalItem(null)}>
                Keep Application
              </button>
              <button
                type="button"
                className="danger"
                onClick={handleConfirmCancel}
              >
                Yes, Cancel Leave
              </button>
            </div>
          </div>
        </PortalDialog>
      )}
    </div>
  )
}
