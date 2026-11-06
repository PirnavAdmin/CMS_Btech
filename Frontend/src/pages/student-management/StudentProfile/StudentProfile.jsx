import StudentDocumentActions from '../../../components/StudentDocumentActions'
import { resetAdmissionAcademicDependents } from '../../../utils/admissionAcademicMapping'
import eventBus, { ERP_EVENTS } from '../../../services/eventBus'
import { studentIntegrationFees } from '../../../utils/studentIntegrationFees'
import { uploadAdmissionDocuments } from '../../../utils/admissionDocumentWorkflow'
import PageHeader from '../../../components/PageHeader'
import ViewDialog from '../../../components/ViewDialog'
import { useScreenAccess } from '../../../auth/ScreenAccess'
import { showInfo, showWarning } from '../../../utils/toast'
import { FiUploadCloud, FiInbox } from 'react-icons/fi'
import { academicYearApi, branchApi, courseApi, lookupIndianPincode } from '../../../api/apiEndpoints'
import { getColleges } from '../../../auth/collegeApi'
import { getOperationalAcademicYearOptions } from '../../../utils/academicYearUtils'
import { REQUIRED_FIELDS, HOSTEL_FEES, TRANSPORT_FEES } from '../../../utils/studentCanonicalModel'
import { ProjectSelect } from '../../../components/SearchableSelect'
import { Link } from 'react-router-dom'
import { readFeeWorkspace, feeLedger, feeMoney, readHostelStructures, readTransportStructures } from '../../../services/feeStructureService'
import { FiClock, FiCreditCard, FiShield, FiPrinter } from 'react-icons/fi'
import { feeCollectionApi } from '../../../api/apiEndpoints'

import DirectoryEmptyState from '../../../components/DirectoryEmptyState'
import useCollegeState from '../../../hooks/useCollegeState'
import { newestFirst, rememberCreated } from '../../../utils/newestFirst'

const resolveProfileHostelFee = (admission = {}, fees = {}, academic = {}) => {
  if (admission?.hostel !== 'Yes') return 0;
  const collegeId = admission.collegeId || academic?.collegeId;
  const roomType = String(admission?.hostelRoomType || '').trim().toLowerCase();
  const gender = String(admission?.gender || '').trim().toLowerCase();
  const preference = String(admission?.hostelPreference || '').trim().toLowerCase();

  try {
    const hostelPlans = readHostelStructures(collegeId);
    if (Array.isArray(hostelPlans) && hostelPlans.length > 0) {
      const activePlans = hostelPlans.filter(p => !p.status || ['Active', 'Published', 'Approved'].includes(p.status));
      const candidates = activePlans.length ? activePlans : hostelPlans;
      const matchedPlan = candidates.find(p => {
        if (preference && String(p.hostelType || p.hostelName || '').toLowerCase().includes(preference)) return true;
        if (gender === 'male' && /boys/i.test(String(p.hostelType || p.hostelName || ''))) return true;
        if (gender === 'female' && /girls/i.test(String(p.hostelType || p.hostelName || ''))) return true;
        return false;
      }) || candidates[0];

      if (matchedPlan) {
        if (Array.isArray(matchedPlan.roomPricing) && matchedPlan.roomPricing.length > 0) {
          const matchedRoom = matchedPlan.roomPricing.find(r => {
            const rType = String(r.roomType || '').trim().toLowerCase();
            return roomType && (rType === roomType || rType.includes(roomType) || roomType.includes(rType));
          }) || matchedPlan.roomPricing[0];
          if (matchedRoom) {
            const roomComps = Array.isArray(matchedRoom.components) ? matchedRoom.components : [];
            const roomTotal = roomComps.reduce((sum, c) => sum + Number(c.amount || 0), 0);
            if (roomTotal > 0) return roomTotal;
            if (Number(matchedRoom.fee || matchedRoom.amount || 0) > 0) return Number(matchedRoom.fee || matchedRoom.amount);
          }
        }
        const planComps = Array.isArray(matchedPlan.components) ? matchedPlan.components : [];
        const planTotal = planComps.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        if (planTotal > 0) return planTotal;
        if (Number(matchedPlan.fee || matchedPlan.amount || 0) > 0) return Number(matchedPlan.fee || matchedPlan.amount);
      }
    }
  } catch {}
  if (Number(fees?.hostelFee || 0) > 0) return Number(fees.hostelFee);
  return Number(HOSTEL_FEES[admission?.hostelRoomType] || 0);
};

const resolveProfileTransportFee = (admission = {}, fees = {}, academic = {}) => {
  if (admission?.transport !== 'Yes') return 0;
  const collegeId = admission.collegeId || academic?.collegeId;
  const route = String(admission?.transportRoute || '').trim().toLowerCase();

  try {
    const transportPlans = readTransportStructures(collegeId);
    if (Array.isArray(transportPlans) && transportPlans.length > 0) {
      const activePlans = transportPlans.filter(p => !p.status || ['Active', 'Published', 'Approved'].includes(p.status));
      const candidates = activePlans.length ? activePlans : transportPlans;
      const matchedPlan = candidates.find(p => {
        const pRoute = String(p.route || p.routeCode || p.name || '').trim().toLowerCase();
        return route && (pRoute === route || pRoute.includes(route) || route.includes(pRoute));
      }) || candidates[0];

      if (matchedPlan) {
        const planComps = Array.isArray(matchedPlan.components) ? matchedPlan.components : [];
        const planTotal = planComps.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        if (planTotal > 0) return planTotal;
        if (Number(matchedPlan.fee || matchedPlan.amount || 0) > 0) return Number(matchedPlan.fee || matchedPlan.amount);
      }
    }
  } catch {}
  if (Number(fees?.transportFee || 0) > 0) return Number(fees.transportFee);
  return Number(TRANSPORT_FEES[admission?.transportRoute] || 0);
};
import useToastState from '../../../hooks/useToastState'
import { isApiResult } from '../../../utils/exportProvenance'
import { approvedStudentProfiles, isApprovedAdmission } from '../../../utils/approvedStudentProfiles'
import ExportMenu, { PrintDetailsButton } from '../../../components/ExportMenu'
import { profileColumns } from '../../../utils/exportColumns'
import { useEffect, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiArrowLeft, FiBookOpen, FiCheckCircle, FiChevronLeft, FiChevronRight, FiEdit2, FiFileText, FiFilter, FiRefreshCw, FiSave, FiSearch, FiUser, FiUsers, FiX } from "react-icons/fi";
import InfoCard from "../../../components/InfoCard";
import StatusBadge from "../../../components/StatusBadge";
import DashboardLayout from "../../../layouts/DashboardLayout";
import FilterPanel from "../../../components/FilterPanel";
import CompactSummary from "../../../components/CompactSummary";
import {
  studentAcademicDetailsApi,
  studentDocumentApi,
  studentFeeApi,
  studentParentApi,
  studentPreviousEducationApi,
  studentProfilesApi,
  studentAdmissionApi,
} from "../../../api/apiEndpoints";
import {
  createEmptyCanonicalStudent,
  normalizeCanonicalStudent,
  studentFullName,
  studentInitials,
  studentQuotaDisplay,
  formatAddress,
  formatMoney,
  formatDateTime,
  formatDisplay,
  apiAssetUrl,
  tenDigitMobile,
  normalizeAddressObj,
  dateInputValue,
  DOCUMENTS_CONFIG,
  resolveFeeSummary,
} from "../../../utils/studentCanonicalModel";
import { useAcademic } from "../../../context/AcademicContext";
import "./StudentProfile.css";


const PAGE_SIZE = 5;
const TABS = [
  ["personal", "Personal & Contact", FiUser],
  ["parent", "Parent / Guardian", FiUsers],
  ["academic", "Academic", FiBookOpen],
  ["education", "Previous Education", FiBookOpen],
  ["services", "Admission & Services", FiCheckCircle],
  ["fees", "Fees", FiFileText],
  ["documents", "Documents", FiFileText],
];
const value = (x) => formatDisplay(x);
const name = (x) => studentFullName(x);
const initials = (x) => studentInitials(x);
const status = (x) =>
  ({ ADMITTED: "Active", APPROVED: "Approved", VERIFIED: "Verified" })[x] ||
  String(x || "Not available").replaceAll("_", " ");

// Abbreviations used to keep the directory table's Academic details column compact.
const BRANCH_ABBR = {
  "computer science and engineering": "CSE",
  "electronics and communication engineering": "ECE",
  "electrical and electronics engineering": "EEE",
  "mechanical engineering": "ME",
  "civil engineering": "CE",
  "information technology": "IT",
  "artificial intelligence and machine learning": "AI & ML",
  "artificial intelligence and data science": "AI & DS",
  "bachelor of technology": "B.Tech",
};
const shortLabel = (x) => {
  const key = String(x || "").trim().toLowerCase();
  return BRANCH_ABBR[key] || x;
};

const clone = (x) => structuredClone(x);

const PROFILE_DOCUMENTS = DOCUMENTS_CONFIG.map((d) => [d.key, d.label]);

