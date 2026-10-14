import { readFeeWorkspace, feeLedger, feeMoney } from '../../fees/feeStructureService'
import { FiClock, FiCreditCard, FiShield, FiPrinter } from 'react-icons/fi'
import { feeCollectionApi } from '../../../api/apiEndpoints'

import DirectoryEmptyState from '../../../components/DirectoryEmptyState'
import useCollegeState from '../../../hooks/useCollegeState'
import { newestFirst, rememberCreated } from '../../../utils/newestFirst'
import useToastState from '../../../hooks/useToastState'
import { isApiResult } from '../../../utils/exportProvenance'
import { approvedStudentProfiles, isApprovedAdmission } from '../../../utils/approvedStudentProfiles'
import ExportMenu, { PrintDetailsButton } from '../../../components/ExportMenu'
import { profileColumns } from '../../../utils/exportColumns'
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBookOpen,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";
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
import StudentProfileEdit from "./StudentProfileEdit";
import "./StudentProfile.css";
import "./StudentProfileDocuments.css";


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

const profileFromApi = (x) => normalizeCanonicalStudent(x);

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
      studentId ? feeCollectionApi.allPending({ studentId }).catch(() => []) : Promise.resolve([]),
      studentId ? feeCollectionApi.allHistory({ studentId }).catch(() => []) : Promise.resolve([]),
    ]);
  const read = (result, fallback = null) =>
    result.status === "fulfilled" ? result.value : fallback;
  const admissionData = read(admission, {});
  const parentData = read(parent);
  const combinedSource = mergeFilledProfileData(admissionData, sourceData);
  const rawSummary = read(feeSummary);
  const rawStructure = read(feeStructure);
  const resolvedFees = resolveFeeSummary(combinedSource, rawSummary, rawStructure);
  const pendingItems = Array.isArray(read(feePending)) ? read(feePending) : [];
  const historyItems = Array.isArray(read(feeHistory)) ? read(feeHistory) : [];

  // Workspace assignment ledger fallback
  let wsAssignment = null;
  let wsLedger = null;
  try {
    const collegeId = combinedSource.admission?.collegeId || combinedSource.academic?.collegeId;
    if (collegeId) {
      const ws = readFeeWorkspace(collegeId);
      if (ws && Array.isArray(ws.assignments)) {
        wsAssignment = ws.assignments.find(a => String(a.student?.id) === String(studentId) || String(a.student?.studentId) === String(studentId));
        if (wsAssignment) {
          wsLedger = feeLedger(ws, wsAssignment);
        }
      }
    }
  } catch {}

  let totalPayable = 0;
  let paidAmount = 0;
  let balanceAmount = 0;
  let isOverdue = false;
  let paymentStatus = 'Pending';
  let installments = [];
  let isConfigured = false;

  if (pendingItems.length > 0) {
    isConfigured = true;
    totalPayable = pendingItems.reduce((sum, r) => sum + Number(r.payableAmount || 0), 0);
    paidAmount = pendingItems.reduce((sum, r) => sum + Number(r.paidAmount || 0), 0);
    balanceAmount = pendingItems.reduce((sum, r) => sum + Number(r.balanceAmount || 0), 0);
    isOverdue = pendingItems.some(r => r.overdue || (r.dueDate && new Date(r.dueDate) < new Date() && Number(r.balanceAmount || 0) > 0));
    paymentStatus = isOverdue
      ? 'Overdue'
      : balanceAmount <= 0 && totalPayable > 0
      ? 'Paid'
      : paidAmount > 0
      ? 'Partially Paid'
      : 'Pending';
    installments = pendingItems.map((item, idx) => ({
      id: item.studentFeeId || idx,
      name: item.feePlanName || item.feeCategory || `Installment ${idx + 1}`,
      dueDate: item.dueDate,
      payable: Number(item.payableAmount || 0),
      paid: Number(item.paidAmount || 0),
      balance: Number(item.balanceAmount || 0),
      status: item.overdue ? 'Overdue' : Number(item.balanceAmount || 0) === 0 ? 'Paid' : Number(item.paidAmount || 0) > 0 ? 'Partially Paid' : 'Pending',
    }));
  } else if (wsLedger) {
    isConfigured = true;
    totalPayable = Number(wsLedger.total || 0) / 100;
    paidAmount = Number(wsLedger.paid || 0) / 100;
    balanceAmount = Number(wsLedger.outstanding || 0) / 100;
    isOverdue = Boolean(wsLedger.overdue);
    paymentStatus = isOverdue
      ? 'Overdue'
      : balanceAmount <= 0 && totalPayable > 0
      ? 'Paid'
      : paidAmount > 0
      ? 'Partially Paid'
      : 'Pending';
  } else {
    const tuition = Number(resolvedFees.tuitionFee) > 0 ? Number(resolvedFees.tuitionFee) : Number(combinedSource.fees?.tuitionFee) > 0 ? Number(combinedSource.fees.tuitionFee) : 0;
    const admissionFee = Number(resolvedFees.admissionFee) > 0 ? Number(resolvedFees.admissionFee) : Number(combinedSource.fees?.admissionFee) > 0 ? Number(combinedSource.fees.admissionFee) : 0;
    const hostel = Number(resolvedFees.hostelFee || combinedSource.fees?.hostelFee || 0);
    const transport = Number(resolvedFees.transportFee || combinedSource.fees?.transportFee || 0);
    const scholarship = Number(resolvedFees.scholarshipAmount || combinedSource.fees?.scholarshipAmount || 0);
    totalPayable = Number(resolvedFees.totalFee || combinedSource.fees?.totalFee || 0) || Math.max(0, tuition + admissionFee + hostel + transport - scholarship);
    paidAmount = Number(combinedSource.fees?.paidAmount || 0);
    if (historyItems.length > 0) {
      paidAmount = historyItems.reduce((sum, h) => sum + Number(h.totalAmount || h.feeAmount || 0), 0);
    }
    if (historyItems.length > 0 && pendingItems.length === 0) {
      totalPayable = Math.max(totalPayable, paidAmount);
      balanceAmount = 0;
      paymentStatus = 'Paid';
      isConfigured = true;
    } else {
      balanceAmount = Math.max(0, totalPayable - paidAmount);
      isConfigured = resolvedFees.configured || Boolean(combinedSource.fees?.configured) || totalPayable > 0 || (resolvedFees.components && resolvedFees.components.length > 0);
      paymentStatus = isConfigured
        ? (balanceAmount <= 0 && totalPayable > 0 ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending')
        : 'Fee Not Assigned';
    }
  }

  if (historyItems.length > 0 && pendingItems.length === 0) {
    paidAmount = historyItems.reduce((sum, h) => sum + Number(h.totalAmount || h.feeAmount || 0), 0);
    totalPayable = Math.max(totalPayable, paidAmount);
    balanceAmount = 0;
    paymentStatus = 'Paid';
    isConfigured = true;
  }

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
    },
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
  // Student Profiles is an administrative workspace. Keep the edit action
  // available to every user who can open this screen; the API remains the
  // source of truth for save authorization.
  const canEdit = true;
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
  const load = async () => {
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
      setStudents(newestFirst('student-profiles', rows));
      if (directory.status === "rejected" && !rows.length)
        setError(
          directory.reason?.message || "Student profiles could not be loaded.",
        );
    } catch (loadError) {
      setError(loadError.message || "Student profiles could not be loaded.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

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
    shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
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
      console.warn("Hydration warning on openProfile:", previewError);
      if (directoryStudent) {
        setSelectedStudent(directoryStudent);
      }
    }
  };
  const closeProfile = () => {
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
        ? studentParentApi.update(studentId, student).catch(() => null)
        : Promise.resolve(),
      admissionId && changed("previousEducation")
        ? studentPreviousEducationApi.update(admissionId, student.previousEducation).catch(() => null)
        : Promise.resolve(),
      admissionId && !savedThroughAdmission && changed("admission")
        ? studentAdmissionApi.update(admissionId, student).catch(() => null)
        : Promise.resolve(),
    ];
    await Promise.allSettled(relatedUpdates);
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

  const body = selected ? (
    <Profile
      student={selected}
      tab={tab}
      setTab={setTab}
      back={closeProfile}
      edit={() => beginEdit(selected)}
      canEdit={canEdit}
    />
  ) : (
    <>
      <header className="sp-heading cm-header">
        <div>
          <h1>Student Profiles</h1>
          <p>
            Find, preview and manage profiles created from student admissions.
          </p>
        </div>
        <div className="cm-row-actions">
          <CompactSummary
            label="Student profile summary"
            items={studentSummaryItems}
          />
        </div>
      </header>
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
                    <select
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
                    </select>
                  </label>
                ))}
              </div>
            </FilterPanel>
            <div className="sp-table-wrap">
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

