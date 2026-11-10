import AsyncState from '../components/AsyncState'
import { Link as react_router_domImports_Link, useNavigate as react_router_domImports_useNavigate, useSearchParams as react_router_domImports_useSearchParams, useLocation as react_router_domImports_useLocation } from 'react-router-dom'
import { FiBookOpen as fiImports_FiBookOpen, FiLogIn as fiImports_FiLogIn, FiArrowLeft as fiImports_FiArrowLeft, FiActivity as fiImports_FiActivity, FiArrowRight as fiImports_FiArrowRight, FiAward as fiImports_FiAward, FiBarChart2 as fiImports_FiBarChart2, FiBriefcase as fiImports_FiBriefcase, FiCalendar as fiImports_FiCalendar, FiCheckCircle as fiImports_FiCheckCircle, FiChevronRight as fiImports_FiChevronRight, FiClock as fiImports_FiClock, FiExternalLink as fiImports_FiExternalLink, FiGrid as fiImports_FiGrid, FiLayers as fiImports_FiLayers, FiPieChart as fiImports_FiPieChart, FiPlus as fiImports_FiPlus, FiRefreshCw as fiImports_FiRefreshCw, FiSearch as fiImports_FiSearch, FiSliders as fiImports_FiSliders, FiStar as fiImports_FiStar, FiTrendingUp as fiImports_FiTrendingUp, FiUser as fiImports_FiUser, FiUserCheck as fiImports_FiUserCheck, FiUserPlus as fiImports_FiUserPlus, FiUsers as fiImports_FiUsers, FiZap as fiImports_FiZap, FiEye as fiImports_FiEye, FiEyeOff as fiImports_FiEyeOff, FiCheck as fiImports_FiCheck, FiHome as fiImports_FiHome, FiMenu as fiImports_FiMenu, FiTool as fiImports_FiTool, FiX as fiImports_FiX, FiBell as fiImports_FiBell, FiFileText as fiImports_FiFileText } from 'react-icons/fi'
import { FiSun, FiMoon } from 'react-icons/fi'
import {
  FiChevronRight, FiBookOpen, FiEyeOff, FiFileText, FiBriefcase, FiEye,
  FiCheck, FiCalendar, FiUser, FiBell, FiArrowRight, FiTool, FiTrendingUp,
  FiUserCheck, FiArrowLeft, FiGrid, FiUsers, FiUserPlus, FiRefreshCw,
  FiAward, FiExternalLink, FiHome, FiLayers, FiClock, FiX, FiMenu,
} from 'react-icons/fi'
import college_campus_hero_pngImports_default from '../assets/college-campus-hero.png'
import useCollegeStateImports_default from '../hooks/useCollegeState'
import { useEffect as reactImports_useEffect, useState as reactImports_useState, useMemo as reactImports_useMemo, useRef as reactImports_useRef } from 'react'
import { getUserRole as authImports_getUserRole, signIn as authImports_signIn } from '../auth/auth'
import { ROLES as rolesImports_ROLES } from '../auth/roles'
import DashboardLayoutImports_default from '../layouts/DashboardLayout'
import { buildTrend as dashboardDataImports_buildTrend } from '../utils/dashboardData'
import { studentAdmissionApi as apiEndpointsImports_studentAdmissionApi, studentProfilesApi as apiEndpointsImports_studentProfilesApi, profileApi as apiEndpointsImports_profileApi, AuthRequestError as apiEndpointsImports_AuthRequestError, login as apiEndpointsImports_login, completeAccountSetup as apiEndpointsImports_completeAccountSetup } from '../api/apiEndpoints'
import subjectServiceImports_default from '../services/subjectService'
import facultyServiceImports_default from '../services/facultyService'
import { useAcademic as AcademicContextImports_useAcademic } from '../context/AcademicContext'
import { GENERIC_ERROR_MESSAGE as userErrorImports_GENERIC_ERROR_MESSAGE } from '../utils/userError.js'
import { showSuccess as toastImports_showSuccess, showWarning as toastImports_showWarning } from '../utils/toast'
import useToastStateImports_default from '../hooks/useToastState'
import { AuthRequestError as authApiImports_AuthRequestError, generateOtp as authApiImports_generateOtp, resendOtp as authApiImports_resendOtp, verifyOtp as authApiImports_verifyOtp, resetPassword as authApiImports_resetPassword, sendOtp as authApiImports_sendOtp, register as authApiImports_register } from '../auth/authApi'
import { notifyApiUnavailable as apiFailureNoticeImports_notifyApiUnavailable } from '../api/apiFailureNotice'
import RequestDemoImports_default from '../components/RequestDemo'
import ThemeToggleImports_default from '../components/ThemeToggle'
import { validateLogin as loginValidationImports_validateLogin } from '../auth/loginValidation'
import { passwordRequirements as registrationValidationImports_passwordRequirements, validateRegistration as registrationValidationImports_validateRegistration } from '../auth/registrationValidation'
import './Pages.css'

// ActivateAccount screen and private helpers.
const ActivateAccountScreen = (() => {
const Link = react_router_domImports_Link
const useNavigate = react_router_domImports_useNavigate
const useSearchParams = react_router_domImports_useSearchParams
const FiBookOpen = fiImports_FiBookOpen
const FiArrowLeft = fiImports_FiArrowLeft
const FiCheckCircle = fiImports_FiCheckCircle
const FiArrowRight = fiImports_FiArrowRight
const FiEye = fiImports_FiEye
const FiEyeOff = fiImports_FiEyeOff
const campusHero = college_campus_hero_pngImports_default

function ActivateAccount() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [invitation, setInvitation] = reactImports_useState(() => ({ loginId: (params.get('loginId') || '').trim(), token: (params.get('token') || '').trim() }))
  const [password, setPassword] = reactImports_useState('')
  const [confirmPassword, setConfirmPassword] = reactImports_useState('')
  const [visible, setVisible] = reactImports_useState(false)
  const [confirmVisible, setConfirmVisible] = reactImports_useState(false)
  const [errors, setErrors] = reactImports_useState({})
  const [error, setError] = reactImports_useState('')
  const [busy, setBusy] = reactImports_useState(false)
  const [complete, setComplete] = reactImports_useState(false)
  const lock = reactImports_useRef(false)
  const validLink = Boolean(invitation.loginId && invitation.token)
  const submit = async event => {
    event.preventDefault()
    if (lock.current || !validLink) return
    const next = {}
    if (!password.trim() || password.length < 12) next.password = 'Use at least 12 characters for your password.'
    else if (new TextEncoder().encode(password).length > 72) next.password = 'Password must not exceed 72 UTF-8 bytes. Use fewer characters.'
    if (!confirmPassword) next.confirmPassword = 'Confirm your new password.'
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next); setError('')
    if (Object.keys(next).length) return
    lock.current = true; setBusy(true)
    try {
      await apiEndpointsImports_completeAccountSetup({ loginId: invitation.loginId, token: invitation.token, newPassword: password, confirmNewPassword: confirmPassword })
      setComplete(true); setPassword(''); setConfirmPassword('')
      setInvitation(current => ({ ...current, token: '' }))
      setParams({}, { replace: true })
    } catch (reason) {
      setError(reason?.message || 'The setup link could not be verified. Ask your administrator to resend your invitation.')
    } finally { lock.current = false; setBusy(false) }
  }
  const continueToLogin = () => navigate('/login', { replace: true, state: { identifier: invitation.loginId } })
  return <main className="admin-login pirnav-login account-setup">
    <section className="login-intro pirnav-login__campus" aria-label="Pirnav Engineering College digital campus">
      <img className="pirnav-login__campus-image" src={campusHero} alt="Pirnav Engineering College campus" />
      <div className="pirnav-login__campus-shade" />
      <div className="login-intro__pattern" aria-hidden="true" />
      <div className="login-intro__content">
        <header className="brand"><span className="brand__mark"><FiBookOpen /></span><span className="brand__name"><strong>Pirnav Engineering College</strong><small>Digital Campus Management Portal</small></span></header>
        <div className="intro-copy"><p className="eyebrow">Secure campus access</p><h1>Welcome to your digital campus</h1><p>Complete your account setup to access your college workspace.</p></div>
        <p className="copyright">Pirnav Engineering College <span>|</span> College Management System</p>
      </div>
    </section>
    <section className="login-panel" aria-labelledby="account-setup-title">
      <div className="login-public-actions"><ThemeToggleImports_default /><Link className="login-home-link" to="/"><FiArrowLeft aria-hidden="true" /> Home</Link></div>
      {complete ? <div className="login-form account-setup__success" role="status">
        <FiCheckCircle aria-hidden="true" />
        <header><h2 id="account-setup-title">Account activated</h2><p>Your password has been set. Sign in with your registered email or login ID and new password. No OTP is needed.</p></header>
        <p className="account-setup__identity">Login ID: <strong>{invitation.loginId}</strong></p>
        <button className="sign-in-button" type="button" onClick={continueToLogin}>Continue to Sign In <FiArrowRight aria-hidden="true" /></button>
      </div> : !validLink ? <div className="login-form">
        <header><h2 id="account-setup-title">Open your invitation link</h2><p>This link is incomplete. Open the full account setup link in your invitation email, or ask your administrator to resend it.</p></header>
        <Link className="account-setup__back" to="/login"><FiArrowLeft aria-hidden="true" /> Back to Sign In</Link>
      </div> : <form className="login-form account-setup__form" onSubmit={submit} noValidate aria-busy={busy}>
        <header><p className="pirnav-greeting">Account invitation</p><h2 id="account-setup-title">Complete account setup</h2><p>Choose your password to activate your invited account.</p></header>
        <p className="account-setup__notice">Your email link is a one-time verification. The server checks it when you activate your account.</p>
        <label htmlFor="setup-login-id"><span>Login ID</span><input id="setup-login-id" type="text" autoComplete="username" value={invitation.loginId} readOnly /></label>
        <label htmlFor="setup-password"><span>New password</span><span className="password-input"><input id="setup-password" type={visible ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a secure password" value={password} onChange={event => { setPassword(event.target.value); setErrors(current => ({ ...current, password: '' })) }} required aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'setup-password-help setup-password-error' : 'setup-password-help'} /><button className="password-toggle" type="button" aria-label={visible ? 'Hide new password' : 'Show new password'} onClick={() => setVisible(value => !value)}>{visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></span></label>
        <p className="account-setup__help" id="setup-password-help">At least 12 characters; maximum 72 UTF-8 bytes.</p>
        {errors.password && <p className="field-error" id="setup-password-error" role="alert">{errors.password}</p>}
        <label htmlFor="setup-confirm"><span>Confirm password</span><span className="password-input"><input id="setup-confirm" type={confirmVisible ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setErrors(current => ({ ...current, confirmPassword: '' })) }} required aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'setup-confirm-error' : undefined} /><button className="password-toggle" type="button" aria-label={confirmVisible ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setConfirmVisible(value => !value)}>{confirmVisible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></span></label>
        {errors.confirmPassword && <p className="field-error" id="setup-confirm-error" role="alert">{errors.confirmPassword}</p>}
        {error && <div className="form-error" role="alert"><p>{error}</p><p>If this invitation has expired or was already used, ask your administrator to resend it or sign in with your existing password.</p></div>}
        <button className="sign-in-button" type="submit" disabled={busy}>{busy ? 'Activating account...' : 'Set Password & Activate'} <FiArrowRight aria-hidden="true" /></button>
        <Link className="account-setup__back" to="/login"><FiArrowLeft aria-hidden="true" /> Back to Sign In</Link>
      </form>}
    </section>
  </main>
}
return { default: ActivateAccount }
})()

