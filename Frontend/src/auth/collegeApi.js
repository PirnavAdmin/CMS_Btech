const cleanUrl = (url) => (url || "").replace(/\/+$/, "");

const getErrorMessage = (data, status) => {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    if (data.errors && typeof data.errors === "object") {
      const validationMessages = Object.entries(data.errors)
        .flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).filter(Boolean).map((message) => `${field}: ${message}`));
      if (validationMessages.length) return validationMessages.join(" ");
    }
    const directMessage = data.message || data.detail;
    if (directMessage) return directMessage;
    if (data.title && data.title !== "One or more validation errors occurred.") return data.title;
  }
  return {
    400: "The college details were rejected by the server. Check the required fields and college code.",
    401: "Your session has expired. Please sign in again.",
    403: "You do not have permission to manage colleges.",
    404: "The college API endpoint was not found. Check that the college service is available.",
    409: "A college with these details already exists.",
  }[status] || `The college request failed with HTTP ${status}.`;
};

const collegesBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL_COLLEGES);
const academicBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL_ACADEMIC);
const settingsBaseUrl = cleanUrl(import.meta.env.VITE_API_BASE_URL_SETTINGS);

const createClient = (baseUrl, prefix) => {
  const request = async (path, options = {}) => {
    const token = localStorage.getItem("btech-access-token");
    const response = await fetch(`${baseUrl}${prefix}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
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


// -------------------------
// COLLEGE APIs
// -------------------------

export const getColleges = () => {
  return API.get("/colleges");
};

export const getCollegeById = (id) => {
  return API.get(`/colleges/${id}`);
};

export const searchColleges = (searchTerm) => {
  return API.get("/colleges/search", {
    params: {
      Query: searchTerm,
    },
  });
};

export const createCollege = (collegeData) => {
  return API.post("/colleges", collegeData);
};

export const updateCollege = (id, collegeData) => {
  return API.put(`/colleges/${id}`, collegeData);
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