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
import DashboardLayout from "../../../layouts/DashboardLayout";
import FilterPanel from "../../../components/FilterPanel";
import { hasRole } from "../../../auth/auth";
import { ROLES } from "../../../auth/roles";
import {
  studentDocumentApi,
  studentProfilesApi,
} from "../../../api/apiEndpoints";
import StudentProfileEdit from "./StudentProfileEdit";
import "./StudentProfile.css";
import "./StudentProfileDocuments.css";

const PAGE_SIZE = 10;
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
      item.line2,
      item.town,
      item.city,
      item.district,
      item.state,
      item.country && item.country !== "India" ? item.country : "",
      item.pincode,
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    if (item.address) return String(item.address).trim();
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
      x.firstName ??
      x.personal?.firstName ??
      personalRaw.firstName ??
      parsedName.firstName,
    middleName:
      x.middleName ??
      x.personal?.middleName ??
      personalRaw.middleName ??
      parsedName.middleName,
    lastName:
      x.lastName ??
      x.personal?.lastName ??
      personalRaw.lastName ??
      parsedName.lastName,
    gender: x.gender ?? x.personal?.gender ?? personalRaw.gender ?? "",
    dob: dateOnly(
      x.dateOfBirth ??
        x.personal?.dob ??
        personalRaw.dateOfBirth ??
        personalRaw.dob,
    ),
    bloodGroup:
      x.bloodGroup ?? x.personal?.bloodGroup ?? personalRaw.bloodGroup ?? "",
    nationality:
      x.nationality ??
      x.personal?.nationality ??
      personalRaw.nationality ??
      "Indian",
    aadhaar:
      x.aadhaarNumber ??
      x.personal?.aadhaar ??
      personalRaw.aadhaarNumber ??
      personalRaw.aadhaar ??
      "",
    photo: apiAssetUrl(
      x.profilePhoto ??
        header.profilePhoto ??
        x.personal?.photo ??
        personalRaw.profilePhoto ??
        personalRaw.photo,
    ),
  };
  const contactRaw = x.contact ?? x.contactInformation ?? {};
  const currRaw =
    contactRaw.currentAddress ??
    x.currentAddress ??
    x.contactInformation?.currentAddress ??
    x.address ??
    personalRaw.address;
  const permRaw =
    contactRaw.permanentAddress ??
    x.permanentAddress ??
    x.contactInformation?.permanentAddress;
  const currentAddress = normalizeAddressObj(currRaw);
  const permanentAddress = normalizeAddressObj(permRaw);
  const hasPerm = Boolean(formatAddress(permanentAddress));
  const sameAddressExplicit = contactRaw.sameAddress;
  const sameAddress =
    sameAddressExplicit !== undefined && sameAddressExplicit !== null
      ? Boolean(sameAddressExplicit)
      : !hasPerm && Boolean(formatAddress(currentAddress));
  const contact = {
    mobile: tenDigitMobile(x.mobile ?? personalRaw.mobile ?? contactRaw.mobile),
    alternateMobile: tenDigitMobile(
      x.alternateMobile ?? contactRaw.alternateMobile,
    ),
    email: x.email ?? personalRaw.email ?? contactRaw.email ?? "",
    alternateEmail: x.alternateEmail ?? contactRaw.alternateEmail ?? "",
    sameAddress,
    currentAddress,
    permanentAddress:
      !hasPerm && sameAddress ? { ...currentAddress } : permanentAddress,
  };
  const parents = {
    father: {
      name: parentRaw.fatherName ?? x.parents?.father?.name ?? "",
      mobile: tenDigitMobile(
        parentRaw.fatherMobile ??
          parentRaw.parentMobile ??
          x.parents?.father?.mobile,
      ),
      email:
        parentRaw.fatherEmail ??
        parentRaw.parentEmail ??
        x.parents?.father?.email ??
        "",
      occupation:
        parentRaw.fatherOccupation ?? x.parents?.father?.occupation ?? "",
      qualification: x.parents?.father?.qualification ?? "",
      income: x.parents?.father?.income ?? "",
    },
    mother: {
      name: parentRaw.motherName ?? x.parents?.mother?.name ?? "",
      mobile: tenDigitMobile(
        parentRaw.motherMobile ?? x.parents?.mother?.mobile,
      ),
      email: parentRaw.motherEmail ?? x.parents?.mother?.email ?? "",
      occupation:
        parentRaw.motherOccupation ?? x.parents?.mother?.occupation ?? "",
      qualification:
        parentRaw.motherQualification ?? x.parents?.mother?.qualification ?? "",
      income: parentRaw.motherIncome ?? x.parents?.mother?.income ?? "",
    },
    guardian: {
      name: parentRaw.guardianName ?? x.parents?.guardian?.name ?? "",
      relationship:
        parentRaw.guardianRelationship ??
        x.parents?.guardian?.relationship ??
        "",
      relationshipOther: x.parents?.guardian?.relationshipOther ?? "",
      mobile: tenDigitMobile(
        parentRaw.guardianMobile ?? x.parents?.guardian?.mobile,
      ),
      email: parentRaw.guardianEmail ?? x.parents?.guardian?.email ?? "",
      occupation:
        parentRaw.guardianOccupation ?? x.parents?.guardian?.occupation ?? "",
      qualification:
        parentRaw.guardianQualification ?? x.parents?.guardian?.qualification ?? "",
      income: parentRaw.guardianIncome ?? x.parents?.guardian?.income ?? "",
    },
  };
  const academic = {
    academicYear: x.academicYear ?? "",
    admissionType: "",
    course: x.course ?? "",
    department: x.department ?? "",
    branch: x.branch ?? "",
    semester: x.semester ?? "",
    section: x.section ?? "",
    regulation: "",
    quota: "",
    quotaOther: "",
    entryType: "",
    ...x.academic,
    ...x.academicInformation,
  };
  const application = {
    registrationNumber:
      x.registrationNumber ??
      summary.registrationNumber ??
      x.academicInformation?.registrationNumber ??
      "",
    admissionNumber: x.admissionNumber ?? summary.admissionNumber ?? "",
    number: "",
    date: dateOnly(x.registrationDate ?? summary.registrationDate ?? x.application?.date) || new Date().toISOString().slice(0, 10),
    admissionDate: "",
    ...x.application,
  };
  const previousEducation = {
    tenth: {
      board: "",
      institution: "",
      rollNumber: "",
      passingYear: "",
      score: "",
    },
    intermediate: {
      qualification: "",
      board: "",
      institution: "",
      passingYear: "",
      stream: "",
      score: "",
    },
    ...x.previousEducation,
  };
  const admission = {
    collegeId: x.collegeId ?? x.admission?.collegeId ?? "",
    college: x.college ?? x.collegeName ?? "",
    batch: "",
    scholarship: "",
    scholarshipType: "",
    hostel: "",
    hostelPreference: "",
    hostelRoomType: "",
    transport: "",
    transportRoute: "",
    ...x.admission,
  };
  const fees = {
    tuitionFee: "",
    admissionFee: "",
    scholarshipAmount: "",
    hostelFee: "",
    transportFee: "",
    totalFee: "",
    paymentPlan: "",
    paymentStatus: "",
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
    id: x.studentId ?? header.studentId ?? x.id,
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
      a.semester,
      a.section,
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
function Notice({ message, close }) {
  return (
    <div className="sp-toast" role="status">
      <FiCheckCircle />
      {message}
      <button onClick={close} aria-label="Dismiss">
        <FiX />
      </button>
    </div>
  );
}

export default function StudentProfile() {
  const canEdit = hasRole([ROLES.ADMIN]);
  const [students, setStudents] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState({
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
      const [directory, profile] = await Promise.allSettled([
        studentProfilesApi.getAll(),
        requestedId
          ? Promise.all([
              studentProfilesApi.preview(requestedId),
              studentDocumentApi.getAll(requestedId).catch(() => []),
            ])
          : Promise.resolve(null),
      ]);
      let rows =
        directory.status === "fulfilled"
          ? directory.value.map(profileFromApi)
          : [];
      if (profile.status === "fulfilled" && profile.value) {
        const [preview, documents] = profile.value;
        const latest = profileFromApi({
          ...preview,
          studentId: requestedId,
          documents: documentsFromApi(documents),
        });
        rows = [
          latest,
          ...rows.filter((row) => String(row.id) !== String(requestedId)),
        ];
      } else if (profile.status === "rejected")
        setNotice(
          profile.reason?.message ||
            "Unable to load the approved student profile.",
        );
      setStudents(rows);
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
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(t);
  }, [notice]);
  const options = (key) =>
    [
      ...new Set(
        students
          .map((x) => (key === "status" ? status(x.status) : x.academic?.[key]))
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
              (key === "status" ? status(x.status) : a[key]) === selected,
          )
        );
      }),
    [students, query, filters],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    selected = students.find((x) => String(x.id) === String(selectedId));
  useEffect(() => setPage(1), [query, filters]);
  // Narrow the "Academic details" column so Contact sits closer to it.
  // Uses setProperty(..., "important") because the CSS file locks these
  // widths with !important, which a plain inline style can't override.
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const widths = ["24%", "26%", "22%", "10%", "8%"]; // Student, Academic, Contact, Status, Actions
    table.querySelectorAll("th, td").forEach((cell, i) => {
      const colIndex = i % widths.length;
      if (widths[colIndex])
        cell.style.setProperty("width", widths[colIndex], "important");
    });
  }, [shown]);
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
  const openProfile = async (id) => {
    setSelectedId(id);
    setTab("overview");
    const url = new URL(window.location.href);
    url.searchParams.set("studentId", id);
    window.history.pushState({}, "", url);
    try {
      const [preview, documentRows] = await Promise.all([
        studentProfilesApi.preview(id),
        studentDocumentApi.getAll(id).catch(() => []),
      ]);
      const latest = profileFromApi({
        ...preview,
        documents: documentsFromApi(documentRows),
      });
      setStudents((current) => [
        latest,
        ...current.filter((x) => String(x.id) !== String(id)),
      ]);
    } catch (previewError) {
      setNotice(previewError.message || "Unable to load the latest profile.");
    }
  };
  const closeProfile = () => {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("studentId");
    window.history.pushState({}, "", url);
  };
  const beginEdit = (student) => {
    if (!canEdit) {
      setNotice("You do not have permission to edit student profiles.");
      return;
    }
    setEditing(clone(student));
  };
  const saveStudent = async (student) => {
    const p = student.personal || {},
      c = student.contact || {},
      father = student.parents?.father || {},
      mother = student.parents?.mother || {},
      guardian = student.parents?.guardian || {};
    await studentProfilesApi.update(student.id, {
      fullName: name(student),
      gender: p.gender,
      dateOfBirth: p.dob || null,
      email: c.email,
      mobile: c.mobile,
      bloodGroup: p.bloodGroup,
      photo: p.photo || '',
      profilePhoto: p.photo || '',
      address: formatAddress(c.currentAddress),
      fatherName: father.name,
      fatherMobile: father.mobile,
      fatherEmail: father.email,
      fatherOccupation: father.occupation,
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
      student,
    });
    const [preview, documentRows] = await Promise.all([
      studentProfilesApi.preview(student.id),
      studentDocumentApi.getAll(student.id).catch(() => []),
    ]);
    const next = profileFromApi({
      ...preview,
      documents: documentsFromApi(documentRows),
    });
    if (student.personal?.photo) next.personal.photo = student.personal.photo;
    setStudents((current) =>
      current.map((x) => (String(x.id) === String(next.id) ? next : x)),
    );
    setEditing(null);
    setNotice("Student updated successfully.");
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
      <header className="sp-heading">
        <div>
          <span>Student management</span>
          <h1>Student Profiles</h1>
          <p>
            Find, preview and manage profiles created from student admissions.
          </p>
        </div>
        <button className="sp-button secondary" onClick={load}>
          <FiRefreshCw /> Refresh
        </button>
      </header>
      {error ? (
        <State error={error} onRetry={load} />
      ) : (
        <>
          <section className="sp-directory">
            <header>
              <div>
                <h2>Student profile directory</h2>
                <p>
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "student" : "students"} found
                </p>
              </div>
            </header>
            <FilterPanel
              active={Boolean(query || Object.values(filters).some(Boolean))}
              onClear={() => {
                setQuery("");
                setFilters({
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
                    <th>Student</th>
                    <th>Academic details</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th />
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
                        onClick={() => openProfile(student.id)}
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
                            <div>
                              <strong>
                                {name(student) || "Unnamed student"}
                              </strong>
                              <small>
                                Admission No: {value(app.admissionNumber)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <strong style={{ margin: 0, lineHeight: 1.3 }}>
                              {value(shortLabel(a.course))} ·{" "}
                              {value(shortLabel(a.branch))}
                            </strong>
                            <small style={{ margin: 0, lineHeight: 1.3 }}>
                              {value(shortLabel(a.department))} ·{" "}
                              {value(a.academicYear)}
                            </small>
                            <small style={{ margin: 0, lineHeight: 1.3 }}>
                              {value(a.semester)}{" "}
                              {a.section && `· Section ${a.section}`}
                            </small>
                          </div>
                        </td>
                        <td>
                          <strong>{value(student.contact?.mobile)}</strong>
                          <small>{value(student.contact?.email)}</small>
                        </td>
                        <td>
                          <span className="sp-badge active">
                            <i />
                            {status(student.status)}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              className="sp-table-button"
                              aria-label="View student profile"
                              title="View student profile"
                              onClick={(e) => {
                                e.stopPropagation();
                                openProfile(student.id);
                              }}
                            >
                              <FiEye className="module-action-icon module-action-icon--view" />
                            </button>
                            {canEdit && (
                              <button
                                className="sp-table-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  beginEdit(student);
                                }}
                              >
                                <FiEdit2 className="module-action-icon module-action-icon--edit" />{" "}
                                Edit
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
        {notice && <Notice message={notice} close={() => setNotice("")} />}{" "}
        {body}
        {editing && (
          <StudentProfileEdit
            student={editing}
            onCancel={() => setEditing(null)}
            onSave={saveStudent}
          />
        )}
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
      ["Semester", a.semester],
      ["Section", a.section],
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
      ["Guardian name", parents.guardian?.name],
      ["Guardian relationship", relationship],
      ["Guardian mobile", parents.guardian?.mobile],
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
      ["Regulation", a.regulation],
      ["Quota", a.quota === "Other" ? a.quotaOther : a.quota],
      ["Entry type", a.entryType],
    ],
    education: [
      ["10th board", previous.tenth?.board],
      ["10th institution", previous.tenth?.institution],
      ["10th roll number", previous.tenth?.rollNumber],
      ["10th passing year", previous.tenth?.passingYear],
      ["10th score", previous.tenth?.score],
      ["Qualification", previous.intermediate?.qualification],
      ["Board / University", previous.intermediate?.board],
      [
        "Intermediate / Diploma institution",
        previous.intermediate?.institution,
      ],
      ["Passing year", previous.intermediate?.passingYear],
      ["Stream", previous.intermediate?.stream],
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
    <>
      <button className="sp-back" onClick={back}>
        <FiArrowLeft /> Back to student directory
      </button>
      <section className="sp-hero">
        <div className="sp-avatar">
          {p.photo ? (
            <img src={p.photo} alt={name(student)} />
          ) : (
            initials(student)
          )}
        </div>
        <div className="sp-identity">
          <h2>{name(student) || "Unnamed student"}</h2>
          <p>
            Admission No. {value(app.admissionNumber)} · Registration No.{" "}
            {value(app.registrationNumber || app.number)}
          </p>
          <span>
            {value(a.course)} · {value(a.branch)} · {value(a.semester)}
          </span>
        </div>
        <span className="sp-badge active">
          <i />
          {status(student.status)}
        </span>
        <button
          className="sp-button sp-hero-edit"
          onClick={edit}
          disabled={!canEdit}
          title={
            canEdit
              ? "Edit student profile"
              : "Only administrators can edit student profiles"
          }
        >
          <FiEdit2 className="module-action-icon module-action-icon--edit" />{" "}
          Edit Student
        </button>
      </section>
      <nav className="sp-tabs">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
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
        <section className="sp-panel">
          <header>
            <h2>{TABS.find((item) => item[0] === tab)[1]}</h2>
          </header>
          <dl className="sp-info-grid">
            {panels[tab].map(([label, content]) => detail(label, content))}
          </dl>
        </section>
      ) : (
        <Empty title="Information unavailable">
          No admission information is available for this section.
        </Empty>
      )}
    </>
  );
}
function EditStudent({ student, onCancel, onSave }) {
  const [form, setForm] = useState(() => clone(student)),
    [errors, setErrors] = useState({}),
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
              <Field path="academic.semester" label="Semester" readOnly />
              <Field path="academic.section" label="Section" readOnly />
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