function StudentProfileReceiptModal({ receipt, student, onClose }) {
  const collegeName = student.admission?.college || student.academic?.collegeName || "Academic ERP Institute";
  const amountVal = Number(receipt?.totalAmount || receipt?.feeAmount || 0);
  const balanceVal = Number(receipt?.balanceAmount ?? student.fees?.balanceAmount ?? 0);
  const receiptNum = receipt?.receiptNumber || `REC-${receipt?.receiptId || receipt?.paymentId || '001'}`;
  const dateStr = receipt?.paymentDate || receipt?.issuedAt || new Date().toISOString().slice(0, 10);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="sa-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sa-dialog" style={{ width: 'min(100%, 650px)' }} onClick={e => e.stopPropagation()}>
        <button type="button" className="sa-dialog-close" onClick={onClose} aria-label="Close">
          <FiX />
        </button>
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
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{receipt?.paymentMode || 'CASH'}</div>
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
      </div>
    </div>
  );
}

function StudentProfileFeesView({ student, onOpenReceipt }) {
  const fees = student.fees || {};
  const isConfigured = Boolean(fees.configured || Number(fees.totalFee || 0) > 0 || (fees.components && fees.components.length > 0));
  const totalFee = Number(fees.totalFee || 0);
  const paidAmount = Number(fees.paidAmount || (fees.paymentStatus === 'Paid' ? totalFee : 0));
  const balance = Math.max(0, totalFee - paidAmount);
  const isOverdue = fees.paymentStatus === 'Overdue';
  const statusLabel = isOverdue ? 'Overdue' : balance === 0 && totalFee > 0 ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending';
  const statusSlug = statusLabel.toLowerCase().replace(/\s+/g, '-');
  const payments = Array.isArray(fees.paymentHistory) ? fees.paymentHistory : [];
  const installments = Array.isArray(fees.installments) ? fees.installments : [];

  return (
    <div className="sp-fees-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
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
                No payment transactions recorded yet for this student.
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
        <div className="cm-profile-banner">
          <div className="cm-profile-avatar-wrap">
            {p.photo ? (
              <img src={p.photo} alt={studentFullName(student)} className="cm-profile-logo" />
            ) : (
              <div className="cm-profile-placeholder">
                {studentInitials(student)}
              </div>
            )}
          </div>
          <div className="cm-profile-header-info">
            <div className="cm-profile-badges">
              {app.admissionNumber && <span className="cm-badge cm-badge-code">Adm: {app.admissionNumber}</span>}
              {app.registrationNumber && <span className="cm-badge cm-badge-type">Reg: {app.registrationNumber}</span>}
              <span className="cm-status-badge active">
                {status(student.status)}
              </span>
            </div>
            <h1 className="cm-profile-title">{studentFullName(student) || "Unnamed student"}</h1>
            <p className="cm-profile-subtitle">
              {[formatDisplay(a.course), formatDisplay(a.branch)].filter((x) => x !== 'Not provided').join(' - ')}
            </p>
          </div>
        </div>

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
          </header>
          <div className="sp-document-list">
            {documentRows.map(([label, document], index) => (
              <article key={document?.id || label + index}>
                <FiFileText />
                <div>
                  <strong>{label}</strong>
                  <span>{document?.name || document?.status || "Not uploaded"}</span>
                </div>
                {document?.data && (
                  <a href={document.data} target="_blank" rel="noreferrer">
                    Preview
                  </a>
                )}
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
