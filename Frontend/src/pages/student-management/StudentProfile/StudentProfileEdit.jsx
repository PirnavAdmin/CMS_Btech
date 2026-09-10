import { showInfo, showWarning } from '../../../utils/toast'
import useToastState from '../../../hooks/useToastState'
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiFileText,
  FiSave,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { lookupIndianPincode } from "../../../api/apiEndpoints";
import { getColleges } from "../../../auth/collegeApi";

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
const studentName = (student) =>
  [
    student?.personal?.firstName,
    student?.personal?.middleName,
    student?.personal?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
const validMobile = (value) => /^[6-9]\d{9}$/.test(String(value || ""));
const clean = (value) => String(value ?? "").trim();
const validName = (value) => /^[A-Za-z][A-Za-z .'-]{1,79}$/.test(clean(value));
const validEmail = (value) => /^\S+@\S+\.\S+$/.test(clean(value));
const validYear = (value) =>
  /^\d{4}$/.test(clean(value)) &&
  Number(value) >= 1950 &&
  Number(value) <= new Date().getFullYear() + 1;
const initialEditForm = (student) => {
  const form = clone(student);
  form.application ??= {};
  form.previousEducation ??= {};
  form.previousEducation.intermediate ??= {};
  form.application.date ??= new Date().toISOString().slice(0, 10);
  form.previousEducation.intermediate.stream ??= "";
  return form;
};

export default function StudentProfileEdit({ student, onCancel, onSave }) {
  const tabs = [
    ["personal", "Personal"],
    ["contact", "Contact & Address"],
    ["parents", "Parent / Guardian"],
    ["academic", "Academic"],
    ["education", "Previous Education"],
    ["services", "Admission & Services"],
    ["fees", "Fees"],
    ["documents", "Documents"],
  ];
  const [form, setForm] = useState(() => initialEditForm(student)),
    [errors, setErrors] = useToastState({}, 'error'),
    [saving, setSaving] = useState(false),
    [photoName, setPhotoName] = useState(""),
    [discard, setDiscard] = useState(false),
    [tab, setTab] = useState("personal"),
    [pinStatus, setPinStatus] = useState({ current: "", permanent: "" }),
    [colleges, setColleges] = useState([]),
    tabNavRef = useRef(null),
    bottomScrollRef = useRef(null),
    [tabScrollWidth, setTabScrollWidth] = useState(0),
    original = useMemo(() => JSON.stringify(student), [student]),
    dirty = JSON.stringify(form) !== original;
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
    getColleges()
      .then((response) => {
        let value = response;
        for (let depth = 0; depth < 5 && value && typeof value === "object"; depth += 1) {
          if (Array.isArray(value)) break;
          value = value.items ?? value.content ?? value.records ?? value.data;
        }
        if (active) setColleges(Array.isArray(value) ? value : []);
      })
      .catch(() => { if (active) setColleges([]); });
    return () => { active = false; };
  }, []);
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
      setForm((current) => setPath(current, path, value));
      setErrors((current) => ({ ...current, [path]: "" }));
    },
    close = () => {
      if (saving) return;
      if (dirty) setDiscard(true);
      else onCancel();
    };
  const submit = async (event) => {
    event.preventDefault();
    const next = {
        ...Object.fromEntries(
          Object.entries(errors).filter(([key]) =>
            key.startsWith("documentUploads."),
          ),
        ),
      },
      p = form.personal || {},
      c = form.contact || {},
      father = form.parents?.father || {},
      mother = form.parents?.mother || {},
      guardian = form.parents?.guardian || {},
      tenth = form.previousEducation?.tenth || {},
      inter = form.previousEducation?.intermediate || {},
      admission = form.admission || {};
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
    if (!validName(father.name))
      next["parents.father.name"] = "Enter a valid father name.";
    if (!validMobile(father.mobile))
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
    if (form.academic?.quota === "Other" && !clean(form.academic?.quotaOther))
      next["academic.quotaOther"] = "Specify the admission quota.";
    if (admission.hostel === "Yes" && !clean(admission.hostelPreference))
      next["admission.hostelPreference"] = "Select a hostel preference.";
    if (admission.transport === "Yes" && !clean(admission.transportRoute))
      next["admission.transportRoute"] = "Enter the transportation route.";
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
      await onSave(form);
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
  }) => {
    const current =
        path.split(".").reduce((value, key) => value?.[key], form) ?? "",
      message = errors[path],
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
      onChange: (event) => {
        const next =
          mobile || numeric
            ? event.target.value.replace(/\D/g, "").slice(0, limit)
            : event.target.value;
        update(path, next);
      },
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
            {options.map((option) => (
              <option key={option}>{option}</option>
            ))}
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
  const addresses = (prefix) =>
    fields(
      [
        ["line1", "Address line 1"],
        ["line2", "Landmark (Optional)"],
        ["town", "Village / Town"],
        ["city", "City"],
        ["district", "District"],
        ["state", "State"],
        ["country", "Country"],
        ["pincode", "PIN code"],
      ].map(([key, label]) => [`${prefix}.${key}`, label]),
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
    <div className="sp-edit-page">
      <section className="sp-edit-dialog sp-edit-inline" aria-labelledby="edit-student-title">
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
          className="sp-edit-tabs"
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
              <i>{index + 1}</i>
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
                  { options: ["Female", "Male", "Non-binary"] },
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
                {addresses("contact.currentAddress")}
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
                    {addresses("contact.permanentAddress")}
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
                ["parents.father.name", "Father name", { required: true }],
                ["parents.father.mobile", "Father mobile", { required: true }],
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
                ["parents.guardian.relationshipOther", "Specify relationship"],
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
                ["parents.emergencyMobile", "Emergency mobile"],
              ])}
            </fieldset>
          )}
          {tab === "academic" && (
            <fieldset>
              <legend>Academic Information</legend>
              <p className="sp-edit-note">
                Academic placement is system-managed and read-only.
              </p>
              {fields(
                [
                  ["academic.academicYear", "Academic year"],
                  ["academic.admissionType", "Admission type"],
                  ["academic.course", "Course"],
                  ["academic.courseCode", "Course code"],
                  ["academic.department", "Department"],
                  ["academic.branch", "Branch"],
                  ["academic.branchCode", "Branch code"],
                  ["academic.studentCategory", "Student category"],
                  ["academic.regulation", "Regulation"],
                  ...(form.academic?.admissionType === "Lateral Entry" ? [["academic.quota", "Admission quota"], ["academic.quotaOther", "Specify admission quota"]] : []),
                  ["academic.entryType", "Entry type"],
                ].map(([path, label]) => [path, label, { readOnly: true }]),
              )}
            </fieldset>
          )}
          {tab === "education" && (
            <>
              <fieldset>
                <legend>10th / SSC</legend>
                {fields([
                  ["previousEducation.tenth.board", "Board"],
                  ["previousEducation.tenth.institution", "School name"],
                  ["previousEducation.tenth.rollNumber", "10th roll number"],
                  ["previousEducation.tenth.passingYear", "Year of passing"],
                  [
                    "previousEducation.tenth.score",
                    "Percentage (0–100)",
                    { type: "number" },
                  ],
                ])}
              </fieldset>
              <fieldset>
                <legend>Intermediate / Diploma</legend>
                {fields([
                  ["previousEducation.intermediate.qualification", "Qualification"],
                  [
                    "previousEducation.intermediate.board",
                    "Board / University",
                  ],
                  [
                    "previousEducation.intermediate.institution",
                    "College name",
                  ],
                  [
                    "previousEducation.intermediate.passingYear",
                    "Year of passing",
                  ],
                  [
                    "previousEducation.intermediate.stream",
                    "Stream",
                  ],
                  [
                    "previousEducation.intermediate.scoreType",
                    "Score type",
                    { options: ["Percentage", "CGPA"] },
                  ],
                  [
                    "previousEducation.intermediate.score",
                    "Percentage (0–100)",
                    { type: "number" },
                  ],
                ])}
              </fieldset>
            </>
          )}
          {tab === "services" && (
            <fieldset>
              <legend>Admission & Services</legend>
              {fields([
                [
                  "application.registrationNumber",
                  "Registration number",
                  { readOnly: true },
                ],
                [
                  "application.date",
                  "Registration date",
                  { type: "date", readOnly: true },
                ],
                [
                  "application.admissionNumber",
                  "Admission number",
                  { readOnly: true },
                ],
                [
                  "application.admissionDate",
                  "Admission date",
                  { type: "date", readOnly: true },
                ],
                ["admission.batch", "Batch", { readOnly: true }],
                ["admission.scholarship", "Scholarship", { options: ["No", "Yes"] }],
                ["admission.scholarshipType", "Scholarship type"],
                [
                  "admission.hostel",
                  "Hostel required",
                  { options: ["No", "Yes"] },
                ],
                [
                  "admission.hostelPreference",
                  "Hostel preference",
                  { options: ["Boys Hostel", "Girls Hostel"] },
                ],
                ["admission.hostelRoomType", "Room type / Beds"],
                [
                  "admission.transport",
                  "Transportation required",
                  { options: ["No", "Yes"] },
                ],
                ["admission.transportRoute", "Transport route"],
              ])}
              <div className="sp-edit-grid">
                <label className="sp-edit-field">
                  <span>College</span>
                  <select
                    value={form.admission?.collegeId || ""}
                    onChange={(event) => {
                      const college = colleges.find((item) => String(item.collegeId ?? item.id) === event.target.value);
                      update("admission.collegeId", event.target.value);
                      update("admission.college", college?.collegeName ?? college?.name ?? college?.institutionName ?? "");
                    }}
                  >
                    <option value="">Select College</option>
                    {colleges.map((college) => {
                      const id = college.collegeId ?? college.id;
                      const label = college.collegeName ?? college.name ?? college.institutionName;
                      return id && label ? <option key={id} value={id}>{label}</option> : null;
                    })}
                  </select>
                </label>
              </div>
            </fieldset>
          )}
          {tab === "fees" && (
            <fieldset>
              <legend>Fee Information</legend>
              <p className="sp-edit-note">
                Fee values are managed by Fee Structure and are shown here for
                reference.
              </p>
              {fields([
                [
                  "fees.tuitionFee",
                  "Tuition fee (per year)",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.admissionFee",
                  "Admission fee",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.scholarshipAmount",
                  "Scholarship amount",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.hostelFee",
                  "Hostel fee",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.transportFee",
                  "Transportation fee",
                  { type: "number", readOnly: true },
                ],
                [
                  "fees.totalFee",
                  "Total fee",
                  { type: "number", readOnly: true },
                ],
                ["fees.paymentPlan", "Payment preference", { readOnly: true }],
                ["fees.paymentStatus", "Payment status", { readOnly: true }],
              ])}
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
                    <div className="sp-document-upload-actions"><select value={documentStatus} onChange={(event) => update(`documents.${key}`, event.target.value ? { status: event.target.value } : null)}><option value="">Select status</option><option>Submitted</option><option>Pending</option><option>Not Submitted</option></select></div>
                  </article>;
                })}
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
  );
}
