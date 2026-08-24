import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api/v1`,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const SETTINGS_API = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api`,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

// Add JWT token to requests
const addAuthToken = (config) => {
  const token = localStorage.getItem("btech-access-token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

API.interceptors.request.use(addAuthToken);
SETTINGS_API.interceptors.request.use(addAuthToken);


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
  return API.patch(`/colleges/${id}/status`, status);
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
