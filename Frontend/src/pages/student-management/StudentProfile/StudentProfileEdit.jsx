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

export default function StudentProfileEdit({ student, onCancel, onSave }) {
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
    bottomScrollRef = useRef(null),
    [tabScrollWidth, setTabScrollWidth] = useState(0),
    original = useMemo(() => JSON.stringify(student), [student]),
    dirty = JSON.stringify(form) !== original;
  const markTouched = (path) => setTouched((prev) => ({ ...prev, [path]: true }));
  const liveErrors = useMemo(() => validateProfileForm(form, errors), [form, errors]);
  useEffect(() => {
    const nav = tabNavRef.current;
    if (!nav) return undefined;
    const updateWidth = () => setTabScrollWidth(nav.scrollWidth);
    updateWidth();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateWidth) : null;
    observer?.observe(nav);
    window.addEventListener("resize", updateWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);
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
          .querySelector(".sp-edit-dialog")
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
                  "PIN code not found — enter the address manually",
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
              Student management · Step {stepIndex + 1} of {tabs.length}
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
          onScroll={(event) => {
            if (bottomScrollRef.current) bottomScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
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
                <label className="sp-photo-picker" htmlFor="student-profile-photo"><strong>Choose photo</strong><small>{photoName || 'JPG, PNG or WEBP · Max 5 MB'}</small></label>
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
                            Ready to upload · {Math.ceil(selected.size / 1024)}{" "}
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
        <div
          ref={bottomScrollRef}
          className="sp-edit-tabs-scroll-bottom"
          aria-label="Scroll edit sections"
          onScroll={(event) => {
            if (tabNavRef.current) tabNavRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
        >
          <div style={{ width: `${Math.max(tabScrollWidth, 1)}px` }} />
        </div>
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
            fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '—' && String(val).trim() !== 'N/A'),
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
                    {[form.academic?.registrationNumber || form.studentId, form.academic?.course, form.academic?.branch, form.academic?.status || 'Active'].filter(Boolean).join(' • ')}
                  </p>
                </div>
              </div>
              {sections.map(sec => (
                <div key={sec.title} className="preview-section-group" style={{ marginBottom: '12px' }}>
                  <span className="preview-section-title">{sec.title}</span>
                  <div className="preview-kv-grid">
                    {sec.fields.map(([label, textVal]) => (
                      <div key={label} className="preview-kv-item">
                        <span className="kv-label">{label}</span>
                        <strong className="kv-val" title={String(textVal).trim()}>{String(textVal).trim()}</strong>
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