const documentsFromApi = (rows) => {
  const mapped = {
    ...Object.fromEntries(PROFILE_DOCUMENTS.map(([key]) => [key, null])),
    otherCertificates: [],
  };
  for (const row of Array.isArray(rows) ? rows : []) {
    const type = String(row.documentType ?? row.type ?? "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();
    const key = PROFILE_DOCUMENTS.find(([candidate, label]) =>
      [candidate, label].some(
        (item) =>
          String(item)
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase() === type,
      ),
    )?.[0];
    const document = {
      ...row,
      id: row.documentId ?? row.id,
      name: row.fileName ?? row.name ?? row.originalFileName,
      data: apiAssetUrl(row.fileUrl ?? row.documentUrl ?? row.url ?? ""),
      status: row.status ?? "Submitted",
    };
    if (key) mapped[key] = document;
    else mapped.otherCertificates.push(document);
  }
  return mapped;
};

const photoStorageKey = (kind, id) => `pirnav-${kind}-photo-${id}`;
const readStoredPhoto = (kind, id) => {
  try {
    return id ? localStorage.getItem(photoStorageKey(kind, id)) || "" : "";
  } catch {
    return "";
  }
};
const saveStoredPhoto = (kind, id, photo) => {
  try {
    if (!id) return;
    if (photo) localStorage.setItem(photoStorageKey(kind, id), photo);
    else localStorage.removeItem(photoStorageKey(kind, id));
  } catch {
    // A successful API update remains the source of truth if storage is unavailable.
  }
};

const profileFromApi = (x) => { const normalized = normalizeCanonicalStudent(x); return { ...normalized, documentError: x.documentError, fees: x.fees?.source === "backend" || x.fees?.error ? x.fees : { ...normalized.fees, ...studentIntegrationFees(x.feeSummary, x.feeStructure) } }; };

const profileAdmissionId = (source) =>
  source?.admissionId ??
  source?.application?.admissionId ??
  source?.admission?.admissionId;

const profileStudentId = (source) =>
  source?.studentId ??
  source?.student?.studentId ??
  source?.student?.id ??
  source?.header?.studentId ??
  source?.id;

const normalizeProfileFees = (...responses) => {
  const source = responses.reduce((merged, response) => {
    const nested = response?.feeSummary ?? response?.summary ?? response?.feeDetails ?? response?.feeStructure ?? {};
    return { ...merged, ...(typeof nested === "object" ? nested : {}), ...(response || {}) };
  }, {});
  const components = source.components ?? source.feeComponents ?? source.feeHeads ?? source.feeBreakdown ?? source.items ?? [];
  const amount = (...keys) => keys.map((key) => Number(source[key] || 0)).find((value) => value > 0) || 0;
  return {
    ...source,
    components: Array.isArray(components) ? components : [],
    tuitionFee: amount("tuitionFee", "tuitionAmount", "academicFee"),
    admissionFee: amount("admissionFee", "admissionAmount", "registrationFee", "oneTimeFee"),
    hostelFee: amount("hostelFee", "hostelAmount"),
    transportFee: amount("transportFee", "transportationFee", "transportAmount"),
    scholarshipAmount: amount("scholarshipAmount", "discountAmount", "concessionAmount"),
    totalFee: amount("firstYearTotal", "totalFee", "totalAmount", "grandTotal", "netPayable", "totalPayable", "netAmount", "payableAmount"),
    paymentPlan: source.paymentPlan ?? "",
    paymentStatus: source.paymentStatus ?? "",
  };
};

// List and preview responses are intentionally compact and may contain empty
// nested objects. Do not let those placeholders erase values returned by the
// approved-admission detail endpoint while preparing an edit form.
const mergeFilledProfileData = (base, overlay) => {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay))
    return overlay ?? base;
  const result = base && typeof base === "object" && !Array.isArray(base)
    ? { ...base }
    : {};
  for (const [key, value] of Object.entries(overlay)) {
    if (value === "" || value === null || value === undefined) continue;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = mergeFilledProfileData(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

// A student profile response is intentionally small. The admission wizard
// stores academic, education, parent, fee and document data in separate API
// resources, so hydrate those sections when opening a profile.
const hydrateProfile = async (source) => {
  let sourceData = source ?? {};
  let admissionId = profileAdmissionId(sourceData);
  let studentId = profileStudentId(sourceData);

  // Directory fallback rows can be keyed by admission ID until a Student ID is
  // returned by the profile service. Resolve both IDs before calling detail APIs.
  if (!admissionId || !studentId) {
    try {
      const admissions = await studentAdmissionApi.getAll();
      const sourceId = String(sourceData.id ?? "");
      const matched = admissions.find((admission) => {
        const candidateAdmissionId = String(admission.admissionId ?? admission.id ?? "");
        const candidateStudentId = String(
          admission.studentId ?? admission.student?.studentId ?? admission.student?.id ?? "",
        );
        return (
          (admissionId && candidateAdmissionId === String(admissionId)) ||
          (studentId && candidateStudentId === String(studentId)) ||
          candidateAdmissionId === sourceId ||
          candidateStudentId === sourceId
        );
      });
      if (matched) {
        admissionId ??= matched.admissionId ?? matched.id;
        if (!studentId || String(studentId) === sourceId)
          studentId = matched.studentId ?? matched.student?.studentId ?? matched.student?.id;
        sourceData = { ...matched, ...sourceData };
      }
    } catch {
      // The profile summary can still be shown if admission-ID resolution fails.
    }
  }
  const [admission, academic, education, parent, feeSummary, feeStructure, documents, feePending, feeHistory] =
    await Promise.allSettled([
      admissionId ? studentAdmissionApi.getById(admissionId) : Promise.resolve(null),
      admissionId ? studentAcademicDetailsApi.get(admissionId) : Promise.resolve(null),
      admissionId ? studentPreviousEducationApi.get(admissionId) : Promise.resolve(null),
      studentId ? studentParentApi.get(studentId) : Promise.resolve(null),
      admissionId ? studentFeeApi.getSummary(admissionId) : Promise.resolve(null),
      admissionId ? studentFeeApi.getStructure(admissionId) : Promise.resolve(null),
      studentId ? studentDocumentApi.getAll(studentId) : Promise.resolve([]),
      studentId ? feeCollectionApi.allPending({ studentId }) : Promise.resolve([]),
      studentId ? feeCollectionApi.allHistory({ studentId }) : Promise.resolve([]),
    ]);
  const read = (result, fallback = null) =>
    result.status === "fulfilled" ? result.value : fallback;
  const admissionData = read(admission, {});
  const parentData = read(parent);
  const combinedSource = mergeFilledProfileData(admissionData, sourceData);
  const rawSummary = read(feeSummary);
  const rawStructure = read(feeStructure);
  const resolvedFees = studentIntegrationFees(rawSummary, rawStructure);
  const pendingItems = Array.isArray(read(feePending)) ? read(feePending) : [];
  const historyItems = Array.isArray(read(feeHistory)) ? read(feeHistory) : [];

  const feeError = feeSummary.status === 'rejected' || feeStructure.status === 'rejected' ? 'Unable to load Student Integration fee information. Close and retry this student.' : '';
  const backendFee = { ...(rawStructure || {}), ...(rawSummary || {}) };
  const number = (...keys) => { const key = keys.find(key => backendFee[key] != null && backendFee[key] !== ''); const value = key ? Number(backendFee[key]) : null; return Number.isFinite(value) ? value : null; };
  const payable = number('payableAmount','netPayable','totalPayable','firstYearTotal','totalFee','totalAmount');
  const paid = number('amountPaid','paidAmount','totalPaid');
  const outstanding = number('balanceAmount','outstandingBalance','balance','pendingAmount');
  const totalPayable = payable ?? 0, paidAmount = paid ?? 0;
  const balanceAmount = outstanding ?? (payable != null && paid != null ? Math.max(0,payable-paid) : 0);
  const isConfigured = !feeError && resolvedFees.configured;
  const isOverdue = Boolean(backendFee.overdue);
  const paymentStatus = backendFee.paymentStatus || (isConfigured ? 'Pending' : 'Fee Not Assigned');
  const installments = Array.isArray(backendFee.installments) ? backendFee.installments : [];

  return profileFromApi({
    ...combinedSource,
    id: studentId ?? admissionData.studentId ?? admissionData.id,
    studentId: studentId ?? admissionData.studentId,
    admissionId: admissionId ?? admissionData.admissionId ?? admissionData.id,
    academicDetails: read(academic) || combinedSource.academicDetails || combinedSource.academic,
    previousEducation: read(education) || combinedSource.previousEducation || combinedSource.previousEducationDetails,
    parents: parentData ?? combinedSource.parents ?? combinedSource.parentDetails,
    parentDetails: parentData ?? combinedSource.parentDetails ?? combinedSource.parents,
    fees: {
      ...resolvedFees,
      ...(combinedSource.fees || {}),
      ...(rawStructure || {}),
      ...(rawSummary || {}),
      configured: isConfigured,
      error: feeError,
      balanceVerified: payable != null && paid != null,
      source: 'backend',
      planName: rawStructure?.name || rawStructure?.planName || rawSummary?.planName || resolvedFees.planName || (isConfigured ? 'Academic Fee Structure' : ''),
      tuitionFee: Number(resolvedFees.tuitionFee || combinedSource.fees?.tuitionFee || 0),
      admissionFee: Number(resolvedFees.admissionFee || combinedSource.fees?.admissionFee || 0),
      totalFee: totalPayable,
      payableAmount: totalPayable,
      paidAmount,
      balanceAmount,
      balance: balanceAmount,
      overdue: isOverdue,
      paymentPlan: combinedSource.fees?.paymentPlan || rawSummary?.paymentPlan || rawStructure?.paymentPlan || resolvedFees.paymentPlan || 'Full Payment',
      paymentStatus,
      installments: installments.length > 0 ? installments : (rawStructure?.installments || resolvedFees.installments || []),
      paymentHistory: historyItems,
      historyError: feeHistory.status === "rejected" ? feeHistory.reason?.message || "Payment history unavailable." : "",
    },
    documentError: documents.status === "rejected" ? documents.reason?.message || "Saved documents could not be loaded. Close and retry this student." : "",
    documents: documents.status === "fulfilled" && documents.value
      ? mergeFilledProfileData(combinedSource.documents, documentsFromApi(documents.value))
      : combinedSource.documents,
  });
};
const detail = (label, content) => (
  <div key={label}>
    <dt>{label}</dt>
    <dd>{value(content)}</dd>
  </div>
);
const completion = (x) => {
  const p = x.personal || {},
    c = x.contact || {},
    a = x.academic || {},
    f = x.parents?.father || {},
    app = x.application || {},
    fields = [
      name(x),
      p.gender,
      p.dob,
      c.mobile,
      c.email,
      c.permanentAddress?.line1,
      f.name,
      f.mobile,
      a.department,
      a.course,
      a.branch,
      a.academicYear,
      app.registrationNumber,
      app.admissionNumber,
    ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
};
const setPath = (data, path, value) => {
  const next = clone(data),
    parts = path.split(".");
  let at = next;
  parts.slice(0, -1).forEach((key) => {
    at[key] ??= {};
    at = at[key];
  });
  at[parts.at(-1)] = value;
  return next;
};
const clean = (x) => String(x || "").trim(),
  validName = (x) => /^[A-Za-z][A-Za-z .'-]{1,79}$/.test(clean(x)),
  validMobile = (x) => /^[6-9]\d{9}$/.test(String(x || "").replace(/\s/g, "")),
  validEmail = (x) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/i.test(clean(x));
const validate = (x) => {
  const e = {},
    p = x.personal || {},
    c = x.contact || {},
    f = x.parents?.father || {},
    m = x.parents?.mother || {};
  if (!validName(p.firstName))
    e["personal.firstName"] = "Enter a valid student name.";
  if (clean(p.lastName) && !validName(p.lastName))
    e["personal.lastName"] = "Enter a valid last name.";
  if (!validMobile(c.mobile))
    e["contact.mobile"] = "Enter a valid Indian 10-digit mobile number.";
  if (clean(c.email) && !validEmail(c.email))
    e["contact.email"] = "Enter a valid email address.";
  if (
    !p.dob ||
    Number.isNaN(new Date(`${p.dob}T00:00:00`).getTime()) ||
    new Date(`${p.dob}T00:00:00`) > new Date()
  )
    e["personal.dob"] = "Date of birth cannot be in the future.";
  if (
    clean(p.aadhaar) &&
    !/^\d{12}$/.test(String(p.aadhaar).replace(/\s/g, ""))
  )
    e["personal.aadhaar"] = "Aadhaar number must contain exactly 12 digits.";
  if (!validName(f.name))
    e["parents.father.name"] = "Enter a valid father name.";
  if (!validMobile(f.mobile))
    e["parents.father.mobile"] = "Enter a valid parent mobile number.";
  if (clean(f.email) && !validEmail(f.email))
    e["parents.father.email"] = "Enter a valid parent email address.";
  if (clean(m.name) && !validName(m.name))
    e["parents.mother.name"] = "Enter a valid mother name.";
  if (clean(m.mobile) && !validMobile(m.mobile))
    e["parents.mother.mobile"] = "Enter a valid Indian 10-digit mobile number.";
  return e;
};
function State({ error, onRetry }) {
  if (!error) return <DirectoryEmptyState title="No student admissions found." actionLabel="New Admission" to="/student-management/admissions/new" />;
  return (
    <section className="sp-state" data-message-tone={error ? 'error' : undefined} role={error ? 'alert' : undefined}>
      <FiAlertCircle />
      <h2>
        {error ? "Unable to load students." : "No student admissions found."}
      </h2>
      <p>
        {error ||
          "Admitted students will appear here automatically after their admission is submitted."}
      </p>
      {error && (
        <button onClick={onRetry}>
          <FiRefreshCw /> Retry
        </button>
      )}
    </section>
  );
}
function Skeleton() {
  return (
    <main className="student-profile">
      <div className="sp-skeleton title" />
      <div className="sp-skeleton filters" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div className="sp-skeleton row" key={i} />
      ))}
    </main>
  );
}
function Empty({ title, children }) {
  return (
    <div className="sp-empty">
      <FiAlertCircle />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}


export default function StudentProfile() {
  const { canAction } = useScreenAccess();
  const canEdit = canAction('/student-management/profiles', 'edit');
  const [sort, setSort] = useState('recent');
  const detailSequence = useRef(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const { selectedCollegeId, selectedCollege, selectedAcademicYearId, selectedAcademicYear } = useAcademic();
  const [students, setStudents] = useCollegeState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useToastState("", 'error'),
    [, setNotice] = useToastState("", 'success'),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState({
      department: "",
      course: "",
      branch: "",
      status: "",
    }),
    [page, setPage] = useState(1),
    [selectedId, setSelectedId] = useState(() => {
      const raw = new URLSearchParams(window.location.search).get("studentId");
      return raw && raw !== "undefined" && raw !== "null" ? raw : null;
    }),
    [selectedStudent, setSelectedStudent] = useState(null),
    [tab, setTab] = useState("personal"),
    [editing, setEditing] = useState(null);
  const tableRef = useRef(null);
  const directorySequence = useRef(0);
  const previousScope = useRef(`${selectedCollegeId}:${selectedAcademicYearId}`);
  const load = async () => {
    const requestId = ++directorySequence.current;
    setLoading(true);
    setError("");
    const rawParam = new URLSearchParams(window.location.search).get("studentId");
    const requestedId = rawParam && rawParam !== "undefined" && rawParam !== "null" ? rawParam : null;
    try {
      const [directory, profile, admissions] = await Promise.allSettled([
        studentProfilesApi.getAll(),
        requestedId
          ? Promise.all([
              studentProfilesApi.preview(requestedId),
              studentDocumentApi.getAll(requestedId).catch(() => []),
            ])
          : Promise.resolve(null),
        studentAdmissionApi.getAll(),
      ]);
      if (requestId !== directorySequence.current) return;
      let rows =
        directory.status === "fulfilled"
          ? directory.value.map(row => ({ ...profileFromApi(row), exportVerified: isApiResult(directory.value) }))
          : [];
      if (profile.status === "fulfilled" && profile.value) {
        const [preview, documents] = profile.value;
        const latest = await hydrateProfile({
          ...preview,
          studentId: requestedId,
          documents: documentsFromApi(documents),
        });
        if (requestId !== directorySequence.current) return;
        setSelectedStudent(latest);
        rows = [
          { ...latest, exportVerified: isApiResult(preview) },
          ...rows.filter((row) => String(row.id) !== String(requestedId)),
        ];
      } else if (profile.status === "rejected" && requestedId)
        setNotice(
          profile.reason?.message ||
            "Unable to load the approved student profile.", "error",
        );
      if (admissions.status !== 'fulfilled' || !isApiResult(admissions.value)) {
        setStudents([]);
        throw new Error('Unable to verify admission approvals. Please refresh the student list.');
      }
      // The profile-directory endpoint is intentionally compact and, for some
      // records, omits the college display name even though it is present on
      // the approved admission. Merge that source before rendering the
      // directory so valid selections are not shown as "Not provided".
      rows = rows.map((row) => {
        const admission = admissions.value.find((item) => {
          const rowAdmissionId = String(row.admissionId ?? row.application?.admissionId ?? '');
          const itemAdmissionId = String(item.admissionId ?? item.id ?? '');
          const rowStudentId = String(row.studentId ?? row.id ?? '');
          const itemStudentId = String(item.studentId ?? item.student?.studentId ?? item.student?.id ?? '');
          return (rowAdmissionId && rowAdmissionId === itemAdmissionId) || (rowStudentId && rowStudentId === itemStudentId);
        });
        return admission
          ? { ...profileFromApi(mergeFilledProfileData(admission, row)), exportVerified: row.exportVerified }
          : row;
      });
      rows = approvedStudentProfiles(rows, admissions.value);
      const existingAdmissions = new Set(rows.map(row => String(row.admissionId ?? row.application?.admissionId ?? row.admission?.admissionId ?? '')));
      const existingStudents = new Set(rows.map(row => String(row.studentId ?? row.id ?? '')));
      const missingApprovedAdmissions = admissions.value.filter(admission => {
        if (!isApprovedAdmission(admission.status ?? admission.currentStatus ?? admission.admissionStatus ?? admission.applicationStatus)) return false;
        const admissionId = String(admission.admissionId ?? admission.id ?? '');
        const studentId = String(admission.studentId ?? admission.student?.studentId ?? admission.student?.id ?? '');
        return !existingAdmissions.has(admissionId) && (!studentId || !existingStudents.has(studentId));
      });
      rows = [
        ...rows,
        ...missingApprovedAdmissions.map(admission => profileFromApi({
          ...admission,
          id: admission.studentId ?? admission.student?.studentId ?? admission.student?.id ?? admission.admissionId ?? admission.id,
          studentId: admission.studentId ?? admission.student?.studentId ?? admission.student?.id,
          admissionId: admission.admissionId ?? admission.id,
          status: 'APPROVED',
          exportVerified: isApiResult(admissions.value),
        })),
      ];
      if (requestId !== directorySequence.current) return;
      setStudents(newestFirst('student-profiles', rows));
      if (directory.status === "rejected" && !rows.length)
        setError(
          directory.reason?.message || "Student profiles could not be loaded.",
        );
    } catch (loadError) {
      if (requestId === directorySequence.current) setError(loadError.message || "Student profiles could not be loaded.");
    } finally {
      if (requestId === directorySequence.current) setLoading(false);
    }
  };
  useEffect(() => {
    const scope = selectedCollegeId + ':' + selectedAcademicYearId;
    if (previousScope.current !== scope) {
      detailSequence.current += 1; setSelectedStudent(null); setSelectedId(null); setEditing(null); setPage(1);
      const url = new URL(window.location.href); url.searchParams.delete('studentId'); window.history.replaceState({}, '', url);
      previousScope.current = scope;
    }
    load();
    const unsubscribe = eventBus.on(ERP_EVENTS.STUDENT_UPDATED, load);
    return () => { unsubscribe?.(); detailSequence.current += 1; directorySequence.current += 1; };
  }, [selectedCollegeId, selectedAcademicYearId]);

  const normYear = y => String(y || '').replace(/[^0-9]/g, '')
  const scopedStudents = useMemo(() => {
    return students.filter(item => {
      let collegeMatches = true
      if (selectedCollegeId) {
        const itemCollegeId = item.admission?.collegeId ?? item.collegeId ?? item.academic?.collegeId ?? ''
        const itemCollegeName = item.admission?.college ?? item.college ?? ''
        const matchById = itemCollegeId && String(itemCollegeId) === String(selectedCollegeId)
        const matchByName = selectedCollege?.name && itemCollegeName && itemCollegeName.trim().toLowerCase() === selectedCollege.name.trim().toLowerCase()
        collegeMatches = Boolean(matchById || matchByName)
      }

      let yearMatches = true
      if (selectedAcademicYearId) {
        const itemYearId = item.academic?.academicYearId ?? item.academicYearId ?? ''
        const itemYearName = item.academic?.academicYear ?? item.academicYear ?? ''
        const matchById = itemYearId && String(itemYearId) === String(selectedAcademicYearId)
        const matchByName = selectedAcademicYear?.name && itemYearName && (
          normYear(itemYearName) === normYear(selectedAcademicYear.name) ||
          itemYearName.trim().toLowerCase() === selectedAcademicYear.name.trim().toLowerCase()
        )
        yearMatches = Boolean(matchById || matchByName)
      }

      return collegeMatches && yearMatches
    })
  }, [students, selectedCollegeId, selectedCollege, selectedAcademicYearId, selectedAcademicYear])

  const options = (key) =>
    [
      ...new Set(
        scopedStudents
          .map((x) => key === "status" ? status(x.status) : x.academic?.[key])
          .filter(Boolean),
      ),
    ].sort();
  const filtered = useMemo(
    () =>
      scopedStudents.filter((x) => {
        const a = x.academic || {},
          app = x.application || {},
          c = x.contact || {},
          needle = [
            name(x),
            a.rollNumber,
            app.registrationNumber,
            app.admissionNumber,
            c.mobile,
            c.email,
          ]
            .join(" ")
            .toLowerCase();
        return (
          needle.includes(query.trim().toLowerCase()) &&
          Object.entries(filters).every(
            ([key, selected]) =>
              !selected ||
              (key === "status" ? status(x.status) : a[key]) === selected,
          )
        );
      }),
    [scopedStudents, query, filters],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    shown = [...filtered].sort((a,b) => sort === 'name' ? name(a).localeCompare(name(b)) : sort === 'admission' ? String(a.application?.admissionNumber || '').localeCompare(String(b.application?.admissionNumber || ''), undefined, { numeric:true }) : 0).slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page,pages) * PAGE_SIZE),
    selected = selectedStudent || (selectedId ? (
      scopedStudents.find((x) =>
        String(x.id) === String(selectedId) ||
        String(x.studentId) === String(selectedId) ||
        String(x.admissionId) === String(selectedId)
      ) || students.find((x) =>
        String(x.id) === String(selectedId) ||
        String(x.studentId) === String(selectedId) ||
        String(x.admissionId) === String(selectedId)
      )
    ) : null);
  useEffect(() => setPage(1), [query, filters]);

  const updateFilter = (key, next) =>
    setFilters((current) => {
      const updated = { ...current, [key]: next };
      if (key === "department")
        Object.assign(updated, {
          course: "",
          branch: "",
        });
      if (key === "course")
        Object.assign(updated, { branch: "" });
      return updated;
    });
  const openProfile = async (studentOrId) => {
    const requestId = ++detailSequence.current;
    setDetailLoading(true); setDetailError('');
    const directoryStudent =
      typeof studentOrId === "object"
        ? studentOrId
        : students.find((student) =>
            String(student.id) === String(studentOrId) ||
            String(student.studentId) === String(studentOrId) ||
            String(student.admissionId) === String(studentOrId)
          );
    const rawReqId = directoryStudent?.studentId ?? directoryStudent?.id ?? studentOrId;
    const requestedId = rawReqId && rawReqId !== "undefined" && rawReqId !== "null" ? String(rawReqId) : null;
    if (directoryStudent) {
      setSelectedStudent(directoryStudent);
    }
    if (requestedId) {
      setSelectedId(requestedId);
      const url = new URL(window.location.href);
      url.searchParams.set("studentId", requestedId);
      window.history.pushState({}, "", url);
    }
    setTab("personal");
    try {
      let preview = directoryStudent ?? { id: requestedId };
      const studentIdToFetch = directoryStudent?.studentId || requestedId;
      if (studentIdToFetch) {
        try {
          preview = {
            ...preview,
            ...(await studentProfilesApi.preview(studentIdToFetch)),
          };
        } catch {
          // Some newly approved rows are initially keyed by admission ID rather
          // than student ID. Hydration below resolves the correct student record.
        }
      }
      const latest = await hydrateProfile({
        ...preview,
        studentId: directoryStudent?.studentId || (directoryStudent?.admissionId ? undefined : requestedId),
      });
      if (requestId !== detailSequence.current) return;
      const resolvedId = String(latest.id ?? latest.studentId ?? latest.admissionId ?? requestedId);
      setSelectedStudent(latest);
      setSelectedId(resolvedId);
      if (resolvedId && resolvedId !== "undefined" && resolvedId !== "null") {
        const url = new URL(window.location.href);
        url.searchParams.set("studentId", resolvedId);
        window.history.replaceState({}, "", url);
      }
      setStudents((current) => [
        latest,
        ...current.filter(
          (x) =>
            String(x.id) !== String(resolvedId) &&
            String(x.studentId) !== String(resolvedId) &&
            String(x.admissionId) !== String(resolvedId) &&
            String(x.id) !== String(requestedId),
        ),
      ]);
    } catch (previewError) {
      if (requestId !== detailSequence.current) return;
      setDetailError(previewError.message || "Unable to load student details.");
      if (directoryStudent) {
        setSelectedStudent(directoryStudent);
      }
    } finally { if (requestId === detailSequence.current) setDetailLoading(false); }
  };
  const closeProfile = () => {
    detailSequence.current += 1; setDetailLoading(false); setDetailError('');
    setSelectedStudent(null);
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("studentId");
    window.history.pushState({}, "", url);
  };
  const beginEdit = async (student) => {
    if (!canEdit) {
      setNotice("You do not have permission to edit student profiles.", "warning");
      return;
    }
    try {
      // Profile editing is deliberately independent from the admission
      // registration workflow. Hydrating first makes every saved profile
      // section available in the editor without asking for a declaration or
      // re-submission of an already-approved admission.
      const studentId = profileStudentId(student);
      let latestProfile = student;
      if (studentId && studentId !== 'undefined' && studentId !== 'null') {
        try {
          latestProfile = mergeFilledProfileData(
            student,
            await studentProfilesApi.preview(studentId),
          );
        } catch {
          // Approved-admission fallback rows can briefly have only an
          // admission ID. hydrateProfile resolves them below.
        }
      }
      const hydrated = await hydrateProfile(latestProfile);
      setEditing(hydrated);
    } catch (editError) {
      console.warn("Hydration failed for edit, opening with available student data:", editError);
      setEditing(student);
    }
  };
  const saveStudent = async (student, originalStudent = {}) => {
    if (!canEdit) throw new Error('You do not have permission to edit student profiles.');
    const p = student.personal || {},
      c = student.contact || {},
      father = student.parents?.father || {},
      mother = student.parents?.mother || {},
      guardian = student.parents?.guardian || {};
    const admissionId = profileAdmissionId(student);
    const studentId = profileStudentId(student);
    if (!studentId && !admissionId)
      throw new Error("This approved admission is not linked to a student record yet.");
    const profilePayload = {
      fullName: studentFullName(student),
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: p.dob || null,
      nationality: p.nationality,
      aadhaarNumber: p.aadhaar,
      email: c.email,
      mobile: c.mobile,
      alternateMobile: c.alternateMobile,
      alternateEmail: c.alternateEmail,
      currentAddress: c.currentAddress,
      permanentAddress: c.permanentAddress,
      sameAddress: c.sameAddress,
      bloodGroup: p.bloodGroup,
      photo: p.photo || '',
      profilePhoto: p.photo || '',
      address: formatAddress(c.currentAddress),
      fatherName: father.name,
      fatherMobile: father.mobile,
      fatherEmail: father.email,
      fatherOccupation: father.occupation,
      fatherQualification: father.qualification,
      fatherIncome: father.income,
      motherName: mother.name,
      motherMobile: mother.mobile,
      motherEmail: mother.email,
      motherOccupation: mother.occupation,
      motherQualification: mother.qualification,
      motherIncome: mother.income,
      guardianName: guardian.name,
      guardianRelationship: guardian.relationship,
      guardianRelationshipOther: guardian.relationshipOther,
      guardianMobile: guardian.mobile,
      guardianEmail: guardian.email,
      guardianOccupation: guardian.occupation,
      guardianQualification: guardian.qualification,
      guardianIncome: guardian.income,
      primaryContact: student.parents?.primaryContact,
      emergencyMobile: student.parents?.emergencyMobile,
      registrationNumber: student.application?.registrationNumber || student.application?.number,
      registrationDate: student.application?.registrationDate || student.application?.date,
      admissionNumber: student.application?.admissionNumber,
      admissionDate: student.application?.admissionDate,
      collegeId: student.admission?.collegeId,
      college: student.admission?.college,
      batch: student.admission?.batch,
      scholarship: student.admission?.scholarship,
      hostel: student.admission?.hostel,
      hostelPreference: student.admission?.hostelPreference,
      hostelRoomType: student.admission?.hostelRoomType,
      transport: student.admission?.transport,
      transportRoute: student.admission?.transportRoute,
      academicYear: student.academic?.academicYear,
      academicYearId: student.academic?.academicYearId,
      admissionType: student.academic?.admissionType,
      course: student.academic?.course,
      courseId: student.academic?.courseId,
      courseCode: student.academic?.courseCode,
      department: student.academic?.department,
      departmentId: student.academic?.departmentId,
      branch: student.academic?.branch,
      branchId: student.academic?.branchId,
      branchCode: student.academic?.branchCode,
      semester: student.academic?.semester,
      semesterId: student.academic?.semesterId,
      section: student.academic?.section,
      sectionId: student.academic?.sectionId,
      regulation: student.academic?.regulation,
      quota: student.academic?.quota,
      quotaOther: student.academic?.quotaOther,
      studentCategory: student.academic?.studentCategory,
      documentStatuses: Object.fromEntries(
        Object.entries(student.documents || {})
          .filter(([, item]) => item && !Array.isArray(item))
          .map(([key, item]) => [key, typeof item === "object" ? item.status ?? "Submitted" : item])
      ),
      changeReason:
        "Student profile updated from the College Management System.",
    };
    let savedThroughAdmission = false;
    let profileUpdateSucceeded = false;
    if (studentId && studentId !== 'undefined' && studentId !== 'null') {
      try {
        await studentProfilesApi.update(studentId, profilePayload);
        profileUpdateSucceeded = true;
      } catch (profileError) {
        const missingProfile =
          Number(profileError?.status) === 404 ||
          Number(profileError?.status) === 405 ||
          /profile not found/i.test(profileError?.message || "") ||
          /not found/i.test(profileError?.message || "");
        if (admissionId) {
          try {
            await studentAdmissionApi.update(admissionId, student);
            savedThroughAdmission = true;
          } catch (admissionErr) {
            if (!missingProfile) throw profileError;
            console.warn("Admission update fallback failed:", admissionErr);
          }
        } else if (!missingProfile) {
          throw profileError;
        }
      }
    } else if (admissionId) {
      try {
        await studentAdmissionApi.update(admissionId, student);
        savedThroughAdmission = true;
      } catch (admissionErr) {
        console.warn("Admission update failed:", admissionErr);
      }
    }
    // These resources own the editable parent and education sections. The
    // profile endpoint owns personal/contact/document-status fields.
    const changed = (key) =>
      JSON.stringify(student[key] ?? {}) !== JSON.stringify(originalStudent[key] ?? {});
    const relatedUpdates = [
      studentId && studentId !== 'undefined' && changed("parents")
        ? studentParentApi.update(studentId, student)
        : Promise.resolve(),
      admissionId && changed("previousEducation")
        ? studentPreviousEducationApi.update(admissionId, student.previousEducation)
        : Promise.resolve(),
      admissionId && !savedThroughAdmission && changed("admission")
        ? studentAdmissionApi.update(admissionId, student)
        : Promise.resolve(),
    ];
    const relatedResults = await Promise.allSettled(relatedUpdates);
    const failed = relatedResults.find(result => result.status === 'rejected');
    if (failed) throw new Error('Profile saved partially. ' + (failed.reason?.message || 'A related section could not be saved. Retry the unsaved changes.'));
    // Keep the image visible when an API returns a compact record without its
    // photo field; the API value still takes precedence whenever it is present.
    saveStoredPhoto("student-profile", studentId, p.photo);
    saveStoredPhoto("admission", admissionId, p.photo);
    if (studentId) rememberCreated('student-profiles', studentId);
    if (admissionId) rememberCreated('admissions', admissionId);
    await load();
    setEditing(null);
    setSelectedStudent(null);
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("studentId");
    window.history.replaceState({}, "", url);
    setNotice("Student profile updated successfully.");
  };
  const studentSummaryItems = useMemo(() => {
    const total = scopedStudents.length;
    const approved = scopedStudents.filter((s) => {
      const st = String(status(s.status) || s.status || s.academic?.status || "").toLowerCase();
      return st === "approved" || st === "active" || isApprovedAdmission(s);
    }).length;
    const maleCount = scopedStudents.filter((s) => {
      const g = String(s.personal?.gender || s.gender || "").trim().toLowerCase();
      return g === "male" || g === "m";
    }).length;
    const femaleCount = scopedStudents.filter((s) => {
      const g = String(s.personal?.gender || s.gender || "").trim().toLowerCase();
      return g === "female" || g === "f";
    }).length;

    return [
      { label: "TOTAL", value: total },
      { label: "APPROVED", value: approved, tone: "active" },
      { label: "MALE", value: maleCount, tone: "default" },
      { label: "FEMALE", value: femaleCount, tone: "default" },
    ];
  }, [scopedStudents]);

  const profileDialog = selected ? (
    <ViewDialog title="Student Details" icon={FiUser} onClose={closeProfile} showExport={false} maxWidth="1120px">
    {detailLoading && <p role="status">Loading complete student details...</p>}
    {detailError && <div role="alert"><p>{detailError}</p><button type="button" onClick={() => openProfile(selected)}>Retry details</button></div>}
    <Profile
      student={selected}
      tab={tab}
      setTab={setTab}
      back={closeProfile}
      edit={() => beginEdit(selected)}
      canEdit={canEdit && !detailLoading}
    />
    </ViewDialog>
  ) : null;
  const body = (
    <>
      <div className="sp-overview-header">
        <PageHeader title="Student Management" subtitle="Find and manage approved students in the selected college and academic year." />
        <div className="sp-reference-summary" aria-label="Student summary">{studentSummaryItems.map(item => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</div>
      </div>
      {error ? (
        <State error={error} onRetry={load} />
      ) : (
        <>
          <section className="sp-directory cm-panel">
            <header className="course-directory-heading">
              <div>
                <span className="cm-eyebrow">Student Profile Directory</span>
                <p>
                  {filtered.length} records
                </p>
              </div>
            </header>
            <FilterPanel
              active={Boolean(query || Object.values(filters).some(Boolean))}
              leadingActions={
                <div className="directory-export-actions">
                  <ExportMenu rows={filtered.filter(row => row.exportVerified)} columns={profileColumns} title="Student Profiles" filename="student-profiles" loading={loading || Boolean(error)} scope="Current filtered API results (offline records excluded)" />
                </div>
              }
              onClear={() => {
                setQuery("");
                setFilters({
                  department: "",
                  course: "",
                  branch: "",
                  status: "",
                });
                setPage(1);
              }}
            >
              <div className="sp-toolbar">
                <label>
                  <FiSearch />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, registration, admission, mobile or email"
                  />
                </label>
                <FiFilter />
              </div>
              <div className="sp-filters">
                {[
                  ["department", "Department"],
                  ["course", "Course"],
                  ["branch", "Branch"],
                  ["status", "Status"],
                ].map(([key, label]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <ProjectSelect
                      value={filters[key]}
                      onChange={(e) => updateFilter(key, e.target.value)}
                    >
                      <option value="">All</option>
                      {options(key)
                        .filter(
                          (o) =>
                            key !== "course" ||
                            !filters.department ||
                            scopedStudents.some(
                              (x) =>
                                x.academic?.department === filters.department &&
                                x.academic?.course === o,
                            ),
                        )
                        .filter(
                          (o) =>
                            key !== "branch" ||
                            !filters.course ||
                            scopedStudents.some(
                              (x) =>
                                x.academic?.course === filters.course &&
                                x.academic?.branch === o,
                            ),
                        )
                        .map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                    </ProjectSelect>
                  </label>
                ))}
              </div>
            </FilterPanel>
            <label className="sp-sort">Sort by <select aria-label="Sort students" value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}><option value="recent">Recently added</option><option value="name">Student name</option><option value="admission">Admission number</option></select></label>
            <div className="sp-table-wrap" tabIndex={0} role="region" aria-label="Student directory">
              <table className="sp-directory-table" ref={tableRef}>
                <thead>
                  <tr>
                    <th style={{ minWidth: "190px" }}>Student</th>
                    <th style={{ minWidth: "200px" }}>Academic details</th>
                    <th style={{ minWidth: "160px" }}>Contact</th>
                    <th className="table-center" style={{ minWidth: "110px", width: "110px" }}>Status</th>
                    <th className="table-center" style={{ minWidth: "100px", width: "100px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((student) => {
                    const a = student.academic || {},
                      app = student.application || {},
                      photo = student.personal?.photo;
                    return (
                      <tr
                        key={student.id}

                      >
                        <td>
                          <div className="sp-student">
                            <i>
                              {photo ? (
                                <img src={photo} alt={studentFullName(student)} />
                              ) : (
                                studentInitials(student)
                              )}
                            </i>
                            <div className="table-cell-group" style={{ minWidth: 0 }}>
                              <button type="button" className="student-name-link table-cell-truncate" title={studentFullName(student) || "Unnamed student"} aria-label={`View profile for ${studentFullName(student) || "Unnamed student"}`} onClick={() => openProfile(student)}>
                                {studentFullName(student) || "Unnamed student"}
                              </button>
                              <small className="table-cell-truncate" title={`Admission No: ${formatDisplay(app.admissionNumber)}`}>
                                Admission No: {formatDisplay(app.admissionNumber)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="table-cell-group" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                            <strong className="table-cell-truncate" style={{ margin: 0, lineHeight: 1.3 }} title={`${formatDisplay(shortLabel(a.course))} | ${formatDisplay(shortLabel(a.branch))}`}>
                              {formatDisplay(shortLabel(a.course))} |{" "}
                              {formatDisplay(shortLabel(a.branch))}
                            </strong>
                            <small className="table-cell-truncate" style={{ margin: 0, lineHeight: 1.3 }} title={`${formatDisplay(shortLabel(a.department))} | ${formatDisplay(a.academicYear)}`}>
                              {formatDisplay(shortLabel(a.department))} |{" "}
                              {formatDisplay(a.academicYear)}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="table-cell-group" style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                            <strong className="table-cell-truncate" title={formatDisplay(student.contact?.mobile)}>{formatDisplay(student.contact?.mobile)}</strong>
                            <small className="table-cell-truncate" title={formatDisplay(student.contact?.email)}>{formatDisplay(student.contact?.email)}</small>
                          </div>
                        </td>
                        <td className="table-center">
                          <StatusBadge value={status(student.status)} />
                        </td>
                        <td className="table-center">
                          <div className="table-actions-cell table-actions-group">
                            {canEdit && (
                              <button
                                type="button"
                                className="table-action-btn action-edit"
                                aria-label="Edit student profile"
                                title="Edit student profile"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  beginEdit(student);
                                }}
                              >
                                <FiEdit2 aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!shown.length && (
              <DirectoryEmptyState title="No students found." actionLabel="New Admission" to="/student-management/admissions/new" />
            )}
            <footer className="sp-pagination">
              <span>
                Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}-
                {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div>
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <FiChevronLeft />
                </button>
                <b>
                  {page} / {pages}
                </b>
                <button
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                >
                  <FiChevronRight />
                </button>
              </div>
            </footer>
          </section>
          {!students.length && <State />}
        </>
      )}
    </>
  );
  if (loading)
    return (
      <DashboardLayout>
        <Skeleton />
      </DashboardLayout>
    );
  return (
    <DashboardLayout>
      <main className="student-profile">
        {" "}
        {profileDialog}
        {editing ? (
          <StudentProfileEdit
            student={editing}
            onCancel={() => setEditing(null)}
            onSave={saveStudent}
          />
        ) : body}
      </main>
    </DashboardLayout>
  );
}

function ProfileCard({ title, icon: Icon, rows = [] }) {
  return (
    <section className="sp-profile-panel">
      {(Icon || title) && (
        <header className="sp-panel-header">
          {Icon && <Icon aria-hidden="true" />}
          {title && <h2>{title}</h2>}
        </header>
      )}
      <dl className="sp-panel-grid">
        {rows.map(([label, val], idx) => (
          <div className="sp-panel-item" key={label || idx}>
            <dt className="sp-panel-label">{label}</dt>
            <dd className="sp-panel-val">{formatDisplay(val)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StudentProfileReceiptModal({ receipt: requestedReceipt, student, onClose }) {
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true; setReceipt(null); setError('')
    if (!requestedReceipt?.receiptId) { setError('This payment does not include a receipt identity.'); return }
    feeCollectionApi.receipt(requestedReceipt.receiptId).then(result => { if(active) setReceipt(result) }).catch(reason => { if(active) setError(reason.message || 'Unable to load the receipt.') })
    return () => { active = false }
  }, [requestedReceipt?.receiptId, attempt])
  if (!receipt) return <ViewDialog title="Fee Receipt" onClose={onClose} showExport={false}><div role={error ? 'alert' : 'status'}>{error || 'Loading receipt...'}{error && <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry receipt</button>}</div></ViewDialog>

  const collegeName = student.admission?.college || student.academic?.collegeName || "Academic ERP Institute";
  const amountVal = Number(receipt?.totalAmount || receipt?.feeAmount || 0);
  const balanceVal = Number(receipt?.balanceAmount ?? student.fees?.balanceAmount ?? 0);
  const receiptNum = receipt?.receiptNumber || 'Unavailable';
  const dateStr = receipt?.paymentDate || receipt?.issuedAt || 'Unavailable';

  const handlePrint = () => {
    window.print();
  };

  return (
<ViewDialog title="Fee Receipt" onClose={onClose} showExport={false} hideFooter maxWidth="650px">
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: '0 0 4px' }}>{collegeName}</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Official Fee Receipt</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="fm-badge fm-badge--confirmed" style={{ fontSize: '11px', fontWeight: 800 }}>FEE RECEIPT</span>
            <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '4px' }}>#{receiptNum}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Date: {dateStr}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', margin: '16px 0', padding: '12px', background: 'var(--surface-soft)', borderRadius: '8px' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Student Name</span>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{receipt?.studentName || studentFullName(student)}</div>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Admission No.</span>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{receipt?.studentCode || student.application?.admissionNumber || student.roll || '—'}</div>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Payment Method</span>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{receipt?.paymentMode || 'Unavailable'}</div>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Transaction Ref</span>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{receipt?.transactionReference || '—'}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-soft)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '8px 10px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px' }}>Fee Payment ({receipt?.feeCategory || student.fees?.planName || 'Academic Fee'})</td>
              <td style={{ textAlign: 'right', padding: '10px', fontWeight: 700 }}>{formatMoney(amountVal)}</td>
            </tr>
            <tr style={{ background: 'var(--surface-soft)', fontWeight: 800 }}>
              <td style={{ padding: '10px' }}>Total Amount Paid</td>
              <td style={{ textAlign: 'right', padding: '10px', color: '#059669' }}>{formatMoney(amountVal)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          <span>Outstanding Balance: <strong>{formatMoney(balanceVal)}</strong></span>
          <span>Status: <strong style={{ color: '#059669' }}>Payment Confirmed</strong></span>
        </div>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
          <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="cm-button erp-btn erp-btn--primary" onClick={handlePrint}>
            <FiPrinter /> Print Receipt
          </button>
        </footer>
    </ViewDialog>
  );
}

function StudentProfileFeesView({ student, onOpenReceipt }) {
  const fees = student.fees || {};
  const isConfigured = fees.configured === true;
  const totalFee = Number(fees.totalFee || 0);
  const paidAmount = Number(fees.paidAmount ?? 0);
  const balance = Number(fees.balanceAmount ?? fees.balance ?? Math.max(0,totalFee - paidAmount));
  const isOverdue = fees.paymentStatus === 'Overdue';
  const statusLabel = isOverdue ? 'Overdue' : balance === 0 && totalFee > 0 ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending';
  const statusSlug = statusLabel.toLowerCase().replace(/\s+/g, '-');
  const payments = Array.isArray(fees.paymentHistory) ? fees.paymentHistory : [];
  const installments = Array.isArray(fees.installments) ? fees.installments : [];

  if (fees.error) return <div className="sa-empty" role="alert"><h3>Fee information unavailable</h3><p>{fees.error}</p></div>;
  if (!isConfigured) return <div className="sa-empty" role="status"><h3>No applicable active fee structure</h3><p>Configure and assign an approved fee plan for this student's academic placement.</p></div>;
  if (!fees.balanceVerified) return <div className="sa-empty" role="status"><h3>Fee balance unavailable</h3><p>The Student Integration response does not contain complete payable, paid and outstanding balances.</p></div>;
  return (
    <div className="sp-fees-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Link className="sa-primary" to="/fees/assignments" state={{ feeStudentId: profileStudentId(student) }}>
          <FiCreditCard /> Assign Fee Plan
        </Link>
      </div>
      {/* 4 Colorful ERP KPI cards */}
      <div className="fm-summary-cards-grid">
        <div className="fm-summary-card fm-summary-card--blue">
          <div className="fm-summary-card__header">
            <span className="fm-summary-card__label">Total Fee Demand</span>
            <span className="fm-summary-card__icon-box"><FiCreditCard /></span>
          </div>
          <strong className="fm-summary-card__value">{formatMoney(totalFee)}</strong>
          <span className="fm-summary-card__meta">{fees.planName || 'Applicable Fee Plan'}</span>
        </div>

        <div className="fm-summary-card fm-summary-card--green">
          <div className="fm-summary-card__header">
            <span className="fm-summary-card__label">Total Collected</span>
            <span className="fm-summary-card__icon-box"><FiCheckCircle /></span>
          </div>
          <strong className="fm-summary-card__value">{formatMoney(paidAmount)}</strong>
          <span className="fm-summary-card__meta">Confirmed collections</span>
        </div>

        <div className="fm-summary-card fm-summary-card--amber">
          <div className="fm-summary-card__header">
            <span className="fm-summary-card__label">Outstanding Balance</span>
            <span className="fm-summary-card__icon-box"><FiClock /></span>
          </div>
          <strong className="fm-summary-card__value">{formatMoney(balance)}</strong>
          <span className="fm-summary-card__meta">Remaining student balance</span>
        </div>

        <div className={`fm-summary-card ${isOverdue ? 'fm-summary-card--red' : 'fm-summary-card--blue'}`}>
          <div className="fm-summary-card__header">
            <span className="fm-summary-card__label">Payment Status</span>
            <span className="fm-summary-card__icon-box"><FiShield /></span>
          </div>
          <strong className="fm-summary-card__value" style={{ fontSize: '18px' }}>
            <span className={`fm-badge fm-badge--${statusSlug}`}>{statusLabel}</span>
          </strong>
          <span className="fm-summary-card__meta">Payment plan: {fees.paymentPlan || 'Full Payment'}</span>
        </div>
      </div>

      {!isConfigured ? (
        <div className="sa-fee-unconfigured-card">
          <div className="sa-fee-unconfigured-icon">
            <FiAlertCircle />
          </div>
          <div className="sa-fee-unconfigured-body">
            <h3>Fee Structure Not Configured</h3>
            <p>
              No active fee plan is configured for {studentFullName(student)} ({formatDisplay(student.academic?.course)} - {formatDisplay(student.academic?.branch)}).
            </p>
            <div className="sa-fee-unconfigured-hint">
              Configure and publish academic fee plans in <strong>Fee Management &gt; Fee Plans</strong> to assign fee heads and installment schedules.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Fee Structure Breakdown Card */}
          <section className="sp-panel" style={{ padding: '16px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Fee Plan & Components</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Breakdown of all applicable fee heads for this student
                </p>
              </div>
              <span className="fm-badge fm-badge--published" style={{ fontSize: '11px', fontWeight: 700 }}>
                {fees.planName || 'Academic Fee Structure'}
              </span>
            </header>
            <div className="fm-table-wrap">
              <table className="fm-table" style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Fee Component / Head</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Number(fees.tuitionFee) > 0 && (
                    <tr>
                      <td><strong>Tuition Fee</strong></td>
                      <td>Academic</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(fees.tuitionFee)}</td>
                    </tr>
                  )}
                  {Number(fees.admissionFee) > 0 && (
                    <tr>
                      <td><strong>Admission Fee</strong></td>
                      <td>One-time</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(fees.admissionFee)}</td>
                    </tr>
                  )}
                  {(fees.components || [])
                    .filter(c => {
                      const n = String(c.name || '').toLowerCase();
                      return !n.includes('tuition') && !n.includes('admission') && Number(c.amount || 0) > 0;
                    })
                    .map((c, i) => (
                      <tr key={c.id || i}>
                        <td><strong>{c.name || `Fee Component ${i + 1}`}</strong></td>
                        <td>{c.category || 'Academic'}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(c.amount)}</td>
                      </tr>
                    ))}
                  {student.admission?.hostel === 'Yes' && Number(fees.hostelFee) > 0 && (
                    <tr>
                      <td><strong>Hostel Fee ({student.admission?.hostelRoomType || 'Standard'})</strong></td>
                      <td>Facility</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(fees.hostelFee)}</td>
                    </tr>
                  )}
                  {student.admission?.transport === 'Yes' && Number(fees.transportFee) > 0 && (
                    <tr>
                      <td><strong>Transportation Fee ({student.admission?.transportRoute || 'Campus'})</strong></td>
                      <td>Facility</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(fees.transportFee)}</td>
                    </tr>
                  )}
                  {Number(fees.scholarshipAmount) > 0 && (
                    <tr>
                      <td><strong style={{ color: 'var(--success)' }}>Scholarship / Concession</strong></td>
                      <td>Deduction</td>
                      <td style={{ textAlign: 'right', color: 'var(--success)' }}>− {formatMoney(fees.scholarshipAmount)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800, background: 'var(--surface-soft)' }}>
                    <td colSpan={2}>Net Payable Demand</td>
                    <td style={{ textAlign: 'right', color: 'var(--brand)', fontSize: '13px' }}>{formatMoney(totalFee)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Scheduled Installments (if any) */}
          {installments.length > 0 && (
            <section className="sp-panel" style={{ padding: '16px' }}>
              <header style={{ marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Installment Schedule</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tranche due dates and collection progress
                </p>
              </header>
              <div className="fm-table-wrap">
                <table className="fm-table" style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Installment</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: 'right' }}>Payable</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst, i) => (
                      <tr key={inst.id || i}>
                        <td><strong>{inst.name || `Installment ${i + 1}`}</strong></td>
                        <td>{inst.dueDate || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(inst.payable || inst.amount)}</td>
                        <td style={{ textAlign: 'right', color: '#059669' }}>{formatMoney(inst.paid || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(inst.balance ?? inst.payable ?? inst.amount)}</td>
                        <td>
                          <span className={`fm-badge fm-badge--${String(inst.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>
                            {inst.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Payment & Receipt History */}
          <section className="sp-panel" style={{ padding: '16px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Payment & Receipt History</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Confirmed transactions and official receipts
                </p>
              </div>
              <span className="fm-count-chip">{payments.length} Payments</span>
            </header>
            {payments.length > 0 ? (
              <div className="fm-table-wrap">
                <table className="fm-table" style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Payment Mode</th>
                      <th>Transaction Ref</th>
                      <th style={{ textAlign: 'right' }}>Amount Paid</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.paymentId || p.receiptId || i}>
                        <td>
                          <button
                            type="button"
                            className="fm-text-link"
                            style={{ background: 'transparent', border: 0, color: 'var(--brand)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                            onClick={() => onOpenReceipt(p)}
                          >
                            {p.receiptNumber || `REC-${p.receiptId || p.paymentId || i + 1}`}
                          </button>
                        </td>
                        <td>{p.paymentDate || p.date || p.issuedAt || '—'}</td>
                        <td><span style={{ fontWeight: 600 }}>{p.paymentMode || p.mode || 'CASH'}</span></td>
                        <td>{p.transactionReference || p.reference || '—'}</td>
                        <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                          {formatMoney(p.totalAmount || p.feeAmount || p.amount)}
                        </td>
                        <td>
                          <span className="fm-badge fm-badge--confirmed">Confirmed</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="cm-button secondary erp-btn erp-btn--secondary"
                            style={{ minHeight: '28px', padding: '0 8px', fontSize: '11px' }}
                            onClick={() => onOpenReceipt(p)}
                          >
                            <FiPrinter /> View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                {fees.historyError || 'No payment transactions recorded yet for this student.'}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Profile({ student, tab, setTab, back, edit, canEdit }) {
  const [receiptModal, setReceiptModal] = useState(null);
  const a = student.academic || {},
    app = student.application || {},
    p = student.personal || {},
    c = student.contact || {},
    parents = student.parents || {},
    previous = student.previousEducation || {},
    admission = student.admission || {},
    fees = student.fees || {},
    documents = student.documents || {};

  const relationship =
    parents.guardian?.relationship === "Other"
      ? (parents.guardian?.relationshipOther ? `Other (${parents.guardian.relationshipOther})` : "Other")
      : parents.guardian?.relationship;

  const sectionsByTab = {
    personal: [
      {
        title: "Personal Information",
        icon: FiUser,
        rows: [
          ["Student Full Name", studentFullName(student)],
          ["First Name", p.firstName],
          ["Middle Name", p.middleName],
          ["Last Name", p.lastName],
          ["Gender", p.gender],
          ["Date of Birth", p.dob],
          ["Blood Group", p.bloodGroup],
          ["Nationality", p.nationality],
          ["Aadhaar Number", p.aadhaar],
        ],
      },
      {
        title: "Contact & Communication",
        icon: FiUser,
        rows: [
          ["Student Mobile", c.mobile],
          ["Alternate Mobile", c.alternateMobile],
          ["Student Email", c.email],
          ["Alternate Email", c.alternateEmail],
        ],
      },
      {
        title: "Address Details",
        icon: FiUser,
        rows: [
          ["Current Address", formatAddress(c.currentAddress)],
          ["Permanent Address", formatAddress(c.permanentAddress) || formatAddress(c.currentAddress)],
        ],
      },
    ],
    parent: [
      {
        title: "Father Details",
        icon: FiUser,
        rows: [
          ["Father Name", parents.father?.name],
          ["Father Mobile", parents.father?.mobile],
          ["Father Email", parents.father?.email],
          ["Father Occupation", parents.father?.occupation],
          ["Father Qualification", parents.father?.qualification],
          ["Father Annual Income", parents.father?.income],
        ],
      },
      {
        title: "Mother Details",
        icon: FiUser,
        rows: [
          ["Mother Name", parents.mother?.name],
          ["Mother Mobile", parents.mother?.mobile],
          ["Mother Email", parents.mother?.email],
          ["Mother Occupation", parents.mother?.occupation],
          ["Mother Qualification", parents.mother?.qualification],
          ["Mother Annual Income", parents.mother?.income],
        ],
      },
      {
        title: "Guardian & Emergency Details",
        icon: FiUsers,
        rows: [
          ["Guardian Name", parents.guardian?.name],
          ["Guardian Relationship", relationship],
          ["Guardian Mobile", parents.guardian?.mobile],
          ["Guardian Email", parents.guardian?.email],
          ["Guardian Occupation", parents.guardian?.occupation],
          ["Guardian Qualification", parents.guardian?.qualification],
          ["Guardian Annual Income", parents.guardian?.income],
          ["Primary Contact", parents.primaryContact],
          ["Emergency Contact", parents.emergencyMobile],
        ],
      },
    ],
    academic: [
      {
        title: "Academic Enrollment",
        icon: FiBookOpen,
        rows: [
          ["Academic Year", a.academicYear],
          ["Joining College", admission.college],
          ["Admission Type", a.admissionType],
          ["Quota", studentQuotaDisplay(student)],
          ["Course", a.course],
          ["Course Code", a.courseCode],
          ["Department", a.department],
          ["Branch", a.branch],
          ["Branch Code", a.branchCode],
          ["Student Category", a.studentCategory],
          ["Regulation", a.regulation],
          ["Year of Study", a.yearOfStudy],
          ["Roll Number", a.rollNumber],
        ],
      },
    ],
    education: [
      {
        title: "10th / SSC Qualification",
        icon: FiBookOpen,
        rows: [
          ["Board", previous.tenth?.board],
          ["School / Institution", previous.tenth?.institution],
          ["Roll Number", previous.tenth?.rollNumber],
          ["Passing Year", previous.tenth?.passingYear],
          ["Score Type", previous.tenth?.scoreType],
          ["Score", previous.tenth?.score],
        ],
      },
      {
        title: "Intermediate / 12th / Diploma Qualification",
        icon: FiBookOpen,
        rows: [
          ["Qualification", previous.intermediate?.qualification],
          ["Board / University", previous.intermediate?.board],
          ["College / Institution", previous.intermediate?.institution],
          ["Roll Number", previous.intermediate?.rollNumber],
          ["Passing Year", previous.intermediate?.passingYear],
          ["Stream", previous.intermediate?.stream === "Other" ? previous.intermediate?.streamOther : previous.intermediate?.stream],
          ["Score Type", previous.intermediate?.scoreType],
          ["Score", previous.intermediate?.score],
        ],
      },
    ],
    services: [
      {
        title: "Registration & College Details",
        icon: FiCheckCircle,
        rows: [
          ["Registration Number", app.registrationNumber || app.number],
          ["Registration Date", app.registrationDate || app.date],
          ["Admission Number", app.admissionNumber],
          ["Admission Date", app.admissionDate],
          ["College", admission.college],
          ["Batch", admission.batch],
        ],
      },
      {
        title: "Campus Amenities & Services",
        icon: FiCheckCircle,
        rows: [
          ["Scholarship", admission.scholarship],
          ["Hostel Accommodation", admission.hostel],
          ["Hostel Preference", admission.hostelPreference],
          ["Room Type / Beds", admission.hostelRoomType],
          ["Transportation Service", admission.transport],
          ["Transport Route", admission.transportRoute],
        ],
      },
    ],
    fees: [
      {
        title: "Fee Structure & Summary",
        icon: FiFileText,
        rows: [
          ["Tuition Fee (per year)", formatMoney(fees.tuitionFee || 0)],
          ["Admission Fee (one-time)", formatMoney(fees.admissionFee || 0)],
          ["Scholarship Deduction", Number(fees.scholarshipAmount) > 0 ? `- ${formatMoney(fees.scholarshipAmount)}` : "None"],
          ["Hostel Room Type", admission.hostel === "Yes" ? (admission.hostelRoomType || "Standard Room") : "Not selected"],
          ["Hostel Fee (per year)", admission.hostel === "Yes" ? formatMoney(fees.hostelFee) : "Not selected"],
          ["Transportation Fee (per year)", admission.transport === "Yes" ? formatMoney(fees.transportFee) : "Not selected"],
          ["First-Year Total", formatMoney(fees.totalFee || 0)],
          ["Estimated Entire 4-Year Total", formatMoney((Number(fees.tuitionFee || 0) + Number(fees.hostelFee || 0) + Number(fees.transportFee || 0)) * 4 + Number(fees.admissionFee || 0))],
          ["Payment Preference", fees.paymentPlan || "Full Payment"],
          ["Payment Status", fees.paymentStatus || "Pending"],
          ...(fees.components || [])
            .filter((c) => {
              const compName = String(c.name ?? c.componentName ?? c.feeHead ?? '').trim().toLowerCase()
              if (!compName) return false
              if (['tuition fee', 'admission fee', 'hostel fee', 'transport fee', 'transportation fee'].includes(compName)) return false
              return Number(c.amount || 0) > 0
            })
            .map((component, index) => [
              component.name ?? component.componentName ?? component.feeHead ?? `Fee component ${index + 1}`,
              formatMoney(component.amount),
            ]),
        ],
      },
    ],
  };

  const documentRows = [
    ["Aadhaar Card", documents.aadhaarCard],
    ["10th / SSC Marks Memo", documents.tenthMemo],
    ["Intermediate / Diploma Marks Memo", documents.qualifyingMemo],
    ["Transfer Certificate", documents.transferCertificate],
    ["Caste Certificate", documents.casteCertificate],
    ["Income Certificate", documents.incomeCertificate],
    ...(documents.otherCertificates || []).map((item, index) => [
      item?.name ? `Other: ${item.name}` : `Other Certificate ${index + 1}`,
      item,
    ]),
  ];

  const exportSections = Object.entries(sectionsByTab).flatMap(([, sections]) =>
    sections.map((sec) => ({
      title: sec.title,
      rows: sec.rows,
    }))
  );

  return (
    <div className="cm-profile-view" data-export-record>
      <div className="cm-profile-top-bar">
        <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={back}>
          &larr; Back
        </button>
        <div className="sp-profile-top-actions">
          <ExportMenu
            mode="single"
            title="Student Profile"
            filename={`student_${app.admissionNumber || app.registrationNumber || student.id}`}
            recordSections={exportSections}
          />
          <button
            type="button"
            className="cm-button erp-btn erp-btn--primary"
            onClick={edit}
            disabled={!canEdit}
            title={
              canEdit
                ? "Edit student profile"
                : "Only administrators can edit student profiles"
            }
          >
            <FiEdit2 className="sp-profile-edit-icon" aria-hidden="true" /> Edit Student
          </button>
        </div>
      </div>

      <div className="cm-profile-card">
        <div className="sp-reference-identity">{p.photo && <img src={p.photo} alt="" />}<div><h3>{studentFullName(student) || 'Unnamed student'}</h3><p>{[formatDisplay(a.course),formatDisplay(a.branch)].join(' · ')}</p><small>{app.admissionNumber || app.registrationNumber}</small></div><StatusBadge value={status(student.status)} /></div>
        <nav className="sp-tabs" aria-label="Student profile sections">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
      {tab === "documents" ? (
        <section className="sp-panel">
          <header>
            <h2>Submitted documents</h2>
            {student.documentError && <p role="alert">{student.documentError}</p>}
          </header>
          <div className="sp-document-list">
            {documentRows.map(([label, document], index) => (
              <article key={document?.id || label + index}>
                <FiFileText />
                <div>
                  <strong>{label}</strong>
                  <span>{document?.name || document?.status || "Not uploaded"}</span>
                </div>
<StudentDocumentActions document={document} studentId={profileStudentId(student)} />
              </article>
            ))}
          </div>
        </section>
      ) : tab === "fees" ? (
        <StudentProfileFeesView student={student} onOpenReceipt={setReceiptModal} />
      ) : sectionsByTab[tab] ? (
        <div className="sp-profile-cards-container">
          {sectionsByTab[tab].map((section, idx) => (
            <ProfileCard
              key={section.title || idx}
              title={section.title}
              icon={section.icon}
              rows={section.rows}
            />
          ))}
        </div>
      ) : (
        <Empty title="Information unavailable">
          No admission information is available for this section.
        </Empty>
      )}
      </div>

      {receiptModal && (
        <StudentProfileReceiptModal
          receipt={receiptModal}
          student={student}
          onClose={() => setReceiptModal(null)}
        />
      )}
    </div>
  );
}

// Profile editing stays in this module with its helpers isolated.
const StudentProfileEdit = (() => {



const clone = (value) => structuredClone(value);
const setPath = (source, path, value) => {
  const next = clone(source),
    parts = path.split(".");
  let cursor = next;
  parts.slice(0, -1).forEach((key) => {
    if (!cursor[key]) cursor[key] = {};
    cursor = cursor[key];
  });
  cursor[parts.at(-1)] = value;
  return next;
};
const studentName = (student) => studentFullName(student);
const validMobile = (value) => /^[6-9]\d{9}$/.test(String(value || ""));
const clean = (value) => String(value ?? "").trim();
const validName = (value) => /^[A-Za-z][A-Za-z .'-]{1,79}$/.test(clean(value));
const validEmail = (value) =>
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/i.test(clean(value));
const validYear = (value) =>
  /^\d{4}$/.test(clean(value)) &&
  Number(value) >= 1950 &&
  Number(value) <= new Date().getFullYear() + 1;
const initialEditForm = (student) => ({ ...normalizeCanonicalStudent(student), fees: { ...student.fees }, documentUploads: {} });

const validateProfileForm = (form, docErrors = {}) => {
  const next = {
    ...Object.fromEntries(
      Object.entries(docErrors).filter(([key]) =>
        key.startsWith("documentUploads."),
      ),
    ),
  };
  const p = form.personal || {};
  const c = form.contact || {};
  const father = form.parents?.father || {};
  const mother = form.parents?.mother || {};
  const guardian = form.parents?.guardian || {};
  const tenth = form.previousEducation?.tenth || {};
  const inter = form.previousEducation?.intermediate || {};
  const admission = form.admission || {};

  if (!validName(p.firstName))
    next["personal.firstName"] =
      "Enter a valid first name using letters only.";
  if (clean(p.middleName) && !validName(p.middleName))
    next["personal.middleName"] = "Enter a valid middle name.";
  if (clean(p.lastName) && !validName(p.lastName))
    next["personal.lastName"] = "Enter a valid last name.";
  if (!p.dob) next["personal.dob"] = "Date of birth is required.";
  else if (
    Number.isNaN(new Date(`${p.dob}T00:00:00`).getTime()) ||
    new Date(`${p.dob}T00:00:00`) > new Date()
  )
    next["personal.dob"] =
      "Enter a valid date of birth that is not in the future.";
  if (clean(p.nationality) && !/^[A-Za-z ]{2,50}$/.test(clean(p.nationality)))
    next["personal.nationality"] = "Enter a valid nationality.";
  if (
    clean(p.aadhaar) &&
    !/^\d{12}$/.test(clean(p.aadhaar).replace(/\s/g, ""))
  )
    next["personal.aadhaar"] =
      "Aadhaar number must contain exactly 12 digits.";
  if (!validMobile(c.mobile))
    next["contact.mobile"] = "Enter a valid 10-digit Indian mobile number.";
  if (clean(c.alternateMobile) && !validMobile(c.alternateMobile))
    next["contact.alternateMobile"] =
      "Enter a valid alternate mobile number.";
  if (clean(c.alternateMobile) && clean(c.alternateMobile) === clean(c.mobile))
    next["contact.alternateMobile"] =
      "Alternate mobile number must be different from the student mobile number.";
  if (clean(c.email) && !validEmail(c.email))
    next["contact.email"] = "Enter a valid email address.";
  if (clean(c.alternateEmail) && !validEmail(c.alternateEmail))
    next["contact.alternateEmail"] = "Enter a valid alternate email address.";
  if (clean(c.alternateEmail) && clean(c.alternateEmail).toLowerCase() === clean(c.email).toLowerCase())
    next["contact.alternateEmail"] =
      "Alternate email must be different from the student email.";
  for (const prefix of ["currentAddress", "permanentAddress"]) {
    const address = c[prefix] || {};
    if (clean(address.pincode) && !/^\d{6}$/.test(clean(address.pincode)))
      next[`contact.${prefix}.pincode`] =
        "PIN code must contain exactly 6 digits.";
    for (const key of ["town", "city", "district", "state", "country"])
      if (
        clean(address[key]) &&
        !/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(clean(address[key]))
      )
        next[`contact.${prefix}.${key}`] = `Enter a valid ${key}.`;
  }
  if (clean(father.name) && !validName(father.name))
    next["parents.father.name"] = "Enter a valid father name.";
  if (clean(father.mobile) && !validMobile(father.mobile))
    next["parents.father.mobile"] = "Enter a valid father mobile number.";
  if (clean(father.email) && !validEmail(father.email))
    next["parents.father.email"] = "Enter a valid father email address.";
  if (
    clean(father.income) &&
    (Number(father.income) < 0 || !Number.isFinite(Number(father.income)))
  )
    next["parents.father.income"] = "Annual income cannot be negative.";
  if (clean(mother.name) && !validName(mother.name))
    next["parents.mother.name"] = "Enter a valid mother name.";
  if (clean(mother.mobile) && !validMobile(mother.mobile))
    next["parents.mother.mobile"] = "Enter a valid mother mobile number.";
  if (clean(mother.email) && !validEmail(mother.email))
    next["parents.mother.email"] = "Enter a valid mother email address.";
  if (clean(mother.income) && (Number(mother.income) < 0 || !Number.isFinite(Number(mother.income))))
    next["parents.mother.income"] = "Annual income cannot be negative.";
  if (clean(guardian.name) && !validName(guardian.name))
    next["parents.guardian.name"] = "Enter a valid guardian name.";
  if (clean(guardian.mobile) && !validMobile(guardian.mobile))
    next["parents.guardian.mobile"] = "Enter a valid guardian mobile number.";
  if (clean(guardian.email) && !validEmail(guardian.email))
    next["parents.guardian.email"] = "Enter a valid guardian email address.";
  if (clean(guardian.income) && (Number(guardian.income) < 0 || !Number.isFinite(Number(guardian.income))))
    next["parents.guardian.income"] = "Annual income cannot be negative.";
  if (guardian.relationship === "Other" && !clean(guardian.relationshipOther))
    next["parents.guardian.relationshipOther"] =
      "Specify the guardian relationship.";
  for (const [prefix, row] of [
    ["tenth", tenth],
    ["intermediate", inter],
  ]) {
    if (clean(row.passingYear) && !validYear(row.passingYear))
      next[`previousEducation.${prefix}.passingYear`] =
        "Enter a valid four-digit passing year.";
    if (clean(row.score)) {
      const score = Number(row.score),
        maximum = row.scoreType === "CGPA" ? 10 : 100;
      if (!Number.isFinite(score) || score < 0 || score > maximum)
        next[`previousEducation.${prefix}.score`] =
          `${row.scoreType || "Percentage"} must be between 0 and ${maximum}.`;
    }
  }
  if (form.academic?.admissionType === "Lateral Entry" && !clean(form.academic?.quota))
    next["academic.quota"] = "Select the admission quota for lateral entry.";
  if (form.academic?.admissionType === "Lateral Entry" && form.academic?.quota === "Other" && !clean(form.academic?.quotaOther))
    next["academic.quotaOther"] = "Specify the admission quota.";
  if (admission.hostel === "Yes" && !clean(admission.hostelPreference))
    next["admission.hostelPreference"] = "Select a hostel preference.";
  if (admission.transport === "Yes" && !clean(admission.transportRoute))
    next["admission.transportRoute"] = "Enter the transportation route.";
  return next;
};

function StudentProfileEdit({ student, onCancel, onSave }) {
  const tabs = [
    ["personal", "Basic Information"],
    ["contact", "Contact & Address"],
    ["parents", "Parent / Guardian"],
    ["academic", "Academic Information"],
    ["education", "Previous Education"],
    ["services", "Admission & Services"],
    ["fees", "Fee Structure & Payment"],
    ["documents", "Supporting Documents"],
  ];
  const [form, setForm] = useState(() => initialEditForm(student)),
    [errors, setErrors] = useToastState({}, 'error'),
    [touched, setTouched] = useState({}),
    [saving, setSaving] = useState(false),
    [photoName, setPhotoName] = useState(""),
    [discard, setDiscard] = useState(false),
    [tab, setTab] = useState("personal"),
    [pinStatus, setPinStatus] = useState({ current: "", permanent: "" }),
    [colleges, setColleges] = useState([]),
    [courses, setCourses] = useState([]),
    [branches, setBranches] = useState([]),
    [academicYears, setAcademicYears] = useState([]),
    tabNavRef = useRef(null),
    original = useMemo(() => JSON.stringify(student), [student]),
    dirty = JSON.stringify(form) !== original;
  const markTouched = (path) => setTouched((prev) => ({ ...prev, [path]: true }));
  const liveErrors = useMemo(() => validateProfileForm(form, errors), [form, errors]);
  useEffect(() => {
    let active = true;
    Promise.all([
      getColleges().catch(() => []),
      courseApi.getAll().catch(() => []),
      branchApi.getAll().catch(() => []),
      academicYearApi.getAll().catch(() => []),
    ]).then(([collegeResponse, courseResponse, branchResponse, yearResponse]) => {
      if (!active) return;
      const unwrap = (response) => {
        let value = response;
        for (let depth = 0; depth < 5 && value && typeof value === "object"; depth += 1) {
          if (Array.isArray(value)) return value;
          const rows = value.items ?? value.content ?? value.results ?? value.records;
          if (Array.isArray(rows)) return rows;
          value = value.data;
        }
        return Array.isArray(value) ? value : [];
      };
      setColleges(unwrap(collegeResponse));
      setCourses(unwrap(courseResponse));
      setBranches(unwrap(branchResponse));
      setAcademicYears(getOperationalAcademicYearOptions(unwrap(yearResponse)));
    });
    return () => {
      active = false;
    };
  }, []);

  const same = (left, right) => String(left ?? "").trim() === String(right ?? "").trim();
  const selectedCollegeId = form.admission?.collegeId;
  const selectedCollegeName = form.admission?.college;
  const matchedCollege = colleges.find(
    (c) =>
      (selectedCollegeId && same(c.collegeId ?? c.id, selectedCollegeId)) ||
      (selectedCollegeName && (same(c.collegeName, selectedCollegeName) || same(c.name, selectedCollegeName) || same(c.institutionName, selectedCollegeName)))
  );
  const effectiveCollegeId = form.admission?.collegeId || matchedCollege?.collegeId || matchedCollege?.id || "";

  const courseOptions = useMemo(() => {
    return courses
      .map((item) => {
        const id = item.courseId ?? item.id ?? "";
        const name = item.courseName ?? item.name ?? "";
        const code = item.courseCode ?? item.code ?? item.shortName ?? "";
        const collegeId = item.collegeId ?? item.college?.collegeId ?? item.college?.id;
        const department = item.departmentName ?? item.department ?? "";
        return { id: String(id), name, code, collegeId, department };
      })
      .filter(
        (item) =>
          item.name &&
          (!effectiveCollegeId || !item.collegeId || same(item.collegeId, effectiveCollegeId))
      );
  }, [courses, effectiveCollegeId]);

  const selectedCourseId = form.academic?.courseId;
  const selectedCourseName = form.academic?.course;
  const matchedCourse = courseOptions.find(
    (c) =>
      (selectedCourseId && same(c.id, selectedCourseId)) ||
      (selectedCourseName && same(c.name, selectedCourseName))
  );
  const effectiveCourseId = selectedCourseId || matchedCourse?.id || "";

  const availableBranches = useMemo(() => {
    return branches
      .map((item) => {
        const id = item.branchId ?? item.id ?? "";
        const name = item.branchName ?? item.name ?? item.branchShortName ?? item.shortName ?? "";
        const code = item.branchCode ?? item.code ?? item.shortName ?? "";
        const courseId = item.courseId ?? item.course?.courseId ?? item.course?.id;
        const collegeId = item.collegeId ?? item.college?.collegeId ?? item.college?.id;
        const department = item.departmentName ?? item.department ?? "";
        return { id: String(id), name, code, courseId, collegeId, department };
      })
      .filter(
        (item) =>
          item.name &&
          (effectiveCourseId && same(item.courseId, effectiveCourseId)) && (!item.collegeId || same(item.collegeId,effectiveCollegeId))
      );
  }, [branches, effectiveCourseId, effectiveCollegeId]);

  const roomTypeOptions = useMemo(() => {
    const list = [];
    try {
      const hostelPlans = readHostelStructures(effectiveCollegeId);
      if (Array.isArray(hostelPlans)) {
        hostelPlans.forEach(p => {
          if (Array.isArray(p.roomPricing)) {
            p.roomPricing.forEach(r => {
              const name = String(r.roomType || '').trim();
              if (name && !list.includes(name)) list.push(name);
            });
          }
          const pRoom = String(p.roomType || '').trim();
          if (pRoom && !list.includes(pRoom)) list.push(pRoom);
        });
      }
    } catch {}
    return [...new Set([...list, ...Object.keys(HOSTEL_FEES)])];
  }, [effectiveCollegeId]);

  const transportRouteOptions = useMemo(() => {
    const list = [];
    try {
      const transportPlans = readTransportStructures(effectiveCollegeId);
      if (Array.isArray(transportPlans)) {
        transportPlans.forEach(p => {
          const rName = String(p.route || p.routeCode || p.name || '').trim();
          if (rName && !list.includes(rName)) list.push(rName);
        });
      }
    } catch {}
    return [...new Set([...list, ...Object.keys(TRANSPORT_FEES)])];
  }, [effectiveCollegeId]);

  // Auto-fill courseCode / branchCode if missing but course / branch is selected
  useEffect(() => {
    if (!courses.length && !branches.length) return;
    setForm((current) => {
      let next = current;
      let changed = false;
      if (current.academic?.course && !current.academic?.courseCode) {
        const matched = courses.find((c) =>
          same(c.courseName ?? c.name, current.academic.course) ||
          same(c.courseId ?? c.id, current.academic.courseId)
        );
        if (matched) {
          const code = matched.courseCode ?? matched.code ?? matched.shortName ?? "";
          if (code) {
            next = setPath(next, "academic.courseCode", code);
            changed = true;
          }
        }
      }
      if (current.academic?.branch && !current.academic?.branchCode) {
        const matched = branches.find((b) =>
          same(b.branchName ?? b.name ?? b.branchShortName ?? b.shortName, current.academic.branch) ||
          same(b.branchId ?? b.id, current.academic.branchId)
        );
        if (matched) {
          const code = matched.branchCode ?? matched.code ?? matched.shortName ?? "";
          if (code) {
            next = setPath(next, "academic.branchCode", code);
            changed = true;
          }
        }
      }
      return changed ? next : current;
    });
  }, [courses, branches, form.academic?.course, form.academic?.branch]);
  const stepIndex = Math.max(
      0,
      tabs.findIndex(([id]) => id === tab),
    ),
    lastStep = stepIndex === tabs.length - 1;
  const moveStep = (direction) => {
    const next = Math.min(tabs.length - 1, Math.max(0, stepIndex + direction));
    setTab(tabs[next][0]);
    window.setTimeout(
      () =>
        document
          .querySelector(".sp-edit-inline form")
          ?.scrollTo({ top: 0, behavior: "smooth" }),
      0,
    );
  };
  const update = (path, value) => {
      setForm((current) => {
        let next = setPath(current, path, value);
        if (path === "personal.gender") {
          if (next.admission?.hostel === "Yes") {
            next.admission.hostelPreference =
              value === "Male" ? "Boys Hostel" : value === "Female" ? "Girls Hostel" : next.admission.hostelPreference || "Boys Hostel";
          }
        }
        if (path === "contact.sameAddress" && value) {
          next.contact.permanentAddress = clone(next.contact.currentAddress || {});
        }
        if (path.startsWith("contact.currentAddress.") && next.contact?.sameAddress) {
          next.contact.permanentAddress = clone(next.contact.currentAddress || {});
        }
        if (path === "parents.guardian.relationship" && value !== "Other") {
          next.parents.guardian.relationshipOther = "";
        }
        if (path === "previousEducation.intermediate.stream" && value !== "Other") {
          next.previousEducation.intermediate.streamOther = "";
        }
        if (path === "academic.admissionType" && value !== "Lateral Entry") {
          next.academic.quota = "";
          next.academic.quotaOther = "";
        }
        if (path === "academic.quota" && value !== "Other") {
          next.academic.quotaOther = "";
        }
        if (path === "admission.scholarship" && value === "No") {
          next.admission.scholarshipType = "";
          next.fees.scholarshipAmount = 0;
        }
        if (path === "admission.hostel") {
          if (value === "No") {
            next.admission.hostelPreference = "";
            next.admission.hostelRoomType = "";
            next.fees.hostelFee = 0;
          } else if (value === "Yes") {
            next.admission.hostelPreference =
              current.personal?.gender === "Male"
                ? "Boys Hostel"
                : current.personal?.gender === "Female"
                  ? "Girls Hostel"
                  : "Boys Hostel";
            if (next.admission?.hostelRoomType) {
              next.fees.hostelFee = resolveProfileHostelFee(next.admission, next.fees, next.academic);
            }
          }
        }
        if (path === "admission.hostelRoomType" || path === "admission.hostelPreference") {
          next.fees.hostelFee = resolveProfileHostelFee(next.admission, next.fees, next.academic);
        }
        if (path === "admission.transport") {
          if (value === "No") {
            next.admission.transportRoute = "";
            next.fees.transportFee = 0;
          } else if (next.admission?.transportRoute) {
            next.fees.transportFee = resolveProfileTransportFee(next.admission, next.fees, next.academic);
          }
        }
        if (path === "admission.transportRoute") {
          next.fees.transportFee = resolveProfileTransportFee(next.admission, next.fees, next.academic);
        }
        const tuition = Number(next.fees?.tuitionFee) > 0 ? Number(next.fees.tuitionFee) : 0;
        const admission = Number(next.fees?.admissionFee !== undefined && next.fees?.admissionFee !== "" ? next.fees.admissionFee : 0);
        const hostel = next.admission?.hostel === "Yes" ? Number(next.fees?.hostelFee || resolveProfileHostelFee(next.admission, next.fees, next.academic) || 0) : 0;
        const transport = next.admission?.transport === "Yes" ? Number(next.fees?.transportFee || resolveProfileTransportFee(next.admission, next.fees, next.academic) || 0) : 0;
        const scholarship = Number(next.fees?.scholarshipAmount || 0);
        const total = Math.max(0, tuition + admission + hostel + transport - scholarship);
        if (!next.fees) next.fees = {};
        next.fees.tuitionFee = tuition;
        next.fees.admissionFee = admission;
        next.fees.hostelFee = hostel;
        next.fees.transportFee = transport;
        next.fees.totalFee = total;
        return next;
      });
      markTouched(path);
      setErrors((current) => ({ ...current, [path]: "" }));
    },
    close = () => {
      if (saving) return;
      if (dirty) setDiscard(true);
      else onCancel();
    };
  const submit = async (event) => {
    event.preventDefault();
    const next = validateProfileForm(form, errors);
    setErrors(next);
    if (Object.keys(next).length) showWarning('Correct the highlighted fields before saving the profile.');
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0],
        section = first.split(".")[0];
      setTab(
        section === "contact"
          ? "contact"
          : section === "parents"
            ? "parents"
            : section === "previousEducation"
              ? "education"
              : section === "admission"
                ? "services"
                : section === "documentUploads"
                  ? "documents"
                  : "personal",
      );
      window.setTimeout(
        () =>
          document
            .querySelector(
              ".sp-edit-field.invalid input,.sp-edit-field.invalid select,.sp-document-upload.invalid input",
            )
            ?.focus(),
        0,
      );
      return;
    }
    setSaving(true);
    try {
      await uploadAdmissionDocuments(profileStudentId(student), Object.fromEntries(Object.entries(form.documentUploads || {}).map(([key,file]) => [key, { ...(form.documents?.[key] || {}), file, name:file.name }])), DOCUMENTS_CONFIG, studentDocumentApi.upload, (item,saved) => {
        delete form.documentUploads[item.key];
        form.documents = { ...form.documents, [item.key]: saved };
        setForm(current => ({ ...current, documents:form.documents, documentUploads:{ ...form.documentUploads } }));
      });
      await onSave(form, student);
    } catch (error) {
      setErrors({ form: error?.message || "Unable to update this student." });
      setSaving(false);
    }
  };
  const renderField = ({
    path,
    label,
    type = "text",
    required = false,
    options,
    readOnly = false,
    maxLength,
    min,
    max,
    step,
    onChange,
  }) => {
    const current =
        path.split(".").reduce((value, key) => value?.[key], form) ?? "",
      isTouched = Boolean(touched[path]),
      hasValue = typeof current === "string" ? current.trim().length > 0 : Boolean(current),
      message = (isTouched || hasValue) ? liveErrors[path] || errors[path] : errors[path],
      mobile = path.toLowerCase().includes("mobile"),
      numeric = /aadhaar|pincode|passingYear/.test(path),
      limit = mobile
        ? 10
        : /aadhaar/.test(path)
          ? 12
          : /pincode/.test(path)
            ? 6
            : /passingYear/.test(path)
              ? 4
              : maxLength;
    const common = {
      value: current,
      disabled: readOnly,
      required,
      "aria-invalid": Boolean(message),
      "aria-describedby": message ? `${path}-error` : undefined,
      onBlur: () => markTouched(path),
      onChange: onChange || ((event) => {
        const next =
          mobile || numeric
            ? event.target.value.replace(/\D/g, "").slice(0, limit)
            : event.target.value;
        update(path, next);
      }),
    };
    return (
      <label key={path} className={`sp-edit-field ${message ? "invalid" : ""}`}>
        <span>
          {label}
          {required && <b> *</b>}
        </span>
        {options ? (
          <ProjectSelect {...common}>
            <option value="">Select</option>
            {options.map((option) => {
              if (typeof option === "object" && option !== null) {
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              }
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            })}
          </ProjectSelect>
        ) : (
          <input
            {...common}
            type={type}
            readOnly={readOnly}
            maxLength={limit}
            min={min}
            max={max}
            step={step}
            inputMode={mobile || numeric ? "numeric" : undefined}
          />
        )}{" "}
        {message && (
          <small id={`${path}-error`} role="alert">
            {message}
          </small>
        )}
      </label>
    );
  };
  const fields = (rows) => (
    <div className="sp-edit-grid">
      {rows.map((item) =>
        renderField({ path: item[0], label: item[1], ...(item[2] || {}) }),
      )}
    </div>
  );
  const addresses = (prefix, isRequired = false) =>
    fields(
      [
        ["line1", "Address line 1", { required: isRequired }],
        ["line2", "Landmark (Optional)"],
        ["town", "Village / Town"],
        ["city", "City", { required: isRequired }],
        ["district", "District"],
        ["state", "State"],
        ["country", "Country"],
        ["pincode", "PIN code", { required: isRequired }],
      ].map(([key, label, opts]) => [`${prefix}.${key}`, label, opts]),
    );
  const currentPin = form.contact?.currentAddress?.pincode || "",
    permanentPin = form.contact?.permanentAddress?.pincode || "",
    sameAddress = Boolean(form.contact?.sameAddress);
  useEffect(() => {
    const targets = [
      ["contact.currentAddress", "current", currentPin],
      ...(!sameAddress
        ? [["contact.permanentAddress", "permanent", permanentPin]]
        : []),
    ];
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.all(
        targets.map(async ([prefix, key, pin]) => {
          if (!/^\d{6}$/.test(pin)) {
            setPinStatus((status) => ({ ...status, [key]: "" }));
            return;
          }
          setPinStatus((status) => ({
            ...status,
            [key]: "Fetching location...",
          }));
          try {
            const location = await lookupIndianPincode(pin);
            if (!active) return;
            setForm((current) => {
              if (
                prefix
                  .split(".")
                  .reduce((value, part) => value?.[part], current)?.pincode !==
                pin
              )
                return current;
              let next = setPath(
                current,
                `${prefix}.town`,
                location.town || location.city || "",
              );
              next = setPath(next, `${prefix}.city`, location.city || "");
              next = setPath(
                next,
                `${prefix}.district`,
                location.district || "",
              );
              next = setPath(next, `${prefix}.state`, location.state || "");
              next = setPath(next, `${prefix}.country`, "India");
              if (
                prefix === "contact.currentAddress" &&
                next.contact.sameAddress
              )
                next.contact.permanentAddress = {
                  ...next.contact.currentAddress,
                };
              return next;
            });
            setPinStatus((status) => ({
              ...status,
              [key]: "Address details filled",
            }));
          } catch (error) {
            if (active)
              setPinStatus((status) => ({
                ...status,
                [key]:
                  error.message ||
                  "PIN code not found - enter the address manually",
              }));
          }
        }),
      );
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [currentPin, permanentPin, sameAddress]);
  const documentFields = [
    ["aadhaarCard", "Aadhaar card"],
    ["tenthMemo", "10th / SSC marks memo"],
    ["qualifyingMemo", "Intermediate / Diploma marks memo"],
    ["transferCertificate", "Transfer certificate"],
    ["casteCertificate", "Caste certificate"],
    ["incomeCertificate", "Income certificate"],
  ];
  const chooseDocument = (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      showWarning('Select a PDF, JPG or PNG file no larger than 500 KB.');
      setErrors((current) => ({
        ...current,
        [`documentUploads.${key}`]: "Only PDF, JPG and PNG files are allowed.",
      }));
      return;
    }
    if (file.size > 500 * 1024) {
      showWarning('Select a PDF, JPG or PNG file no larger than 500 KB.');
      setErrors((current) => ({
        ...current,
        [`documentUploads.${key}`]: "File must be 500 KB or smaller.",
      }));
      return;
    }
    update(`documentUploads.${key}`, file);
    showInfo('Document selected. Save the profile to upload it.');
  };
  return (
    <div className="sp-edit-page erp-two-column-layout" data-without-live-preview="true">
      <div className="erp-card-main">
        <section className="sp-edit-dialog sp-edit-inline" aria-labelledby="edit-student-title" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
        <header>
          <div>
            <span>
              Student management | Step {stepIndex + 1} of {tabs.length}
            </span>
            <h2>Edit Student Profile</h2>
            <p>
              Admission details for {studentName(student) || "this student"}.
            </p>
          </div>
          <button className="sp-close" onClick={close} aria-label="Close">
            <FiX />
          </button>
        </header>
        <nav
          ref={tabNavRef}
          className="erp-tabs-bar ac-tabs sp-edit-tabs"
          aria-label="Student profile edit sections"
        >
          {tabs.map(([id, label], index) => (
            <button
              type="button"
              key={id}
              className={`${tab === id ? "active" : ""} ${index < stepIndex ? "complete" : ""}`}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "step" : undefined}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sp-edit-progress" aria-hidden="true">
          <span
            style={{ width: `${((stepIndex + 1) / tabs.length) * 100}%` }}
          />
        </div>
        <form onSubmit={submit}>
          {tab === "personal" && (
            <fieldset>
              <legend>Personal Information</legend>
              <div className="sp-photo-field">
                <span>Profile photo</span>
                <input id="student-profile-photo" type="file" accept="image/*" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file || !file.type.startsWith('image/')) return
                  setPhotoName(file.name)
                  const reader = new FileReader()
                  reader.onload = () => update('personal.photo', reader.result)
                  reader.readAsDataURL(file)
                }} />
                <label className="sp-photo-picker" htmlFor="student-profile-photo"><strong>Choose photo</strong><small>{photoName || 'JPG, PNG or WEBP | Max 5 MB'}</small></label>
                {form.personal?.photo && <img src={form.personal.photo} alt="Profile preview" />}
              </div>
              {fields([
                ["personal.firstName", "First name", { required: true }],
                ["personal.middleName", "Middle name"],
                ["personal.lastName", "Last name"],
                [
                  "personal.gender",
                  "Gender",
                  { options: ["Female", "Male", "Non-binary"], required: true },
                ],
                [
                  "personal.dob",
                  "Date of birth",
                  { type: "date", required: true },
                ],
                [
                  "personal.bloodGroup",
                  "Blood group",
                  {
                    options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
                  },
                ],
                ["personal.nationality", "Nationality"],
                ["personal.aadhaar", "Aadhaar number"],
              ])}
            </fieldset>
          )}
          {tab === "contact" && (
            <>
              <fieldset>
                <legend>Contact Information</legend>
                {fields([
                  ["contact.mobile", "Student mobile", { required: true }],
                  ["contact.alternateMobile", "Alternate mobile"],
                  [
                    "contact.email",
                    "Student email",
                    { type: "email", required: true },
                  ],
                  [
                    "contact.alternateEmail",
                    "Alternate email",
                    { type: "email" },
                  ],
                ])}
              </fieldset>
              <fieldset>
                <legend>Current Address</legend>
                {addresses("contact.currentAddress", true)}
                {pinStatus.current && (
                  <p
                    className={`sp-pincode-status ${pinStatus.current === "Address details filled" ? "success" : ""}`}
                  >
                    {pinStatus.current}
                  </p>
                )}
              </fieldset>
              <fieldset>
                <legend>Permanent Address</legend>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form.contact?.sameAddress)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setForm((current) => {
                        const next = clone(current);
                        if (!next.contact) next.contact = {};
                        next.contact.sameAddress = checked;
                        if (checked)
                          next.contact.permanentAddress = clone(
                            next.contact.currentAddress || {},
                          );
                        return resetAdmissionAcademicDependents(next, current, 'admission.collegeId');
                      });
                    }}
                  />
                  <span>Permanent address same as current address</span>
                </label>
                {!form.contact?.sameAddress && (
                  <>
                    {addresses("contact.permanentAddress", true)}
                    {pinStatus.permanent && (
                      <p
                        className={`sp-pincode-status ${pinStatus.permanent === "Address details filled" ? "success" : ""}`}
                      >
                        {pinStatus.permanent}
                      </p>
                    )}
                  </>
                )}
              </fieldset>
            </>
          )}
          {tab === "parents" && (
            <fieldset>
              <legend>Parent / Guardian</legend>
              {fields([
                ["parents.father.name", "Father name"],
                ["parents.father.mobile", "Father mobile"],
                ["parents.father.email", "Father email", { type: "email" }],
                ["parents.father.occupation", "Father occupation"],
                ["parents.father.qualification", "Father qualification"],
                [
                  "parents.father.income",
                  "Father annual income",
                  { type: "number" },
                ],
                ["parents.mother.name", "Mother name"],
                ["parents.mother.mobile", "Mother mobile"],
                ["parents.mother.email", "Mother email", { type: "email" }],
                ["parents.mother.occupation", "Mother occupation"],
                ["parents.mother.qualification", "Mother qualification"],
                [
                  "parents.mother.income",
                  "Mother annual income",
                  { type: "number" },
                ],
                ["parents.guardian.name", "Guardian name"],
                [
                  "parents.guardian.relationship",
                  "Guardian relationship",
                  {
                    options: [
                      "Mother",
                      "Brother",
                      "Sister",
                      "Grandfather",
                      "Grandmother",
                      "Uncle",
                      "Aunt",
                      "Legal Guardian",
                      "Other",
                    ],
                  },
                ],
                ["parents.guardian.relationshipOther", "Specify relationship", { required: form.parents?.guardian?.relationship === "Other" }],
                ["parents.guardian.mobile", "Guardian mobile"],
                ["parents.guardian.email", "Guardian email", { type: "email" }],
                ["parents.guardian.occupation", "Guardian occupation"],
                ["parents.guardian.qualification", "Guardian qualification"],
                [
                  "parents.guardian.income",
                  "Guardian annual income",
                  { type: "number" },
                ],
                ["parents.primaryContact", "Primary contact"],
                ["parents.emergencyMobile", "Emergency contact"],
              ])}
            </fieldset>
          )}
          {tab === "academic" && (
            <fieldset>
              <legend>Academic Information</legend>
              <p className="sp-edit-note">
                Academic placement details.
              </p>
              {fields([
                [
                  "academic.academicYear",
                  "Academic year",
                  {
                    options: academicYears.map((y) => ({
                      value: y.name || y.academicYearName,
                      label: y.name || y.academicYearName,
                    })),
                    onChange: (event) => {
                      const val = event.target.value;
                      const selected = academicYears.find(
                        (y) => (y.name || y.academicYearName) === val
                      );
                      setForm((current) => {
                        let next = setPath(current, "academic.academicYear", val);
                        next = setPath(
                          next,
                          "academic.academicYearId",
                          selected?.id || selected?.academicYearId || ""
                        );
                        return resetAdmissionAcademicDependents(next,current,"academic.academicYearId");
                      });
                      setErrors((current) => ({ ...current, "academic.academicYear": "" }));
                    },
                  },
                ],
                [
                  "admission.college",
                  "Joining college",
                  {
                    options: colleges.map((c) => ({
                      value: c.collegeName || c.name || c.institutionName,
                      label: c.collegeName || c.name || c.institutionName,
                    })),
                    onChange: (event) => {
                      const val = event.target.value;
                      const selected = colleges.find(
                        (c) => (c.collegeName || c.name || c.institutionName) === val
                      );
                      setForm((current) => {
                        let next = setPath(current, "admission.college", val);
                        next = setPath(
                          next,
                          "admission.collegeId",
                          selected?.collegeId || selected?.id || ""
                        );
                        next = setPath(next, "academic.course", "");
                        next = setPath(next, "academic.courseId", "");
                        next = setPath(next, "academic.courseCode", "");
                        next = setPath(next, "academic.branch", "");
                        next = setPath(next, "academic.branchId", "");
                        next = setPath(next, "academic.branchCode", "");
                        return next;
                      });
                      setErrors((current) => ({ ...current, "admission.college": "" }));
                    },
                  },
                ],
                [
                  "academic.admissionType",
                  "Admission type",
                  {
                    options: [
                      "Regular / Counselling",
                      "Management",
                      "Spot Admission",
                      "Lateral Entry",
                      "Transfer",
                      "Direct Admission",
                      "Re-Admission",
                      "International Admission",
                    ],
                  },
                ],
                ...(form.academic?.admissionType === "Lateral Entry"
                  ? [
                      [
                        "academic.quota",
                        "Admission quota",
                        {
                          options: [
                            "Government / Convener",
                            "Management",
                            "NRI",
                            "NRI Sponsored",
                            "Institutional",
                            "Other",
                          ],
                        },
                      ],
                      ...(form.academic?.quota === "Other"
                        ? [["academic.quotaOther", "Specify quota", { required: true }]]
                        : []),
                    ]
                  : []),
                [
                  "academic.course",
                  "Course",
                  {
                    options: courseOptions.map((c) => ({
                      value: c.name,
                      label: c.code ? `${c.name} (${c.code})` : c.name,
                    })),
                    onChange: (event) => {
                      const val = event.target.value;
                      const selected = courseOptions.find((c) => c.name === val);
                      setForm((current) => {
                        let next = setPath(current, "academic.course", val);
                        next = setPath(next, "academic.courseId", selected?.id || "");
                        next = setPath(next, "academic.courseCode", selected?.code || "");
                        next = resetAdmissionAcademicDependents(next,current,"academic.courseId");
                        if (selected?.department) {
                          next = setPath(next, "academic.department", selected.department);
                        }
                        next = setPath(next, "academic.branch", "");
                        next = setPath(next, "academic.branchId", "");
                        next = setPath(next, "academic.branchCode", "");
                        return next;
                      });
                      setErrors((current) => ({ ...current, "academic.course": "" }));
                    },
                  },
                ],
                ["academic.courseCode", "Course code", { readOnly: true }],
                ["academic.department", "Department"],
                [
                  "academic.branch",
                  "Branch",
                  {
                    options: availableBranches.map((b) => ({
                      value: b.name,
                      label: b.code ? `${b.name} (${b.code})` : b.name,
                    })),
                    onChange: (event) => {
                      const val = event.target.value;
                      const selected = availableBranches.find((b) => b.name === val);
                      setForm((current) => {
                        let next = setPath(current, "academic.branch", val);
                        next = setPath(next, "academic.branchId", selected?.id || "");
                        next = setPath(next, "academic.branchCode", selected?.code || "");
                        next = resetAdmissionAcademicDependents(next,current,"academic.branchId");
                        if (selected?.department && !current.academic?.department) {
                          next = setPath(next, "academic.department", selected.department);
                        }
                        return next;
                      });
                      setErrors((current) => ({ ...current, "academic.branch": "" }));
                    },
                  },
                ],
                ["academic.branchCode", "Branch code", { readOnly: true }],
                [
                  "academic.studentCategory",
                  "Student category",
                  { options: ["General", "SC", "ST", "BC", "EWS", "Other"] },
                ],
                ["academic.regulation", "Regulation"],
              ])}
            </fieldset>
          )}
          {tab === "education" && (
            <>
              <fieldset>
                <legend>10th / SSC</legend>
                {fields([
                  ["previousEducation.tenth.board", "Board"],
                  ["previousEducation.tenth.institution", "School name"],
                  ["previousEducation.tenth.rollNumber", "Roll number"],
                  ["previousEducation.tenth.passingYear", "Year of passing"],
                  ["previousEducation.tenth.scoreType", "Score type", { options: ["Percentage", "CGPA"] }],
                  [
                    "previousEducation.tenth.score",
                    "Percentage / CGPA",
                    { type: "number" },
                  ],
                ])}
              </fieldset>
              <fieldset>
                <legend>Intermediate / Diploma</legend>
                {fields([
                  [
                    "previousEducation.intermediate.qualification",
                    "Qualification",
                    { options: ["Intermediate", "Diploma", "12th Standard", "Other"] },
                  ],
                  [
                    "previousEducation.intermediate.board",
                    "Board / University",
                  ],
                  [
                    "previousEducation.intermediate.institution",
                    "College name",
                  ],
                  [
                    "previousEducation.intermediate.rollNumber",
                    "Roll / Hall ticket number",
                  ],
                  [
                    "previousEducation.intermediate.passingYear",
                    "Year of passing",
                  ],
                  [
                    "previousEducation.intermediate.stream",
                    "Stream",
                    { options: ["MPC", "BiPC", "MEC", "CEC", "Diploma in Engineering", "Other"] },
                  ],
                  ["previousEducation.intermediate.streamOther", "Specify stream", { required: form.previousEducation?.intermediate?.stream === "Other" }],
                  ["previousEducation.intermediate.scoreType", "Score type", { options: ["Percentage", "CGPA"] }],
                  [
                    "previousEducation.intermediate.score",
                    "Percentage / CGPA",
                    { type: "number" },
                  ],
                ])}
              </fieldset>
            </>
          )}
          {tab === "services" && (
            <>
              <fieldset>
                <legend>Application Information</legend>
                {fields([
                  [
                    "application.registrationNumber",
                    "Registration number",
                    { readOnly: true },
                  ],
                  [
                    "application.date",
                    "Registration date",
                    { type: "date" },
                  ],
                  [
                    "application.admissionNumber",
                    "Admission number",
                    { readOnly: true },
                  ],
                  [
                    "application.admissionDate",
                    "Admission date",
                    { type: "date" },
                  ],
                  ["admission.college", "College"],
                  ["admission.batch", "Batch"],
                ])}
              </fieldset>
              <fieldset>
                <legend>Student Services</legend>
                {fields([
                  [
                    "admission.scholarship",
                    "Scholarship",
                    { options: ["No", "Yes"] },
                  ],
                  [
                    "admission.hostel",
                    "Hostel required",
                    { options: ["No", "Yes"] },
                  ],
                  ...(form.admission?.hostel === "Yes"
                    ? [
                        [
                          "admission.hostelPreference",
                          "Hostel preference",
                          {
                            options:
                              form.personal?.gender === "Male"
                                ? ["Boys Hostel"]
                                : form.personal?.gender === "Female"
                                  ? ["Girls Hostel"]
                                  : ["Boys Hostel", "Girls Hostel"],
                            required: true,
                          },
                        ],
                        [
                          "admission.hostelRoomType",
                          "Room type / Beds",
                          { options: roomTypeOptions, required: true },
                        ],
                      ]
                    : []),
                  [
                    "admission.transport",
                    "Transportation required",
                    { options: ["No", "Yes"] },
                  ],
                  ...(form.admission?.transport === "Yes"
                    ? [
                        [
                          "admission.transportRoute",
                          "Transport route",
                          { options: transportRouteOptions, required: true },
                        ],
                      ]
                    : []),
                ])}
              </fieldset>
            </>
          )}
          {tab === "fees" && (
            <fieldset>
              <legend>Fee Structure & Payment Preference</legend>
              <p className="sp-edit-note">
                Live calculated fee structure based on academic details and services.
              </p>
              {fields([
                [
                  "fees.tuitionFee",
                  "Tuition fee (per year)",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.admissionFee",
                  "Admission fee (one-time)",
                  { type: "number" },
                ],
                [
                  "fees.scholarshipAmount",
                  "Scholarship deduction",
                  { type: "number" },
                ],
                [
                  "fees.hostelFee",
                  "Hostel fee (per year)",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.transportFee",
                  "Transportation fee (per year)",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.totalFee",
                  "Estimated first-year total",
                  { type: "number", readOnly: true },
                ],
                ["fees.paymentStatus", "Payment status", { options: ["Pending", "Paid", "Partially Paid", "Exempted"] }],
              ])}

              <div style={{ marginTop: "18px", padding: "16px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--surface-soft)" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "14px", color: "var(--text-primary)" }}>Payment Preference</h3>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "8px", background: form.fees?.paymentPlan !== "Term-wise Payment" ? "var(--brand-soft)" : "var(--surface)", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="paymentPlan"
                      checked={form.fees?.paymentPlan !== "Term-wise Payment"}
                      onChange={() => update("fees.paymentPlan", "Full Payment")}
                    />
                    <span>
                      <strong>Full Payment</strong>
                      <small style={{ display: "block", color: "var(--text-secondary)", fontSize: "11px" }}>Pay complete first-year amount</small>
                    </span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "8px", background: form.fees?.paymentPlan === "Term-wise Payment" ? "var(--brand-soft)" : "var(--surface)", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="paymentPlan"
                      checked={form.fees?.paymentPlan === "Term-wise Payment"}
                      onChange={() => update("fees.paymentPlan", "Term-wise Payment")}
                    />
                    <span>
                      <strong>Term-wise Payment</strong>
                      <small style={{ display: "block", color: "var(--text-secondary)", fontSize: "11px" }}>Pay in two terms per year</small>
                    </span>
                  </label>
                </div>

                {form.fees?.paymentPlan === "Term-wise Payment" && (
                  <div style={{ marginTop: "12px", padding: "12px", border: "1px dashed var(--border)", borderRadius: "8px", background: "var(--surface)" }}>
                    <strong style={{ fontSize: "12px", color: "var(--text-primary)" }}>Term Breakdown</strong>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                      <div>
                        <small style={{ color: "var(--text-muted)", display: "block" }}>First Term</small>
                        <strong style={{ fontSize: "14px", color: "var(--brand)" }}>{formatMoney(Math.ceil((Number(form.fees?.totalFee) ?? 0) / 2))}</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--text-muted)", display: "block" }}>Second Term</small>
                        <strong style={{ fontSize: "14px", color: "var(--brand)" }}>{formatMoney(Math.max(0, (Number(form.fees?.totalFee) ?? 0) - Math.ceil((Number(form.fees?.totalFee) ?? 0) / 2)))}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </fieldset>
          )}
          {tab === "documents" && (
            <fieldset>
              <legend>Document Status</legend>
              <p className="sp-edit-note">Mark the current status for each document. Uploading documents is not required.</p>
              <div className="sp-document-upload-grid">
                {documentFields.map(([key, label]) => {
                  const current = form.documents?.[key];
                  const documentStatus = current?.status || (current ? "Submitted" : "");
                  return <article key={key} className={`sp-document-upload ${documentStatus === "Submitted" ? "has-file" : ""}`}>
                    <div className="sp-document-upload-icon">{documentStatus === "Submitted" ? <FiCheckCircle /> : <FiFileText />}</div>
                    <div className="sp-document-upload-copy"><strong>{label}</strong><span>{documentStatus || "Status not selected"}</span></div>
                    <div className="sp-document-upload-actions"><ProjectSelect value={documentStatus} onChange={(event) => update(`documents.${key}`, { ...(current || {}), status: event.target.value })}><option value="">Select status</option><option>Submitted</option><option>Pending</option></ProjectSelect></div>
                  </article>;
                })}
                {(form.documents?.otherCertificates || []).map((document, index) => (
                  <article key={document.id ?? `other-${index}`} className="sp-document-upload has-file">
                    <div className="sp-document-upload-icon"><FiFileText /></div>
                    <div className="sp-document-upload-copy"><strong>Other certificate</strong><span>{document.name || "Submitted"}</span></div>
                    {document.data && <a href={document.data} target="_blank" rel="noreferrer">Preview</a>}
                  </article>
                ))}
              </div>
            </fieldset>
          )}
          {tab === "documents" && (
            <fieldset>
              <legend>Student Documents</legend>
              <p className="sp-edit-note">
                Upload a replacement PDF, JPG or PNG file. Maximum file size is
                500 KB.
              </p>
              <div className="sp-document-upload-grid">
                {documentFields.map(([key, label]) => {
                  const current = form.documents?.[key],
                    selected = form.documentUploads?.[key],
                    message = errors[`documentUploads.${key}`],
                    available = Boolean(selected || current);
                  return (
                    <article
                      key={key}
                      className={`sp-document-upload ${available ? "has-file" : ""} ${message ? "invalid" : ""}`}
                    >
                      <div className="sp-document-upload-icon">
                        {available ? <FiCheckCircle /> : <FiFileText />}
                      </div>
                      <div className="sp-document-upload-copy">
                        <strong>{label}</strong>
                        <span title={selected?.name || current?.name}>
                          {selected?.name ||
                            current?.name ||
                            "No document uploaded"}
                        </span>
                        {selected && (
                          <small>
                            Ready to upload | {Math.ceil(selected.size / 1024)}{" "}
                            KB
                          </small>
                        )}
                        {message && (
                          <small className="error" role="alert">
                            {message}
                          </small>
                        )}
                      </div>
                      <div className="sp-document-upload-actions">
                        {current?.data && !selected && (
                          <a
                            href={current.data}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Preview
                          </a>
                        )}
                        <label>
                          <FiUploadCloud />
                          {available ? "Replace" : "Upload"}
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            onChange={(event) => chooseDocument(key, event)}
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            </fieldset>
          )}
          {errors.form && (
            <p className="sp-form-error" role="alert">
              {errors.form}
            </p>
          )}
          <footer>
            <button
              type="button"
              className="sp-button secondary"
              onClick={close}
              disabled={saving}
            >
              Cancel
            </button>
            <span className="sp-edit-action-spacer" />
            {stepIndex > 0 && (
              <button
                type="button"
                className="sp-button secondary"
                onClick={() => moveStep(-1)}
                disabled={saving}
              >
                Previous
              </button>
            )}
            {!lastStep ? (
              <button
                type="button"
                className="sp-button"
                onClick={() => moveStep(1)}
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                className="sp-button"
                disabled={!dirty || saving}
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <FiSave /> Save Changes
                  </>
                )}
              </button>
            )}
          </footer>
        </form>
        {discard && (
          <ViewDialog title="Discard unsaved changes?" onClose={() => setDiscard(false)} showExport={false} hideFooter maxWidth="480px">
              <h3>You have unsaved changes.</h3>
              <p>Discard your changes?</p>
              <footer>
                <button
                  className="sp-button secondary"
                  onClick={() => setDiscard(false)}
                >
                  Stay
                </button>
                <button className="sp-button danger" onClick={onCancel}>
                  Discard Changes
                </button>
              </footer>
          </ViewDialog>
        )}
      </section>
    </div>

    <></>
  </div>
);
}

return StudentProfileEdit;
})();
