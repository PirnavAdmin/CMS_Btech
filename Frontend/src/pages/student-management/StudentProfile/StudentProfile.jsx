// Pages and helpers in this module retain their own isolated scopes.
import * as external0 from "react";
import * as external3 from "react-icons/fi";
import { toastModule, academicYearUtilsModule, exportColumnsModule } from "../../../components/components.jsx";
import { useToastStateModule, DirectoryEmptyStateModule, useCollegeStateModule, ExportMenuModule, InfoCardModule, StatusBadgeModule, DashboardLayoutModule, FilterPanelModule, CompactSummaryModule, AcademicContextModule } from "../../../components/components.jsx";
import { apiEndpointsModule, collegeApiModule, studentCanonicalModelModule, newestFirstModule, exportProvenanceModule, approvedStudentProfilesModule } from "../../../API/apiendpoints.jsx";

export const StudentProfileEditModule = (() => {
const { showInfo } = toastModule;
const { showWarning } = toastModule;
const { default: useToastState } = useToastStateModule;
const { useEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { FiCheckCircle } = external3;
const { FiFileText } = external3;
const { FiSave } = external3;
const { FiUploadCloud } = external3;
const { FiX } = external3;
const { FiInbox } = external3;
const { academicYearApi } = apiEndpointsModule;
const { branchApi } = apiEndpointsModule;
const { courseApi } = apiEndpointsModule;
const { lookupIndianPincode } = apiEndpointsModule;
const { getColleges } = collegeApiModule;
const { getOperationalAcademicYearOptions } = academicYearUtilsModule;
const { createEmptyCanonicalStudent } = studentCanonicalModelModule;
const { normalizeCanonicalStudent } = studentCanonicalModelModule;
const { studentFullName } = studentCanonicalModelModule;
const { studentInitials } = studentCanonicalModelModule;
const { studentQuotaDisplay } = studentCanonicalModelModule;
const { formatAddress } = studentCanonicalModelModule;
const { formatMoney } = studentCanonicalModelModule;
const { formatDateTime } = studentCanonicalModelModule;
const { formatDisplay } = studentCanonicalModelModule;
const { apiAssetUrl } = studentCanonicalModelModule;
const { tenDigitMobile } = studentCanonicalModelModule;
const { normalizeAddressObj } = studentCanonicalModelModule;
const { dateInputValue } = studentCanonicalModelModule;
const { REQUIRED_FIELDS } = studentCanonicalModelModule;
const { DOCUMENTS_CONFIG } = studentCanonicalModelModule;
const { HOSTEL_FEES } = studentCanonicalModelModule;
const { TRANSPORT_FEES } = studentCanonicalModelModule;
/* Imports for isolated regression tests:
import { showInfo, showWarning } from '../../../utils/toast'
import useToastState from '../../../hooks/useToastState'
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiFileText,
  FiSave,
  FiUploadCloud,
  FiX,
  FiInbox,
} from "react-icons/fi";
import {
  academicYearApi,
  branchApi,
  courseApi,
  lookupIndianPincode,
} from "../../../api/apiEndpoints";
import { getColleges } from "../../../auth/collegeApi";
import { getOperationalAcademicYearOptions } from "../../../utils/academicYearUtils";
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
  REQUIRED_FIELDS,
  DOCUMENTS_CONFIG,
  HOSTEL_FEES,
  TRANSPORT_FEES,
} from "../../../utils/studentCanonicalModel";
*/
// #region pages/student-management/StudentProfile/StudentProfileEdit.jsx
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
const initialEditForm = (student) => normalizeCanonicalStudent(student);

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

/* export default */ function StudentProfileEdit({ student, onCancel, onSave }) {
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
          (!effectiveCourseId || !item.courseId || same(item.courseId, effectiveCourseId))
      );
  }, [branches, effectiveCourseId]);

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
              next.fees.hostelFee = HOSTEL_FEES[next.admission.hostelRoomType] || 0;
            }
          }
        }
        if (path === "admission.hostelRoomType") {
          next.fees.hostelFee = HOSTEL_FEES[value] || 0;
        }
        if (path === "admission.transport") {
          if (value === "No") {
            next.admission.transportRoute = "";
            next.fees.transportFee = 0;
          } else if (next.admission?.transportRoute) {
            next.fees.transportFee = TRANSPORT_FEES[next.admission.transportRoute] || 0;
          }
        }
        if (path === "admission.transportRoute") {
          next.fees.transportFee = TRANSPORT_FEES[value] || 0;
        }
        const tuition = Number(next.fees?.tuitionFee) > 0 ? Number(next.fees.tuitionFee) : 50000;
        const admission = Number(next.fees?.admissionFee !== undefined && next.fees?.admissionFee !== "" ? next.fees.admissionFee : 4000);
        const hostel = next.admission?.hostel === "Yes" ? Number(next.fees?.hostelFee || (next.admission?.hostelRoomType ? HOSTEL_FEES[next.admission.hostelRoomType] : 0) || 0) : 0;
        const transport = next.admission?.transport === "Yes" ? Number(next.fees?.transportFee || (next.admission?.transportRoute ? TRANSPORT_FEES[next.admission.transportRoute] : 0) || 0) : 0;
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
          <select {...common}>
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
          </select>
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
    <div className="sp-edit-page erp-two-column-layout">
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
                        return next;
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
                        return next;
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
                          { options: Object.keys(HOSTEL_FEES), required: true },
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
                          { options: Object.keys(TRANSPORT_FEES), required: true },
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
                        <strong style={{ fontSize: "14px", color: "var(--brand)" }}>{formatMoney(Math.ceil((Number(form.fees?.totalFee) || 54000) / 2))}</strong>
                      </div>
                      <div>
                        <small style={{ color: "var(--text-muted)", display: "block" }}>Second Term</small>
                        <strong style={{ fontSize: "14px", color: "var(--brand)" }}>{formatMoney(Math.max(0, (Number(form.fees?.totalFee) || 54000) - Math.ceil((Number(form.fees?.totalFee) || 54000) / 2)))}</strong>
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
                    <div className="sp-document-upload-actions"><select value={documentStatus} onChange={(event) => update(`documents.${key}`, event.target.value ? { status: event.target.value } : null)}><option value="">Select status</option><option>Submitted</option><option>Pending</option></select></div>
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
          {tab === "legacy-documents" && (
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
          <div className="sp-confirm">
            <div>
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
            </div>
          </div>
        )}
      </section>
    </div>

    <aside className="preview-card" aria-label="Student Profile Live Preview">
      <header className="preview-top-bar">
        <span className="preview-live-tag">
          <span className="live-dot" /> LIVE PREVIEW
        </span>
        <span className="preview-sync-hint">Real-time sync</span>
      </header>

      <div className="preview-body-container">
        {(() => {
          const fullName = studentName(form)
          const curAddr = formatAddress(form.contact?.currentAddress)
          const permAddr = formatAddress(form.contact?.permanentAddress)
          const tenth = form.previousEducation?.tenth || {}
          const inter = form.previousEducation?.intermediate || {}
          const fees = form.fees || {}

          const sections = [
            {
              title: 'Personal Information',
              fields: [
                ['Student Name', fullName],
                ['Gender', form.personal?.gender],
                ['Date of Birth', form.personal?.dob],
                ['Blood Group', form.personal?.bloodGroup],
                ['Aadhaar Number', form.personal?.aadhaar],
                ['Nationality', form.personal?.nationality],
              ],
            },
            {
              title: 'Contact & Address',
              fields: [
                ['Mobile Number', form.contact?.mobile],
                ['Alternate Mobile', form.contact?.alternateMobile],
                ['Email Address', form.contact?.email],
                ['Alternate Email', form.contact?.alternateEmail],
                ['Current Address', curAddr],
                ['Permanent Address', permAddr || (form.contact?.sameAddress ? curAddr : '')],
              ],
            },
            {
              title: 'Parent / Guardian',
              fields: [
                ['Father Name', form.parents?.father?.name],
                ['Father Mobile', form.parents?.father?.mobile],
                ['Mother Name', form.parents?.mother?.name],
                ['Mother Mobile', form.parents?.mother?.mobile],
                ['Guardian Name', form.parents?.guardian?.name],
                ['Guardian Mobile', form.parents?.guardian?.mobile],
              ],
            },
            {
              title: 'Academic Enrollment',
              fields: [
                ['Academic Year', form.academic?.academicYear],
                ['Course', form.academic?.course],
                ['Branch', form.academic?.branch],
                ['Semester', form.academic?.semester],
                ['Admission Type', form.academic?.admissionType],
                ['Quota', form.academic?.quota === 'Other' ? form.academic?.quotaOther : form.academic?.quota],
                ['Student Category', form.academic?.studentCategory],
                ['Regulation', form.academic?.regulation],
              ],
            },
            {
              title: 'Previous Education',
              fields: [
                ['10th Board', tenth.board],
                ['10th School', tenth.institution],
                ['10th Score', tenth.score ? `${tenth.score} (${tenth.scoreType || '%'})` : ''],
                ['Inter / Diploma Board', inter.board],
                ['Inter / Diploma College', inter.institution],
                ['Stream', inter.stream === 'Other' ? inter.streamOther : inter.stream],
                ['Inter / Diploma Score', inter.score ? `${inter.score} (${inter.scoreType || '%'})` : ''],
              ],
            },
            {
              title: 'Services & Fees',
              fields: [
                ['Hostel Required', form.admission?.hostel === 'Yes' ? 'Yes' : ''],
                ['Hostel Room Type', form.admission?.hostel === 'Yes' ? form.admission?.hostelRoomType : ''],
                ['Transport Required', form.admission?.transport === 'Yes' ? 'Yes' : ''],
                ['Transport Route', form.admission?.transport === 'Yes' ? form.admission?.transportRoute : ''],
                ['Scholarship', form.admission?.scholarship === 'Yes' ? (form.admission?.scholarshipType || 'Yes') : ''],
                ['Estimated Total Fee', fees.totalFee ? formatMoney(fees.totalFee) : ''],
                ['Payment Status', fees.paymentStatus],
                ['Payment Plan', fees.paymentPlan],
              ],
            },
            {
              title: 'Supporting Documents',
              fields: Object.entries(form.documents || {})
                .filter(([, val]) => val === 'Submitted' || val?.status === 'Submitted' || val?.uploaded || val?.file)
                .map(([key]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), 'Submitted']),
            },
          ].map(sec => ({
            ...sec,
            fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-' && String(val).trim() !== 'N/A'),
          })).filter(sec => sec.fields.length > 0)

          if (sections.length === 0) {
            return (
              <div className="preview-empty-hint">
                <span>Enter details in the form to preview here in real time.</span>
              </div>
            )
          }

          const photoSrc = form.personal?.photo ? apiAssetUrl(form.personal.photo) : (form.personal?.photoUrl ? apiAssetUrl(form.personal.photoUrl) : '')
          const initials = studentInitials(form)

          return (
            <>
              <div className="preview-hero" style={{ marginBottom: '14px' }}>
                <div className="preview-hero-badge" style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: '#e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
                  {photoSrc ? <img src={photoSrc} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials || <FiUser />}
                </div>
                <div className="preview-hero-details">
                  <h3 className="preview-course-title" style={{ margin: 0 }}>{fullName || 'Student Profile Preview'}</h3>
                  <p className="preview-course-meta" style={{ margin: '2px 0 0', color: '#64748B', fontSize: '0.78rem' }}>
                    {[form.academic?.registrationNumber || form.studentId, form.academic?.course, form.academic?.branch, form.academic?.status || 'Active'].filter(Boolean).join(' - ')}
                  </p>
                </div>
              </div>
              {sections.map(sec => (
                <div key={sec.title} className="preview-section-group" style={{ marginBottom: '12px' }}>
                  <span className="preview-section-title">{sec.title}</span>
                  <div className="preview-kv-grid">
                    {sec.fields.map(([label, textVal]) => (
                      <div key={label} className={`preview-kv-item${label.toLowerCase().includes('address') ? ' preview-kv-item--full' : ''}`}>
                        <span className="kv-label">{label}</span>
                        <strong className={`kv-val${label.toLowerCase().includes('address') ? ' kv-val--wrap' : ''}`} title={String(textVal).trim()}>{String(textVal).trim()}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )
        })()}
      </div>
    </aside>
  </div>
);
}
// #endregion pages/student-management/StudentProfile/StudentProfileEdit.jsx
return {
  get default() { return StudentProfileEdit; }
};
})();

export const StudentProfileModule = (() => {
const { default: DirectoryEmptyState } = DirectoryEmptyStateModule;
const { default: useCollegeState } = useCollegeStateModule;
const { newestFirst } = newestFirstModule;
const { rememberCreated } = newestFirstModule;
const { default: useToastState } = useToastStateModule;
const { isApiResult } = exportProvenanceModule;
const { approvedStudentProfiles } = approvedStudentProfilesModule;
const { isApprovedAdmission } = approvedStudentProfilesModule;
const { default: ExportMenu } = ExportMenuModule;
const { PrintDetailsButton } = ExportMenuModule;
const { profileColumns } = exportColumnsModule;
const { useEffect } = external0;
const { useMemo } = external0;
const { useRef } = external0;
const { useState } = external0;
const { FiAlertCircle } = external3;
const { FiArrowLeft } = external3;
const { FiBookOpen } = external3;
const { FiCheckCircle } = external3;
const { FiChevronLeft } = external3;
const { FiChevronRight } = external3;
const { FiEdit2 } = external3;
const { FiFileText } = external3;
const { FiFilter } = external3;
const { FiRefreshCw } = external3;
const { FiSave } = external3;
const { FiSearch } = external3;
const { FiUser } = external3;
const { FiUsers } = external3;
const { FiX } = external3;
const { default: InfoCard } = InfoCardModule;
const { default: StatusBadge } = StatusBadgeModule;
const { default: DashboardLayout } = DashboardLayoutModule;
const { default: FilterPanel } = FilterPanelModule;
const { default: CompactSummary } = CompactSummaryModule;
const { studentAcademicDetailsApi } = apiEndpointsModule;
const { studentDocumentApi } = apiEndpointsModule;
const { studentFeeApi } = apiEndpointsModule;
const { studentParentApi } = apiEndpointsModule;
const { studentPreviousEducationApi } = apiEndpointsModule;
const { studentProfilesApi } = apiEndpointsModule;
const { studentAdmissionApi } = apiEndpointsModule;
const { createEmptyCanonicalStudent } = studentCanonicalModelModule;
const { normalizeCanonicalStudent } = studentCanonicalModelModule;
const { studentFullName } = studentCanonicalModelModule;
const { studentInitials } = studentCanonicalModelModule;
const { studentQuotaDisplay } = studentCanonicalModelModule;
const { formatAddress } = studentCanonicalModelModule;
const { formatMoney } = studentCanonicalModelModule;
const { formatDateTime } = studentCanonicalModelModule;
const { formatDisplay } = studentCanonicalModelModule;
const { apiAssetUrl } = studentCanonicalModelModule;
const { tenDigitMobile } = studentCanonicalModelModule;
const { normalizeAddressObj } = studentCanonicalModelModule;
const { dateInputValue } = studentCanonicalModelModule;
const { DOCUMENTS_CONFIG } = studentCanonicalModelModule;
const { resolveFeeSummary } = studentCanonicalModelModule;
const { useAcademic } = AcademicContextModule;
const { default: StudentProfileEdit } = StudentProfileEditModule;
/* Imports for isolated regression tests:
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
*/
// #region pages/student-management/StudentProfile/StudentProfile.jsx
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
  const rawSummary = read(feeSummary);
  const rawStructure = read(feeStructure);
  const resolvedFees = resolveFeeSummary(combinedSource, rawSummary, rawStructure);
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
      tuitionFee: Number(resolvedFees.tuitionFee) > 0 ? resolvedFees.tuitionFee : Number(combinedSource.fees?.tuitionFee) > 0 ? combinedSource.fees.tuitionFee : 50000,
      admissionFee: Number(resolvedFees.admissionFee) > 0 ? resolvedFees.admissionFee : Number(combinedSource.fees?.admissionFee) > 0 ? combinedSource.fees.admissionFee : 4000,
      totalFee: Number(resolvedFees.totalFee) > 0 ? resolvedFees.totalFee : Number(combinedSource.fees?.totalFee) > 0 ? combinedSource.fees.totalFee : 54000,
      paymentPlan: combinedSource.fees?.paymentPlan || rawSummary?.paymentPlan || rawStructure?.paymentPlan || resolvedFees.paymentPlan || 'Full Payment',
      paymentStatus: combinedSource.fees?.paymentStatus || rawSummary?.paymentStatus || rawStructure?.paymentStatus || resolvedFees.paymentStatus || 'Pending',
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


/* export default */ function StudentProfile() {
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
          ["Tuition Fee (per year)", formatMoney(fees.tuitionFee || 50000)],
          ["Admission Fee (one-time)", formatMoney(fees.admissionFee || 4000)],
          ["Scholarship Deduction", Number(fees.scholarshipAmount) > 0 ? `- ${formatMoney(fees.scholarshipAmount)}` : "None"],
          ["Hostel Room Type", admission.hostel === "Yes" ? (admission.hostelRoomType || "Standard Room") : "Not selected"],
          ["Hostel Fee (per year)", admission.hostel === "Yes" ? formatMoney(fees.hostelFee) : "Not selected"],
          ["Transportation Fee (per year)", admission.transport === "Yes" ? formatMoney(fees.transportFee) : "Not selected"],
          ["First-Year Total", formatMoney(fees.totalFee || 54000)],
          ["Estimated Entire 4-Year Total", formatMoney((Number(fees.tuitionFee || 50000) + Number(fees.hostelFee || 0) + Number(fees.transportFee || 0)) * 4 + Number(fees.admissionFee || 4000))],
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
    </div>
  );
}
// #endregion pages/student-management/StudentProfile/StudentProfile.jsx
return {
  get default() { return StudentProfile; }
};
})();

export const StudentProfileEdit = StudentProfileEditModule.default;
export const StudentProfile = StudentProfileModule.default;
