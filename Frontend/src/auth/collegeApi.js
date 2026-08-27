const cleanUrl = (url) => (url || "").replace(/\/+$/, "");

const getErrorMessage = (data, status) => {
  if (status >= 500) return "Something went wrong while completing your request. Please try again.";
  if (typeof data === "string") {
    const message = data.trim();
    const isTechnicalPage = /<!doctype|<html|<head|<body|<script|ngrok|err_ngrok|data-payload|https?:\/\//i.test(message);
    if (message && !isTechnicalPage && message.length <= 500) return message;
  }
  if (data && typeof data === "object") {
    if (data.errors && typeof data.errors === "object") {
      const validationMessages = Object.entries(data.errors)
        .flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).filter(Boolean).map((message) => `${field}: ${message}`));
      if (validationMessages.length) return validationMessages.join(" ");
    }
    const directMessage = data.message || data.detail;
    if (directMessage && !/<!doctype|<html|ngrok|err_ngrok|https?:\/\//i.test(String(directMessage))) return directMessage;
    if (data.title && data.title !== "One or more validation errors occurred.") return data.title;
  }
  return {
    400: "Please check the required college details and try again.",
    401: "Your session has expired. Please sign in again.",
    403: "You do not have permission to manage colleges.",
    404: "College information is temporarily unavailable. Please try again later.",
    409: "A college with these details already exists.",
  }[status] || "We couldn’t complete your request. Please try again.";
};

const commonBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL);
const collegesBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL_COLLEGES) || commonBaseUrl;
const academicBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL_ACADEMIC) || commonBaseUrl;
const settingsBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL_SETTINGS) || commonBaseUrl;