// Dashboard screen and private helpers.
const DashboardScreen = (() => {
const useCollegeState = useCollegeStateImports_default
const useEffect = reactImports_useEffect
const useState = reactImports_useState
const useMemo = reactImports_useMemo
const Link = react_router_domImports_Link
const useNavigate = react_router_domImports_useNavigate
const getUserRole = authImports_getUserRole
const ROLES = rolesImports_ROLES
const DashboardLayout = DashboardLayoutImports_default
const buildTrend = dashboardDataImports_buildTrend
const studentAdmissionApi = apiEndpointsImports_studentAdmissionApi
const studentProfilesApi = apiEndpointsImports_studentProfilesApi
const profileApi = apiEndpointsImports_profileApi
const subjectService = subjectServiceImports_default
const facultyService = facultyServiceImports_default
const useAcademic = AcademicContextImports_useAcademic

function Dashboard() {
  const navigate = useNavigate()
  const role = getUserRole()
  const {
    scopeRecords,
    selectedCollege,
    selectedCollegeId,
    selectedAcademicYear,
    selectedAcademicYearId,
    colleges,
    academicYears,
    departments,
    courses,
    branches,
    semesters,
    sections,
    loading: academicLoading,
    error: academicError,
  } = useAcademic()

  const [admissions, setAdmissions] = useCollegeState([])
  const [students, setStudents] = useCollegeState([])
  const [faculty, setFaculty] = useCollegeState([])
  const [subjects, setSubjects] = useCollegeState([])
  const [setupApiAvailability, setSetupApiAvailability] = useState({ admissions: null, faculty: null })
  const [loadingStats, setLoadingStats] = useState(true)
  const [dashboardError, setDashboardError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [userName, setUserName] = useState(() =>
    localStorage.getItem('btech-user-name') || sessionStorage.getItem('btech-user-name') || ''
  )

  // Interactive timeframe states for charts (Day / Week / Month / Branch)
  const [inflowTimeframe, setInflowTimeframe] = useState('Month')
  const [barViewMode, setBarViewMode] = useState('Month') // 'Month', 'Branch', 'Week'

  // Search filter for tables
  const [searchQuery, setSearchQuery] = useState('')

  // Active slice state for donut charts
  const [activeDonut1, setActiveDonut1] = useState(null)
  const [activeDonut2, setActiveDonut2] = useState(null)

  useEffect(() => {
    let active = true
    const loadDashboard = () => {
      setLoadingStats(true); setDashboardError(false)
      return Promise.allSettled([
        studentAdmissionApi.getAll(),
        studentProfilesApi.getAll(),
        facultyService.list(),
        subjectService.getSubjects(),
      ])
        .then(([admRes, studentRes, facRes, subRes]) => {
          if (!active) return
          setDashboardError([admRes, studentRes, facRes, subRes].some(result => result.status !== 'fulfilled' || !Array.isArray(result.value)))
          setSetupApiAvailability({
            admissions: admRes.status === 'fulfilled' && Array.isArray(admRes.value),
            faculty: facRes.status === 'fulfilled' && Array.isArray(facRes.value),
          })
          if (admRes.status === 'fulfilled' && Array.isArray(admRes.value)) setAdmissions(admRes.value)
          if (studentRes.status === 'fulfilled' && Array.isArray(studentRes.value)) setStudents(studentRes.value)
          if (facRes.status === 'fulfilled' && Array.isArray(facRes.value)) setFaculty(facRes.value)
          if (subRes.status === 'fulfilled' && Array.isArray(subRes.value)) setSubjects(subRes.value)
          setLastUpdated(new Date())
          setLoadingStats(false)
        })
        .catch(() => {
          if (active) { setLoadingStats(false); setDashboardError(true) }
        })
    }

    loadDashboard()
    const interval = window.setInterval(loadDashboard, 45000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [selectedCollegeId, selectedAcademicYearId, refreshVersion])

  useEffect(() => {
    let active = true
    profileApi.getProfile()
      .then((profile) => {
        if (active && profile.fullName) setUserName(profile.fullName)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  // Context-filtered Real Admissions
  const scopedAdmissions = useMemo(() => {
    return admissions.filter((item) => {
      let colMatch = true
      if (selectedCollegeId) {
        const colId = item.admission?.collegeId ?? item.collegeId ?? item.academic?.collegeId
        colMatch = !colId || String(colId) === String(selectedCollegeId)
      }
      let yrMatch = true
      if (selectedAcademicYearId) {
        const yrId = item.academic?.academicYearId ?? item.academicYearId
        const yrName = item.academic?.academicYear ?? item.academicYear
        yrMatch =
          (!yrId && !yrName) ||
          (yrId && String(yrId) === String(selectedAcademicYearId)) ||
          (selectedAcademicYear?.name &&
            yrName &&
            yrName.trim().toLowerCase() === selectedAcademicYear.name.trim().toLowerCase())
      }
      return colMatch && yrMatch
    })
  }, [admissions, selectedCollegeId, selectedAcademicYearId, selectedAcademicYear])

  const scopedStudents = useMemo(() => students.filter((item) => {
    const collegeId = item.collegeId ?? item.admission?.collegeId ?? item.academic?.collegeId
    const yearId = item.academicYearId ?? item.academic?.academicYearId
    const yearName = item.academicYear ?? item.academic?.academicYear
    const matchesCollege = !selectedCollegeId || !collegeId || String(collegeId) === String(selectedCollegeId)
    const matchesYear = !selectedAcademicYearId || (!yearId && !yearName) ||
      (yearId && String(yearId) === String(selectedAcademicYearId)) ||
      (selectedAcademicYear?.name && yearName && yearName.trim().toLowerCase() === selectedAcademicYear.name.trim().toLowerCase())
    return matchesCollege && matchesYear
  }), [students, selectedCollegeId, selectedAcademicYearId, selectedAcademicYear])

  const approvedAdmissions = useMemo(() => {
    return scopedAdmissions.filter((item) => {
      const s = String(item.status || item.currentStatus || '').toUpperCase()
      return s === 'APPROVED' || s === 'ADMITTED'
    })
  }, [scopedAdmissions])

  const pendingAdmissions = useMemo(() => {
    return scopedAdmissions.filter((item) => {
      const s = String(item.status || item.currentStatus || '').toUpperCase()
      return ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED'].includes(s)
    })
  }, [scopedAdmissions])

  const otherAdmissions = Math.max(
    0,
    scopedAdmissions.length - approvedAdmissions.length - pendingAdmissions.length
  )

  // Context-scoped counts
  const scopedBranches = branches.filter(
    (b) => !selectedCollegeId || !b.collegeId || String(b.collegeId) === String(selectedCollegeId)
  )
  const scopedDepartments = scopeRecords(departments)
  const activeBranchesCount = scopedBranches.filter((branch) =>
    branch.isActive !== false && !['INACTIVE', 'DISABLED', 'ARCHIVED'].includes(String(branch.status || '').toUpperCase())
  ).length
  const scopedCourses = courses.filter(
    (c) => !selectedCollegeId || !c.collegeId || String(c.collegeId) === String(selectedCollegeId)
  )
  const scopedSections = sections.filter(
    (s) => !selectedAcademicYearId || !s.academicYearId || String(s.academicYearId) === String(selectedAcademicYearId)
  )

  // =========================================================================
  // REAL ENROLLMENT VELOCITY DATA ENGINE (SYNCHRONIZED WITH ACTUAL ADMISSIONS)
  // =========================================================================
  const enrollmentVelocityData = useMemo(() => {
    const totalCount = scopedAdmissions.length

    // Mode 1: Group By Branch (Real Branch Enrollments)
    if (barViewMode === 'Branch') {
      const branchMap = {}
      // Initialize with active branches in context
      scopedBranches.forEach((b) => {
        const name = b.branchCode || b.shortName || b.name || b.branchName || 'Branch'
        branchMap[name] = 0
      })

      // Count actual admissions per branch
      scopedAdmissions.forEach((adm) => {
        const bName =
          adm.academic?.branchCode ||
          adm.academic?.branchName ||
          adm.branchCode ||
          adm.branchName ||
          adm.academic?.branch ||
          'CSE'
        // Match or find closest branch code
        const matched = Object.keys(branchMap).find(
          (k) => bName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(bName.toLowerCase())
        ) || bName
        branchMap[matched] = (branchMap[matched] || 0) + 1
      })

      const entries = Object.entries(branchMap)
      const maxVal = Math.max(...entries.map(([, v]) => v), 1)

      return entries.map(([label, val]) => ({
        label: label.length > 8 ? label.substring(0, 7) + '..' : label,
        fullLabel: label,
        value: val,
        fillHeight: Math.max(12, Math.round((val / maxVal) * 100)),
      }))
    }

    const trend = buildTrend(scopedAdmissions, barViewMode)
    const max = Math.max(1, ...trend.buckets.map(bucket => bucket.value))
    return trend.buckets.map(bucket => ({ label: bucket.label, fullLabel: bucket.label, value: bucket.value, fillHeight: bucket.value / max * 100 }))
  }, [barViewMode, scopedAdmissions, scopedBranches])

  // Real Admissions Inflow Trend Wave (Synchronized exactly with real count)
  const inflowTrendData = useMemo(() => {
    const trend = buildTrend(scopedAdmissions, inflowTimeframe)
    return { labels: trend.buckets.map(bucket => bucket.label), points: trend.buckets.map(bucket => bucket.value), subtext: `${approvedAdmissions.length} Approved | ${pendingAdmissions.length} In Review${trend.undated ? ` | ${trend.undated} without dates` : ''}` }
  }, [inflowTimeframe, scopedAdmissions, approvedAdmissions.length, pendingAdmissions.length])

  // Donut 1 Segments (Real Admission Statuses: Exact Counts)
  const sourceSegments = useMemo(() => {
    const total = scopedAdmissions.length
    if (total === 0) {
      return [
        { label: 'Approved', value: 0, color: 'var(--success)' },
        { label: 'Pending Review', value: 0, color: 'var(--info)' },
        { label: 'Under Verification', value: 0, color: 'var(--warning)' },
      ]
    }
    return [
      { label: 'Approved', value: approvedAdmissions.length, color: 'var(--success)' },
      { label: 'Under Review', value: pendingAdmissions.length, color: 'var(--info)' },
      { label: 'Under Verification', value: otherAdmissions, color: 'var(--warning)' },
    ].filter((item) => item.value > 0 || total === 0)
  }, [scopedAdmissions.length, approvedAdmissions.length, pendingAdmissions.length, otherAdmissions])

  // Donut 2 Segments (Real Branch Distribution: Exact Counts)
  const branchSegments = useMemo(() => {
    const map = {}
    scopedAdmissions.forEach((item) => {
      const bName =
        item.academic?.branchName ||
        item.branchName ||
        item.academic?.branch ||
        'Unassigned'
      map[bName] = (map[bName] || 0) + 1
    })

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
    if (entries.length > 0) {
      const distinctColors = ['var(--info)', 'var(--brand)', 'var(--chart-series-3)', 'var(--success)', 'var(--warning)']
      return entries.slice(0, 4).map(([label, val], idx) => ({
        label,
        value: val,
        color: distinctColors[idx % distinctColors.length],
      }))
    }

    return []
  }, [scopedAdmissions, branches])

  // Real Recent Admissions List from Database
  const recentAdmissionsList = useMemo(() => {
    const list = scopedAdmissions.length > 0
      ? scopedAdmissions.map((item, idx) => {
          const name =
            item.personal?.fullName ||
            item.fullName ||
            item.studentName ||
            item.personal?.name ||
            `Applicant #${item.applicationNumber || item.id || idx + 101}`
          const branch =
            item.academic?.branchName ||
            item.branchName ||
            item.academic?.branch ||
            'Engineering'
          const appNo = item.applicationNumber || item.admissionNumber || 'Not provided'
          const status = String(item.status || item.currentStatus || 'Pending').toUpperCase()
          const isApproved = status === 'APPROVED' || status === 'ADMITTED'

          return {
            id: item.id || idx,
            name,
            branch,
            appNo,
            status: isApproved ? 'Approved' : 'Under Review',
            isApproved,
          }
        })
      : []

    if (!searchQuery) return list.slice(0, 5)
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.appNo.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5)
  }, [scopedAdmissions, searchQuery])

  // Real Academic Departments & Program Matrix
  const academicProgramsList = useMemo(() => {
    const list = departments.length > 0
      ? departments.map((dept, idx) => {
          const deptId = dept.id || dept.departmentId
          const deptCourses = courses.filter((c) => String(c.departmentId) === String(deptId))
          const deptBranches = branches.filter((b) => String(b.departmentId) === String(deptId))
          const deptIntake = deptBranches.reduce((acc, b) => acc + Number(b.intakeCapacity || b.intake || 0), 0)
          const deptIcons = ['var(--brand)', 'var(--info)', 'var(--success)', 'var(--warning)']

          return {
            id: deptId || idx,
            name: dept.name || dept.departmentName || `Department of Engg`,
            code: dept.code || dept.departmentCode || `DEPT-${idx + 1}`,
            coursesCount: deptCourses.length,
            branchesCount: deptBranches.length,
            intake: deptBranches.some(branch => branch.intakeCapacity != null || branch.intake != null) ? `${deptIntake} Seats` : 'Not configured',
            color: deptIcons[idx % deptIcons.length],
          }
        })
      : []

    if (!searchQuery) return list.slice(0, 4)
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 4)
  }, [departments, courses, branches, searchQuery])

  const yearName = selectedAcademicYear?.academicYearName || selectedAcademicYear?.name || 'Active Session 2026-27'
  const roleName = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Administrator'

  // Count completion only for stages backed by the existing live context/API data.
  // Academic Levels, rooms and fee structures do not currently expose a shared
  // setup-status source here, so they are shown as unavailable instead of guessed.
  const academicDataUnavailable = Boolean(academicLoading || academicError)
  const setupFlowSteps = [
    { title: 'College', count: academicDataUnavailable ? 'Status unavailable' : selectedCollege ? 'Selected' : 'Select a college', route: '/college-institution-management', icon: FiHome, isConfigured: academicDataUnavailable ? null : Boolean(selectedCollege), color: 'var(--brand)' },
    { title: 'Academic Year', count: academicDataUnavailable ? 'Status unavailable' : selectedAcademicYear ? `${yearName.split(' ')[0]}` : 'Configure', route: '/academic-year-management', icon: FiCalendar, isConfigured: academicDataUnavailable ? null : Boolean(selectedAcademicYear), color: 'var(--brand)' },
    { title: 'Academic Levels', count: 'Status unavailable', route: null, icon: FiLayers, isConfigured: null, color: 'var(--text-muted)' },
    { title: 'Departments', count: academicDataUnavailable ? 'Status unavailable' : `${scopedDepartments.length} Units`, route: '/academic-structure?step=departments', icon: FiGrid, isConfigured: academicDataUnavailable ? null : scopedDepartments.length > 0, color: 'var(--info)' },
    { title: 'Courses', count: academicDataUnavailable ? 'Status unavailable' : `${scopedCourses.length} Programs`, route: '/academic-structure?step=courses', icon: FiLayers, isConfigured: academicDataUnavailable ? null : scopedCourses.length > 0, color: 'var(--success)' },
    { title: 'Branches', count: academicDataUnavailable ? 'Status unavailable' : `${scopedBranches.length} Streams`, route: '/academic-structure?step=branches', icon: FiBriefcase, isConfigured: academicDataUnavailable ? null : scopedBranches.length > 0, color: 'var(--warning)' },
    { title: 'Semesters', count: academicDataUnavailable ? 'Status unavailable' : `${semesters.length} Terms`, route: '/semester-management', icon: FiClock, isConfigured: academicDataUnavailable ? null : semesters.length > 0, color: 'var(--brand)' },
    { title: 'Sections', count: academicDataUnavailable ? 'Status unavailable' : `${scopedSections.length} Batches`, route: '/section-management', icon: FiUsers, isConfigured: academicDataUnavailable ? null : scopedSections.length > 0, color: 'var(--info)' },
    { title: 'Rooms & Classrooms', count: 'Status unavailable', route: '/rooms-management', icon: FiGrid, isConfigured: null, color: 'var(--text-muted)' },
    { title: 'Fee Structure', count: 'Status unavailable', route: '/fees/structures', icon: FiLayers, isConfigured: null, color: 'var(--text-muted)' },
    { title: 'Faculty Setup', count: setupApiAvailability.faculty === null ? 'Status unavailable' : `${faculty.length} Records`, route: '/faculty', icon: FiBriefcase, isConfigured: setupApiAvailability.faculty === null ? null : faculty.length > 0, color: 'var(--info)' },
    { title: 'Student Admissions', count: setupApiAvailability.admissions === null ? 'Status unavailable' : `${scopedAdmissions.length} Records`, route: '/student-management/admissions', icon: FiUserPlus, isConfigured: setupApiAvailability.admissions === null ? null : scopedAdmissions.length > 0, color: 'var(--success)' },
  ]
  const availableSetupStages = setupFlowSteps.filter(step => step.isConfigured !== null)
  const completedSetupStages = availableSetupStages.filter(step => step.isConfigured).length
  const unavailableSetupStages = setupFlowSteps.length - availableSetupStages.length

  const totalSourceCount = scopedAdmissions.length
  const totalBranchCandCount = scopedAdmissions.length || branchSegments.reduce((acc, s) => acc + s.value, 0)

  // Approval Rate Calculation
  const approvalRate = scopedAdmissions.length > 0
    ? Math.round((approvedAdmissions.length / scopedAdmissions.length) * 100)
    : 0

  if (loadingStats || dashboardError) return <DashboardLayout><main className="ym-dashboard-wrapper"><AsyncState status={loadingStats ? 'loading' : 'error'} title={loadingStats ? 'Loading dashboard…' : 'Dashboard data is unavailable.'} message={dashboardError ? 'Please retry to load current college records.' : undefined} onRetry={() => setRefreshVersion(version => version + 1)} /></main></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="ym-dashboard-wrapper">
        {/* =========================================================================
            ROW 1: WELCOME HERO + INFLOW WAVE (INDIGO) + DONUT 1 (STATUS)
           ========================================================================= */}
        <section className="ym-grid-row-1">
          {/* 1. Welcome Card with Live Institutional Data */}
          <div className="ym-card ym-welcome-card">
            <div className="ym-welcome-text">
              <div className="ym-welcome-greeting">
                <div>
                  <h2>Welcome back, {userName || 'there'}</h2>
                  <p>Unified institutional operations, student lifecycle & academic delivery.</p>
                </div>
              </div>

              {/* Live campus overview */}
              <div className="ym-summary-chips ym-hero-stats">
                <button type="button" className="ym-hero-stat" onClick={() => navigate('/student-management/admissions')}>
                  <span className="ym-hero-stat-icon is-purple"><FiUserPlus /></span><span><strong>{scopedAdmissions.length}</strong><small>Admissions</small></span>
                </button>
                <button type="button" className="ym-hero-stat" onClick={() => navigate('/student-management/profiles')}>
                  <span className="ym-hero-stat-icon is-blue"><FiUsers /></span><span><strong>{scopedStudents.length}</strong><small>Total Students</small></span>
                </button>
                <button type="button" className="ym-hero-stat" onClick={() => navigate('/academic-structure?step=branches')}>
                  <span className="ym-hero-stat-icon is-teal"><FiLayers /></span><span><strong>{activeBranchesCount}</strong><small>Active Branches</small></span>
                </button>
                <button type="button" className="ym-hero-stat" onClick={() => navigate('/faculty')}>
                  <span className="ym-hero-stat-icon is-violet"><FiBriefcase /></span><span><strong>{faculty.length}</strong><small>Faculty</small></span>
                </button>
              </div>
            </div>

            {/* University campus illustration */}
            <div className="ym-welcome-visual" aria-hidden="true">
              <img className="ym-campus-art" src="/university-campus.svg" alt="" />
            </div>
          </div>

          {/* 2. Admissions Inflow Trend Wave Chart 1 (Smooth Indigo/Purple Wave with Clear X & Y Labels) */}
          <div className="ym-card ym-chart-card ym-card--inflow">
            <div className="ym-card-header">
              <div>
                <h3 className="ym-card-title text-indigo-title">Admissions & Inflow Trend</h3>
                <span className="ym-card-subtitle">{inflowTrendData.subtext}</span>
              </div>
              <div className="ym-timeframe-toggle">
                {['Day', 'Week', 'Month'].map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    className={`ym-tf-btn ${inflowTimeframe === tf ? 'is-active' : ''}`}
                    onClick={() => setInflowTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Render clear readable wave with explicit X-axis labels and value tooltips */}
            <ExplicitWaveChart
              labels={inflowTrendData.labels}
              points={inflowTrendData.points}
              color="var(--brand)"
              gradientId="ymWaveGradIndigo"
              unit="Students"
            />

            <div className="ym-wave-footer-meta">
              <span>Approval Rate: <strong className="text-indigo-bold">{approvalRate}%</strong></span>
              <Link to="/student-management/admissions" className="ym-card-link link-indigo">
                Review Queue ({pendingAdmissions.length}) <FiArrowRight />
              </Link>
            </div>
          </div>

          {/* 3. Donut Ring Chart 1: Real Admission Statuses (Rose & Emerald Palette) */}
          <div className="ym-card ym-donut-card ym-card--donut1">
            <div className="ym-card-header">
              <div>
                <h3 className="ym-card-title">Admission Pipeline</h3>
                <span className="ym-card-subtitle">{totalSourceCount} Total Registered</span>
              </div>
              {role === ROLES.ADMIN && (
                <button
                  className="ym-refresh-icon-btn"
                  onClick={() => setRefreshVersion((v) => v + 1)}
                  disabled={loadingStats}
                  title="Refresh Live Data"
                  type="button"
                >
                  <FiRefreshCw className={loadingStats ? 'is-spinning' : ''} />
                </button>
              )}
            </div>

            <div className="ym-donut-body">
              <InteractiveDonutRing
                total={totalSourceCount}
                segments={sourceSegments}
                activeSegment={activeDonut1}
                onSelect={setActiveDonut1}
              />
              <div className="ym-donut-legend">
                {sourceSegments.map((seg) => {
                  const pct = totalSourceCount > 0 ? Math.round((seg.value / totalSourceCount) * 100) : 0
                  return (
                    <span
                      key={seg.label}
                      className={`ym-legend-pill ${activeDonut1 === seg.label ? 'is-highlighted' : ''}`}
                      onMouseEnter={() => setActiveDonut1(seg.label)}
                      onMouseLeave={() => setActiveDonut1(null)}
                    >
                      <i style={{ backgroundColor: seg.color }} />
                      {seg.label}: <strong>{seg.value}</strong> <small>({pct}%)</small>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ROW 2: ENROLLMENT VELOCITY (REAL DATA) + BRANCH DONUT + CURRICULUM WAVE
           ========================================================================= */}
        <section className="ym-grid-row-2">
          {/* 1. Enrollment Activity Pill Bar Chart (Real Admissions Synchronized) */}
          <div className="ym-card ym-bar-chart-card ym-card--bars">
            <div className="ym-card-header">
              <div>
                <h3 className="ym-card-title text-cyan-title">Enrollment Velocity</h3>
                <span className="ym-card-subtitle">
                  {scopedAdmissions.length} Registered Students ({barViewMode} Breakdown)
                </span>
              </div>
              <div className="ym-timeframe-toggle">
                {['Month', 'Branch', 'Week'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`ym-tf-btn ${barViewMode === mode ? 'is-active' : ''}`}
                    onClick={() => setBarViewMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="ym-bar-chart-layout">
              {/* Y-Axis scale marks */}
              <div className="ym-bar-y-axis">
                <span>{Math.max(...enrollmentVelocityData.map(d => d.value), 1)}</span>
                <span>{Math.round(Math.max(...enrollmentVelocityData.map(d => d.value), 1) / 2)}</span>
                <span>0</span>
              </div>

              {/* Bar columns with exact real candidate counts */}
              <div className="ym-bar-columns-wrap">
                {enrollmentVelocityData.map((item) => (
                  <div key={item.label} className="ym-bar-column-item">
                    <span className="ym-bar-val-badge">{item.value}</span>
                    <div className="ym-bar-track">
                      <div
                        className="ym-bar-pill ym-bar-pill--cyan"
                        style={{ height: `${item.fillHeight}%` }}
                        title={`${item.fullLabel || item.label}: ${item.value} enrolled`}
                      />
                    </div>
                    <span className="ym-bar-x-label" title={item.fullLabel || item.label}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Donut Ring Chart 2: Branch & Stream Distribution (Sky Blue & Royal Indigo Theme) */}
          <div className="ym-card ym-donut-card ym-card--donut2">
            <div className="ym-card-header">
              <div>
                <h3 className="ym-card-title">Branch Distribution</h3>
                <span className="ym-card-subtitle">{scopedBranches.length} Academic Streams</span>
              </div>
            </div>

            <div className="ym-donut-body">
              <InteractiveDonutRing
                total={totalBranchCandCount}
                segments={branchSegments}
                activeSegment={activeDonut2}
                onSelect={setActiveDonut2}
              />
              <div className="ym-donut-legend">
                {branchSegments.map((seg) => {
                  const pct = totalBranchCandCount > 0 ? Math.round((seg.value / totalBranchCandCount) * 100) : 0
                  return (
                    <span
                      key={seg.label}
                      className={`ym-legend-pill ${activeDonut2 === seg.label ? 'is-highlighted' : ''}`}
                      title={seg.label}
                      onMouseEnter={() => setActiveDonut2(seg.label)}
                      onMouseLeave={() => setActiveDonut2(null)}
                    >
                      <i style={{ backgroundColor: seg.color }} />
                      {seg.label}: <strong>{seg.value}</strong> <small>({pct}%)</small>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <section className="ym-card ym-chart-card ym-card--velocity" aria-label="Curriculum configuration">
            <div className="ym-card-header"><div><h3 className="ym-card-title">Curriculum Configuration</h3><p className="ym-card-subtitle">Current configuration for the selected college.</p></div></div>
            <dl className="dashboard-curriculum-summary"><div><dt>Subjects</dt><dd>{subjects.length}</dd></div><div><dt>Sections</dt><dd>{scopedSections.length}</dd></div><div><dt>Faculty</dt><dd>{faculty.length}</dd></div></dl>
            <div className="ym-wave-footer-meta"><Link to="/subject-management" className="ym-card-link">Subject Management <FiArrowRight /></Link></div>
          </section>
        </section>

        {/* =========================================================================
            ROW 3: RECENT ADMISSIONS TABLE + ACADEMIC DEPARTMENTS TABLE
           ========================================================================= */}
        <section className="ym-grid-row-3">
          {/* Real Recent Admissions Table */}
          <div className="ym-card ym-table-card">
            <div className="ym-card-header">
              <div>
                <h3 className="ym-card-title">Recent Student Admissions</h3>
                <span className="ym-card-subtitle">{scopedAdmissions.length} Enrolled in session</span>
              </div>
              <Link to="/student-management/admissions" className="ym-card-link">
                View All <FiArrowRight />
              </Link>
            </div>

            <div className="ym-table-responsive">
              <table className="ym-data-table">
                <thead>
                  <tr>
                    <th className="ym-admissions-name-col">Candidate Name</th>
                    <th className="ym-admissions-id-col">Application ID</th>
                    <th className="ym-admissions-status-col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!recentAdmissionsList.length && <tr><td colSpan={3}>No admissions found for this selection.</td></tr>}
                  {recentAdmissionsList.map((item) => (
                    <tr key={item.id}>
                      <td className="ym-admissions-name-col">
                        <div className="ym-candidate-cell">
                          <div className="ym-candidate-avatar">
                            <FiUser />
                          </div>
                          <div className="ym-candidate-info">
                            <strong>{item.name}</strong>
                            <small>{item.branch}</small>
                          </div>
                        </div>
                      </td>
                      <td className="ym-admissions-id-col">
                        <span className="ym-fee-tag">{item.appNo}</span>
                      </td>
                      <td className="ym-admissions-status-col">
                        <span className={`ym-status-badge ${item.isApproved ? 'approved' : 'pending'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real Academic Departments & Program Matrix */}
          <div className="ym-card ym-table-card">
            <div className="ym-card-header">
              <div>
                <h3 className="ym-card-title">Academic Units & Capacities</h3>
                <span className="ym-card-subtitle">{departments.length} Departments | {scopedCourses.length} Degree Programs</span>
              </div>
              <Link to="/academic-structure?step=departments" className="ym-card-link">
                Manage <FiArrowRight />
              </Link>
            </div>

            <div className="ym-table-responsive">
              <table className="ym-data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Streams</th>
                    <th style={{ textAlign: 'right' }}>Total Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {!academicProgramsList.length && <tr><td colSpan={3}>No academic units found for this selection.</td></tr>}
                  {academicProgramsList.map((dept) => (
                    <tr key={dept.id}>
                      <td>
                        <div className="ym-prog-cell">
                          <div className="ym-prog-icon" style={{ backgroundColor: `color-mix(in srgb, ${dept.color} 12%, transparent)`, color: dept.color }}>
                            <FiGrid />
                          </div>
                          <div className="ym-candidate-info">
                            <strong>{dept.name}</strong>
                            <small>Code: {dept.code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ym-category-tag">{dept.branchesCount} Branches</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong className="ym-fee-tag">{dept.intake}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            ROW 4: CONNECTED 8-STEP ACADEMIC SETUP WORKFLOW PIPELINE
           ========================================================================= */}
        {role === ROLES.ADMIN && (
          <section className="ym-card ym-workflow-card">
            <div className="ym-card-header">
              <div>
                <h3 className="ym-card-title">College Setup Progress</h3>
                <span className="ym-card-subtitle">{completedSetupStages} of {availableSetupStages.length} connected stages complete; {unavailableSetupStages} stage statuses are not available from the current APIs.</span>
              </div>
              <Link to="/college-institution-management" className="ym-card-link">
                Configure Setup <FiChevronRight />
              </Link>
            </div>

            <div className="ym-flow-pipeline">
              {setupFlowSteps.map((step, idx) => {
                const StepIcon = step.icon
                const content = <>
                  <div className="ym-flow-icon-circle" style={{ backgroundColor: `color-mix(in srgb, ${step.color} 12%, transparent)`, color: step.color }}>
                    <StepIcon />
                  </div>
                  <div className="ym-flow-text">
                    <strong>{step.title}</strong>
                    <small style={{ color: step.color }}>{step.count}</small>
                  </div>
                  {idx < setupFlowSteps.length - 1 && (
                    <div className="ym-flow-arrow" aria-hidden="true">
                      <FiChevronRight />
                    </div>
                  )}
                </>
                const className = `ym-flow-item ${step.isConfigured ? 'is-active-step' : ''}${step.isConfigured === null ? ' is-setup-status-unavailable' : ''}`
                return step.route ? (
                  <Link key={step.title} to={step.route} className={className} title={step.isConfigured === null ? 'Completion status is not available from current APIs.' : undefined}>
                    {content}
                  </Link>
                ) : (
                  <div key={step.title} className={className} role="note" title="No academic-level setup screen is currently connected.">
                    {content}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* =========================================================================
            ROW 5: QUICK ACTION SHORTCUTS MATRIX
           ========================================================================= */}
        <section className="ym-card ym-quick-actions-card">
          <div className="ym-card-header">
            <div>
              <h3 className="ym-card-title">Quick Action Command Center</h3>
              <span className="ym-card-subtitle">Direct shortcuts to operational tasks & management screens</span>
            </div>
          </div>

          <div className="ym-actions-grid">
            {role === ROLES.ADMIN ? (
              <>
                <Link to="/student-management/admissions/new" className="ym-action-item">
                  <div className="ym-action-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }}><FiUserPlus /></div>
                  <div className="ym-action-body">
                    <strong>New Student Admission</strong>
                    <small>Enroll new candidate</small>
                  </div>
                  <FiArrowRight className="ym-action-arrow" />
                </Link>

                <Link to="/student-management/admissions" className="ym-action-item">
                  <div className="ym-action-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}><FiUserCheck /></div>
                  <div className="ym-action-body">
                    <strong>Review Admissions</strong>
                    <small>{pendingAdmissions.length} applications pending</small>
                  </div>
                  <FiArrowRight className="ym-action-arrow" />
                </Link>

                <Link to="/section-management" className="ym-action-item">
                  <div className="ym-action-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--info) 12%, transparent)', color: 'var(--info)' }}><FiUsers /></div>
                  <div className="ym-action-body">
                    <strong>Section Allotment</strong>
                    <small>{scopedSections.length} batches active</small>
                  </div>
                  <FiArrowRight className="ym-action-arrow" />
                </Link>

                <Link to="/subject-management" className="ym-action-item">
                  <div className="ym-action-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)' }}><FiBookOpen /></div>
                  <div className="ym-action-body">
                    <strong>Subject Management</strong>
                    <small>{subjects.length} syllabi configured</small>
                  </div>
                  <FiArrowRight className="ym-action-arrow" />
                </Link>

                <Link to="/faculty" className="ym-action-item">
                  <div className="ym-action-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)', color: 'var(--warning)' }}><FiBriefcase /></div>
                  <div className="ym-action-body">
                    <strong>Faculty Roster</strong>
                    <small>{faculty.length} teaching staff</small>
                  </div>
                  <FiArrowRight className="ym-action-arrow" />
                </Link>

                <Link to="/timetable" className="ym-action-item">
                  <div className="ym-action-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)' }}><FiCalendar /></div>
                  <div className="ym-action-body">
                    <strong>Timetable Matrix</strong>
                    <small>Schedule classes & rooms</small>
                  </div>
                  <FiArrowRight className="ym-action-arrow" />
                </Link>
              </>
            ) : (
              <Link to="/my-subjects" className="ym-action-item">
                <div className="ym-action-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)' }}><FiBookOpen /></div>
                <div className="ym-action-body">
                  <strong>My Assigned Subjects</strong>
                  <small>View assigned curriculum</small>
                </div>
                <FiArrowRight className="ym-action-arrow" />
              </Link>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

/* =========================================================================
   EXPLICIT WAVE CHART WITH VISIBLE X-AXIS, Y-AXIS GRID & POINT LABELS
   ========================================================================= */
function ExplicitWaveChart({ labels = [], points = [], color = 'var(--brand)', gradientId = 'grad', unit = '' }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const width = 300
  const height = 90
  const paddingLeft = 24
  const paddingRight = 14
  const paddingTop = 14
  const paddingBottom = 16

  const usableWidth = width - paddingLeft - paddingRight
  const usableHeight = height - paddingTop - paddingBottom
  const maxVal = Math.max(...points, 1)
  const minVal = Math.min(...points, 0)
  const range = maxVal - minVal || 1

  // Compute exact coordinates with Y-axis scale offset
  const coords = useMemo(() => {
    return points.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(1, points.length - 1)) * usableWidth
      const ratio = (p - minVal) / range
      const y = height - paddingBottom - ratio * usableHeight
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        val: p,
        label: labels[idx] || `${idx + 1}`,
      }
    })
  }, [points, labels, minVal, range, usableWidth, usableHeight, height, paddingBottom, paddingLeft])

  // Build Spline Curve
  const { strokeD, fillD } = useMemo(() => {
    if (!coords || coords.length === 0) return { strokeD: '', fillD: '' }
    if (coords.length === 1) {
      const pt = coords[0]
      return {
        strokeD: `M ${pt.x},${pt.y} L ${pt.x + 10},${pt.y}`,
        fillD: `M ${pt.x},${pt.y} L ${pt.x + 10},${pt.y} L ${pt.x + 10},${height} L ${pt.x},${height} Z`,
      }
    }

    let d = `M ${coords[0].x},${coords[0].y}`
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const dx = p2.x - p1.x
      const cp1x = (p1.x + dx * 0.45).toFixed(1)
      const cp1y = p1.y.toFixed(1)
      const cp2x = (p2.x - dx * 0.45).toFixed(1)
      const cp2y = p2.y.toFixed(1)

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
    }

    const first = coords[0]
    const last = coords[coords.length - 1]
    const fill = `${d} L ${last.x.toFixed(1)},${height - paddingBottom} L ${first.x.toFixed(1)},${height - paddingBottom} Z`

    return { strokeD: d, fillD: fill }
  }, [coords, height, paddingBottom])

  return (
    <div className="ym-explicit-chart-wrap">
      {/* Visual Chart Container */}
      <div className="ym-explicit-chart-body">
        {/* Y-Axis scale marks on left */}
        <div className="ym-explicit-y-axis">
          <span>{maxVal}</span>
          <span>{Math.round((maxVal + minVal) / 2)}</span>
          <span>{minVal}</span>
        </div>

        {/* SVG Curve & Grid */}
        <div className="ym-explicit-svg-wrap">
          <svg className="ym-wave-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="85%" stopColor={color} stopOpacity="0.04" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Horizontal Guide Lines */}
            <line
              x1={paddingLeft}
              y1={paddingTop}
              x2={width - paddingRight}
              y2={paddingTop}
              stroke="var(--border, #D8E4F2)"
              strokeDasharray="3 3"
              strokeWidth="0.8"
            />
            <line
              x1={paddingLeft}
              y1={height - paddingBottom}
              x2={width - paddingRight}
              y2={height - paddingBottom}
              stroke="var(--border, #D8E4F2)"
              strokeWidth="1"
            />

            {/* Filled Area */}
            <path d={fillD} fill={`url(#${gradientId})`} />

            {/* Main Smooth Spline Line */}
            <path
              d={strokeD}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Point Markers with Value Badges */}
            {coords.map((c, idx) => (
              <g key={idx} className="ym-chart-point-group">
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={hoveredIdx === idx ? 5 : 3.5}
                  fill={hoveredIdx === idx ? 'var(--surface)' : color}
                  stroke={color}
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            ))}
          </svg>

          {/* Active Floating Tooltip */}
          {hoveredIdx !== null && coords[hoveredIdx] && (
            <div
              className="ym-wave-tooltip"
              style={{
                left: `${(coords[hoveredIdx].x / width) * 100}%`,
                top: `${(coords[hoveredIdx].y / height) * 100}%`,
              }}
            >
              <strong>{coords[hoveredIdx].label}</strong>: {coords[hoveredIdx].val} {unit}
            </div>
          )}
        </div>
      </div>

      {/* Explicit X-Axis Label Row underneath the chart */}
      <div className="ym-explicit-x-axis" style={{ paddingLeft: '24px' }}>
        {labels.map((lbl, idx) => (
          <span
            key={idx}
            className={`ym-x-lbl ${hoveredIdx === idx ? 'is-active-x' : ''}`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {lbl}
          </span>
        ))}
      </div>
    </div>
  )
}

/* =========================================================================
   INTERACTIVE DONUT RING COMPONENT
   ========================================================================= */
function InteractiveDonutRing({ total, segments, activeSegment, onSelect }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const currentSegment = segments.find((s) => s.label === activeSegment)

  return (
    <div className="ym-donut-graphic">
      <svg viewBox="0 0 120 120" className="ym-donut-svg">
        <circle className="ym-donut-track" cx="60" cy="60" r={radius} />
        {segments.map((seg) => {
          const strokeLength = total > 0 ? (seg.value / total) * circumference : 0
          const isActive = activeSegment === seg.label
          const circle = (
            <circle
              key={seg.label}
              className={`ym-donut-slice ${isActive ? 'is-active-slice' : ''}`}
              cx="60"
              cy="60"
              r={radius}
              stroke={seg.color}
              strokeWidth={isActive ? 16 : 14}
              strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
              strokeDashoffset={-offset}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onSelect && onSelect(seg.label)}
              onMouseLeave={() => onSelect && onSelect(null)}
            />
          )
          offset += strokeLength
          return circle
        })}
      </svg>
      <div className="ym-donut-middle">
        {currentSegment ? (
          <>
            <strong className="ym-donut-val" style={{ color: currentSegment.color }}>
              {currentSegment.value}
            </strong>
            <span className="ym-donut-lbl" title={currentSegment.label}>
              {currentSegment.label}
            </span>
          </>
        ) : (
          <>
            <strong className="ym-donut-val">{total}</strong>
            <span className="ym-donut-lbl">Total</span>
          </>
        )}
      </div>
    </div>
  )
}

return { default: Dashboard }
})()

// ForgotPassword screen and private helpers.
const ForgotPasswordScreen = (() => {
const GENERIC_ERROR_MESSAGE = userErrorImports_GENERIC_ERROR_MESSAGE
const showSuccess = toastImports_showSuccess
const useToastState = useToastStateImports_default
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useRef = reactImports_useRef
const useState = reactImports_useState
const AuthRequestError = authApiImports_AuthRequestError
const generateOtp = authApiImports_generateOtp
const resendOtp = authApiImports_resendOtp
const verifyOtp = authApiImports_verifyOtp
const resetPassword = authApiImports_resetPassword
const notifyApiUnavailable = apiFailureNoticeImports_notifyApiUnavailable
const isValidContact = (value, method) => method === 'email'
  ? /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(value)
  : /^[6-9]\d{9}$/.test(value)

function ForgotPassword({ onBack }) {
  const [method, setMethod] = useState('email')
  const [contact, setContact] = useState('')
  const [contactTouched, setContactTouched] = useState(false)
  const [error, setError] = useToastState('', 'error')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('contact')
  const [loading, setLoading] = useState(false)
  const [demoOtp, setDemoOtp] = useState('')
  const [timer, setTimer] = useState(0)
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })
  const [visiblePasswords, setVisiblePasswords] = useState({ password: false, confirmPassword: false })
  const otpRefs = useRef([])

  const contactErrorMsg = useMemo(() => {
    const cleanContact = contact.trim()
    if (!cleanContact) return ''
    if (!isValidContact(cleanContact, method)) {
      return method === 'email' ? 'Please enter a valid email ID.' : 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
    }
    return ''
  }, [contact, method])
  const activeContactError = (contactTouched || Boolean(contact.trim())) ? (contactErrorMsg || error) : error

  useEffect(() => {
    if (!timer) return undefined
    const interval = window.setInterval(() => setTimer((value) => value - 1), 1000)
    return () => window.clearInterval(interval)
  }, [timer])

  const requestOtp = async (event) => {
    event?.preventDefault()
    const cleanContact = contact.trim()
    if (!cleanContact) {
      setError(method === 'email' ? 'Please enter your email ID.' : 'Please enter your mobile number.')
      return
    }
    if (!isValidContact(cleanContact, method)) {
      setError(method === 'email' ? 'Please enter a valid email ID.' : 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.')
      return
    }
    setLoading(true)
    setError('')
    try {
      let res
      try {
        res = await (step === 'otp' ? resendOtp : generateOtp)({ contact: cleanContact, purpose: 'PASSWORD_RESET' })
      } catch (err) {
        if (method === 'email') {
          const fbRes = await fetch('/api/v1/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ identifier: cleanContact })
          })
          if (fbRes.status >= 500) { notifyApiUnavailable({ status: fbRes.status }); throw new Error(GENERIC_ERROR_MESSAGE) }
          const fbData = await fbRes.json().catch(() => ({}))
          if (fbRes.ok && (fbData?.success || fbData?.data?.success)) {
            res = {
              success: true,
              message: fbData?.message || fbData?.data?.message || 'Verification code sent successfully.',
              otp: fbData?.data?.otp || fbData?.otp || ''
            }
          } else {
            throw err
          }
        } else {
          throw err
        }
      }
      setDemoOtp(res?.otp || '')
      setStep('otp'); showSuccess(res?.message || 'Verification code sent successfully.')
      setTimer(60)
    } catch (requestError) {
      setError(requestError instanceof AuthRequestError ? requestError.message : 'Unable to send the verification code.')
    } finally {
      setLoading(false)
    }
  }

  const validateOtp = async (event) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(otp)) return setError('Please enter a valid 6-digit OTP code.')
    setLoading(true)
    setError('')
    try {
      await verifyOtp({ contact: contact.trim(), otp, purpose: 'PASSWORD_RESET' })
      setStep('change-password'); showSuccess('Verification code verified successfully.')
    } catch (verificationError) {
      setError(verificationError instanceof AuthRequestError ? verificationError.message : 'Unable to verify the OTP.')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    const newPassword = passwords.password.trim()
    const confirmed = passwords.confirmPassword.trim()

    if (!newPassword || !confirmed) {
      setError('Please fill in both password fields.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }
    if (newPassword !== confirmed) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await resetPassword({ contact: contact.trim(), otp, password: newPassword })
      sessionStorage.setItem('btech-logout-message', 'Password changed successfully. Please sign in with your new password.')
      onBack()
      window.history.replaceState(null, '', '/login')
      window.setTimeout(() => window.location.reload(), 0)
    } catch (resetError) {
      setError(resetError instanceof AuthRequestError ? resetError.message : 'Unable to reset your password right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateOtp = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtp((current) => `${current.padEnd(6, ' ').slice(0, index)}${digit || ' '}${current.padEnd(6, ' ').slice(index + 1)}`.trimEnd())
    setError('')
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  if (step === 'success') return <div className="login-form recovery-success" role="status"><header><h2>Password changed</h2><p>Your password has been updated successfully. You can now sign in with your new password.</p></header><button className="sign-in-button" type="button" onClick={onBack}>Back to Sign In</button></div>

  if (step === 'change-password') return (
    <form className="login-form" onSubmit={changePassword} noValidate>
      <header><h2>Change password</h2><p>Create a new password for your account.</p></header>
      <label className="recovery-password" htmlFor="new-password"><span>New password</span><div className="recovery-password-input"><input id="new-password" type={visiblePasswords.password ? 'text' : 'password'} autoComplete="new-password" value={passwords.password} onChange={(event) => { setPasswords((current) => ({ ...current, password: event.target.value })); setError('') }} /><button type="button" className="recovery-password-toggle" aria-label={`${visiblePasswords.password ? 'Hide' : 'Show'} new password`} title={`${visiblePasswords.password ? 'Hide' : 'Show'} new password`} onClick={() => setVisiblePasswords((current) => ({ ...current, password: !current.password }))}>{visiblePasswords.password ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></div></label>
      <label className="recovery-password" htmlFor="confirm-password"><span>Confirm new password</span><div className="recovery-password-input"><input id="confirm-password" type={visiblePasswords.confirmPassword ? 'text' : 'password'} autoComplete="new-password" value={passwords.confirmPassword} onChange={(event) => { setPasswords((current) => ({ ...current, confirmPassword: event.target.value })); setError('') }} /><button type="button" className="recovery-password-toggle" aria-label={`${visiblePasswords.confirmPassword ? 'Hide' : 'Show'} confirm new password`} title={`${visiblePasswords.confirmPassword ? 'Hide' : 'Show'} confirm new password`} onClick={() => setVisiblePasswords((current) => ({ ...current, confirmPassword: !current.confirmPassword }))}>{visiblePasswords.confirmPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></div></label>
      {activeContactError && <p className="form-error" role="alert">{activeContactError}</p>}
      <button className="sign-in-button" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Change Password'}</button>
      <button type="button" className="text-button back-to-login" onClick={onBack}>Cancel</button>
    </form>
  )

  if (step === 'otp') return (
    <form className="login-form" onSubmit={validateOtp} noValidate>
      <header><h2>Verification code</h2><p>Enter the 6-digit code sent to <strong>{contact.trim()}</strong>.</p></header>
      <fieldset className="otp-fieldset compact-otp-fieldset"><legend>Verification code</legend><div className="otp-boxes compact-otp-boxes" onPaste={(event) => { const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (pasted) { event.preventDefault(); setOtp(pasted); otpRefs.current[Math.min(pasted.length, 6) - 1]?.focus() } }}>{Array.from({ length: 6 }, (_, index) => <input key={index} ref={(element) => { otpRefs.current[index] = element }} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} value={otp[index] || ''} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus() }} aria-label={`OTP digit ${index + 1}`} aria-invalid={Boolean(error)} />)}</div></fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="sign-in-button" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
      <div className="recovery-actions clean-recovery-actions">
        <div className="recovery-actions-left">
          {timer > 0 ? (
            <span className="resend-countdown">Resend OTP in {timer}s</span>
          ) : (
            <button type="button" className="text-button resend-button" disabled={loading} onClick={requestOtp}>
              Resend OTP
            </button>
          )}
        </div>
        <div className="recovery-actions-right">
          <button type="button" className="text-button change-contact-btn" onClick={() => { setStep('contact'); setOtp(''); setError('') }}>
            Change contact
          </button>
          <button type="button" className="text-button cancel-btn" onClick={onBack}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  )

  const switchMethod = (nextMethod) => { setMethod(nextMethod); setContact(''); setError('') }
  return (
    <form className="login-form" onSubmit={requestOtp} noValidate>
      <header><h2>Forgot your password?</h2><p>Choose where you would like to receive your verification code.</p></header>
      <div className="recovery-tabs verification-method-tabs" role="tablist" aria-label="Verification method"><button type="button" role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'active' : ''} onClick={() => switchMethod('email')}>Email</button><button type="button" role="tab" aria-selected={method === 'mobile'} className={method === 'mobile' ? 'active' : ''} onClick={() => switchMethod('mobile')}>Mobile</button></div>
      <label htmlFor="recovery-contact"><span>{method === 'email' ? 'Email ID' : 'Mobile number'}</span><input id="recovery-contact" type="text" inputMode={method === 'email' ? 'email' : 'numeric'} autoComplete={method === 'email' ? 'email' : 'tel'} maxLength={method === 'mobile' ? 10 : undefined} placeholder={method === 'email' ? 'Enter email ID' : 'Enter mobile number'} value={contact} onBlur={() => setContactTouched(true)} onChange={(event) => { setContact(method === 'mobile' ? event.target.value.replace(/\D/g, '') : event.target.value); setContactTouched(true); setError('') }} aria-invalid={Boolean(activeContactError)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="sign-in-button" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Verification Code'}</button>
      <button type="button" className="text-button back-to-login" onClick={onBack}><FiArrowLeft aria-hidden="true" /> Back to Sign In</button>
    </form>
  )
}

return { default: ForgotPassword }
})()

// LandingPage screen and private helpers.
const LandingPageScreen = (() => {
const useEffect = reactImports_useEffect
const useRef = reactImports_useRef
const useState = reactImports_useState
const Link = react_router_domImports_Link
const RequestDemo = RequestDemoImports_default
const ThemeToggle = ThemeToggleImports_default

const APP_VERSION = 'v1.0.0', APP_RELEASE_YEAR = '2026'
const navigation = [['home','Home'],['about','About'],['academics','Programs'],['benefits','Why Choose Us'],['facilities','Facilities'],['request','Request Information']]
const programmes = [['CSE','Computer Science & Engineering'],['ECE','Electronics & Communication'],['EEE','Electrical & Electronics'],['ME','Mechanical Engineering'],['CE','Civil Engineering'],['AI & DS','Artificial Intelligence & Data Science']]
const benefits = [[FiBookOpen,'Learning with purpose','Connect engineering fundamentals with practical problems and your chosen discipline.'],[FiUsers,'Faculty guidance','Learn through classroom discussion, academic guidance and collaborative work.'],[FiTool,'Practical experience','Build understanding through laboratory work, projects and hands-on exploration.'],[FiTrendingUp,'Career development','Explore how your studies can prepare you for professional opportunities.'],[FiGrid,'Research & innovation','Develop ideas, ask questions and explore solutions to engineering challenges.'],[FiAward,'Student development','Grow through teamwork, communication and participation in college life.']]
function Brand() { return <Link className="lp-brand" to="/"><i><FiBookOpen /></i><span><strong>Pirnav Engineering College</strong><small>Digital Campus</small></span></Link> }
function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false), [menuOpen, setMenuOpen] = useState(false), [active, setActive] = useState('home')
  const menuButton = useRef(null)
  useEffect(() => {
    const update = () => { const current = navigation.map(([id]) => document.getElementById(id)).filter(section => section && section.getBoundingClientRect().top <= 130).at(-1); setActive(current?.id || 'home') }
    update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])
  const links = navigation.map(([id, label]) => <a key={id} href={'#' + id} aria-current={active === id ? 'location' : undefined} onClick={() => setMenuOpen(false)}>{label}</a>)
  return <main className="lp-page lp-public">
    <a className="lp-skip" href="#home">Skip to content</a>
    <nav className="lp-nav" aria-label="Main navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus() } }}><div><Brand /><div className="lp-links">{links}</div><div className="lp-actions"><ThemeToggle /><Link className="lp-button small" to="/login">Login <FiArrowRight /></Link><button ref={menuButton} className="lp-menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="lp-mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <FiX /> : <FiMenu />}</button></div></div><div id="lp-mobile-navigation" className="lp-mobile-navigation" hidden={!menuOpen}>{links}</div></nav>
    <section className="lp-hero universal" id="home" tabIndex={-1}><div className="lp-hero-content"><p className="lp-eyebrow">Welcome to Pirnav Engineering College</p><h1>Your engineering journey.<span>A world of possibilities.</span></h1><p className="lp-lead">Explore engineering programs, discover campus life and take the next step in your education. Start with the college, then find the information that matters to you.</p><div className="lp-hero-actions"><a className="lp-button" href="#about">Discover Pirnav <FiArrowRight /></a></div><div className="lp-trust">{['Engineering education','Practical learning','Campus community'].map(text => <span key={text}><FiCheck />{text}</span>)}</div></div></section>
    <section className="lp-section lp-heading" id="about"><div><p className="lp-eyebrow">01 / College overview</p><h2>A place to learn, connect and grow.</h2></div><div><p>Pirnav Engineering College brings engineering education and campus life together. Explore our B.Tech disciplines, learn about the academic experience and connect with the college for information about your next steps.</p></div></section>
    <section className="lp-section lp-hierarchy" id="academics"><div><p className="lp-eyebrow">02 / Academics & programs</p><h2>Find your path in engineering.</h2><p>Explore the disciplines already featured by our college. Request information to learn more about curriculum, admissions and program availability.</p><a className="lp-text-link" href="#request">Ask about a program <FiArrowRight /></a></div><div className="lp-programmes">{programmes.map(([code,name]) => <article key={code}><b>{code}</b><span>{name}</span></article>)}</div></section>
    <section className="lp-section lp-benefits" id="benefits"><header><p className="lp-eyebrow">03 / Why choose us</p><h2>Why Choose Pirnav Engineering College?</h2></header><div>{benefits.map(([Icon,title,text]) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="lp-section lp-facilities" id="facilities"><header className="lp-heading"><div><p className="lp-eyebrow">04 / Campus facilities & services</p><h2>Stay connected to college life.</h2></div><p>Access the existing digital campus services with your college account. Contact the college for physical facilities, transport or accommodation details before planning your visit.</p></header><div className="lp-facility-grid">{[[FiCalendar,'Academic calendar','Keep track of semester schedules, examinations and important dates.'],[FiHome,'Campus updates','Find announcements, notices, events and college activities.'],[FiBookOpen,'Student services','Reach academic information, results, fees and certificate services through the campus portal.']].map(([Icon,title,text]) => <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="lp-cta" id="request"><div><p className="lp-eyebrow light">05 / Take the next step</p><h2>What would you like to know?</h2><p>Ask about programs or campus life, or request a walkthrough of the digital campus.</p></div><button type="button" className="lp-button inverse" onClick={() => setDemoOpen(true)}>Request Information / Demo <FiArrowRight /></button></section>
    <footer className="lp-footer">
  <div className="lp-footer-top">
    <div className="lp-footer-brand">
      <Brand />
      <p className="lp-footer-tagline">Pirnav Engineering College - Digital Campus &amp; Academic Management System</p>
      <div className="lp-footer-badge">Developed &amp; Engineered by <strong>Pirnav</strong></div>
    </div>
    <div className="lp-footer-info">
      <strong>Product Information</strong>
      <ul className="lp-footer-meta">
        <li><span>Product:</span> <b>College Management System</b></li>
        <li><span>Version:</span> <b>{APP_VERSION}</b></li>
        <li><span>Developed by:</span> <b>Pirnav</b></li>
        <li><span>Release:</span> <b>{APP_RELEASE_YEAR}</b></li>
      </ul>
    </div>
    <div className="lp-footer-website">
      <strong>Official Website &amp; Links</strong>
      <div className="lp-footer-official-site">
        <span>Official Website: </span>
        <a href="https://pirnav.com/" target="_blank" rel="noopener noreferrer" className="lp-pirnav-link">
          Pirnav <FiExternalLink className="lp-ext-icon" />
        </a>
      </div>
      <nav className="lp-footer-nav" aria-label="Footer navigation"><a href="#about">About</a><a href="#academics">Programs</a><a href="#request">Contact</a><Link to="/login">Login</Link></nav>
    </div>
  </div>
  <div className="lp-footer-bottom">
    <p className="lp-footer-copyright">&copy; {APP_RELEASE_YEAR} Pirnav Software Solutions. All Rights Reserved.</p>
    <p className="lp-footer-legal">
      This software and its associated design, source code, architecture, and intellectual property are proprietary to Pirnav. Unauthorized reproduction, distribution, or modification is prohibited.
    </p>
  </div>
</footer>
    {demoOpen && <RequestDemo onClose={() => setDemoOpen(false)} />}
  </main>
}

return { default: LandingPage }
})()

// Login screen and private helpers.
const LoginScreen = (() => {
const showSuccess = toastImports_showSuccess
const showWarning = toastImports_showWarning
const useToastState = useToastStateImports_default
const useState = reactImports_useState
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const Link = react_router_domImports_Link
const useNavigate = react_router_domImports_useNavigate
const signIn = authImports_signIn
const sendOtp = authApiImports_sendOtp
const verifyOtp = authApiImports_verifyOtp
const AuthRequestError = apiEndpointsImports_AuthRequestError
const login = apiEndpointsImports_login
const validateLogin = loginValidationImports_validateLogin
const ForgotPassword = ForgotPasswordScreen.default
const ThemeToggle = ThemeToggleImports_default
const campusHero = college_campus_hero_pngImports_default

const validateContact = (input) => {
  const value = String(input || '').trim()
  if (!value) return 'Please enter your email or mobile number.'
  if (/^\d+$/.test(value)) {
    if (value.length !== 10) return 'Mobile number must be exactly 10 digits.'
    return ''
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/
  if (!emailRegex.test(value)) return 'Please enter a valid email address or 10-digit mobile number.'
  return ''
}

function Login() {
  const navigate = useNavigate()
  const location = react_router_domImports_useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('btech-remember-me') === 'true')
  const [values, setValues] = useState(() => ({ identifier: location.state?.identifier || (localStorage.getItem('btech-remember-me') === 'true' ? localStorage.getItem('btech-remembered-identifier') || '' : ''), password: '' }))
  const [errors, setErrors] = useState({ identifier: '', password: '' })
  const [touched, setTouched] = useState({})
  const [loginSubmitted, setLoginSubmitted] = useState(false)
  const markTouched = (name) => setTouched(prev => ({ ...prev, [name]: true }))
  const liveErrors = useMemo(() => validateLogin(values), [values])
  const getFieldError = (name) => {
    if (name === 'password') return loginSubmitted ? liveErrors.password : ''
    return (touched[name] || Boolean(values[name])) ? (liveErrors[name] || errors[name]) : errors[name]
  }
  const [submitError, setSubmitError] = useToastState('', 'error')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const greetingParts = greeting.split(' ')
  const greetingIcon = new Date().getHours() < 18
    ? <FiSun size={18} aria-hidden="true" />
    : <FiMoon size={18} aria-hidden="true" />

  // OTP Flow States: 'login' | 'request_otp' | 'verify_otp' | 'success'
  const [viewMode, setViewMode] = useState('login')
  const [otpContact, setOtpContact] = useState('')
  const [contactError, setContactError] = useToastState('', 'error')
  const [otpContactTouched, setOtpContactTouched] = useState(false)
  const liveContactError = useMemo(() => validateContact(otpContact), [otpContact])
  const getContactError = () => (otpContactTouched || Boolean(otpContact.trim())) ? (liveContactError || contactError) : contactError
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useToastState('', 'error')
  const [demoOtpHint, setDemoOtpHint] = useState('')
  const [timer, setTimer] = useState(0)
  const [, setLogoutMessage] = useToastState('', 'success')

  useEffect(() => {
    const message = sessionStorage.getItem('btech-logout-message')
    if (!message) return
    setLogoutMessage(message)
    sessionStorage.removeItem('btech-logout-message')
  }, [setLogoutMessage])


  useEffect(() => {
    let interval = null
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  const updateValue = ({ target: { name, value } }) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const resetOtpFlow = () => {
    setViewMode('login')
    setOtpContact('')
    setContactError('')
    setOtp('')
    setOtpError('')
    setDemoOtpHint('')
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setLoginSubmitted(true)
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    if (nextErrors.identifier || nextErrors.password) { showWarning('Enter your login ID and password.'); return }

    setIsSubmitting(true)
    setSubmitError('')
    try {
      const session = await login({ identifier: values.identifier.trim(), password: values.password, rememberMe })
      localStorage.setItem('btech-remember-me', String(rememberMe))
      if (rememberMe) localStorage.setItem('btech-remembered-identifier', values.identifier.trim())
      else localStorage.removeItem('btech-remembered-identifier')
      const sessionUser = { ...session.user, mustChangePassword: session.mustChangePassword ?? session.user.mustChangePassword }
      signIn(session.roles?.length ? session.roles : sessionUser.role, session.accessToken, session.refreshToken, rememberMe, sessionUser); showSuccess('Logged in successfully.')
      if (sessionUser.mustChangePassword) { navigate('/my-profile?setup=1'); return }
      if (sessionUser.profileCompleted === false) { navigate('/my-profile?profileSetup=1'); return }
      navigate('/dashboard')
    } catch (error) {
      setSubmitError(error instanceof AuthRequestError ? error.message : 'Unable to sign in right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendCode = async (e) => {
    e.preventDefault()
    setOtpError('')

    const validationMsg = validateContact(otpContact)
    if (validationMsg) {
      setContactError(validationMsg)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await sendOtp({ contact: otpContact.trim() })
      if (result.demoOtp) {
        setDemoOtpHint(`Verification code: ${result.demoOtp}`)
      }
      setViewMode('verify_otp'); showSuccess('Verification code sent successfully.')
      setTimer(60)
    } catch (error) {
      setOtpError(error instanceof AuthRequestError ? error.message : 'Failed to send verification code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setOtpError('')

    if (!otp || !/^\d{6}$/.test(otp)) {
      setOtpError('Please enter a valid 6-digit OTP code.')
      return
    }

    setIsSubmitting(true)
    try {
      await verifyOtp({ contact: otpContact.trim(), otp })
      setViewMode('success'); showSuccess('Verification code verified successfully.')
    } catch (error) {
      setOtpError(error instanceof AuthRequestError ? error.message : 'OTP verification failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login pirnav-login">
      <section className="login-intro pirnav-login__campus" aria-label="Pirnav Engineering College digital campus">
        <img className="pirnav-login__campus-image" src={campusHero} alt="Pirnav Engineering College campus" />
        <div className="pirnav-login__campus-shade" />
        <div className="login-intro__pattern" aria-hidden="true" />
        <div className="login-intro__content">
          <header className="brand"><span className="brand__mark"><FiBookOpen /></span><span className="brand__name"><strong>Pirnav Engineering College</strong><small>Digital Campus Management Portal</small></span></header>
          <div className="intro-copy"><p className="eyebrow">Connected Academic Experience</p><h1>Welcome to Pirnav Engineering College</h1><p>A connected digital campus for academics, communication, examinations and college services.</p><div className="pirnav-campus-cards"><article><FiCalendar /><span><small>Academic Calendar</small><strong>View your academic calendar</strong></span></article><article><FiBell /><span><small>Campus Announcements</small><strong>Campus news and notices</strong></span></article><article><FiFileText /><span><small>Examinations</small><strong>Schedules and services online</strong></span></article></div></div>
          <p className="copyright">Pirnav Engineering College <span>|</span> College Management System</p>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-public-actions">
          <ThemeToggle />
          <Link className="login-home-link" to="/" aria-label="Return to home"><FiArrowLeft aria-hidden="true" /> Home</Link>
        </div>
        {viewMode === 'login' && (
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="pirnav-form-brand"><span><FiBookOpen /></span><div><strong>Pirnav Engineering College</strong><small>Digital Campus Management Portal</small></div></div>
            <header>
              <p className="pirnav-greeting"><span className="pirnav-greeting-initial">{greetingParts[0][0]}</span>{greetingParts[0].slice(1)} <span className="pirnav-greeting-initial">{greetingParts[1][0]}</span>{greetingParts[1].slice(1)} <span className="pirnav-greeting-icon">{greetingIcon}</span></p>
              <h2 id="login-title">Welcome back</h2>
              <p>Securely access your academic dashboard and campus services.</p>
            </header>

            <label htmlFor="identifier">
              <span>College Email / Mobile / ID</span>
              <input
                id="identifier"
                type="text"
                name="identifier"
                value={values.identifier}
                onBlur={() => markTouched('identifier')}
                onChange={(e) => { updateValue(e); markTouched('identifier'); }}
                placeholder="Enter college email, mobile number or ID"
                autoComplete="username"
                aria-invalid={Boolean(getFieldError('identifier'))}
                aria-describedby={getFieldError('identifier') ? 'identifier-error' : undefined}
              />
            </label>
            {getFieldError('identifier') && <p id="identifier-error" className="field-error" role="alert">{getFieldError('identifier')}</p>}

            <label htmlFor="password">
              <span>Password</span>
              <span className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={values.password}
                  onBlur={() => markTouched('password')}
                  onChange={(e) => { updateValue(e); markTouched('password'); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(getFieldError('password'))}
                  aria-describedby={getFieldError('password') ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m3 3 18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c5.1 0 8.5 4.2 9.5 7.1a1.9 1.9 0 0 1 0 1.3 15.5 15.5 0 0 1-2.1 3.7" />
                      <path d="M6.2 6.2A15.3 15.3 0 0 0 2.5 11.1a1.9 1.9 0 0 0 0 1.3C3.5 15.3 6.9 19.5 12 19.5c1.1 0 2.2-.2 3.2-.6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.4-7.5 9.5-7.5S21.5 12 21.5 12 18.1 19.5 12 19.5 2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="2.7" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
            {getFieldError('password') && <p id="password-error" className="field-error" role="alert">{getFieldError('password')}</p>}

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" checked={rememberMe} onChange={(event) => { const checked = event.target.checked; setRememberMe(checked); localStorage.setItem('btech-remember-me', String(checked)); if (!checked) localStorage.removeItem('btech-remembered-identifier') }} />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => setViewMode('forgot-password')}
              >
                Forgot Password?
              </button>
            </div>

            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button className="sign-in-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Login to Digital Campus'}
            </button>
            <p className="access-note">© {new Date().getFullYear()} Pirnav Engineering College. All rights reserved.</p>
          </form>
        )}

        {viewMode === 'forgot-password' && <ForgotPassword onBack={resetOtpFlow} />}

        {/* FORGOT PASSWORD - REQUEST OTP */}
        {viewMode === 'request_otp' && (
          <form className="login-form" onSubmit={handleSendCode} noValidate>
            <header>
              <h2>Forgot Password</h2>
              <p>Enter your Email or 10-digit Mobile number to receive a verification code.</p>
            </header>

            <label htmlFor="otp-contact">
              <span>Email / Mobile Number</span>
              <input
                id="otp-contact"
                type="text"
                value={otpContact}
                onBlur={() => setOtpContactTouched(true)}
                onChange={(e) => {
                  setOtpContact(e.target.value)
                  setOtpContactTouched(true)
                  setContactError('')
                }}
                placeholder="Enter email or 10-digit mobile number"
                aria-invalid={Boolean(getContactError())}
                aria-describedby={getContactError() ? 'otp-contact-error' : undefined}
              />
            </label>
            {getContactError() && <p id="otp-contact-error" className="field-error" role="alert">{getContactError()}</p>}
            {otpError && <p className="form-error" role="alert">{otpError}</p>}

            <button className="sign-in-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
            </button>

            <button
              type="button"
              className="forgot-password-link"
              onClick={resetOtpFlow}
              style={{ marginTop: '12px', background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
            >
              &larr; Back to Sign In
            </button>
          </form>
        )}

        {viewMode === 'verify_otp' && (
          <form className="login-form" onSubmit={handleVerifyOtp} noValidate>
            <header>
              <h2>OTP Verification</h2>
              <p>Enter the 6-digit code sent to <strong>{otpContact}</strong></p>
            </header>

            <label htmlFor="otp-code">
              <span>Enter 6-Digit OTP</span>
              <input
                id="otp-code"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''))
                  setOtpError('')
                }}
                placeholder="e.g. 529691"
                style={{ letterSpacing: '4px', fontSize: '1.1rem', textAlign: 'center' }}
              />
            </label>
            {otpError && <p className="form-error" role="alert">{otpError}</p>}

            <button className="sign-in-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <button
                type="button"
                disabled={timer > 0 || isSubmitting}
                onClick={handleSendCode}
                style={{ background: 'none', border: 'none', color: timer > 0 ? 'var(--text-muted)' : 'var(--brand)', cursor: timer > 0 ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={resetOtpFlow}
                style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {viewMode === 'success' && (
          <div className="login-form" style={{ textAlign: 'center' }}>
            <header>
              <h2>Verification Complete</h2>
              <p style={{ color: 'var(--brand)', margin: '20px 0', fontSize: '1.1rem', fontWeight: 600 }}>
                Verified successfully
              </p>
            </header>
            <button className="sign-in-button" type="button" onClick={resetOtpFlow}>
              Back to Sign In
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

return { default: Login }
})()

// MySubjects screen and private helpers.
const MySubjectsScreen = (() => {
const DashboardLayout = DashboardLayoutImports_default

function MySubjects() { return <DashboardLayout><div className="erp-page"><header className="erp-page-heading"><div><p className="erp-eyebrow">Academic workspace</p><h1>My Subjects</h1><p>Access your assigned or enrolled subjects.</p></div></header><section className="erp-empty-state"><span aria-hidden="true">SUB</span><h2>No subjects assigned</h2><p>Your subjects will appear here.</p></section></div></DashboardLayout> }

return { default: MySubjects }
})()

// Register screen and private helpers.
const RegisterScreen = (() => {
const showSuccess = toastImports_showSuccess
const showWarning = toastImports_showWarning
const useToastState = useToastStateImports_default
const useMemo = reactImports_useMemo
const useRef = reactImports_useRef
const useState = reactImports_useState
const Link = react_router_domImports_Link
const AuthRequestError = authApiImports_AuthRequestError
const register = authApiImports_register
const passwordRequirements = registrationValidationImports_passwordRequirements
const validateRegistration = registrationValidationImports_validateRegistration
const ThemeToggle = ThemeToggleImports_default
const campusHero = college_campus_hero_pngImports_default

const initialValues = { fullName: '', email: '', mobile: '', password: '', confirmPassword: '', terms: false }

function Register() {
  const submitLock = useRef(false)
  const formRef = useRef(null)
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useToastState({}, 'error')
  const [touched, setTouched] = useState({})
  const markTouched = (name) => setTouched(prev => ({ ...prev, [name]: true }))
  const liveErrors = useMemo(() => validateRegistration(values), [values])
  const getFieldError = (name) => (touched[name] || Boolean(typeof values[name] === 'string' ? values[name].trim() : values[name])) ? (liveErrors[name] || errors[name]) : errors[name]
  const [submitError, setSubmitError] = useToastState('', 'error')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const updateValue = ({ target: { name, value, checked, type } }) => {
    markTouched(name)
    if (submitLock.current) return
    const nextValues = { ...values, [name]: type === 'checkbox' ? checked : value }
    setValues(nextValues)
    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(['password', 'confirmPassword'].includes(name) ? {
        confirmPassword: nextValues.confirmPassword && nextValues.password !== nextValues.confirmPassword
          ? 'Passwords do not match.' : '',
      } : {}),
    }))
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitLock.current) return

    const nextErrors = validateRegistration(values)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      showWarning('Correct the highlighted fields before submitting.')
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    submitLock.current = true

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        mobile: values.mobile.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        agreeToTerms: values.terms,
      })
      setValues(initialValues)
      setIsComplete(true); showSuccess('Access request submitted successfully.')
    } catch (error) {
      setSubmitError(error instanceof AuthRequestError ? error.message : 'Unable to submit your request right now. Please try again.')
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login register-page">
      <section className="login-intro register-brand-panel" aria-label="Pirnav Engineering College digital campus">
        <img className="register-brand-panel__image" src={campusHero} alt="Pirnav Engineering College campus" />
        <div className="register-brand-panel__shade" />
        <div className="login-intro__pattern" aria-hidden="true" />
        <div className="login-intro__content">
          <header className="brand"><span className="brand__mark"><FiBookOpen /></span><span className="brand__name"><strong>Pirnav Engineering College</strong><small>Digital Campus Management Portal</small></span></header>
          <div className="intro-copy"><p className="eyebrow">Connected Academic Experience</p><h1>Welcome to Pirnav Engineering College</h1><p>A connected digital campus for academics, communication, examinations and college services.</p><div className="pirnav-campus-cards"><article><FiCalendar /><span><small>Academic Calendar</small><strong>View your academic calendar</strong></span></article><article><FiBell /><span><small>Campus Announcements</small><strong>Campus news and notices</strong></span></article><article><FiFileText /><span><small>Examinations</small><strong>Schedules and services online</strong></span></article></div></div>
          <p className="copyright">Pirnav Engineering College <span>|</span> College Management System</p>
        </div>
      </section>
      <section className="login-panel" aria-labelledby="register-title"><div className="register-public-actions"><Link to="/">Home</Link><ThemeToggle /></div>
        {isComplete ? (
          <div className="login-form registration-success" role="status">
            <header><h2 id="register-title">Request submitted</h2><p>Your access request has been submitted successfully.</p></header>
            <p>Please contact the college administration for the status of your access request.</p>
            <Link className="sign-in-button success-link" to="/login">Return to Sign In</Link>
          </div>
        ) : (
          <form ref={formRef} className="login-form register-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
            <header><h2 id="register-title">Request campus access</h2><p>Request access to Pirnav Engineering College.</p></header>
            <label htmlFor="fullName"><span>Full Name</span><input id="fullName" name="fullName" type="text" value={values.fullName} onBlur={() => markTouched('fullName')} onChange={updateValue} placeholder="Enter your full name" autoComplete="name" aria-invalid={Boolean(getFieldError('fullName'))} aria-describedby={getFieldError('fullName') ? 'fullName-error' : undefined} /></label>
            {getFieldError('fullName') && <p id="fullName-error" className="field-error" role="alert">{getFieldError('fullName')}</p>}
            <label htmlFor="email"><span>Email</span><input id="email" name="email" type="email" value={values.email} onBlur={() => markTouched('email')} onChange={updateValue} placeholder="Enter your email address" autoComplete="email" aria-invalid={Boolean(getFieldError('email'))} aria-describedby={getFieldError('email') ? 'email-error' : undefined} /></label>
            {getFieldError('email') && <p id="email-error" className="field-error" role="alert">{getFieldError('email')}</p>}
            <label htmlFor="mobile"><span>Mobile Number</span><input id="mobile" name="mobile" type="tel" value={values.mobile} onBlur={() => markTouched('mobile')} onChange={updateValue} placeholder="Enter your mobile number" autoComplete="tel" inputMode="numeric" maxLength="10" aria-invalid={Boolean(getFieldError('mobile'))} aria-describedby={getFieldError('mobile') ? 'mobile-error' : undefined} /></label>
            {getFieldError('mobile') && <p id="mobile-error" className="field-error" role="alert">{getFieldError('mobile')}</p>}
            <label htmlFor="register-password"><span>Password</span><span className="password-input"><input id="register-password" name="password" type={showPassword ? 'text' : 'password'} value={values.password} onBlur={() => markTouched('password')} onChange={updateValue} placeholder="Create a password" autoComplete="new-password" aria-invalid={Boolean(getFieldError('password'))} aria-describedby={`password-requirements${getFieldError('password') ? ' password-error' : ''}`} /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></span></label>
            {getFieldError('password') && <p id="password-error" className="field-error" role="alert">{getFieldError('password')}</p>}
            <ul aria-live="polite" id="password-requirements" className="password-requirements" aria-label="Password requirements">
              {passwordRequirements.map(rule => <li key={rule.label} className={rule.test(values.password) ? 'met' : 'unmet'}><span aria-hidden="true">{rule.test(values.password) ? '✓' : '○'}</span><span>{rule.label}<span className="sr-only">{rule.test(values.password) ? ': met' : ': not met'}</span></span></li>)}
            </ul>
            <label htmlFor="confirmPassword"><span>Confirm Password</span><span className="password-input"><input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={values.confirmPassword} onBlur={() => markTouched('confirmPassword')} onChange={updateValue} placeholder="Confirm your password" autoComplete="new-password" aria-invalid={Boolean(getFieldError('confirmPassword'))} aria-describedby={getFieldError('confirmPassword') ? 'confirmPassword-error' : undefined} /><button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} title={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></span></label>
            {getFieldError('confirmPassword') && <p id="confirmPassword-error" className="field-error" role="alert">{getFieldError('confirmPassword')}</p>}
            <label className="terms-option"><input name="terms" type="checkbox" checked={values.terms} onBlur={() => markTouched('terms')} onChange={updateValue} aria-invalid={Boolean(getFieldError('terms'))} aria-describedby={getFieldError('terms') ? 'terms-error' : undefined} /><span>I agree to the Terms &amp; Conditions</span></label>
            {getFieldError('terms') && <p id="terms-error" className="field-error" role="alert">{getFieldError('terms')}</p>}
            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            <button className="sign-in-button" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Access Request'}</button>
            <p className="account-link">Already have an account? <Link to="/login">Sign in</Link></p>
          </form>
        )}
      </section>
    </main>
  )
}

return { default: Register }
})()

// Unauthorized screen and private helpers.
const UnauthorizedScreen = (() => {
const Link = react_router_domImports_Link

function Unauthorized() {
  return (
    <div className="erp-message-page">
      <section className="erp-message-card">
        <span className="erp-message-code">403</span>
        <p className="erp-eyebrow">Access restricted</p>
        <h1>You cannot open this page</h1>
        <p>Your current role does not have permission to use this module.</p>
        <Link className="erp-primary-link" to="/dashboard">Return to dashboard</Link>
      </section>
    </div>
  )
}

return { default: Unauthorized }
})()

// Users screen and private helpers.
const UsersScreen = (() => {
const DashboardLayout = DashboardLayoutImports_default

function Users() {
  return (
    <DashboardLayout><div className="erp-page"><header className="erp-page-heading"><div><p className="erp-eyebrow">Administration</p><h1>Users</h1><p>Manage student, faculty, and administrator accounts.</p></div></header><section className="erp-empty-state"><span aria-hidden="true">USR</span><h2>No user records</h2><p>User accounts will appear here.</p></section></div></DashboardLayout>
  )
}

return { default: Users }
})()

export const ActivateAccount = ActivateAccountScreen.default
export const Dashboard = DashboardScreen.default
export const ForgotPassword = ForgotPasswordScreen.default
export const LandingPage = LandingPageScreen.default
export const Login = LoginScreen.default
export const MySubjects = MySubjectsScreen.default
export const Register = RegisterScreen.default
export const Unauthorized = UnauthorizedScreen.default
export const Users = UsersScreen.default
export default Dashboard
