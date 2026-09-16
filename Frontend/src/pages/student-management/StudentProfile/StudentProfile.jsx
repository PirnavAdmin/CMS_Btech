import { newestFirst } from '../../../utils/newestFirst'
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
  FiEye,
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
import StudentProfileEdit from "./StudentProfileEdit";
import "./StudentProfile.css";
import "./StudentProfileDocuments.css";

const PAGE_SIZE = 5;
const TABS = [
  ["overview", "Overview", FiUser],
  ["personal", "Personal & Contact", FiUser],
  ["parent", "Parent / Guardian", FiUsers],
  ["academic", "Academic", FiBookOpen],
  ["education", "Previous Education", FiBookOpen],
  ["services", "Admission & Services", FiCheckCircle],
  ["fees", "Fees", FiFileText],
  ["documents", "Documents", FiFileText],
];
const value = (x) =>
  x === null || x === undefined || String(x).trim() === "" ? "Not provided" : x;
const name = (x) =>
  [x?.personal?.firstName, x?.personal?.middleName, x?.personal?.lastName]
    .filter(Boolean)
    .join(" ");
const initials = (x) =>
  name(x)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "S";
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
const blankAddress = () => ({
  line1: "",
  line2: "",
  town: "",
  city: "",
  district: "",
  state: "",
  country: "India",
  pincode: "",
});
const normalizeAddressObj = (addr) => {
  if (!addr) return blankAddress();
  if (typeof addr === "string") {
    const trimmed = addr.trim();
    return {
      line1: trimmed,
      line2: "",
      town: "",
      city: "",
      district: "",
      state: "",
      country: "India",
      pincode: "",
    };
  }
  if (typeof addr === "object" && addr !== null) {
    // The admission API can wrap the address in `address`, `value` or
    // `details`. Unwrap it before reading its fields; otherwise approved
    // admissions render as an empty address in Student Profiles.
    const nested = [addr.address, addr.value, addr.details].find(
      (item) => item && typeof item === "object",
    );
    if (nested)
      return normalizeAddressObj({
        ...nested,
        ...Object.fromEntries(
          Object.entries(addr).filter(([, item]) => typeof item !== "object"),
        ),
      });
    const line1 =
      addr.line1 ?? addr.address ?? addr.street ?? addr.addressLine1 ?? "";
    const line2 = addr.line2 ?? addr.addressLine2 ?? "";
    const town = addr.town ?? addr.village ?? "";
    const city = addr.city ?? "";
    const district = addr.district ?? "";
    const state = addr.state ?? "";
    const country = addr.country ?? "India";
    const pincode = addr.pincode ?? addr.postalCode ?? addr.zip ?? "";
    return {
      line1: String(line1),
      line2: String(line2),
      town: String(town),
      city: String(city),
      district: String(district),
      state: String(state),
      country: String(country),
      pincode: String(pincode),
    };
  }
  return blankAddress();
};
const formatAddress = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "object" && item !== null) {
    const parts = [
      item.line1,
      item.addressLine1,
      item.street,
      item.line2,
      item.addressLine2,
      item.town,
      item.village,
      item.city,
      item.district,
      item.state,
      item.country && item.country !== "India" ? item.country : "",
      item.pincode,
      item.postalCode,
      item.zip,
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    if (item.address) return formatAddress(item.address);
    if (item.fullAddress) return String(item.fullAddress).trim();
  }
  return String(item || "").trim();
};
const splitFullName = (fullName) => {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts.at(-1) : "",
  };
};
const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");
const tenDigitMobile = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};
const PROFILE_DOCUMENTS = [
  ["aadhaarCard", "Aadhaar card"],
  ["tenthMemo", "10th / SSC marks memo"],
  ["qualifyingMemo", "Intermediate / Diploma marks memo"],
  ["transferCertificate", "Transfer certificate"],
  ["casteCertificate", "Caste certificate"],
  ["incomeCertificate", "Income certificate"],
];
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
    };
    if (key) mapped[key] = document;
    else mapped.otherCertificates.push(document);
  }
  return mapped;
};
const apiAssetUrl = (value) => {
  if (
    !value ||
    ["string", "null", "undefined"].includes(String(value).trim().toLowerCase())
  )
    return "";
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
  const base = String(import.meta.env.VITE_API_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  return import.meta.env.DEV
    ? value
    : `${base}/${String(value).replace(/^\/+/, "")}`;
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
const firstPhoto = (...values) =>
  values.find((item) => {
    const text = String(item ?? "").trim();
    return text && !["null", "undefined"].includes(text.toLowerCase());
  }) || "";
// API summaries often include an empty top-level property alongside the real
// value in a nested detail DTO. Empty strings must not win that comparison.
const firstFilled = (...values) =>
  values.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      (typeof item !== "string" || item.trim() !== ""),
  );
const profileFromApi = (x) => {
  const header = x.header ?? {},
    summary = x.summary ?? {},
    personalRaw = x.personalInformation ?? {},
    parentRaw = x.parentGuardianInformation ?? x.parentDetails ?? {};
  const parsedName = splitFullName(
    x.studentName ?? header.studentName ?? personalRaw.fullName,
  );
  const personal = {
    firstName:
      firstFilled(x.firstName, x.personal?.firstName, personalRaw.firstName, parsedName.firstName) ?? "",
    middleName:
      firstFilled(x.middleName, x.personal?.middleName, personalRaw.middleName, parsedName.middleName) ?? "",
    lastName:
      firstFilled(x.lastName, x.personal?.lastName, personalRaw.lastName, parsedName.lastName) ?? "",
    gender: firstFilled(x.gender, x.personal?.gender, personalRaw.gender) ?? "",
    dob: dateOnly(
      firstFilled(x.dateOfBirth, x.personal?.dob, personalRaw.dateOfBirth, personalRaw.dob),
    ),
    bloodGroup:
      firstFilled(x.bloodGroup, x.personal?.bloodGroup, personalRaw.bloodGroup) ?? "",
    nationality:
      firstFilled(x.nationality, x.personal?.nationality, personalRaw.nationality) ?? "Indian",
    aadhaar:
      firstFilled(x.aadhaarNumber, x.aadhaar, x.personal?.aadhaar, personalRaw.aadhaarNumber, personalRaw.aadhaar) ?? "",
    photo: apiAssetUrl(firstPhoto(
      x.profilePhoto,
      header.profilePhoto,
      x.personal?.photo,
      personalRaw.profilePhoto,
      personalRaw.photo,
      readStoredPhoto("student-profile", x.studentId ?? header.studentId ?? x.id),
      readStoredPhoto("admission", x.admissionId ?? x.application?.admissionId ?? x.admission?.admissionId),
    )),
  };
  const contactRaw = mergeFilledProfileData(
    x.contactInformation,
    x.contact,
  ) ?? {};
  const flatCurrentAddress = {
    line1: x.currentAddressLine1 ?? x.addressLine1 ?? x.address,
    line2: x.currentAddressLine2 ?? x.addressLine2,
    town: x.town ?? x.village,
    city: x.city,
    district: x.district,
    state: x.state,
    country: x.country,
    pincode: x.pincode ?? x.postalCode ?? x.zip,
  };
  const flatPermanentAddress = {
    line1: x.permanentAddressLine1,
    line2: x.permanentAddressLine2,
    town: x.permanentTown ?? x.permanentVillage,
    city: x.permanentCity,
    district: x.permanentDistrict,
    state: x.permanentState,
    country: x.permanentCountry,
    pincode: x.permanentPincode ?? x.permanentPostalCode,
  };
  const currRaw = [contactRaw.currentAddress, x.currentAddress, x.contactInformation?.currentAddress, x.address, personalRaw.address, flatCurrentAddress]
    .find((item) => Boolean(formatAddress(normalizeAddressObj(item))));
  const permRaw = [contactRaw.permanentAddress, x.permanentAddress, x.contactInformation?.permanentAddress, flatPermanentAddress]
    .find((item) => Boolean(formatAddress(normalizeAddressObj(item))));
  const currentAddress = normalizeAddressObj(currRaw);
  const permanentAddress = normalizeAddressObj(permRaw);
  const hasPerm = Boolean(formatAddress(permanentAddress));
  const sameAddressExplicit = contactRaw.sameAddress;
  const sameAddress =
    sameAddressExplicit !== undefined && sameAddressExplicit !== null
      ? Boolean(sameAddressExplicit)
      : !hasPerm && Boolean(formatAddress(currentAddress));
  const contact = {
    mobile: tenDigitMobile(firstFilled(x.mobile, x.studentMobile, personalRaw.mobile, contactRaw.mobile)),
    alternateMobile: tenDigitMobile(
      firstFilled(x.alternateMobile, contactRaw.alternateMobile),
    ),
    email: firstFilled(x.email, x.studentEmail, personalRaw.email, contactRaw.email) ?? "",
    alternateEmail: firstFilled(x.alternateEmail, contactRaw.alternateEmail) ?? "",
    sameAddress,
    currentAddress,
    permanentAddress:
      !hasPerm && sameAddress ? { ...currentAddress } : permanentAddress,
  };
  const parents = {
    father: {
      name: x.fatherName ?? parentRaw.fatherName ?? x.parents?.father?.name ?? "",
      mobile: tenDigitMobile(
        x.fatherMobile ??
          parentRaw.fatherMobile ??
          parentRaw.parentMobile ??
          x.parents?.father?.mobile,
      ),
      email:
        x.fatherEmail ??
        parentRaw.fatherEmail ??
          parentRaw.parentEmail ??
          x.parents?.father?.email ??
          "",
      occupation:
        x.fatherOccupation ?? parentRaw.fatherOccupation ?? x.parents?.father?.occupation ?? "",
      qualification: x.fatherQualification ?? parentRaw.fatherQualification ?? x.parents?.father?.qualification ?? "",
      income: x.fatherIncome ?? parentRaw.fatherIncome ?? parentRaw.annualIncome ?? x.parents?.father?.income ?? "",
    },
    mother: {
      name: x.motherName ?? parentRaw.motherName ?? x.parents?.mother?.name ?? "",
      mobile: tenDigitMobile(
        x.motherMobile ?? parentRaw.motherMobile ?? x.parents?.mother?.mobile,
      ),
      email: x.motherEmail ?? parentRaw.motherEmail ?? x.parents?.mother?.email ?? "",
      occupation:
        x.motherOccupation ?? parentRaw.motherOccupation ?? x.parents?.mother?.occupation ?? "",
      qualification:
        x.motherQualification ?? parentRaw.motherQualification ?? x.parents?.mother?.qualification ?? "",
      income: x.motherIncome ?? parentRaw.motherIncome ?? x.parents?.mother?.income ?? "",
    },
    guardian: {
      name: x.guardianName ?? parentRaw.guardianName ?? x.parents?.guardian?.name ?? "",
      relationship:
        x.guardianRelationship ?? parentRaw.guardianRelationship ??
          x.parents?.guardian?.relationship ??
          "",
      relationshipOther: x.guardianRelationshipOther ?? parentRaw.guardianRelationshipOther ?? x.parents?.guardian?.relationshipOther ?? "",
      mobile: tenDigitMobile(
        x.guardianMobile ?? parentRaw.guardianMobile ?? x.parents?.guardian?.mobile,
      ),
      email: x.guardianEmail ?? parentRaw.guardianEmail ?? x.parents?.guardian?.email ?? "",
      occupation:
        x.guardianOccupation ?? parentRaw.guardianOccupation ?? x.parents?.guardian?.occupation ?? "",
      qualification:
        x.guardianQualification ?? parentRaw.guardianQualification ?? x.parents?.guardian?.qualification ?? "",
      income: x.guardianIncome ?? parentRaw.guardianIncome ?? x.parents?.guardian?.income ?? "",
    },
    primaryContact: x.primaryContact ?? parentRaw.primaryContact ?? x.parents?.primaryContact ?? "",
    emergencyMobile: x.emergencyMobile ?? x.emergencyContact ?? parentRaw.emergencyMobile ?? parentRaw.emergencyContact ?? x.parents?.emergencyMobile ?? "",
  };
  const academic = {
    ...x.academic,
    ...x.academicInformation,
    ...x.academicDetails,
    academicYear: firstFilled(x.academicYear, x.academicYearName, x.academic?.academicYear, x.academicDetails?.academicYear, x.academicDetails?.academicYearName) ?? "",
    academicYearId: x.academicYearId ?? x.academic?.academicYearId ?? x.academicDetails?.academicYearId ?? "",
    admissionType: x.admissionType ?? x.academic?.admissionType ?? x.academicDetails?.admissionType ?? "",
    course: firstFilled(x.course, x.courseName, x.academic?.course, x.academicDetails?.course, x.academicDetails?.courseName) ?? "",
    courseId: x.courseId ?? x.academic?.courseId ?? x.academicDetails?.courseId ?? "",
    department: firstFilled(x.department, x.departmentName, x.academic?.department, x.academicDetails?.department, x.academicDetails?.departmentName) ?? "",
    departmentId: x.departmentId ?? x.academic?.departmentId ?? x.academicDetails?.departmentId ?? "",
    branch: firstFilled(x.branch, x.branchName, x.academic?.branch, x.academicDetails?.branch, x.academicDetails?.branchName) ?? "",
    branchId: x.branchId ?? x.academic?.branchId ?? x.academicDetails?.branchId ?? "",
    semester: x.semester ?? x.semesterName ?? x.academic?.semester ?? x.academicDetails?.semester ?? x.academicDetails?.semesterName ?? "",
    semesterId: x.semesterId ?? x.academic?.semesterId ?? x.academicDetails?.semesterId ?? "",
    section: x.section ?? x.sectionName ?? x.academic?.section ?? x.academicDetails?.section ?? x.academicDetails?.sectionName ?? "",
    sectionId: x.sectionId ?? x.academic?.sectionId ?? x.academicDetails?.sectionId ?? "",
    regulation: x.regulation ?? x.academic?.regulation ?? x.academicDetails?.regulation ?? "",
    quota: x.quota ?? x.academic?.quota ?? x.academicDetails?.quota ?? "",
    quotaOther: x.quotaOther ?? x.academic?.quotaOther ?? x.academicDetails?.quotaOther ?? "",
    entryType: x.entryType ?? x.academic?.entryType ?? x.academicDetails?.entryType ?? "",
    courseCode: x.courseCode ?? x.academic?.courseCode ?? x.academicDetails?.courseCode ?? "",
    branchCode: x.branchCode ?? x.academic?.branchCode ?? x.academicDetails?.branchCode ?? "",
    studentCategory: x.studentCategory ?? x.academic?.studentCategory ?? x.academicDetails?.studentCategory ?? "",
  };
  const application = {
    registrationNumber: firstFilled(x.registrationNumber, summary.registrationNumber, x.application?.registrationNumber, x.application?.number, x.academicInformation?.registrationNumber) ?? "",
    admissionNumber: firstFilled(x.admissionNumber, summary.admissionNumber, x.application?.admissionNumber) ?? "",
    number: firstFilled(x.registrationNumber, summary.registrationNumber, x.application?.registrationNumber, x.application?.number) ?? "",
    date: dateOnly(firstFilled(x.registrationDate, x.applicationDate, summary.registrationDate, x.application?.date)),
    admissionDate: dateOnly(firstFilled(x.admissionDate, summary.admissionDate, x.application?.admissionDate)),
    ...Object.fromEntries(Object.entries(x.application ?? {}).filter(([, item]) => item !== "" && item !== null && item !== undefined)),
  };
  const previousRaw = x.previousEducation || x.previousEducationDetails || {
    tenth: x.ssc || x.tenthDetails,
    qualifyingEducation: x.qualifyingEducation || x.intermediateDetails,
  };
  const tenthRaw = previousRaw.tenth || previousRaw.ssc || previousRaw.tenthDetails || {};
  const intermediateRaw =
    previousRaw.intermediate ||
    previousRaw.qualifyingEducation ||
    previousRaw.intermediateDetails ||
    previousRaw.diploma ||
    {};
  const previousEducation = {
    tenth: {
      board: tenthRaw.board ?? x.tenthBoard ?? "",
      institution: tenthRaw.institution ?? tenthRaw.schoolName ?? x.tenthInstitution ?? "",
      rollNumber: tenthRaw.rollNumber ?? tenthRaw.hallTicket ?? "",
      passingYear: tenthRaw.passingYear ?? tenthRaw.yearOfPassing ?? "",
      score: tenthRaw.score ?? tenthRaw.percentage ?? "",
      ...tenthRaw,
    },
    intermediate: {
      qualification: intermediateRaw.qualification ?? intermediateRaw.educationLevel ?? "",
      board: intermediateRaw.board ?? intermediateRaw.university ?? "",
      institution: intermediateRaw.institution ?? intermediateRaw.collegeName ?? "",
      passingYear: intermediateRaw.passingYear ?? intermediateRaw.yearOfPassing ?? "",
      stream: intermediateRaw.stream ?? "",
      score: intermediateRaw.score ?? intermediateRaw.percentage ?? "",
      ...intermediateRaw,
    },
  };
  const admission = {
    ...x.admission,
    collegeId: x.collegeId ?? x.admission?.collegeId ?? "",
    college: x.college ?? x.collegeName ?? x.admission?.college ?? "",
    batch: x.batch ?? x.admission?.batch ?? "",
    scholarship: x.scholarship ?? x.admission?.scholarship ?? "",
    scholarshipType: x.scholarshipType ?? x.admission?.scholarshipType ?? "",
    hostel: x.hostel === true ? "Yes" : x.hostel ?? x.admission?.hostel ?? "",
    hostelPreference: x.hostelPreference ?? x.admission?.hostelPreference ?? "",
    hostelRoomType: x.hostelRoomType ?? x.admission?.hostelRoomType ?? "",
    transport: x.transport === true ? "Yes" : x.transport ?? x.admission?.transport ?? "",
    transportRoute: x.transportRoute ?? x.admission?.transportRoute ?? "",
  };
  const fees = {
    tuitionFee: x.tuitionFee ?? "",
    admissionFee: x.admissionFee ?? "",
    scholarshipAmount: x.scholarshipAmount ?? "",
    hostelFee: x.hostelFee ?? "",
    transportFee: x.transportFee ?? "",
    totalFee: x.totalFee ?? "",
    paymentPlan: x.paymentPlan ?? "",
    paymentStatus: x.paymentStatus ?? "",
    ...x.fees,
  };
  const documents = {
    aadhaarCard: null,
    tenthMemo: null,
    qualifyingMemo: null,
    transferCertificate: null,
    casteCertificate: null,
    incomeCertificate: null,
    otherCertificates: [],
    ...x.documents,
    ...Object.fromEntries(Object.entries(x.documentStatuses || {}).map(([key, status]) => [key, { status }])),
  };
  return {
    ...x,
    // An approved admission can expose the enrolled student only through its
    // nested student DTO. Always keep that ID: parent, document and profile
    // updates are student-scoped, while the admission ID is a different key.
    id: x.studentId ?? x.student?.studentId ?? x.student?.id ?? header.studentId ?? x.id,
    studentCode: x.studentCode ?? "",
    status: x.status ?? header.status ?? summary.studentStatus ?? "",
    profileCompletionPercentage:
      x.profileCompletionPercentage ?? summary.profileCompletionPercentage ?? 0,
    personal,
    contact,
    parents,
    academic,
    application,
    previousEducation,
    admission,
    fees,
    documents,
  };
};

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
  const [admission, academic, education, parent, feeSummary, feeStructure, documents] =
    await Promise.allSettled([
      admissionId ? studentAdmissionApi.getById(admissionId) : Promise.resolve(null),
      admissionId ? studentAcademicDetailsApi.get(admissionId) : Promise.resolve(null),
      admissionId ? studentPreviousEducationApi.get(admissionId) : Promise.resolve(null),
      studentId ? studentParentApi.get(studentId) : Promise.resolve(null),
      admissionId ? studentFeeApi.getSummary(admissionId) : Promise.resolve(null),
      admissionId ? studentFeeApi.getStructure(admissionId) : Promise.resolve(null),
      studentId ? studentDocumentApi.getAll(studentId) : Promise.resolve([]),
    ]);
  const read = (result, fallback = null) =>
    result.status === "fulfilled" ? result.value : fallback;
  const admissionData = read(admission, {});
  const parentData = read(parent);
  const combinedSource = mergeFilledProfileData(admissionData, sourceData);
  return profileFromApi({
    ...combinedSource,
    id: studentId ?? admissionData.studentId ?? admissionData.id,
    studentId: studentId ?? admissionData.studentId,
    admissionId: admissionId ?? admissionData.admissionId ?? admissionData.id,
    academicDetails: read(academic),
    previousEducation: read(education),
    parents: parentData ?? sourceData.parents,
    parentDetails: parentData ?? sourceData.parentDetails,
    fees: normalizeProfileFees(read(feeStructure), read(feeSummary)),
    documents: documents.status === "fulfilled"
      ? mergeFilledProfileData(sourceData.documents, documentsFromApi(documents.value))
      : sourceData.documents,
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
  validEmail = (x) => /^\S+@\S+\.\S+$/.test(clean(x));
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
  const [students, setStudents] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useToastState("", 'error'),
    [, setNotice] = useToastState("", 'success'),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState({
      college: "",
      department: "",
      course: "",
      branch: "",
      academicYear: "",
      status: "",
    }),
    [page, setPage] = useState(1),
    [selectedId, setSelectedId] = useState(() =>
      new URLSearchParams(window.location.search).get("studentId"),
    ),
    [tab, setTab] = useState("overview"),
    [editing, setEditing] = useState(null);
  const tableRef = useRef(null);
  const load = async () => {
    setLoading(true);
    setError("");
    const requestedId = new URLSearchParams(window.location.search).get(
      "studentId",
    );
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
        rows = [
          { ...latest, exportVerified: isApiResult(preview) },
          ...rows.filter((row) => String(row.id) !== String(requestedId)),
        ];
      } else if (profile.status === "rejected")
        setNotice(
          profile.reason?.message ||
            "Unable to load the approved student profile.", "error",
        );
      if (admissions.status !== 'fulfilled' || !isApiResult(admissions.value)) {
        setStudents([]);
        throw new Error('Unable to verify admission approvals. Please refresh the student list.');
      }
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
  const options = (key) =>
    [
      ...new Set(
        students
          .map((x) => key === "status" ? status(x.status) : key === "college" ? x.admission?.college : x.academic?.[key])
          .filter(Boolean),
      ),
    ].sort();
  const filtered = useMemo(
    () =>
      students.filter((x) => {
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
              (key === "status" ? status(x.status) : key === "college" ? x.admission?.college : a[key]) === selected,
          )
        );
      }),
    [students, query, filters],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    selected = students.find((x) => String(x.id) === String(selectedId));
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
        : students.find((student) => String(student.id) === String(studentOrId));
    const requestedId = directoryStudent?.studentId ?? directoryStudent?.id ?? studentOrId;
    setSelectedId(requestedId);
    setTab("overview");
    const url = new URL(window.location.href);
    url.searchParams.set("studentId", requestedId);
    window.history.pushState({}, "", url);
    try {
      let preview = directoryStudent ?? { id: requestedId };
      try {
        preview = {
          ...preview,
          ...(await studentProfilesApi.preview(requestedId)),
        };
      } catch {
        // Some newly approved rows are initially keyed by admission ID rather
        // than student ID. Hydration below resolves the correct student record.
      }
      const latest = await hydrateProfile({
        ...preview,
        studentId: directoryStudent?.studentId,
      });
      const resolvedId = latest.id ?? requestedId;
      setSelectedId(resolvedId);
      url.searchParams.set("studentId", resolvedId);
      window.history.replaceState({}, "", url);
      setStudents((current) => [
        latest,
        ...current.filter(
          (x) =>
            String(x.id) !== String(resolvedId) &&
            String(x.id) !== String(requestedId),
        ),
      ]);
    } catch (previewError) {
      setNotice(previewError.message || "Unable to load the latest profile.", 'error');
    }
  };
  const closeProfile = () => {
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
      if (studentId) {
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
      setNotice(editError.message || "Unable to open the student profile editor.", "error");
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
    if (!studentId)
      throw new Error("This approved admission is not linked to a student record yet.");
    const profilePayload = {
      fullName: name(student),
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
      registrationDate: student.application?.date,
      collegeId: student.admission?.collegeId,
      college: student.admission?.college,
      admissionType: student.academic?.admissionType,
      quota: student.academic?.quota,
      quotaOther: student.academic?.quotaOther,
      courseCode: student.academic?.courseCode,
      branchCode: student.academic?.branchCode,
      documentStatuses: Object.fromEntries(Object.entries(student.documents || {}).filter(([, item]) => item && !Array.isArray(item)).map(([key, item]) => [key, typeof item === "object" ? item.status ?? "" : item])),
      changeReason:
        "Student profile updated from the College Management System.",
    };
    let savedThroughAdmission = false;
    try {
      await studentProfilesApi.update(studentId, profilePayload);
    } catch (profileError) {
      const missingProfile =
        Number(profileError?.status) === 404 ||
        Number(profileError?.status) === 405 ||
        /student profile not found/i.test(profileError?.message || "");
      if (!missingProfile || !admissionId) throw profileError;

      // Some deployments create the Student Profile projection lazily after
      // approval. The admission record remains the authoritative store for
      // these fields, so do not lose the user's edits while that projection is
      // unavailable.
      await studentAdmissionApi.update(admissionId, student);
      savedThroughAdmission = true;
    }
    // These resources own the editable parent and education sections. The
    // profile endpoint owns personal/contact/document-status fields.
    const changed = (key) =>
      JSON.stringify(student[key] ?? {}) !== JSON.stringify(originalStudent[key] ?? {});
    const relatedUpdates = [
      changed("parents") ? studentParentApi.update(studentId, student) : Promise.resolve(),
      admissionId && changed("previousEducation")
        ? studentPreviousEducationApi.update(admissionId, student.previousEducation)
        : Promise.resolve(),
      admissionId && !savedThroughAdmission && changed("admission")
        ? studentAdmissionApi.update(admissionId, student)
        : Promise.resolve(),
    ];
    const relatedResults = await Promise.allSettled(relatedUpdates);
    const failedUpdate = relatedResults.find((result) => result.status === "rejected");
    if (failedUpdate) throw failedUpdate.reason;
    // Keep the image visible when an API returns a compact record without its
    // photo field; the API value still takes precedence whenever it is present.
    saveStoredPhoto("student-profile", studentId, p.photo);
    saveStoredPhoto("admission", admissionId, p.photo);
    await load();
    setEditing(null);
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("studentId");
    window.history.replaceState({}, "", url);
    setNotice("Student profile updated successfully.");
  };
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
            label="Student summary"
            items={[
              { label: 'Total', value: students.length },
              { label: 'Active', value: students.filter(s => status(s.status) === 'Active' || status(s.status) === 'Approved').length, tone: 'active' },
              { label: 'Inactive', value: students.filter(s => status(s.status) === 'Inactive').length, tone: 'inactive' },
            ]}
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
              <div className="directory-export-actions">
                <ExportMenu rows={filtered.filter(row => row.exportVerified)} columns={profileColumns} title="Student Profiles" filename="student-profiles" loading={loading || Boolean(error)} scope="Current filtered API results (offline records excluded)" />
                <button className="cm-button secondary" onClick={load}>
                  <FiRefreshCw /> Refresh
                </button>
              </div>
            </header>
            <FilterPanel
              active={Boolean(query || Object.values(filters).some(Boolean))}
              onClear={() => {
                setQuery("");
                setFilters({
                  college: "",
                  department: "",
                  course: "",
                  branch: "",
                  academicYear: "",
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
                  ["college", "College"],
                  ["department", "Department"],
                  ["course", "Course"],
                  ["branch", "Branch"],
                  ["academicYear", "Academic year"],
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
                            students.some(
                              (x) =>
                                x.academic?.department === filters.department &&
                                x.academic?.course === o,
                            ),
                        )
                        .filter(
                          (o) =>
                            key !== "branch" ||
                            !filters.course ||
                            students.some(
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
                    <th style={{ minWidth: "220px" }}>Student</th>
                    <th style={{ minWidth: "180px" }}>College</th>
                    <th style={{ minWidth: "240px" }}>Academic details</th>
                    <th style={{ minWidth: "180px" }}>Contact</th>
                    <th className="table-center" style={{ minWidth: "120px", width: "120px" }}>Status</th>
                    <th className="table-center" style={{ minWidth: "130px", width: "130px" }}>Actions</th>
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
                        onClick={() => openProfile(student)}
                      >
                        <td>
                          <div className="sp-student">
                            <i>
                              {photo ? (
                                <img src={photo} alt={name(student)} />
                              ) : (
                                initials(student)
                              )}
                            </i>
                            <div className="table-cell-group" style={{ minWidth: 0 }}>
                              <strong className="table-cell-truncate" title={name(student) || "Unnamed student"}>
                                {name(student) || "Unnamed student"}
                              </strong>
                              <small className="table-cell-truncate" title={`Admission No: ${value(app.admissionNumber)}`}>
                                Admission No: {value(app.admissionNumber)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="table-cell-truncate" title={value(student.admission?.college)}>{value(student.admission?.college)}</span>
                        </td>
                        <td>
                          <div className="table-cell-group" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                            <strong className="table-cell-truncate" style={{ margin: 0, lineHeight: 1.3 }} title={`${value(shortLabel(a.course))} · ${value(shortLabel(a.branch))}`}>
                              {value(shortLabel(a.course))} ·{" "}
                              {value(shortLabel(a.branch))}
                            </strong>
                            <small className="table-cell-truncate" style={{ margin: 0, lineHeight: 1.3 }} title={`${value(shortLabel(a.department))} · ${value(a.academicYear)}`}>
                              {value(shortLabel(a.department))} ·{" "}
                              {value(a.academicYear)}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="table-cell-group" style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                            <strong className="table-cell-truncate" title={value(student.contact?.mobile)}>{value(student.contact?.mobile)}</strong>
                            <small className="table-cell-truncate" title={value(student.contact?.email)}>{value(student.contact?.email)}</small>
                          </div>
                        </td>
                        <td className="table-center">
                          <StatusBadge value={status(student.status)} />
                        </td>
                        <td className="table-center">
                          <div className="table-actions-cell table-actions-group">
                            <button
                              type="button"
                              className="table-action-btn action-view"
                              aria-label="View student profile"
                              title="View student profile"
                              onClick={(e) => {
                                e.stopPropagation();
                                openProfile(student);
                              }}
                            >
                              <FiEye aria-hidden="true" />
                            </button>
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
              <Empty title="No students match your search or filters.">
                <button
                  className="sp-text-button"
                  onClick={() => {
                    setQuery("");
                    setFilters({
                      department: "",
                      course: "",
                      branch: "",
                      academicYear: "",
                      status: "",
                    });
                  }}
                >
                  Clear filters
                </button>
              </Empty>
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
function Profile({ student, tab, setTab, back, edit, canEdit }) {
  const a = student.academic || {},
    app = student.application || {},
    p = student.personal || {},
    c = student.contact || {},
    parents = student.parents || {},
    previous = student.previousEducation || {},
    admission = student.admission || {},
    fees = student.fees || {},
    documents = student.documents || {};
  const address = (item) => formatAddress(item);
  const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  const relationship =
    parents.guardian?.relationship === "Other"
      ? parents.guardian?.relationshipOther
      : parents.guardian?.relationship;
  const panels = {
    overview: [
      ["Registration number", app.registrationNumber || app.number],
      ["Admission number", app.admissionNumber],
      ["Admission date", app.admissionDate],
      ["Student name", name(student)],
      ["Course", a.course],
      ["Department", a.department],
      ["Branch", a.branch],
      ["Academic year", a.academicYear],
      ["Status", status(student.status)],
    ],
    personal: [
      ["First name", p.firstName],
      ["Middle name", p.middleName],
      ["Last name", p.lastName],
      ["Gender", p.gender],
      ["Date of birth", p.dob],
      ["Blood group", p.bloodGroup],
      ["Nationality", p.nationality],
      ["Aadhaar number", p.aadhaar],
      ["Student mobile", c.mobile],
      ["Alternate mobile", c.alternateMobile],
      ["Student email", c.email],
      ["Alternate email", c.alternateEmail],
      ["Current address", formatAddress(c.currentAddress)],
      [
        "Permanent address",
        formatAddress(c.permanentAddress) ||
          (c.sameAddress ? formatAddress(c.currentAddress) : "") ||
          "Not provided",
      ],
    ],
    parent: [
      ["Father name", parents.father?.name],
      ["Father mobile", parents.father?.mobile],
      ["Father email", parents.father?.email],
      ["Father occupation", parents.father?.occupation],
      ["Father qualification", parents.father?.qualification],
      ["Father annual income", parents.father?.income],
      ["Mother name", parents.mother?.name],
      ["Mother mobile", parents.mother?.mobile],
      ["Mother email", parents.mother?.email],
      ["Mother occupation", parents.mother?.occupation],
      ["Mother qualification", parents.mother?.qualification],
      ["Mother annual income", parents.mother?.income],
      ["Guardian name", parents.guardian?.name],
      ["Guardian relationship", relationship],
      ["Guardian mobile", parents.guardian?.mobile],
      ["Guardian email", parents.guardian?.email],
      ["Guardian occupation", parents.guardian?.occupation],
      ["Guardian qualification", parents.guardian?.qualification],
      ["Guardian annual income", parents.guardian?.income],
      ["Primary contact", parents.primaryContact],
      ["Emergency contact", parents.emergencyMobile],
    ],
    academic: [
      ["Academic year", a.academicYear],
      ["Admission type", a.admissionType],
      ["Course", a.course],
      ["Department", a.department],
      ["Branch", a.branch],
      ["Semester", a.semester],
      ["Section", a.section],
      ["Course code", a.courseCode],
      ["Branch code", a.branchCode],
      ["Student category", a.studentCategory],
      ["Regulation", a.regulation],
      ["Quota", a.quota === "Other" ? a.quotaOther : a.quota],
      ["Entry type", a.entryType],
    ],
    education: [
      ["10th board", previous.tenth?.board],
      ["10th institution", previous.tenth?.institution],
      ["10th roll number", previous.tenth?.rollNumber],
      ["10th passing year", previous.tenth?.passingYear],
      ["10th score type", previous.tenth?.scoreType],
      ["10th score", previous.tenth?.score],
      ["Qualification", previous.intermediate?.qualification],
      ["Board / University", previous.intermediate?.board],
      [
        "Intermediate / Diploma institution",
        previous.intermediate?.institution,
      ],
      ["Passing year", previous.intermediate?.passingYear],
      ["Stream", previous.intermediate?.stream],
      ["Score type", previous.intermediate?.scoreType],
      ["Score", previous.intermediate?.score],
    ],
    services: [
      ["Registration number", app.registrationNumber || app.number],
      ["Registration date", app.date],
      ["Admission number", app.admissionNumber],
      ["Admission date", app.admissionDate],
      ["College", admission.college],
      ["Batch", admission.batch],
      ["Scholarship", admission.scholarship],
      ["Scholarship type", admission.scholarshipType],
      ["Hostel", admission.hostel],
      ["Hostel preference", admission.hostelPreference],
      ["Room type / beds", admission.hostelRoomType],
      ["Transportation", admission.transport],
      ["Transport route", admission.transportRoute],
    ],
    fees: [
      ["Tuition fee (per year)", money(fees.tuitionFee)],
      ["Admission fee (one-time)", money(fees.admissionFee)],
      ["Scholarship amount", money(fees.scholarshipAmount)],
      ["Hostel fee (per year)", money(fees.hostelFee)],
      ["Transportation fee (per year)", money(fees.transportFee)],
      ["First-year total", money(fees.totalFee)],
      ["Payment preference", fees.paymentPlan],
      ["Payment status", fees.paymentStatus],
      ...(fees.components || []).map((component, index) => [
        component.name ?? component.componentName ?? component.feeHead ?? `Fee component ${index + 1}`,
        component.amount,
      ]),
    ],
  };
  const documentRows = [
    ["Aadhaar card", documents.aadhaarCard],
    ["10th / SSC marks memo", documents.tenthMemo],
    ["Intermediate / Diploma marks memo", documents.qualifyingMemo],
    ["Transfer certificate", documents.transferCertificate],
    ["Caste certificate", documents.casteCertificate],
    ["Income certificate", documents.incomeCertificate],
    ...(documents.otherCertificates || []).map((item) => [
      "Other certificate",
      item,
    ]),
  ];
  return (
    <div className="cm-profile-view" data-export-record>
      <div className="cm-profile-top-bar">
        <button type="button" className="cm-button secondary erp-btn erp-btn--secondary" onClick={back}>
          &larr; Back to Student Directory
        </button>
        <div className="sp-profile-top-actions">
          <ExportMenu mode="single" title="Student Profile" filename={`student_${app.admissionNumber || app.registrationNumber || student.id}`} recordSections={Object.entries(panels).map(([key, rows]) => ({ title: TABS.find(item => item[0] === key)?.[1] || key, rows }))} />
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
              <img src={p.photo} alt={name(student)} className="cm-profile-logo" />
            ) : (
              <div className="cm-profile-placeholder">
                {initials(student)}
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
            <h1 className="cm-profile-title"><span style={{ color: '#fff' }}>{name(student) || "Unnamed student"}</span></h1>
            <p className="cm-profile-subtitle">
              <span style={{ color: '#fff' }}>{[value(a.course), value(a.branch)].filter((x) => x !== 'Not provided').join(' · ')}</span>
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
                  <span>{document?.name || "Not uploaded"}</span>
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
      ) : panels[tab] ? (
        <div className="cm-profile-grid">
          <InfoCard
            title={TABS.find((item) => item[0] === tab)[1]}
            icon={TABS.find((item) => item[0] === tab)[2]}
            items={panels[tab]
              .filter(([, content]) => content !== null && content !== undefined && String(content).trim() !== "" && String(content).trim() !== "Not provided" && String(content).trim() !== "—" && String(content).trim() !== "N/A")
              .map(([label, value]) => ({ label, value }))}
          />
        </div>
      ) : (
        <Empty title="Information unavailable">
          No admission information is available for this section.
        </Empty>
      )}
      </div>
    </div>
  );
}
function EditStudent({ student, onCancel, onSave }) {
  const [form, setForm] = useState(() => clone(student)),
    [errors, setErrors] = useToastState({}, 'error'),
    [saving, setSaving] = useState(false),
    [discard, setDiscard] = useState(false),
    original = useMemo(() => JSON.stringify(student), [student]),
    dirty = JSON.stringify(form) !== original;
  const update = (path, value) => {
    setForm((current) => setPath(current, path, value));
    setErrors((current) => ({ ...current, [path]: "" }));
  };
  const close = () => {
    if (saving) return;
    dirty ? setDiscard(true) : onCancel();
  };
  const submit = (e) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector(".sp-edit-field.invalid input")?.focus();
      return;
    }
    if (!dirty) return;
    setSaving(true);
    try {
      onSave(form);
    } catch (error) {
      setErrors({ form: error?.message || "Unable to update this student." });
      setSaving(false);
    }
  };
  const Field = ({
    path,
    label,
    type = "text",
    required = false,
    options,
    readOnly = false,
  }) => {
    const current = path.split(".").reduce((x, key) => x?.[key], form) ?? "",
      message = errors[path];
    return (
      <label className={`sp-edit-field ${message ? "invalid" : ""}`}>
        <span>
          {label}
          {required && <b> *</b>}
        </span>
        {options ? (
          <select
            value={current}
            onChange={(e) => update(path, e.target.value)}
            disabled={readOnly}
          >
            <option value="">Select</option>
            {options.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={current}
            onChange={(e) => update(path, e.target.value)}
            readOnly={readOnly}
            inputMode={
              path.includes("mobile") || path.includes("aadhaar")
                ? "numeric"
                : undefined
            }
            maxLength={
              path.includes("mobile")
                ? 10
                : path.includes("aadhaar")
                  ? 12
                  : undefined
            }
          />
        )}{" "}
        {message && <small role="alert">{message}</small>}
      </label>
    );
  };
  return (
    <div
      className="sp-edit-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="sp-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-student-title"
      >
        <header>
          <div>
            <span>Student management</span>
            <h2 id="edit-student-title">Edit Student</h2>
            <p>Update information for {name(student) || "this student"}.</p>
          </div>
          <button
            className="sp-close"
            onClick={close}
            aria-label="Close edit student"
          >
            <FiX />
          </button>
        </header>
        <form onSubmit={submit} noValidate>
          <fieldset>
            <legend>Personal Information</legend>
            <div className="sp-edit-grid">
              <Field path="personal.firstName" label="First name" required />
              <Field path="personal.middleName" label="Middle name" />
              <Field path="personal.lastName" label="Last name" />
              <Field
                path="personal.gender"
                label="Gender"
                options={["Female", "Male", "Non-binary"]}
              />
              <Field
                path="personal.dob"
                label="Date of birth"
                type="date"
                required
              />
              <Field
                path="personal.bloodGroup"
                label="Blood group"
                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
              />
              <Field path="personal.nationality" label="Nationality" />
              <Field path="personal.aadhaar" label="Aadhaar number" />
              <Field path="contact.mobile" label="Student mobile" required />
              <Field path="contact.alternateMobile" label="Alternate mobile" />
              <Field path="contact.email" label="Student email" type="email" />
              <Field
                path="contact.alternateEmail"
                label="Alternate email"
                type="email"
              />
              <Field
                path="contact.currentAddress.line1"
                label="Current address"
              />
              <Field path="contact.currentAddress.city" label="Current city" />
              <Field
                path="contact.permanentAddress.line1"
                label="Permanent address"
              />
              <Field
                path="contact.permanentAddress.city"
                label="Permanent city"
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Academic Information</legend>
            <p className="sp-edit-note">
              Academic placement is system-managed and cannot be changed from
              Student Profile.
            </p>
            <div className="sp-edit-grid">
              <Field path="academic.department" label="Department" readOnly />
              <Field path="academic.course" label="Course" readOnly />
              <Field path="academic.branch" label="Branch" readOnly />
              <Field
                path="academic.academicYear"
                label="Academic year"
                readOnly
              />
              <Field
                path="academic.admissionType"
                label="Admission type"
                readOnly
              />
              <Field path="academic.quota" label="Quota" readOnly />
              <Field path="academic.entryType" label="Entry type" readOnly />
            </div>
          </fieldset>
          <fieldset>
            <legend>Parent Information</legend>
            <div className="sp-edit-grid">
              <Field path="parents.father.name" label="Father name" required />
              <Field
                path="parents.father.mobile"
                label="Parent mobile"
                required
              />
              <Field
                path="parents.father.email"
                label="Parent email"
                type="email"
              />
              <Field
                path="parents.father.occupation"
                label="Father occupation"
              />
              <Field path="parents.mother.name" label="Mother name" />
              <Field path="parents.mother.mobile" label="Mother mobile" />
              <Field
                path="parents.mother.occupation"
                label="Mother occupation"
              />
              <Field path="parents.guardian.name" label="Guardian name" />
              <Field
                path="parents.guardian.relationship"
                label="Guardian relationship"
              />
              <Field path="parents.guardian.mobile" label="Guardian mobile" />
              <Field path="parents.primaryContact" label="Primary contact" />
              <Field path="parents.emergencyMobile" label="Emergency mobile" />
            </div>
          </fieldset>
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
          </footer>
        </form>
        {discard && (
          <div className="sp-confirm">
            <div>
              <h3>You have unsaved changes.</h3>
              <p>Discard your changes to this student profile?</p>
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
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