const createClient = (baseUrl, prefix) => {
  const request = async (path, options = {}) => {
    const token = localStorage.getItem("btech-access-token") || sessionStorage.getItem("btech-access-token");
    let response;
    try {
      response = await fetch(`${baseUrl}${prefix}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    } catch {
      throw new Error("This service is temporarily unavailable. Please try again later.");
    }
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const error = new Error(getErrorMessage(data, response.status));
      error.response = { data, status: response.status };
      throw error;
    }
    return { data, status: response.status, headers: response.headers };
  };
  return {
    get: (path, config = {}) => {
      const query = config.params ? `?${new URLSearchParams(config.params)}` : "";
      return request(`${path}${query}`);
    },
    post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
    put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
    patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
  };
};

const API = createClient(collegesBaseUrl, "/api/v1");
const ACADEMIC_API = createClient(academicBaseUrl, "/api/v1");
const SETTINGS_API = createClient(settingsBaseUrl, "/api");

const COLLEGE_EXTENDED_PREFIX = "CMS_EXTENDED_V1:";

export const readCollegeExtendedDetails = (record = {}) => {
  const raw = typeof record.accreditation === "string"
    ? record.accreditation
    : typeof record.accreditationDetails === "string" ? record.accreditationDetails : "";
  if (!raw.startsWith(COLLEGE_EXTENDED_PREFIX)) return { accreditationSummary: raw };
  try {
    return JSON.parse(raw.slice(COLLEGE_EXTENDED_PREFIX.length));
  } catch {
    return { accreditationSummary: raw };
  }
};


// -------------------------
// COLLEGE APIs
// -------------------------

export const getColleges = () => {
  return API.get("/colleges");
};

export const getCollegeById = (id) => {
  return API.get(`/colleges/${id}`);
};

export const unwrapCollegeRecord = (response) => {
  let current = response;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    if (current.college && typeof current.college === "object") return current.college;
    if (current.item && typeof current.item === "object") return current.item;
    if (current.result && typeof current.result === "object") return current.result;
    if (current.record && typeof current.record === "object") return current.record;
    if (current.data && typeof current.data === "object") { current = current.data; continue; }
    break;
  }
  return current && typeof current === "object" ? current : {};
};

export const searchColleges = (searchTerm) => {
  return API.get("/colleges/search", {
    params: {
      Query: searchTerm,
    },
  });
};

// The college service has used both the short field names (name/contact/principal)
// and the descriptive DTO names (collegeName/contactNumber/principalName).  Send
// both forms so none of the wizard fields are silently ignored by either API
// version. Unknown JSON properties are ignored by the ASP.NET service.
export const buildCollegePayload = (college = {}) => {
  const value = (key, fallback = "") => String(college[key] ?? fallback).trim();
  const name = value("collegeName", college.name);
  const code = value("collegeCode", college.code).toUpperCase();
  const type = value("collegeType", college.type);
  const university = value("universityName", college.university);
  const contactNumber = value("contactNumber", college.contact);
  const alternateContactNumber = value("alternateContactNumber", college.alternateContact);
  const principalName = value("principalName", college.principal);
  const logo = college.logo ?? college.logoUrl ?? "";
  const accreditationSummary = value("accreditation", college.accreditationDetails);
  // The deployed college DTO does not yet expose these wizard fields. Store
  // them in its supported accreditation column so add/edit/view remain lossless.
  const accreditation = `${COLLEGE_EXTENDED_PREFIX}${JSON.stringify({
    accreditationSummary,
    area: value("area"),
    district: value("district"),
    alternateContactNumber,
    principalEmail: value("principalEmail"),
    principalContact: value("principalContact"),
    accreditationStatus: value("accreditationStatus"),
    accreditationBody: value("accreditationBody"),
    accreditationGrade: value("accreditationGrade"),
    accreditationNumber: value("accreditationNumber"),
    validFrom: value("validFrom"),
    validUntil: value("validUntil"),
    logoName: value("logoName"),
  })}`;

  return {
    name, collegeName: name,
    code, collegeCode: code,
    type, collegeType: type, institutionType: type,
    university, universityName: university,
    address: value("address"),
    addressLine1: value("addressLine1"),
    addressLine2: value("addressLine2"),
    area: value("area"),
    district: value("district"),
    city: value("city"),
    state: value("state"),
    pincode: value("pincode"),
    country: value("country", "India"),
    contact: contactNumber,
    contactNumber,
    phoneNumber: contactNumber,
    alternateContact: alternateContactNumber,
    alternateContactNumber,
    email: value("email", college.collegeEmail),
    collegeEmail: value("email", college.collegeEmail),
    website: value("website"),
    logo,
    logoName: value("logoName"),
    principal: principalName,
    principalName,
    principalEmail: value("principalEmail"),
    principalContact: value("principalContact"),
    principalPhone: value("principalContact"),
    accreditation,
    accreditationDetails: accreditation,
    accreditationStatus: value("accreditationStatus"),
    accreditationBody: value("accreditationBody"),
    accreditationGrade: value("accreditationGrade"),
    accreditationNumber: value("accreditationNumber"),
    validFrom: value("validFrom") || null,
    validUntil: value("validUntil") || null,
    accreditationValidFrom: value("validFrom") || null,
    accreditationValidUntil: value("validUntil") || null,
  };
};

export const createCollege = (collegeData) => {
  return API.post("/colleges", buildCollegePayload(collegeData));
};

export const updateCollege = (id, collegeData) => {
  return API.put(`/colleges/${id}`, buildCollegePayload(collegeData));
};

export const updateCollegeStatus = (id, status) => {
  return API.patch(`/colleges/${id}/status`, { status });
};

// -------------------------
// DEPARTMENT APIs
// -------------------------

export const getDepartments = () => {
  return ACADEMIC_API.get("/departments");
};

export const getDepartmentById = (id) => {
  return ACADEMIC_API.get(`/departments/${id}`);
};

export const createDepartment = (departmentData) => {
  return ACADEMIC_API.post("/departments", departmentData);
};

export const updateDepartment = (id, departmentData) => {
  return ACADEMIC_API.put(`/departments/${id}`, departmentData);
};

export const updateDepartmentStatus = (id, status) => {
  return ACADEMIC_API.patch(`/departments/${id}/status`, { status });
};

// -------------------------
// COURSE APIs
// -------------------------

export const getCourses = () => {
  return ACADEMIC_API.get("/courses");
};

export const getCourseById = (id) => {
  return ACADEMIC_API.get(`/courses/${id}`);
};

export const createCourse = (courseData) => {
  return ACADEMIC_API.post("/courses", courseData);
};

export const updateCourse = (id, courseData) => {
  return ACADEMIC_API.put(`/courses/${id}`, courseData);
};

export const updateCourseStatus = (id, status) => {
  return ACADEMIC_API.patch(`/courses/${id}/status`, { status });
};

// -------------------------
// COURSE / SEMESTER MAPPING APIs
// -------------------------

export const getCourseSemesterMappings = () => {
  return ACADEMIC_API.get("/course-semester-mappings");
};

export const getCourseSemesterMappingById = (id) => {
  return ACADEMIC_API.get(`/course-semester-mappings/${id}`);
};

export const createCourseSemesterMapping = (mappingData) => {
  return ACADEMIC_API.post("/course-semester-mappings", mappingData);
};

export const updateCourseSemesterMapping = (id, mappingData) => {
  return ACADEMIC_API.put(`/course-semester-mappings/${id}`, mappingData);
};

export const updateCourseSemesterMappingStatus = (id, status) => {
  return ACADEMIC_API.patch(`/course-semester-mappings/${id}/status`, { status });
};

// -------------------------
// ACADEMIC YEAR APIs
// -------------------------

export const getAcademicYearsDashboard = () => {
  return ACADEMIC_API.get("/academic-years/dashboard");
};

export const getAcademicYears = () => {
  return ACADEMIC_API.get("/academic-years");
};

export const getAcademicYearById = (id) => {
  return ACADEMIC_API.get(`/academic-years/${id}`);
};

export const createAcademicYear = (academicYearData) => {
  return ACADEMIC_API.post("/academic-years", academicYearData);
};

export const generateNextAcademicYear = (generateData) => {
  return ACADEMIC_API.post("/academic-years/generate-next-year", generateData);
};

export const updateAcademicYear = (id, academicYearData) => {
  return ACADEMIC_API.put(`/academic-years/${id}`, academicYearData);
};

export const activateAcademicYear = (id) => {
  return ACADEMIC_API.patch(`/academic-years/${id}/activate`);
};

export const deactivateAcademicYear = (id) => {
  return ACADEMIC_API.patch(`/academic-years/${id}/deactivate`);
};


// -------------------------
// COLLEGE SETTINGS APIs
// -------------------------

export const getCollegeSettings = () => {
  return SETTINGS_API.get("/college-settings");
};

export const createCollegeSettings = (settingsData) => {
  return SETTINGS_API.post("/college-settings", settingsData);
};

export const updateCollegeSettings = (id, settingsData) => {
  return SETTINGS_API.put(`/college-settings/${id}`, settingsData);
};

export const getCollegeSettingsById = (id) => {
  return SETTINGS_API.get(`/college-settings/${id}`);
};

export const getCollegeSettingsByCollegeId = (collegeId) => {
  return SETTINGS_API.get(`/college-settings/college/${collegeId}`);
};
