const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

const createClient = (prefix) => {
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
      const error = new Error(data?.message || data?.title || `Request failed with status ${response.status}`);
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

const API = createClient("/api/v1");
const SETTINGS_API = createClient("/api");


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
