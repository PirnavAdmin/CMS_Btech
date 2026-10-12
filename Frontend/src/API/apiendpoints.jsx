// Consolidated source. Module scopes prevent colliding page/helper names.
// Public-declaration markers retain source-isolated regression test coverage.

export const authModule = (() => {

/* Imports for isolated regression tests:

*/
// #region auth/auth.js
const AUTH_STORAGE_KEY = 'btech-authenticated'
const ROLE_STORAGE_KEY = 'btech-user-role'

const safeStorage = (storageName) => {
  try {
    return window?.[storageName]
  } catch {
    return null
  }
}

const readStorageValue = (storage, key) => {
  try {
    return storage?.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function normalizeStoredRole(role) {
  const rawRole = Array.isArray(role) ? role[0] : role
  const normalizedRole = String(rawRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

  if (['admin', 'college_admin', 'super_admin'].includes(normalizedRole)) return 'admin'
  return normalizedRole
}

/* export */ function getAuthStorage() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  if (localStore && readStorageValue(localStore, AUTH_STORAGE_KEY) === 'true') return localStore
  if (sessionStore && readStorageValue(sessionStore, AUTH_STORAGE_KEY) === 'true') return sessionStore

  if (localStore && readStorageValue(localStore, 'btech-remember-me') === 'true') return localStore
  return sessionStore || localStore || null
}

/* export */ function getAccessToken() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  return readStorageValue(localStore, 'btech-access-token')
    || readStorageValue(sessionStore, 'btech-access-token')
    || readStorageValue(localStore, 'accessToken')
    || readStorageValue(sessionStore, 'accessToken')
    || readStorageValue(localStore, 'token')
    || readStorageValue(sessionStore, 'token')
    || ''
}

/* export */ function getRefreshToken() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  return readStorageValue(localStore, 'btech-refresh-token')
    || readStorageValue(sessionStore, 'btech-refresh-token')
    || readStorageValue(localStore, 'refreshToken')
    || readStorageValue(sessionStore, 'refreshToken')
    || ''
}

/* export */ function setAccessToken(token, rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage
  if (token) storage.setItem('btech-access-token', token)
}

/* export */ function setRefreshToken(token, rememberMe = false) {
  const storage = rememberMe ? localStorage : sessionStorage
  if (token) storage.setItem('btech-refresh-token', token)
}

/* export */ function isAuthenticated() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  return readStorageValue(localStore, AUTH_STORAGE_KEY) === 'true' || readStorageValue(sessionStore, AUTH_STORAGE_KEY) === 'true'
}

/* export */ function signIn(role, accessToken, refreshToken, rememberMe = false, user = {}) {
  signOut()

  const storage = rememberMe ? safeStorage('localStorage') : safeStorage('sessionStorage')
  if (!storage) return

  storage.setItem(AUTH_STORAGE_KEY, 'true')
  storage.setItem(ROLE_STORAGE_KEY, normalizeStoredRole(role))
  storage.setItem('btech-access-token', accessToken)
  storage.setItem('btech-refresh-token', refreshToken)
  storage.setItem('btech-user-name', String(user.name || '').trim())
  storage.setItem('btech-user-id', String(user.id || '').trim())
}

/* export */ function signOut() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')

  if (localStore) {
    localStore.removeItem(AUTH_STORAGE_KEY)
    localStore.removeItem(ROLE_STORAGE_KEY)
  }
  if (sessionStore) {
    sessionStore.removeItem(AUTH_STORAGE_KEY)
    sessionStore.removeItem(ROLE_STORAGE_KEY)
  }
  ;['btech-access-token', 'btech-refresh-token', 'btech-user-name', 'btech-user-id', 'btech-jwt', 'btech-session', 'accessToken', 'refreshToken', 'jwt', 'token'].forEach((key) => {
    localStore?.removeItem(key)
    sessionStore?.removeItem(key)
  })
}

/* export */ function getUserRole() {
  const localStore = safeStorage('localStorage')
  const sessionStore = safeStorage('sessionStorage')
  const storedRole = readStorageValue(localStore, ROLE_STORAGE_KEY) || readStorageValue(sessionStore, ROLE_STORAGE_KEY)
  const normalizedRole = normalizeStoredRole(storedRole)

  if (storedRole && storedRole !== normalizedRole && localStore) {
    localStore.setItem(ROLE_STORAGE_KEY, normalizedRole)
  }

  return normalizedRole || null
}

/* export */ function hasRole(allowedRoles = []) {
  const userRole = getUserRole()

  if (!userRole) {
    return false
  }

  return allowedRoles.includes(userRole)
}
// #endregion auth/auth.js
return {
  get getAuthStorage() { return getAuthStorage; },
  get getAccessToken() { return getAccessToken; },
  get getRefreshToken() { return getRefreshToken; },
  get setAccessToken() { return setAccessToken; },
  get setRefreshToken() { return setRefreshToken; },
  get isAuthenticated() { return isAuthenticated; },
  get signIn() { return signIn; },
  get signOut() { return signOut; },
  get getUserRole() { return getUserRole; },
  get hasRole() { return hasRole; }
};
})();

export const userErrorModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/userError.js
/* export */ const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

// Keep actionable validation messages, but never show infrastructure details.
/* export */ function userErrorMessage(value, status) {
  const code = Number(status ?? value?.status ?? value?.response?.status)
  if (code >= 500) return GENERIC_ERROR_MESSAGE
  const message = String(value?.message || value?.response?.data?.message || value || '').trim()
  if (/\b(server|backend|ngrok|exception|stack\s*trace|sqlstate|mysql|ECONNREFUSED|ENOTFOUND)\b|failed to fetch|network\s*error|load failed|<!doctype|<html/i.test(message)) return GENERIC_ERROR_MESSAGE
  return message
}
// #endregion utils/userError.js
return {
  get GENERIC_ERROR_MESSAGE() { return GENERIC_ERROR_MESSAGE; },
  get userErrorMessage() { return userErrorMessage; }
};
})();

export const collegeLogoModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/collegeLogo.js
/* export */ const collegeLogoValue = record => [
  'logo', 'logoUrl', 'collegeLogo', 'collegeLogoUrl', 'logoPath',
  'Logo', 'LogoUrl', 'CollegeLogo', 'CollegeLogoUrl', 'LogoPath', 'logo_url', 'logo_path',
].map(key => record?.[key]).find(value => typeof value === 'string' && value.trim() && !/^(null|undefined|string)$/i.test(value.trim())) || ''

/* export */ const resolveCollegeLogo = (value, baseUrl = '') => {
  const logo = String(value ?? '').trim().replace(/\\/g, '/')
  const base = baseUrl.replace(/\/+$/, '')
  if (!logo || /^(null|undefined|string)$/i.test(logo)) return ''
  if (/^(data:image\/|blob:)/i.test(logo)) return logo
  if (/^https?:\/\//i.test(logo)) {
    const url = new URL(logo)
    // Uploaded backend files can retain a previous development tunnel's host.
    if (/\.(ngrok-free\.dev|ngrok-free\.app|ngrok\.io)$/i.test(url.hostname)
      && /^\/(uploads|images|api)\//i.test(url.pathname)) return `${base}${url.pathname}${url.search}`
    return logo
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(logo) && logo.replace(/\s/g, '').length > 100) return `data:image/png;base64,${logo.replace(/\s/g, '')}`
  if (/^[a-z]+:/i.test(logo) || logo.startsWith('//')) return ''
  return `${base}/${logo.replace(/^\/+/, '')}`
}
// #endregion utils/collegeLogo.js
return {
  get collegeLogoValue() { return collegeLogoValue; },
  get resolveCollegeLogo() { return resolveCollegeLogo; }
};
})();

export const apiFailureNoticeModule = (() => {
const { GENERIC_ERROR_MESSAGE } = userErrorModule;
/* Imports for isolated regression tests:
import { GENERIC_ERROR_MESSAGE } from '../utils/userError.js'
*/
// #region api/apiFailureNotice.js
/* export */ const API_FAILURE_EVENT = 'app:api-failure'

/* export */ function notifyApiUnavailable(error = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return

  const status = Number(error.status) || 0
  const detail = {
    kind: status >= 500 ? 'server' : 'connection',
    status,
    message: GENERIC_ERROR_MESSAGE,
    occurredAt: Date.now(),
  }

  window.dispatchEvent(new CustomEvent(API_FAILURE_EVENT, { detail }))
}

/* export */ function createApiUnavailableError(status = 0, shouldNotify = true) {
  const error = new Error(GENERIC_ERROR_MESSAGE)
  error.name = 'ApiUnavailableError'
  error.status = status || undefined
  error.code = status >= 500 ? 'API_SERVER_ERROR' : 'API_CONNECTION_ERROR'
  error.retryable = true
  if (shouldNotify) notifyApiUnavailable(error)
  return error
}
// #endregion api/apiFailureNotice.js
return {
  get API_FAILURE_EVENT() { return API_FAILURE_EVENT; },
  get notifyApiUnavailable() { return notifyApiUnavailable; },
  get createApiUnavailableError() { return createApiUnavailableError; }
};
})();

export const collegeApiModule = (() => {
const { GENERIC_ERROR_MESSAGE } = userErrorModule;
const { userErrorMessage } = userErrorModule;
const { resolveCollegeLogo } = collegeLogoModule;
const { getAccessToken } = authModule;
const { createApiUnavailableError } = apiFailureNoticeModule;
const { notifyApiUnavailable } = apiFailureNoticeModule;
/* Imports for isolated regression tests:
import { GENERIC_ERROR_MESSAGE, userErrorMessage } from '../utils/userError.js'
import { resolveCollegeLogo } from '../utils/collegeLogo'
import { getAccessToken } from './auth'
import { createApiUnavailableError, notifyApiUnavailable } from '../api/apiFailureNotice'
*/
// #region auth/collegeApi.js
const cleanUrl = (url) => (url || "").replace(/\/+$/, "");
const DEFAULT_API_BASE_URL = "https://abreast-curling-tutor.ngrok-free.dev";

const friendlyValidationMessage = (errors) => {
  if (!errors || typeof errors !== "object") return "";
  const fields = Object.keys(errors);
  if (fields.some((field) => field.toLowerCase() === "principalemail")) return "Please enter a valid principal email address.";
  if (fields.some((field) => ["email", "collegeemail"].includes(field.toLowerCase()))) return "Please enter a valid official email address.";
  if (fields.some((field) => /contact|phone|mobile/i.test(field))) return "Please enter a valid contact number.";
  return fields.length ? "Please check the entered college details and try again." : "";
};

const getErrorMessage = (data, status) => {
  if (status >= 500) return GENERIC_ERROR_MESSAGE;
  if (typeof data === "string") {
    const message = data.trim();
    try {
      const parsed = JSON.parse(message);
      const validationMessage = friendlyValidationMessage(parsed?.errors);
      if (validationMessage) return validationMessage;
    } catch { /* The response is plain text, so continue with normal handling. */ }
    const isTechnicalPage = /<!doctype|<html|<head|<body|<script|ngrok|err_ngrok|data-payload|https?:\/\//i.test(message);
    if (message && !isTechnicalPage && message.length <= 500) return message;
  }
  if (data && typeof data === "object") {
    if (data.errors && typeof data.errors === "object") {
      const validationMessage = friendlyValidationMessage(data.errors);
      if (validationMessage) return validationMessage;
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

const commonBaseUrl = cleanUrl(import.meta.env.DEV ? "" : (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL));
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
          ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          "ngrok-skip-browser-warning": "true",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    } catch {
      throw createApiUnavailableError();
    }
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      if (response.status >= 500) notifyApiUnavailable({ status: response.status });
      const error = new Error(userErrorMessage(getErrorMessage(data, response.status), response.status));
      error.response = { data: response.status >= 500 ? { message: GENERIC_ERROR_MESSAGE } : data, status: response.status };
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
    postForm: (path, data) => request(path, { method: "POST", body: data }),
    put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
    patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (path) => request(path, { method: "DELETE" }),
  };
};

const API = createClient(collegesBaseUrl, "/api/v1");
const COLLEGE_LOGO_API = createClient(collegesBaseUrl, "/api/College");
const ACADEMIC_API = createClient(academicBaseUrl, "/api/v1");
const SETTINGS_API = createClient(settingsBaseUrl, "/api");
const SEMESTER_API = createClient(academicBaseUrl, "/api");

const COLLEGE_EXTENDED_PREFIX = "CMS_EXTENDED_V1:";

/* export */ const WEBSITE_VALIDATION_MESSAGE = "Please enter a valid website URL, e.g. https://example.com";

/* export */ const normalizeWebsite = (value) => {
  const website = String(value ?? "").trim();
  if (!website || /^(https?|ftp):\/\//i.test(website)) return website;
  return `https://${website}`;
};

/* export */ const isValidWebsite = (value) => {
  if (!value || /[\\\s]/.test(value)) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:", "ftp:"].includes(url.protocol) && url.hostname.includes(".");
  } catch {
    return false;
  }
};

/* export */ const readCollegeExtendedDetails = (record = {}) => {
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

/* export */ const getColleges = () => {
  return API.get("/colleges");
};

/* export */ const getCollegeById = (id) => {
  return API.get(`/colleges/${id}`);
};

/* export */ const unwrapCollegeRecord = (response) => {
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

/* export */ const searchColleges = (searchTerm) => {
  return API.get("/colleges/search", {
    params: {
      Query: searchTerm,
    },
  });
};

/* export */ const uploadCollegeLogo = (collegeId, logoFile) => {
  const formData = new FormData();
  formData.append("CollegeId", String(collegeId));
  formData.append("Logo", logoFile);
  return COLLEGE_LOGO_API.postForm("/logo", formData);
};

// Persistent logo storage helper across IDs, codes, and college names
const collegeLogoCacheKey = (key) => `pirnav-college-logo-${String(key || '').trim().toLowerCase().replace(/\s+/g, '-')}`;
const LOGOS_MAP_KEY = 'pirnav_college_logos_map';

const getLogosMap = () => {
  try {
    const raw = localStorage.getItem(LOGOS_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setLogosMap = (map) => {
  try {
    localStorage.setItem(LOGOS_MAP_KEY, JSON.stringify(map));
  } catch {}
};

/* export */ const readCachedCollegeLogo = (identifier) => {
  try {
    if (!identifier) return "";
    const key = String(identifier).trim();
    const cleanKey = key.toLowerCase().replace(/\s+/g, '-');
    const direct = localStorage.getItem(collegeLogoCacheKey(key)) ||
      localStorage.getItem(`pirnav-college-logo-${key}`) ||
      localStorage.getItem(`college-logo-${key}`) ||
      localStorage.getItem(`pirnav-college-logo-${cleanKey}`);
    if (direct) return direct;

    const map = getLogosMap();
    return map[key] || map[cleanKey] || map[key.toLowerCase()] || map[key.toUpperCase()] || "";
  } catch {
    return "";
  }
};

/* export */ const cacheCollegeLogo = (identifier, logo, extraKeys = []) => {
  try {
    if (!identifier && !extraKeys.length) return;
    const allKeys = [identifier, ...extraKeys]
      .filter(k => k != null && String(k).trim() !== '')
      .map(k => String(k).trim());

    const map = getLogosMap();
    allKeys.forEach((key) => {
      const cleanKey = key.toLowerCase().replace(/\s+/g, '-');
      if (logo) {
        localStorage.setItem(collegeLogoCacheKey(key), logo);
        localStorage.setItem(collegeLogoCacheKey(cleanKey), logo);
        map[key] = logo;
        map[cleanKey] = logo;
        map[key.toLowerCase()] = logo;
      } else {
        localStorage.removeItem(collegeLogoCacheKey(key));
        localStorage.removeItem(collegeLogoCacheKey(cleanKey));
        localStorage.removeItem(`pirnav-college-logo-${key}`);
        localStorage.removeItem(`college-logo-${key}`);
        delete map[key];
        delete map[cleanKey];
        delete map[key.toLowerCase()];
      }
    });
    setLogosMap(map);
  } catch { /* storage fallback */ }
};

// Persistent college dates helper across IDs, codes, and college names
const collegeDatesCacheKey = (key) => `pirnav-college-dates-${String(key || '').trim().toLowerCase().replace(/\s+/g, '-')}`;
const DATES_MAP_KEY = 'pirnav_college_dates_map';

const getDatesMap = () => {
  try {
    const raw = localStorage.getItem(DATES_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setDatesMap = (map) => {
  try {
    localStorage.setItem(DATES_MAP_KEY, JSON.stringify(map));
  } catch {}
};

/* export */ const readCachedCollegeDates = (identifier) => {
  try {
    if (!identifier) return null;
    const key = String(identifier).trim();
    const cleanKey = key.toLowerCase().replace(/\s+/g, '-');
    const direct = localStorage.getItem(collegeDatesCacheKey(key)) ||
      localStorage.getItem(`pirnav-college-dates-${key}`) ||
      localStorage.getItem(`pirnav-college-dates-${cleanKey}`);
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }

    const map = getDatesMap();
    const mapVal = map[key] || map[cleanKey] || map[key.toLowerCase()] || map[key.toUpperCase()];
    if (mapVal && typeof mapVal === 'object') return mapVal;
    return null;
  } catch {
    return null;
  }
};

/* export */ const cacheCollegeDates = (identifier, dates = {}, extraKeys = []) => {
  try {
    if (!identifier && !extraKeys.length) return;
    const allKeys = [identifier, ...extraKeys]
      .filter(k => k != null && String(k).trim() !== '')
      .map(k => String(k).trim());

    const map = getDatesMap();
    const dateObj = {
      startDate: dates?.startDate ? String(dates.startDate).slice(0, 10) : '',
      endDate: dates?.endDate ? String(dates.endDate).slice(0, 10) : '',
    };
    const hasAny = Boolean(dateObj.startDate || dateObj.endDate);

    allKeys.forEach((key) => {
      const cleanKey = key.toLowerCase().replace(/\s+/g, '-');
      if (hasAny) {
        localStorage.setItem(collegeDatesCacheKey(key), JSON.stringify(dateObj));
        localStorage.setItem(collegeDatesCacheKey(cleanKey), JSON.stringify(dateObj));
        map[key] = dateObj;
        map[cleanKey] = dateObj;
        map[key.toLowerCase()] = dateObj;
      } else {
        localStorage.removeItem(collegeDatesCacheKey(key));
        localStorage.removeItem(collegeDatesCacheKey(cleanKey));
        localStorage.removeItem(`pirnav-college-dates-${key}`);
        delete map[key];
        delete map[cleanKey];
        delete map[key.toLowerCase()];
      }
    });
    setDatesMap(map);
  } catch { /* storage fallback */ }
};

/* export */ const getCollegeLogoEndpoint = collegeId => collegeId == null || collegeId === '' ? '' : `${collegesBaseUrl}/api/College/logo/${encodeURIComponent(collegeId)}`;

/* export */ const getCollegeLogoUrl = (collegeId, logoValue, extraKeys = []) => {
  const cached = (collegeId ? readCachedCollegeLogo(collegeId) : "") ||
    extraKeys.map(k => readCachedCollegeLogo(k)).find(Boolean) || "";
  const source = String(logoValue || cached || '').trim().replace(/\\/g, '/');
  // CollegeController stores uploads as a filename (for example
  // "a1b2...png") in LogoPath. That file is deliberately not exposed as a
  // public static asset; it must be read through /api/College/logo/{id}.
  // Treating it as /a1b2...png was why the sidebar retained its placeholder.
  const isStoredFileName = source &&
    !/^(data:image\/|blob:|https?:\/\/|\/)/i.test(source) &&
    !source.includes('/');
  if (isStoredFileName && collegeId) return getCollegeLogoEndpoint(collegeId);

  return resolveCollegeLogo(source, collegesBaseUrl) || (collegeId ? getCollegeLogoEndpoint(collegeId) : '');
};

/* export */ const isBackendCollegeLogo = value => {
  const url = new URL(value, window.location.origin);
  const backend = new URL(collegesBaseUrl || window.location.origin, window.location.origin);
  return url.origin === backend.origin && /^\/(api|uploads|images)\//i.test(url.pathname);
};

// The logo endpoint is protected by the same bearer token as the College API.
// An <img> tag cannot attach that header, so fetch the image first and let the
// caller render its blob URL.
/* export */ const fetchCollegeLogo = async (logoUrl) => {
  const token = getAccessToken();
  const response = await fetch(logoUrl, {
    cache: "no-store",
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(token && isBackendCollegeLogo(logoUrl) ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error("Unable to load college logo.");
  const image = await response.blob();
  if (image.type && !image.type.startsWith("image/") && image.type !== "application/octet-stream") throw new Error("The college logo response is not an image.");
  return image;
};

// The college service has used both the short field names (name/contact/principal)
// and the descriptive DTO names (collegeName/contactNumber/principalName).  Send
// both forms so none of the wizard fields are silently ignored by either API
// version. Unknown JSON properties are ignored by the ASP.NET service.
/* export */ const buildCollegePayload = (college = {}) => {
  const value = (key, fallback = "") => String(college[key] ?? fallback).trim();
  const name = value("collegeName", college.name);
  const code = value("collegeCode", college.code).toUpperCase();
  const type = value("collegeType", college.type);
  const university = value("universityName", college.university);
  const contactNumber = value("contactNumber", college.contact);
  const alternateContactNumber = value("alternateContactNumber", college.alternateContact);
  const principalName = value("principalName", college.principal);
  const principalEmail = value("principalEmail");
  const principalContact = value("principalContact");
  const startDate = value("startDate", college.StartDate || college.start_date);
  const endDate = value("endDate", college.EndDate || college.end_date);
  const logo = college.logo ?? college.logoUrl ?? "";
  const website = normalizeWebsite(college.website ?? college.Website);
  const accreditationSummary = value("accreditation", college.accreditationDetails);
  // Keep the database accreditation column within its intended scope. Older
  // code packed every optional wizard field into this string as JSON, which
  // can exceed the backend column limit and surface as a database 500 error.
  // Supported optional fields are sent independently below.
  const accreditation = accreditationSummary.slice(0, 200);

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
    // Website is optional. Omit it when empty so the backend URL validator
    // receives either a valid fully-qualified URL or no Website value at all.
    ...(website ? { Website: website } : {}),
    ...(startDate ? { startDate, StartDate: startDate, start_date: startDate } : {}),
    ...(endDate ? { endDate, EndDate: endDate, end_date: endDate } : {}),
    ...(college.clearLogo ? { logo: null, logoPath: null } : { logo }),
    logoName: value("logoName"),
    principal: principalName,
    principalName,
    // Optional validated fields must be omitted when blank. Sending an empty
    // string causes some ASP.NET DTO versions to run EmailAddress validation.
    ...(principalEmail ? { principalEmail, PrincipalEmail: principalEmail } : {}),
    ...(principalContact ? { principalContact, principalPhone: principalContact } : {}),
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

/* export */ const createCollege = (collegeData) => {
  return API.post("/colleges", buildCollegePayload(collegeData));
};

/* export */ const updateCollege = (id, collegeData) => {
  return API.put(`/colleges/${id}`, buildCollegePayload(collegeData));
};

/* export */ const updateCollegeStatus = (id, status) => {
  return API.patch(`/colleges/${id}/status`, { status });
};
/* export */ const getCollegeDeactivationImpact = (id) => API.get(`/colleges/${id}/deactivation-impact`);

// -------------------------
// DEPARTMENT APIs
// -------------------------

/* export */ const getDepartments = () => {
  return ACADEMIC_API.get("/departments");
};

/* export */ const searchDepartments = (search) => ACADEMIC_API.get("/departments/search", { params: { search } });
/* export */ const getDepartmentsPaginated = (page = 1, pageSize = 5) => ACADEMIC_API.get("/departments/paginated", { params: { page, pageSize } });

/* export */ const getDepartmentById = (id) => {
  return ACADEMIC_API.get(`/departments/${id}`);
};

/* export */ const createDepartment = (departmentData) => {
  return ACADEMIC_API.post("/departments", departmentData);
};

/* export */ const updateDepartment = (id, departmentData) => {
  return ACADEMIC_API.put(`/departments/${id}`, departmentData);
};

/* export */ const updateDepartmentStatus = (id, status) => {
  return ACADEMIC_API.patch(`/departments/${id}/status`, { status });
};

/* export */ const deleteDepartment = (id) => ACADEMIC_API.delete(`/departments/${id}`);

// Semester management APIs (/api/semester)
/* export */ const getSemesters = () => SEMESTER_API.get('/semester');
/* export */ const searchSemesters = (params = {}) => SEMESTER_API.get('/semester/search', { params });
/* export */ const getSemesterById = (id) => SEMESTER_API.get(`/semester/${id}`);
/* export */ const getSemesterSummary = () => SEMESTER_API.get('/semester/summary');
/* export */ const createSemester = (data) => SEMESTER_API.post('/semester', data);
/* export */ const updateSemester = (id, data) => SEMESTER_API.put(`/semester/${id}`, data);

// -------------------------
// COURSE APIs
// -------------------------

/* export */ const getCourses = () => {
  return ACADEMIC_API.get("/courses");
};

/* export */ const getCourseById = (id) => {
  return ACADEMIC_API.get(`/courses/${id}`);
};

/* export */ const createCourse = (courseData) => {
  return ACADEMIC_API.post("/courses", courseData);
};

/* export */ const updateCourse = (id, courseData) => {
  return ACADEMIC_API.put(`/courses/${id}`, courseData);
};

/* export */ const updateCourseStatus = (id, status) => {
  return ACADEMIC_API.patch(`/courses/${id}/status`, { status });
};

// -------------------------
// COURSE / SEMESTER MAPPING APIs
// -------------------------

/* export */ const getCourseSemesterMappings = () => {
  return ACADEMIC_API.get("/course-semester-mappings");
};

/* export */ const getCourseSemesterMappingById = (id) => {
  return ACADEMIC_API.get(`/course-semester-mappings/${id}`);
};

/* export */ const createCourseSemesterMapping = (mappingData) => {
  return ACADEMIC_API.post("/course-semester-mappings", mappingData);
};

/* export */ const updateCourseSemesterMapping = (id, mappingData) => {
  return ACADEMIC_API.put(`/course-semester-mappings/${id}`, mappingData);
};

/* export */ const updateCourseSemesterMappingStatus = (id, status) => {
  return ACADEMIC_API.patch(`/course-semester-mappings/${id}/status`, { status });
};

// -------------------------
// ACADEMIC YEAR APIs
// -------------------------

/* export */ const getAcademicYearsDashboard = () => {
  return ACADEMIC_API.get("/academic-years/dashboard");
};

/* export */ const getAcademicYears = () => {
  return ACADEMIC_API.get("/academic-years");
};

/* export */ const getAcademicYearById = (id) => {
  return ACADEMIC_API.get(`/academic-years/${id}`);
};

/* export */ const createAcademicYear = (academicYearData) => {
  return ACADEMIC_API.post("/academic-years", academicYearData);
};

/* export */ const generateNextAcademicYear = (generateData) => {
  return ACADEMIC_API.post("/academic-years/generate-next-year", generateData);
};

/* export */ const updateAcademicYear = (id, academicYearData) => {
  return ACADEMIC_API.put(`/academic-years/${id}`, academicYearData);
};

/* export */ const activateAcademicYear = (id) => {
  return ACADEMIC_API.patch(`/academic-years/${id}/activate`);
};

/* export */ const deactivateAcademicYear = (id) => {
  return ACADEMIC_API.patch(`/academic-years/${id}/deactivate`);
};


// -------------------------
// COLLEGE SETTINGS APIs
// -------------------------

/* export */ const getCollegeSettings = () => {
  return SETTINGS_API.get("/college-settings");
};

/* export */ const createCollegeSettings = (settingsData) => {
  return SETTINGS_API.post("/college-settings", settingsData);
};

/* export */ const updateCollegeSettings = (id, settingsData) => {
  return SETTINGS_API.put(`/college-settings/${id}`, settingsData);
};

/* export */ const getCollegeSettingsById = (id) => {
  return SETTINGS_API.get(`/college-settings/${id}`);
};

/* export */ const getCollegeSettingsByCollegeId = (collegeId) => {
  return SETTINGS_API.get(`/college-settings/college/${collegeId}`);
};
// #endregion auth/collegeApi.js
return {
  get WEBSITE_VALIDATION_MESSAGE() { return WEBSITE_VALIDATION_MESSAGE; },
  get normalizeWebsite() { return normalizeWebsite; },
  get isValidWebsite() { return isValidWebsite; },
  get readCollegeExtendedDetails() { return readCollegeExtendedDetails; },
  get getColleges() { return getColleges; },
  get getCollegeById() { return getCollegeById; },
  get unwrapCollegeRecord() { return unwrapCollegeRecord; },
  get searchColleges() { return searchColleges; },
  get uploadCollegeLogo() { return uploadCollegeLogo; },
  get readCachedCollegeLogo() { return readCachedCollegeLogo; },
  get cacheCollegeLogo() { return cacheCollegeLogo; },
  get readCachedCollegeDates() { return readCachedCollegeDates; },
  get cacheCollegeDates() { return cacheCollegeDates; },
  get getCollegeLogoEndpoint() { return getCollegeLogoEndpoint; },
  get getCollegeLogoUrl() { return getCollegeLogoUrl; },
  get isBackendCollegeLogo() { return isBackendCollegeLogo; },
  get fetchCollegeLogo() { return fetchCollegeLogo; },
  get buildCollegePayload() { return buildCollegePayload; },
  get createCollege() { return createCollege; },
  get updateCollege() { return updateCollege; },
  get updateCollegeStatus() { return updateCollegeStatus; },
  get getCollegeDeactivationImpact() { return getCollegeDeactivationImpact; },
  get getDepartments() { return getDepartments; },
  get searchDepartments() { return searchDepartments; },
  get getDepartmentsPaginated() { return getDepartmentsPaginated; },
  get getDepartmentById() { return getDepartmentById; },
  get createDepartment() { return createDepartment; },
  get updateDepartment() { return updateDepartment; },
  get updateDepartmentStatus() { return updateDepartmentStatus; },
  get deleteDepartment() { return deleteDepartment; },
  get getSemesters() { return getSemesters; },
  get searchSemesters() { return searchSemesters; },
  get getSemesterById() { return getSemesterById; },
  get getSemesterSummary() { return getSemesterSummary; },
  get createSemester() { return createSemester; },
  get updateSemester() { return updateSemester; },
  get getCourses() { return getCourses; },
  get getCourseById() { return getCourseById; },
  get createCourse() { return createCourse; },
  get updateCourse() { return updateCourse; },
  get updateCourseStatus() { return updateCourseStatus; },
  get getCourseSemesterMappings() { return getCourseSemesterMappings; },
  get getCourseSemesterMappingById() { return getCourseSemesterMappingById; },
  get createCourseSemesterMapping() { return createCourseSemesterMapping; },
  get updateCourseSemesterMapping() { return updateCourseSemesterMapping; },
  get updateCourseSemesterMappingStatus() { return updateCourseSemesterMappingStatus; },
  get getAcademicYearsDashboard() { return getAcademicYearsDashboard; },
  get getAcademicYears() { return getAcademicYears; },
  get getAcademicYearById() { return getAcademicYearById; },
  get createAcademicYear() { return createAcademicYear; },
  get generateNextAcademicYear() { return generateNextAcademicYear; },
  get updateAcademicYear() { return updateAcademicYear; },
  get activateAcademicYear() { return activateAcademicYear; },
  get deactivateAcademicYear() { return deactivateAcademicYear; },
  get getCollegeSettings() { return getCollegeSettings; },
  get createCollegeSettings() { return createCollegeSettings; },
  get updateCollegeSettings() { return updateCollegeSettings; },
  get getCollegeSettingsById() { return getCollegeSettingsById; },
  get getCollegeSettingsByCollegeId() { return getCollegeSettingsByCollegeId; }
};
})();

export const collegeScopeModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/collegeScope.js
const id = value => value == null ? '' : String(value).trim()
const present = value => id(value) !== '' && id(value) !== '0'
const containers = ['academic', 'academicDetails', 'academicInformation', 'admission', 'employment', 'profile', 'personalInformation']
const collections = { department: 'departments', course: 'courses', branch: 'branches', semester: 'semesters', section: 'sections', subject: 'subjects', student: 'students', faculty: 'faculty', group: 'groups' }
const aliases = { faculty: ['employeeProfileId', 'facultyProfileId', 'employeeId'], student: ['studentProfileId', 'admissionId'], group: ['electiveGroupId'] }
/* export */ const collegeField = (row, name) => {
  if (!row || typeof row !== 'object') return undefined
  for (const key of [name + 'Id', ...(aliases[name] || [])]) {
    const value = Object.entries(row).find(([field, value]) => field.replaceAll('_', '').toLowerCase() === key.toLowerCase() && present(value))?.[1]
    if (value !== undefined) return value
  }
  const nested = row[name]
  if (nested && typeof nested === 'object') return nested[name + 'Id'] ?? nested.id
  for (const key of containers) {
    const nested = row[key]
    if (nested && nested !== row && typeof nested === 'object') {
      const value = nested[name + 'Id'] ?? nested[name[0].toUpperCase() + name.slice(1) + 'Id']
      if (present(value)) return value
    }
  }
}
/* export */ const createCollegeScope = (collegeId, hierarchy = {}) => {
  const target = id(collegeId)
  const indexes = Object.fromEntries(Object.entries(collections).map(([type, collection]) => {
    const index = new Map()
    for (const row of hierarchy[collection] || []) {
      for (const value of [collegeField(row, type), row.id, ...(aliases[type] || []).map(key => row[key])]) {
        if (present(value)) index.set(id(value), row)
      }
    }
    return [type, index]
  }))
  const owner = (row, seen = new Set()) => {
    if (!row || typeof row !== 'object' || seen.has(row)) return undefined
    const direct = row.collegeNumericId || collegeField(row, 'college')
    if (present(direct)) return id(direct)
    const next = new Set(seen).add(row), owners = new Set()
    for (const type of ['section', 'semester', 'branch', 'course', 'department', 'subject', 'student', 'faculty', 'group']) {
      const parent = indexes[type].get(id(collegeField(row, type)))
      const resolved = parent && parent !== row ? owner(parent, next) : undefined
      if (resolved) owners.add(resolved)
    }
    for (const key of ['faculty', 'employee', 'student', 'subject', ...containers]) {
      const resolved = owner(row[key], next)
      if (resolved) owners.add(resolved)
    }
    return owners.size === 1 ? [...owners][0] : undefined
  }
  return rows => (Array.isArray(rows) ? rows : []).filter(row => target && owner(row) === target)
}
/* export */ const selectedCollegeId = () => {
  try {
    const context = JSON.parse(localStorage.getItem('pirnav_academic_context') || 'null')
    return context ? id(context.collegeId) : id(localStorage.getItem('pirnav-selected-college-id') || localStorage.getItem('selected_college_id'))
  } catch { return '' }
}
/* export */ const collegeStorageKey = (key, collegeId = selectedCollegeId()) => key + ':college:' + encodeURIComponent(id(collegeId) || 'unselected')
// #endregion utils/collegeScope.js
return {
  get collegeField() { return collegeField; },
  get createCollegeScope() { return createCollegeScope; },
  get selectedCollegeId() { return selectedCollegeId; },
  get collegeStorageKey() { return collegeStorageKey; }
};
})();

export const collegeRequestModule = (() => {
const { selectedCollegeId } = collegeScopeModule;
/* Imports for isolated regression tests:
import { selectedCollegeId } from './collegeScope.js'
*/
// #region utils/collegeRequest.js
const resources = /\/api\/(?:v1\/)?(?:departments|courses|branches|semester|semesters|sections|section-assignments|course-structures|students|student-[\w-]+|faculty(?:-[\w-]+)?|subjects|credits|credit-[\w-]+|elective[\w-]*|results|attendance[\w-]*|promotions|rooms|classrooms|timetable[\w-]*|fee-structures|hostel-fees|transport-fees)(?:\/|\?|$)/i
/* export */ function collegeRequest(url, options = {}, collegeId = selectedCollegeId()) {
  if (!collegeId || !resources.test(url)) return { url, options }
  const [path, query = ''] = url.split('?'), params = new URLSearchParams(query)
  params.set('collegeId', collegeId)
  let scopedOptions = options
  if (typeof options.body === 'string' && ['POST', 'PUT', 'PATCH'].includes(String(options.method).toUpperCase())) {
    try {
      const body = JSON.parse(options.body)
      if (body && typeof body === 'object' && !Array.isArray(body)) scopedOptions = { ...options, body: JSON.stringify({ ...body, collegeId: body.collegeId || collegeId }) }
    } catch { /* Preserve non-JSON bodies. */ }
  }
  return { url: path + '?' + params, options: scopedOptions }
}
// #endregion utils/collegeRequest.js
return {
  get collegeRequest() { return collegeRequest; }
};
})();

export const exportProvenanceModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/exportProvenance.js
// Track successful API results without changing their shape or serializing metadata.
const apiResults = new WeakSet()
/* export */ function markApiResult(value) {
  if (value && typeof value === 'object') apiResults.add(value)
  return value
}
/* export */ const isApiResult = value => Boolean(value && typeof value === 'object' && apiResults.has(value))
// #endregion utils/exportProvenance.js
return {
  get markApiResult() { return markApiResult; },
  get isApiResult() { return isApiResult; }
};
})();

export const subjectDirectoryModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/subjectDirectory.js
/* export */ const idOf = (record, kind) => String(record?.[`${kind}Id`] ?? record?.id ?? '')
/* export */ const relationId = (record, kind) => String(record?.[`${kind}Id`] ?? record?.[kind]?.id ?? record?.[kind]?.[`${kind}Id`] ?? '')
/* export */ const classificationOf = subject => {
  const value = String(subject?.electiveType ?? '').trim().toLowerCase().replace(/[_\s]/g, '-')
  return value === 'elective' ? 'Elective' : value === 'non-elective' ? 'Non-Elective' : value === 'core-subject' ? 'Core Subject' : ''
}
/* export */ const departmentOfBranch = (branch, courses = []) => relationId(branch, 'department') || relationId(courses.find(course => idOf(course, 'course') === relationId(branch, 'course')), 'department')
/* export */ const isElectiveSubject = subject => classificationOf(subject) === 'Elective' && !['0', 'false', 'inactive'].includes(String(subject.status).toLowerCase())

/* export */ function enrichSubject(subject, masters = {}) {
  const { courses = [], branches = [], semesters = [], years = [], departments = [] } = masters
  const courseId = relationId(subject, 'course')
  const branchId = relationId(subject, 'branch')
  const semesterId = relationId(subject, 'semester')
  const academicYearId = relationId(subject, 'academicYear')
  const course = courses.find(item => idOf(item, 'course') === courseId)
  const branch = branches.find(item => idOf(item, 'branch') === branchId)
  const semester = semesters.find(item => idOf(item, 'semester') === semesterId)
  const year = years.find(item => idOf(item, 'academicYear') === academicYearId)
  const departmentId = relationId(subject, 'department') || departmentOfBranch(branch, courses) || relationId(course, 'department')
  const department = departments.find(item => idOf(item, 'department') === departmentId)
  const semesterNumber = Number(subject.semesterNumber ?? semester?.semesterNumber ?? String(subject.semesterName ?? subject.semester ?? semester?.semesterName ?? '').match(/\d+/)?.[0] ?? 0)
  const yearNumber = Math.ceil(semesterNumber / 2)
  return {
    ...subject, id: subject.subjectId ?? subject.id, courseId, branchId, semesterId, academicYearId, departmentId,
    electiveType: classificationOf(subject),
    department: subject.departmentName || department?.departmentName || department?.name || branch?.departmentName || course?.departmentName || '',
    course: subject.courseName || course?.courseName || course?.name || '',
    courseCode: subject.courseCode || course?.courseCode || course?.code || '',
    branchName: subject.branchName || branch?.branchName || branch?.name || (typeof subject.branch === 'string' ? subject.branch : ''),
    branchCode: subject.branchCode || branch?.branchCode || branch?.code || '',
    semesterName: subject.semesterName || semester?.semesterName || semester?.name || (typeof subject.semester === 'string' ? subject.semester : ''),
    academicYearName: subject.academicYearName || year?.academicYearName || year?.name || (typeof subject.academicYear === 'string' ? subject.academicYear : ''),
    level: yearNumber > 0 ? `${yearNumber}${yearNumber === 1 ? 'st' : yearNumber === 2 ? 'nd' : yearNumber === 3 ? 'rd' : 'th'} Year` : '',
    status: ['0', 'false', 'inactive'].includes(String(subject.status).toLowerCase()) ? 'Inactive' : 'Active',
  }
}

/* export */ const hasAcademicFilter = filters => ['department', 'course', 'branch', 'semester', 'academicYear', 'level'].some(key => filters[key] && filters[key] !== 'All')
// Names verified against the live Subject search contract. Department is
// derived from Branch/Course, so it is deliberately filtered locally.
/* export */ function subjectQuery(filters, search = '') {
  const names = { course: 'CourseId', branch: 'BranchId', semester: 'SemesterId', academicYear: 'AcademicYearId', level: 'Level', electiveType: 'ElectiveType', status: 'Status' }
  const query = Object.fromEntries(Object.entries(names).filter(([key]) => filters[key] && filters[key] !== 'All').map(([key, name]) => [name, filters[key]]))
  if (search.trim()) query.Search = search.trim()
  return query
}
/* export */ function matchesSubject(subject, filters, search = '') {
  const fields = { department: 'departmentId', course: 'courseId', branch: 'branchId', semester: 'semesterId', academicYear: 'academicYearId', level: 'level', electiveType: 'electiveType', status: 'status' }
  if (!Object.entries(fields).every(([filter, field]) => !filters[filter] || filters[filter] === 'All' || String(subject[field] ?? '') === String(filters[filter]))) return false
  const query = search.trim().toLowerCase()
  return !query || ['subjectCode', 'subjectName', 'department', 'course', 'courseCode', 'branchName', 'branchCode', 'semesterName', 'academicYearName'].some(field => String(subject[field] ?? '').toLowerCase().includes(query))
}

/* export */ function changeAcademicFilter(filters, key, value) {
  const resets = { department: ['course', 'branch', 'semester', 'level'], course: ['branch', 'semester', 'level'], branch: ['semester', 'level'], level: ['semester'] }
  return { ...filters, ...Object.fromEntries((resets[key] || []).map(field => [field, 'All'])), [key]: value }
}

/* export */ function academicFilterOptions(key, filters, masters) {
  const { departments, courses, branches, semesters, years } = masters
  const selected = value => value && value !== 'All'
  const validBranches = branches.filter(branch =>
    (!selected(filters.course) || relationId(branch, 'course') === String(filters.course)) &&
    (!selected(filters.department) || departmentOfBranch(branch, courses) === String(filters.department)))
  let rows = []
  switch (key) {
    case 'department': rows = departments; break
    case 'course':
      rows = courses.filter(course => !selected(filters.department) ||
        relationId(course, 'department') === String(filters.department) ||
        branches.some(branch => relationId(branch, 'course') === idOf(course, 'course') && departmentOfBranch(branch, courses) === String(filters.department)))
      break
    case 'branch': rows = validBranches; break
    case 'academicYear': rows = years; break
    case 'semester':
      rows = semesters.filter(semester =>
        (!selected(filters.course) || relationId(semester, 'course') === String(filters.course)) &&
        (!selected(filters.branch) || relationId(semester, 'branch') === String(filters.branch)) &&
        (!selected(filters.department) || validBranches.some(branch => idOf(branch, 'branch') === relationId(semester, 'branch'))) &&
        (!selected(filters.level) || enrichSubject({ semesterId: idOf(semester, 'semester') }, { semesters }).level === filters.level))
      break
    case 'status': return ['Active', 'Inactive'].map(value => ({ id: value, name: value }))
    case 'level': return ['1st Year', '2nd Year', '3rd Year', '4th Year'].map(value => ({ id: value, name: value }))
  }
  const options = rows.map(row => ({ id: idOf(row, key), name: row[`${key}Name`] || row.name || idOf(row, key) }))
  if (key !== 'semester') return options
  const seenNames = new Set()
  return options.filter(option => {
    const normalizedName = String(option.name).trim().toLowerCase()
    if (seenNames.has(normalizedName)) return false
    seenNames.add(normalizedName)
    return true
  })
}

/* export */ function eligibleForGroup(subject, group) {
  return isElectiveSubject(subject) && ['course', 'branch', 'semester', 'academicYear'].every(kind => !relationId(group, kind) || relationId(subject, kind) === relationId(group, kind))
}
// #endregion utils/subjectDirectory.js
return {
  get idOf() { return idOf; },
  get relationId() { return relationId; },
  get classificationOf() { return classificationOf; },
  get departmentOfBranch() { return departmentOfBranch; },
  get isElectiveSubject() { return isElectiveSubject; },
  get enrichSubject() { return enrichSubject; },
  get hasAcademicFilter() { return hasAcademicFilter; },
  get subjectQuery() { return subjectQuery; },
  get matchesSubject() { return matchesSubject; },
  get changeAcademicFilter() { return changeAcademicFilter; },
  get academicFilterOptions() { return academicFilterOptions; },
  get eligibleForGroup() { return eligibleForGroup; }
};
})();

export const subjectApiDataModule = (() => {
const { classificationOf } = subjectDirectoryModule;
const { relationId } = subjectDirectoryModule;
/* Imports for isolated regression tests:
import { classificationOf, relationId } from './subjectDirectory.js'
*/
// #region utils/subjectApiData.js
/* export */ const mapApiSubject = subject => ({
  ...subject,
  id: subject.subjectId ?? subject.id,
  subjectId: subject.subjectId ?? subject.id,
  courseId: relationId(subject, 'course'),
  branchId: relationId(subject, 'branch'),
  semesterId: relationId(subject, 'semester'),
  academicYearId: relationId(subject, 'academicYear'),
  departmentId: relationId(subject, 'department'),
  electiveType: classificationOf(subject),
  course: subject.courseName ?? subject.course ?? '',
  branch: subject.branchName ?? subject.branch ?? '',
  semester: subject.semesterName ?? subject.semester ?? '',
  status: Number(subject.status) === 0 || String(subject.status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
})

/* export */ const subjectApiPayload = subject => ({
  subjectCode: String(subject.subjectCode || '').trim(),
  subjectName: String(subject.subjectName || '').trim(),
  courseId: Number(subject.courseId),
  branchId: Number(subject.branchId),
  semesterId: Number(subject.semesterId),
  academicYearId: subject.academicYearId ? Number(subject.academicYearId) : null,
  credits: subject.credits === '' || subject.credits == null ? null : Number(subject.credits),
  subjectType: subject.subjectType || null,
  electiveType: subject.electiveType || null,
  description: subject.description || null,
  status: subject.status === 'Inactive' || Number(subject.status) === 0 ? 0 : 1,
})

// GET /api/v1/subjects supports Page/PageSize (live Swagger, 2026-09-28).
// Fetch every page so academic filters cannot silently omit later subjects.
/* export */ async function readSubjectPages(fetchPage) {
  const all = []
  let previousPage = ''
  for (let page = 1; ; page += 1) {
    const response = await fetchPage({ Page: page, PageSize: 500 })
    let current = response
    for (let depth = 0; depth < 5 && current && !Array.isArray(current); depth += 1) {
      current = current.items ?? current.records ?? current.results ?? current.rows ?? current.content ?? current.data
    }
    if (!Array.isArray(current)) throw new Error('The subject API returned an invalid subject list. Please retry.')
    const signature = JSON.stringify(current)
    if (current.length && signature === previousPage) throw new Error('The subject API repeated a page. The complete subject directory could not be loaded.')
    all.push(...current)
    if (current.length < 500) return all
    previousPage = signature
  }
}
// #endregion utils/subjectApiData.js
return {
  get mapApiSubject() { return mapApiSubject; },
  get subjectApiPayload() { return subjectApiPayload; },
  get readSubjectPages() { return readSubjectPages; }
};
})();

export const apiEndpointsModule = (() => {
const { GENERIC_ERROR_MESSAGE } = userErrorModule;
const { userErrorMessage } = userErrorModule;
const { collegeRequest } = collegeRequestModule;
const { markApiResult } = exportProvenanceModule;
const { readSubjectPages } = subjectApiDataModule;
const { getAccessToken } = authModule;
const { getAuthStorage } = authModule;
const { getRefreshToken } = authModule;
const { signOut } = authModule;
const { createApiUnavailableError } = apiFailureNoticeModule;
const { notifyApiUnavailable } = apiFailureNoticeModule;
/* Imports for isolated regression tests:
import { GENERIC_ERROR_MESSAGE, userErrorMessage } from '../utils/userError.js'
import { collegeRequest } from '../utils/collegeRequest.js'
import { markApiResult } from '../utils/exportProvenance'
import { readSubjectPages } from '../utils/subjectApiData'
import { getAccessToken, getAuthStorage, getRefreshToken, signOut } from '../auth/auth'
import { createApiUnavailableError, notifyApiUnavailable } from './apiFailureNotice'
*/
// #region api/apiEndpoints.js
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    ['pirnav-local-admissions-v2', 'pirnav-local-student-profiles-v2', 'pirnav-department-hod-names-v1'].forEach(key => {
      localStorage.removeItem(key)
    })
  } catch { /* ignore */ }
}

const normalizeBaseUrl = (value = '') => value.trim().replace(/\/+$/, '')
const DEFAULT_API_BASE_URL = 'https://abreast-curling-tutor.ngrok-free.dev'

// Results endpoints are optional until the institution's result service is integrated.
/* export */ const RESULTS_API_ENABLED = String(import.meta.env.VITE_RESULTS_API_ENABLED || '').toLowerCase() === 'true'

/* export */ const API_BASE_URL = import.meta.env.DEV
  ? ''
  : normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)

// Keep local login on the same Vite /api proxy as the rest of the app. Using
// the old public tunnel directly in development makes login fail when that
// tunnel changes or is unavailable, even though the local proxy is configured.
const AUTH_LOGIN_URL = import.meta.env.DEV
  ? '/api/v1/auth/login'
  : normalizeBaseUrl(import.meta.env.VITE_AUTH_API_URL || `${DEFAULT_API_BASE_URL}/api/v1/auth/login`)
const hasConfiguredAuthLoginUrl = Boolean(AUTH_LOGIN_URL || API_BASE_URL)

const endpoint = (path) => `${API_BASE_URL}${path}`

/* export */ const SCREEN_EXPORT_ENDPOINTS = Object.freeze(Object.fromEntries([
  'colleges', 'college-settings', 'academic-years', 'academic-levels',
  'departments', 'courses', 'branches', 'semester', 'sections',
  'course-structures', 'students', 'student-profiles', 'student-admissions',
  'promotions', 'users', 'roles', 'faculty', 'fee-structures', 'hostel-fees', 'transport-fees',
].map(screen => {
  const prefix = ['college-settings', 'academic-levels', 'semester', 'roles'].includes(screen) ? '/api' : '/api/v1'
  return [screen, Object.freeze({ download: endpoint(`${prefix}/${screen}/download`), export: endpoint(`${prefix}/${screen}/export`) })]
})))

/* export */ class AuthRequestError extends Error {
  constructor(message, status = 0) {
    super(userErrorMessage(message, status))
    this.name = 'AuthRequestError'
    this.status = status
  }
}

/* export */ const API_ENDPOINTS = Object.freeze({
  exports: Object.freeze({
    list: endpoint('/api/v1/exports'),
    screen: screen => endpoint(`/api/v1/exports/${encodeURIComponent(screen === 'semester' ? 'semesters' : screen)}`),
  }),
  auth: Object.freeze({
    login: AUTH_LOGIN_URL || endpoint('/api/v1/auth/login'),
    refresh: endpoint('/api/v1/auth/refresh'),
    changePassword: endpoint('/api/v1/auth/change-password'),
    forgotPassword: endpoint('/api/v1/auth/forgot-password'),
  }),
  profile: Object.freeze({
    get: endpoint('/api/v1/profile'),
    update: endpoint('/api/v1/profile'),
  }),
  academicYears: Object.freeze({
    create: endpoint('/api/v1/academic-years'),
    list: endpoint('/api/v1/academic-years'),
    detail: (id) => endpoint(`/api/v1/academic-years/${id}`),
    update: (id) => endpoint(`/api/v1/academic-years/${id}`),
    activate: (id) => endpoint(`/api/v1/academic-years/${id}/activate`),
    deactivate: (id) => endpoint(`/api/v1/academic-years/${id}/deactivate`),
  }),
  branches: Object.freeze({
    create: endpoint('/api/v1/branches'),
    list: endpoint('/api/v1/branches'),
    byCourse: (courseId) => endpoint(`/api/v1/branches/course/${courseId}`),
    detail: (id) => endpoint(`/api/v1/branches/${id}`),
    update: (id) => endpoint(`/api/v1/branches/${id}`),
    status: (id) => endpoint(`/api/v1/branches/${id}/status`),
  }),
  courses: Object.freeze({
    list: endpoint('/api/v1/courses'),
    detail: (id) => endpoint(`/api/v1/courses/${id}`),
  }),
  departments: Object.freeze({
    list: endpoint('/api/v1/departments'),
  }),
  courseStructures: Object.freeze({
    create: endpoint('/api/v1/course-structures'),
    list: endpoint('/api/v1/course-structures'),
    byCourse: (courseId) => endpoint(`/api/v1/course-structures/course/${courseId}`),
    detail: (id) => endpoint(`/api/v1/course-structures/${id}`),
    update: (id) => endpoint(`/api/v1/course-structures/${id}`),
  }),
  sectionAssignments: Object.freeze({
    list: endpoint('/api/v1/section-assignments'),
    assign: (sectionId) => endpoint(`/api/v1/sections/${sectionId}/students`),
    remove: (sectionId, assignmentId) => endpoint(`/api/v1/sections/${sectionId}/students/${assignmentId}`),
  }),
  sections: Object.freeze({
    create: endpoint('/api/v1/sections'),
    list: endpoint('/api/v1/sections'),
    detail: (id) => endpoint(`/api/v1/sections/${id}`),
    update: (id) => endpoint(`/api/v1/sections/${id}`),
    remove: (id) => endpoint(`/api/v1/sections/${id}`),
    search: endpoint('/api/v1/sections/search'),
    status: (id) => endpoint(`/api/v1/sections/${id}/status`),
    validateCapacity: endpoint('/api/v1/sections/validate-capacity'),
    summary: endpoint('/api/v1/sections/summary'),
    classTeacher: (id) => endpoint(`/api/v1/sections/${id}/class-teacher`),
    classTeacherCandidates: (id) => endpoint(`/api/v1/sections/${id}/class-teacher-candidates`),
    studentCandidates: (id) => endpoint(`/api/v1/sections/${id}/student-candidates`),
    capacity: (id) => endpoint(`/api/v1/sections/${id}/capacity`),
    students: (id) => endpoint(`/api/v1/sections/${id}/students`),
    assignStudents: (id) => endpoint(`/api/v1/sections/${id}/students/assign`),
    student: (sectionId, studentId) => endpoint(`/api/v1/sections/${sectionId}/students/${studentId}`),
  }),
  studentAdmissions: Object.freeze({
    approve: (id) => endpoint(`/api/Admissions/${id}/approve`),
    list: endpoint('/api/v1/student-admissions'), create: endpoint('/api/v1/student-admissions'),
    detail: (id) => endpoint(`/api/v1/student-admissions/${id}`), update: (id) => endpoint(`/api/v1/student-admissions/${id}`),
    academicDetails: (id) => endpoint(`/api/v1/student-admissions/${id}/academic-details`),
    previousEducation: (id) => endpoint(`/api/v1/student-admissions/${id}/previous-education`),
    status: (id) => endpoint(`/api/v1/student-admissions/${id}/status`), submit: (id) => endpoint(`/api/v1/student-admissions/${id}/submit`),
    feeSummary: (id) => endpoint(`/api/v1/student-admissions/${id}/fee-summary`), feeStructure: (id) => endpoint(`/api/v1/student-admissions/${id}/fee-structure`),
  }),
  studentAcademicInformation: Object.freeze({ detail: (id) => endpoint(`/api/v1/student-academic-information/${id}`), update: (id) => endpoint(`/api/v1/student-academic-information/${id}`) }),
  students: Object.freeze({
    list: endpoint('/api/v1/students'), create: endpoint('/api/v1/students'), search: endpoint('/api/v1/students/search'),
    detail: (id) => endpoint(`/api/v1/students/${id}`), update: (id) => endpoint(`/api/v1/students/${id}`), status: (id) => endpoint(`/api/v1/students/${id}/status`),
    parent: (id) => endpoint(`/api/student-parents/${id}`), documents: (id) => endpoint(`/api/v1/students/${id}/documents`),
    document: (studentId, documentId) => endpoint(`/api/v1/students/${studentId}/documents/${documentId}`),
    downloadDocument: (studentId, documentId) => endpoint(`/api/v1/students/${studentId}/documents/${documentId}/download`),
    personalInformation: (id) => endpoint(`/api/v1/students/${id}/profile/personal-information`), examResults: (id) => endpoint(`/api/v1/students/${id}/profile/exam-results`),
  }),
  studentProfiles: Object.freeze({ list: endpoint('/api/v1/student-profiles'), preview: (id) => endpoint(`/api/v1/student-profiles/${id}/preview`), update: (id) => endpoint(`/api/v1/student-profiles/${id}`), myProfile: endpoint('/api/StudentProfile/my-profile') }),
  faculty: Object.freeze({
    list: endpoint('/api/v1/faculty'),
    create: endpoint('/api/v1/faculty'),
    search: endpoint('/api/v1/faculty/search'),
    detail: (id) => endpoint(`/api/v1/faculty/${id}`),
    update: (id) => endpoint(`/api/v1/faculty/${id}`),
    workload: (id) => endpoint(`/api/v1/faculty/${id}/workload`),
    profilePhoto: (id) => endpoint(`/api/v1/faculty/${id}/profile-photo`),
    status: (id) => endpoint(`/api/v1/faculty/${id}/status`),
    statusHistory: (id) => endpoint(`/api/v1/faculty/${id}/status-history`),
    summary: endpoint('/api/v1/faculty/summary'),
  }),
  facultyProfiles: Object.freeze({
    detail: (facultyId) => endpoint(`/api/v1/faculty-profile/${facultyId}`),
    create: (facultyId) => endpoint(`/api/v1/faculty-profile/${facultyId}`),
    update: (facultyId) => endpoint(`/api/v1/faculty-profile/${facultyId}`),
  }),
  facultyDocuments: Object.freeze({
    list: (facultyId) => endpoint(`/api/v1/faculty-documents/faculty/${facultyId}`),
    upload: (facultyId) => endpoint(`/api/v1/faculty-documents/faculty/${facultyId}`),
    detail: (documentId) => endpoint(`/api/v1/faculty-documents/${documentId}`),
  }),
  facultySubjectAllocations: Object.freeze({
    list: endpoint('/api/v1/faculty-subject-allocations'),
    create: endpoint('/api/v1/faculty-subject-allocations'),
    detail: (allocationId) => endpoint(`/api/v1/faculty-subject-allocations/${allocationId}`),
  }),
  facultyAttendance: Object.freeze({
    list: endpoint('/api/v1/faculty-attendance'),
    create: endpoint('/api/v1/faculty-attendance'),
    detail: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}`),
    update: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}`),
    checkIn: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}/check-in`),
    checkOut: (attendanceId) => endpoint(`/api/v1/faculty-attendance/${attendanceId}/check-out`),
    daily: endpoint('/api/v1/faculty-attendance/daily'),
    bulk: endpoint('/api/v1/faculty-attendance/bulk'),
    weekly: endpoint('/api/v1/faculty-attendance/reports/weekly'),
    monthly: endpoint('/api/v1/faculty-attendance/reports/monthly'),
    reports: endpoint('/api/v1/faculty-attendance/reports'),
    export: endpoint('/api/v1/faculty-attendance/export'),
  }),
  facultyLeave: Object.freeze({
    requests: endpoint('/api/v1/faculty-leave/requests'),
    request: id => endpoint('/api/v1/faculty-leave/requests/' + id),
    approve: id => endpoint('/api/v1/faculty-leave/requests/' + id + '/approve'),
    reject: id => endpoint('/api/v1/faculty-leave/requests/' + id + '/reject'),
    history: endpoint('/api/v1/faculty-leave/history'),
    balances: endpoint('/api/v1/faculty-leave/balances'),
    types: endpoint('/api/v1/faculty-leave/types'),
    type: id => endpoint('/api/v1/faculty-leave/types/' + id),
    policies: endpoint('/api/v1/faculty-leave/policies'),
    policy: id => endpoint('/api/v1/faculty-leave/policies/' + id),
    activate: id => endpoint('/api/v1/faculty-leave/policies/' + id + '/activate'),
    deactivate: id => endpoint('/api/v1/faculty-leave/policies/' + id + '/deactivate'),
  }),
  facultyPayroll: Object.freeze({
    list: endpoint('/api/v1/faculty-payroll'),
    detail: id => endpoint('/api/v1/faculty-payroll/' + id),
    salaries: endpoint('/api/v1/faculty-payroll/salary-records'),
    payslips: endpoint('/api/v1/faculty-payroll/payslips'),
    hold: id => endpoint('/api/v1/faculty-payroll/' + id + '/hold'),
    export: endpoint('/api/v1/faculty-payroll/export'),
  }),
  subjectManagementSubjects: Object.freeze({
    list: endpoint('/api/v1/subject-management/subjects'),
    search: endpoint('/api/v1/subject-management/subjects/search'),
    detail: id => endpoint(`/api/v1/subject-management/subjects/${id}`),
    status: id => endpoint(`/api/v1/subject-management/subjects/${id}/status`),
    dependencies: id => endpoint(`/api/v1/subject-management/subjects/${id}/dependencies`),
    lookups: endpoint('/api/v1/subject-management/subjects/lookups'),
    summary: endpoint('/api/v1/subject-management/subjects/summary'),
    export: endpoint('/api/v1/subject-management/subjects/export'),
    download: endpoint('/api/v1/subject-management/subjects/download'),
  }),
  studentAttendance: Object.freeze({
    list: endpoint('/api/v1/student-attendance/sessions'),
    create: endpoint('/api/v1/student-attendance/sessions'),
    detail: (sessionId) => endpoint(`/api/v1/student-attendance/sessions/${sessionId}`),
    students: (sessionId) => endpoint(`/api/v1/student-attendance/sessions/${sessionId}/students`),
    mark: (sessionId) => endpoint(`/api/v1/student-attendance/sessions/${sessionId}/mark`),
    status: (sessionId) => endpoint(`/api/v1/student-attendance/sessions/${sessionId}/status`),
    daily: endpoint('/api/v1/student-attendance/reports/daily'),
    subjectReport: endpoint('/api/v1/student-attendance/reports/subject'),
    monthly: endpoint('/api/v1/student-attendance/reports/monthly'),
  }),
  credits: Object.freeze({
    dashboard: endpoint('/api/v1/credits/dashboard'),
    configurations: endpoint('/api/v1/credits/configurations'),
    configuration: id => endpoint(`/api/v1/credits/configurations/${id}`),
    registrations: endpoint('/api/v1/credits/registrations'),
    registration: id => endpoint(`/api/v1/credits/registrations/${id}`),
    summary: endpoint('/api/v1/credits/summary'),
  }),
  electives: Object.freeze({
    groups: endpoint('/api/v1/electives/groups'),
    groupSubjects: id => endpoint(`/api/v1/electives/groups/${id}/subjects`),
    studentSelections: id => endpoint(`/api/v1/students/${id}/electives`),
    approvals: endpoint('/api/v1/elective-approvals'),
    approval: id => endpoint(`/api/v1/elective-approvals/${id}`),
    allocations: endpoint('/api/v1/elective-allocations'),
    allocation: id => endpoint(`/api/v1/elective-allocations/${id}`),
  }),
  results: Object.freeze({
    list: endpoint('/api/v1/results'),
    create: endpoint('/api/v1/results'),
    transcript: (studentId) => endpoint(`/api/v1/results/students/${studentId}/transcript`),
  }),
  promotions: Object.freeze({
    dashboard: endpoint('/api/v1/promotions/dashboard'), directory: endpoint('/api/v1/promotions/directory'), history: endpoint('/api/v1/promotions/history'),
    eligibleStudents: endpoint('/api/v1/promotions/eligible-students'), eligibility: (id) => endpoint(`/api/v1/promotions/student-eligibility/${id}`), eligibilityStatus: (id) => endpoint(`/api/v1/promotions/eligibility-status/${id}`),
    promote: endpoint('/api/v1/promotions/promote'), promoteBulk: endpoint('/api/v1/promotions/promote-bulk'), promoteBulkAtomic: endpoint('/api/v1/promotions/promote-bulk-atomic'), promotedStudents: endpoint('/api/v1/promotions/promoted-students'),
    studentHistory: (id) => endpoint(`/api/v1/promotions/student/${id}/history`), historyByStudent: (id) => endpoint(`/api/v1/promotions/history/${id}`),
  }),
  authorizationTest: Object.freeze({
    authenticated: endpoint('/api/v1/authorization-test/authenticated'),
    admin: endpoint('/api/v1/authorization-test/admin'),
    faculty: endpoint('/api/v1/authorization-test/faculty'),
    student: endpoint('/api/v1/authorization-test/student'),
    adminFaculty: endpoint('/api/v1/authorization-test/admin-faculty'),
  }),
  roles: Object.freeze({
    list: endpoint('/api/roles'),
    create: endpoint('/api/roles'),
    detail: (id) => endpoint(`/api/roles/${id}`),
    update: (id) => endpoint(`/api/roles/${id}`),
    delete: (id) => endpoint(`/api/roles/${id}`),
  }),
  rooms: Object.freeze({
    list: endpoint('/api/v1/rooms'),
    create: endpoint('/api/v1/rooms'),
    options: endpoint('/api/v1/rooms/options'),
    detail: (classroomId) => endpoint(`/api/v1/rooms/${classroomId}`),
    update: (classroomId) => endpoint(`/api/v1/rooms/${classroomId}`),
    delete: (classroomId) => endpoint(`/api/v1/rooms/${classroomId}`),
    allocation: (classroomId) => endpoint(`/api/v1/rooms/${classroomId}/allocation`),
  }),
})

const readBody = async (response) => {
  try { return await response.json() } catch { return null }
}

const listResponse = (response) => {
  let current = response
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    if (Array.isArray(current)) return current
    const list = current.items ?? current.content ?? current.results ?? current.records ?? current.academicYears ?? current.years ?? current.rows ?? current.roles ?? (Array.isArray(current.data) ? current.data : undefined)
    if (Array.isArray(list)) return list
    current = current.data
  }
  return []
}

const validationMessage = (body) => {
  const errors = body?.errors || body?.data?.errors
  if (errors && typeof errors === 'object') {
    const messages = Object.entries(errors).flatMap(([field, value]) => (Array.isArray(value) ? value : [value]).filter((message) => typeof message === 'string').map((message) => field === '$' ? message : `${field}: ${message}`))
    if (messages.length) return messages.join(' ')
  }
  return body?.message || body?.detail || body?.title || body?.data?.message || body?.data?.detail || body?.data?.title || ''
}

let refreshRequestInFlight = null

const refreshAccessToken = async () => {
  if (refreshRequestInFlight) return refreshRequestInFlight

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    signOut()
    if (typeof window !== 'undefined') window.location.replace('/login')
    throw new AuthRequestError('Your session has expired. Please sign in again.', 401)
  }

  refreshRequestInFlight = (async () => {
    let response
    try {
      response = await fetch(API_ENDPOINTS.auth.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      throw createApiUnavailableError()
    }
    if (response.status >= 500) notifyApiUnavailable({ status: response.status })

    const body = await readBody(response)
    if (!response.ok || !body?.data?.accessToken) {
      signOut()
      if (typeof window !== 'undefined') window.location.replace('/login')
      throw new AuthRequestError(body?.message || 'Your session has expired. Please sign in again.', response.status || 401)
    }

    const storage = getAuthStorage()
    storage.setItem('btech-access-token', body.data.accessToken)
    if (body.data.refreshToken) storage.setItem('btech-refresh-token', body.data.refreshToken)

    return body.data.accessToken
  })()

  try {
    return await refreshRequestInFlight
  } finally {
    refreshRequestInFlight = null
  }
}

const pendingGetRequests = new Map()
const request = async (url, options = {}, retried = false, bypassDedupe = false, suppressApiFailureNotice = false) => {
  suppressApiFailureNotice = suppressApiFailureNotice || options.suppressApiFailureNotice === true
  if (options.suppressApiFailureNotice !== undefined) {
    options = { ...options }
    delete options.suppressApiFailureNotice
  }
  if (!retried && !bypassDedupe) ({ url, options } = collegeRequest(url, options))
  const method = String(options.method || 'GET').toUpperCase()
  if (method === 'GET' && !bypassDedupe) {
    const key = `${method}:${url}`
    if (pendingGetRequests.has(key)) return pendingGetRequests.get(key)
    const pending = request(url, options, retried, true, suppressApiFailureNotice).finally(() => pendingGetRequests.delete(key))
    pendingGetRequests.set(key, pending)
    return pending
  }
  const token = getAccessToken()
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: { 'ngrok-skip-browser-warning': 'true', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
  } catch {
    throw createApiUnavailableError(0, !suppressApiFailureNotice)
  }
  if (response.status === 401 && !retried && url !== API_ENDPOINTS.auth.refresh) {
    await refreshAccessToken()
    return request(url, options, true, true, suppressApiFailureNotice)
  }
  const body = await readBody(response)
  if (!response.ok || body?.success === false) {
    // Some read APIs are deliberately optional. Their callers can provide the
    // statuses that mean "no related record yet" so an expected absence does
    // not look like a failed request in the browser console.
    const silentStatuses = Array.isArray(options.silentStatuses) ? options.silentStatuses : []
    if (!silentStatuses.includes(response.status)) {
      console.error('API request failed', { url, method: options.method || 'GET', status: response.status })
    }
    if (response.status >= 500) {
      if (!suppressApiFailureNotice) notifyApiUnavailable({ status: response.status })
      const error = new Error(url.includes('/api/v1/timetable-management') ? validationMessage(body) || GENERIC_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE)
      error.status = response.status
      error.backendMessage = validationMessage(body)
      error.correlationId = typeof body?.correlationId === 'string' ? body.correlationId : undefined
      throw error
    }
    const fallback = {
      400: 'Please check the submitted information.',
      401: 'Your session has expired. Please sign in again.',
      403: "You don't have permission to update this profile.",
      404: 'Record not found.',
      409: 'The email or mobile number is already in use.',
      422: 'Some submitted values are invalid.',
      500: GENERIC_ERROR_MESSAGE,
    }[response.status] || 'The request could not be completed.'
    const backendMessage = validationMessage(body) || fallback
    const error = new Error(url.includes('/api/v1/timetable-management') ? backendMessage : userErrorMessage(backendMessage, response.status))
    error.status = response.status
    throw error
  }
  return body
}

const requiredId = (value, label) => {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error(`${label} is required.`)
  return encodeURIComponent(String(value).trim())
}
const withQuery = (url, params = {}) => {
  const query = new URLSearchParams(Object.entries(params || {}).filter(([, value]) => value !== '' && value !== undefined && value !== null))
  return query.size ? `${url}?${query}` : url
}
const dataResponse = (response) => response?.data?.data ?? response?.data ?? response ?? null
const listData = (response) => listResponse(response)

const blobRequest = async (url, options = {}, retried = false) => {
  const token = getAccessToken()
  let response
  try { response = await fetch(url, { ...options, headers: { 'ngrok-skip-browser-warning': 'true', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }) }
  catch { throw createApiUnavailableError() }
  if (response.status === 401 && !retried && url !== API_ENDPOINTS.auth.refresh) { await refreshAccessToken(); return blobRequest(url, options, true) }
  if (!response.ok) {
    const body = await readBody(response)
    if (response.status >= 500) notifyApiUnavailable({ status: response.status })
    throw new AuthRequestError(response.status >= 500 ? GENERIC_ERROR_MESSAGE : validationMessage(body) || 'The download request could not be completed.', response.status)
  }
  return { blob: await response.blob(), contentDisposition: response.headers.get('content-disposition') || '', contentType: response.headers.get('content-type') || '' }
}

/* export */ const screenExportsApi = {
  list: params => request(withQuery(API_ENDPOINTS.exports.list, params)),
  getScreen: (screen, params) => {
    if (!String(screen || '').trim()) throw new Error('Screen is required.')
    return readExportFile(withQuery(API_ENDPOINTS.exports.screen(screen), params))
  },
  download: (screen, params) => requestScreenFile(screen, 'download', params),
  export: (screen, params) => requestScreenFile(screen, 'export', params),
  save: async (screen, params) => {
    for (const action of ['export', 'download']) {
      try { return await requestScreenFile(screen, action, params) }
      catch (error) { if (![404, 405].includes(error.status)) throw error }
    }
    return screenExportsApi.getScreen(screen, params)
  },
}

async function requestScreenFile(screen, action, params) {
  const routes = SCREEN_EXPORT_ENDPOINTS[screen]
  if (!routes) throw new Error('This screen does not support server exports.')
  return readExportFile(withQuery(routes[action], params))
}

async function readExportFile(url) {
  const result = await blobRequest(url)
  if (/json|text\/html/i.test(result.contentType)) {
    let body
    try { body = JSON.parse(await result.blob.text()) } catch { /* Unexpected gateway page. */ }
    throw new Error(validationMessage(body) || GENERIC_ERROR_MESSAGE)
  }
  if (!result.blob.size) throw new Error(GENERIC_ERROR_MESSAGE)
  return result
}

const normalizeFrontendRole = (roleValue) => {
  const rawRole = Array.isArray(roleValue) ? roleValue[0] : roleValue
  const normalized = String(rawRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

  if (['admin', 'college_admin', 'super_admin'].includes(normalized)) {
    return 'admin'
  }

  return normalized || 'student'
}

/* export */ async function login({ identifier, password, rememberMe = false }) {
  if (!hasConfiguredAuthLoginUrl) {
    throw new AuthRequestError('Sign in is temporarily unavailable. Please try again later.')
  }

  let response
  try {
    response = await fetch(API_ENDPOINTS.auth.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ loginId: identifier, password, rememberMe: Boolean(rememberMe) }),
    })
  } catch {
    notifyApiUnavailable()
    throw new AuthRequestError('We’re having trouble signing you in right now. Please try again shortly.')
  }
  const body = await readBody(response)
  if (!response.ok || body?.success === false) {
    if (response.status >= 500) notifyApiUnavailable({ status: response.status })
    const message = response.status === 401
      ? 'The email, mobile number, or password is incorrect.'
      : response.status === 429
        ? 'Too many sign-in attempts. Please wait a moment and try again.'
        : 'We couldn’t sign you in right now. Please try again.'
    throw new AuthRequestError(message, response.status || 400)
  }
  const data = body?.data
  if (!data?.accessToken || !data?.refreshToken) throw new AuthRequestError('We couldn’t complete sign in. Please try again.')

  const roleValue = data.roles ?? data.role
  return {
    ...data,
    roles: Array.isArray(roleValue) ? roleValue : roleValue ? [roleValue] : [],
    user: {
      id: data.userId,
      name: data.fullName,
      role: normalizeFrontendRole(roleValue),
    },
  }
}

/* export */ async function changePassword({ currentPassword, newPassword, confirmNewPassword }) {
  return request(API_ENDPOINTS.auth.changePassword, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
  })
}

const normalizeProfile = (source) => {
  const data = source && typeof source === 'object' ? source : {}
  const academic = data.academic && typeof data.academic === 'object' ? data.academic : {}
  const application = data.application && typeof data.application === 'object' ? data.application : {}
  const lastLoginAt = data.lastLoginAt ?? data.last_login_at ?? data.LastLoginAt ?? data.lastLogin ?? data.last_login ?? ''
  return {
    id: data.userId ?? data.studentId ?? '', facultyId: data.facultyId ?? '', identifier: data.employeeUserId ?? data.studentCode ?? data.studentId ?? '', fullName: data.fullName ?? data.studentName ?? '',
    email: data.email ?? '', mobile: data.mobile ?? '', role: Array.isArray(data.roles) ? data.roles.join(', ') : String(data.role ?? ''),
    dateOfBirth: data.dateOfBirth ?? '', gender: data.gender ?? '', department: data.department ?? data.departmentName ?? '', departmentId: data.departmentId ?? '',
    designation: data.designation ?? '', houseNumber: data.houseNumber ?? data.currentHouseNumber ?? '', address: data.address ?? data.currentAddress ?? '', permanentHouseNumber: data.permanentHouseNumber ?? '', permanentAddress: data.permanentAddress ?? '', postalCode: data.postalCode ?? '',
    pincode: data.pincode ?? data.postalCode ?? '', city: data.city ?? '', district: data.district ?? '', state: data.state ?? '', permanentPincode: data.permanentPincode ?? '', permanentCity: data.permanentCity ?? '', permanentDistrict: data.permanentDistrict ?? '', permanentState: data.permanentState ?? '', bio: data.bio ?? data.aboutMe ?? '',
    lastLoginAt,
    updatedAt: data.updatedAt ?? '',
    status: data.status ?? data.accountStatus ?? 'Active',
    registrationNumber: data.registrationNumber ?? application.registrationNumber ?? application.number ?? '', admissionNumber: data.admissionNumber ?? application.admissionNumber ?? '',
    rollNumber: data.rollNumber ?? academic.rollNumber ?? '', course: data.course ?? data.courseName ?? academic.course ?? '', branch: data.branch ?? data.branchName ?? academic.branch ?? '',
    academicYear: data.academicYear ?? data.academicYearName ?? academic.academicYear ?? '', semester: data.semester ?? data.semesterName ?? academic.semester ?? '', section: data.section ?? data.sectionName ?? academic.section ?? '', batch: data.batch ?? academic.batch ?? '',
  }
}

/* export */ const profileApi = {
  getProfile: async () => {
    const response = await request(API_ENDPOINTS.profile.get)
    if (!response?.data) throw new Error('We couldn’t load your profile right now. Please try again.')
    return normalizeProfile(response.data)
  },
  updateProfile: async (profile) => {
    const response = await request(API_ENDPOINTS.profile.update, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: String(profile.fullName || '').trim(),
        email: String(profile.email || '').trim(),
        mobile: String(profile.mobile || '').trim(),
        dateOfBirth: profile.dateOfBirth || null,
        gender: profile.gender || null,
        departmentId: profile.departmentId ? Number(profile.departmentId) : null,
        department: String(profile.department || '').trim() || null,
        designation: String(profile.designation || '').trim() || null,
        houseNumber: String(profile.houseNumber || '').trim() || null,
        address: String(profile.address || '').trim() || null,
        permanentHouseNumber: String(profile.permanentHouseNumber || '').trim() || null,
        permanentAddress: String(profile.permanentAddress || '').trim() || null,
        permanentPincode: String(profile.permanentPincode || '').trim() || null,
        permanentCity: String(profile.permanentCity || '').trim() || null,
        permanentDistrict: String(profile.permanentDistrict || '').trim() || null,
        permanentState: String(profile.permanentState || '').trim() || null,
        pincode: String(profile.pincode || profile.postalCode || '').trim() || null,
        city: String(profile.city || '').trim() || null,
        district: String(profile.district || '').trim() || null,
        state: String(profile.state || '').trim() || null,
        aboutMe: String(profile.bio || profile.aboutMe || '').trim() || null,
      }),
    })
    return normalizeProfile(response?.data || {})
  },
}

const academicYearPayload = (year) => {
  const name = String(year.name || year.academicYearName || year.AcademicYearName || '').trim()
  const rawStart = year.startDate ?? year.StartDate ?? year.start_date ?? year.fromDate ?? year.FromDate ?? ''
  const rawEnd = year.endDate ?? year.EndDate ?? year.end_date ?? year.toDate ?? year.ToDate ?? ''
  const normalize = (val) => {
    if (!val) return ''
    const str = String(val).trim()
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
    const dmy = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/)
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    const d = new Date(str)
    return isNaN(d.getTime()) ? str.slice(0, 10) : d.toISOString().slice(0, 10)
  }
  return {
    academicYearName: name,
    startDate: normalize(rawStart),
    endDate: normalize(rawEnd),
  }
}

/* export */ const academicYearApi = {
  getAll: async (options = {}) => {
    const response = await request(API_ENDPOINTS.academicYears.list, options)
    return listResponse(response)
  },
  getById: async (id) => {
    const response = await request(API_ENDPOINTS.academicYears.detail(id))
    return response?.data
  },
  create: async (year) => {
    const response = await request(API_ENDPOINTS.academicYears.create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(academicYearPayload(year)),
    })
    return response?.data
  },
  update: async (id, year) => {
    const response = await request(API_ENDPOINTS.academicYears.update(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(academicYearPayload(year)),
    })
    return response?.data
  },
  activate: async (id) => {
    const response = await request(API_ENDPOINTS.academicYears.activate(id), { method: 'PATCH' })
    return response?.data
  },
  deactivate: async (id) => {
    const response = await request(API_ENDPOINTS.academicYears.deactivate(id), { method: 'PATCH' })
    return response?.data
  },
}

const branchPayload = (branch) => ({
  courseId: Number(branch.courseId),
  branchCode: String(branch.code || branch.branchCode || '').trim().toUpperCase(),
  branchName: String(branch.name || branch.branchName || '').trim(),
  shortName: String(branch.shortName || '').trim() || null,
  specialization: branch.specialization || null,
  ...(branch.departmentId ? { departmentId: Number(branch.departmentId) } : {}),
  branchType: branch.branchType || 'Core',
  duration: branch.duration || branch.durationValue ? Number(branch.duration || branch.durationValue) : null,
  totalSemesters: branch.totalSemesters || branch.semesters ? Number(branch.totalSemesters || branch.semesters) : null,
  intakeCapacity: Number(branch.intakeCapacity ?? branch.intake),
  startingAcademicYearId: branch.startingAcademicYearId || null,
  description: String(branch.description || '').trim() || null,
  status: branch.status === 'Inactive' || Number(branch.status) === 0 ? 0 : 1,
})

/* export */ const branchApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.branches.list)
    return listResponse(response)
  },
  getByCourse: async (courseId) => {
    const response = await request(API_ENDPOINTS.branches.byCourse(courseId))
    return Array.isArray(response?.data) ? response.data : []
  },
  getById: async (id) => {
    const response = await request(API_ENDPOINTS.branches.detail(id))
    return response?.data
  },
  create: async (branch) => {
    const response = await request(API_ENDPOINTS.branches.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branchPayload(branch)) })
    return response?.data
  },
  update: async (id, branch) => {
    const response = await request(API_ENDPOINTS.branches.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(branchPayload(branch)) })
    return response?.data
  },
  updateStatus: async (id, status) => request(API_ENDPOINTS.branches.status(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status === 'Active' || status === 1 || status === true }) }),
}

/* export */ const departmentApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.departments.list)
    return listResponse(response)
  },
}

/* export */ const courseApi = {
  getAll: async (params) => {
    const response = await request(withQuery(API_ENDPOINTS.courses.list, params))
    return listResponse(response)
  },
  getById: async (id) => (await request(API_ENDPOINTS.courses.detail(id)))?.data,
}

const courseStructurePayload = (structure) => ({
  courseId: Number(structure.courseId),
  branchId: Number(structure.branchId),
  academicYearId: Number(structure.academicYearId),
  yearNumber: Number(structure.yearNumber),
  semesterNumber: Number(structure.semesterNumber),
  semesterName: String(structure.semesterName || `Semester ${structure.semesterNumber}`).trim(),
  ...(structure.status !== undefined ? { status: Number(structure.status) === 0 || structure.status === 'Inactive' ? 0 : 1 } : {}),
})

/* export */ const courseStructureApi = {
  getAll: async () => {
    const response = await request(API_ENDPOINTS.courseStructures.list)
    return listResponse(response)
  },
  getByCourse: async (courseId) => {
    const response = await request(API_ENDPOINTS.courseStructures.byCourse(courseId))
    return listResponse(response)
  },
  getById: async (id) => (await request(API_ENDPOINTS.courseStructures.detail(id)))?.data,
  create: async (structure) => (await request(API_ENDPOINTS.courseStructures.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courseStructurePayload(structure)) }))?.data,
  update: async (id, structure) => (await request(API_ENDPOINTS.courseStructures.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(courseStructurePayload(structure)) }))?.data,
}

/* export */ const sectionAssignmentApi = {
  list: async () => {
    const response = await request(API_ENDPOINTS.sectionAssignments.list)
    return listResponse(response)
  },
  assign: async (sectionId, assignment) => request(API_ENDPOINTS.sections.assignStudents(sectionId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds: [Number(assignment.studentId)] }) }),
  assignMany: async (sectionId, studentIds) => request(API_ENDPOINTS.sections.assignStudents(sectionId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds: [...new Set(studentIds.map(Number))] }) }),
  remove: async (sectionId, assignmentId) => {
    await request(API_ENDPOINTS.sections.student(sectionId, assignmentId), { method: 'DELETE' })
  },
  listBySection: async (sectionId) => listResponse(await request(API_ENDPOINTS.sections.students(sectionId))),
  getStudentCandidates: async (sectionId, search = '') => listResponse(await request(withQuery(API_ENDPOINTS.sections.studentCandidates(sectionId), { search }))),
}

/* export */ const sectionAllocationApi = {
  getTeacher: async (sectionId) => (await request(API_ENDPOINTS.sections.classTeacher(sectionId)))?.data,
  getTeacherCandidates: async (sectionId) => listResponse(await request(API_ENDPOINTS.sections.classTeacherCandidates(sectionId))),
  getFormTeacherCandidates: async (sectionId, sections = []) => {
    if (sectionId) return sectionAllocationApi.getTeacherCandidates(sectionId)
    const sectionIds = [...new Set(sections.map((section) => section.sectionId ?? section.id).filter((id) => Number(id) > 0))]
    const results = await Promise.allSettled(sectionIds.map((id) => sectionAllocationApi.getTeacherCandidates(id)))
    const candidates = new Map()
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      for (const candidate of result.value) {
        if (candidate.employeeProfileId) candidates.set(String(candidate.employeeProfileId), candidate)
      }
    }
    if (results.length && results.every((result) => result.status === 'rejected')) throw results[0].reason
    return [...candidates.values()]
  },
  assignTeacher: async (sectionId, employeeProfileId) => (await request(API_ENDPOINTS.sections.classTeacher(sectionId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeProfileId: Number(employeeProfileId) }) }))?.data,
  removeTeacher: async (sectionId) => request(API_ENDPOINTS.sections.classTeacher(sectionId), { method: 'DELETE' }),
  getCapacity: async (sectionId) => (await request(API_ENDPOINTS.sections.capacity(sectionId)))?.data,
}

const sectionPayload = (section) => ({
  sectionCode: String(section.code || section.sectionCode || '').trim().toUpperCase(),
  sectionName: String(section.name || section.sectionName || '').trim(),
  capacity: Number(section.capacity),
  facultyAdvisorEmployeeProfileId: section.facultyAdvisorEmployeeProfileId || null,
  room: String(section.room || '').trim() || null,
  shift: section.shift || 'Morning',
  sectionType: section.type || section.sectionType || 'Regular',
})

const sectionUpdatePayload = (section) => ({
  sectionCode: String(section.code || section.sectionCode || '').trim().toUpperCase(),
  sectionName: String(section.name || section.sectionName || '').trim(),
  capacity: Number(section.capacity),
  facultyAdvisorEmployeeProfileId: section.facultyAdvisorEmployeeProfileId ? Number(section.facultyAdvisorEmployeeProfileId) : null,
  room: String(section.room || '').trim() || null,
  shift: section.shift || 'Morning',
  sectionType: section.type || section.sectionType || 'Regular',
})

/* export */ const sectionApi = {
  getAll: async () => listResponse(await request(API_ENDPOINTS.sections.list)),
  getById: async (id) => (await request(API_ENDPOINTS.sections.detail(id)))?.data,
  create: async (section) => {
    let academicYearId = Number(section.academicYearId || 0)
    if (!academicYearId && section.academicYear) {
      const yearRows = listResponse(await request(API_ENDPOINTS.academicYears.list))
      const selectedYear = yearRows.find((year) => String(year.academicYearName ?? year.name ?? '').trim().toLowerCase() === String(section.academicYear).trim().toLowerCase())
      academicYearId = Number(selectedYear?.academicYearId ?? selectedYear?.id ?? 0)
    }
    const ids = { collegeId: Number(section.collegeId), academicYearId, courseId: Number(section.courseId), branchId: Number(section.branchId), semesterId: Number(section.semesterId) }
    const requiredIds = ['collegeId', 'academicYearId', 'courseId', 'branchId', 'semesterId']
    const missing = requiredIds.filter((key) => !Number.isInteger(ids[key]) || ids[key] <= 0)
    if (missing.length) throw new Error('Select a valid college, academic year, course, branch, and semester.')
    const deptId = Number(section.departmentId)
    const sectionBody = { ...sectionPayload(section), ...ids, departmentId: Number.isInteger(deptId) && deptId > 0 ? deptId : null }
    const response = await request(API_ENDPOINTS.sections.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sectionBody) })
    const id = response?.data?.sectionId ?? response?.sectionId
    return { ...section, ...(response?.data || {}), id: id || response?.data?.id || section.id }
  },
  update: async (id, section) => { const response = await request(API_ENDPOINTS.sections.update(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sectionUpdatePayload(section)) }); return { ...section, ...(response?.data || {}), id } },
  remove: async (id) => request(API_ENDPOINTS.sections.remove(id), { method: 'DELETE' }),
  updateStatus: async (id, status) => request(API_ENDPOINTS.sections.status(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status === 'Active' }) }),
  search: async (params) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)); return listResponse(await request(`${API_ENDPOINTS.sections.search}?${query}`)) },
  summary: async () => { const response = await request(API_ENDPOINTS.sections.summary); return response?.data?.data ?? response?.data ?? null },
  validateCapacity: async (sectionId, capacity) => (await request(`${API_ENDPOINTS.sections.validateCapacity}?sectionId=${sectionId}&capacity=${capacity}`))?.data,
}

const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
// API DTOs define academic references as nullable Int64 values.  Form controls
// use an empty string while no option is selected, which cannot be deserialized
// by ASP.NET as a nullable number.  Omit empty values and normalize valid IDs.
const nullableNumericId = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
const normalizeRecord = (source) => dataResponse(source) || {}
/* export */ const normalizeAdmission = (source) => {
  const { currentStatus, admissionStatus, applicationStatus, ...record } = normalizeRecord(source)
  return { ...record, status: currentStatus ?? admissionStatus ?? applicationStatus ?? record.status }
}
/* export */ const normalizeStudent = (source) => normalizeRecord(source)
/* export */ const normalizeStudentProfile = (source) => normalizeRecord(source)
/* export */ const normalizeAcademicDetails = (source) => normalizeRecord(source)
/* export */ const normalizePreviousEducation = (source) => normalizeRecord(source)
/* export */ const normalizeParent = (source) => normalizeRecord(source)
/* export */ const normalizeDocument = (source) => normalizeRecord(source)
/* export */ const normalizePromotion = (source) => normalizeRecord(source)

// Faculty APIs deliberately keep payloads transparent: the faculty module has
// several independently versioned DTOs (master, profile, attendance, and
// allocations), so callers can pass the schema supplied by the API contract.
const jsonRequest = (url, method, payload) => request(url, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const multipartRequest = (url, form) => request(url, { method: 'POST', body: form })

/* export */ const facultyApi = {
  getAll: async (params, requestOptions) => listData(await request(withQuery(API_ENDPOINTS.faculty.list, params), requestOptions)),
  search: async (params, requestOptions) => listData(await request(withQuery(API_ENDPOINTS.faculty.search, params), requestOptions)),
  getById: async (facultyId) => normalizeRecord(await request(API_ENDPOINTS.faculty.detail(requiredId(facultyId, 'Faculty ID')))),
  create: async (payload, collegeId = payload?.collegeId) => {
    const resolvedCollegeId = Number(collegeId)
    if (!Number.isSafeInteger(resolvedCollegeId) || resolvedCollegeId <= 0) throw new Error('College is required. Select a valid college.')
    const body = { ...payload, collegeId: resolvedCollegeId }
    const url = withQuery(API_ENDPOINTS.faculty.create, { collegeId: resolvedCollegeId })
    console.log('Faculty Create Query collegeId:', resolvedCollegeId)
    console.log('Faculty Create Body collegeId:', body.collegeId)
    console.log('Faculty Create Payload:', body)
    return normalizeRecord(await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, false, true))
  },
  update: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.faculty.update(requiredId(facultyId, 'Faculty ID')), 'PUT', payload)),
  getWorkload: async (facultyId, params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.faculty.workload(requiredId(facultyId, 'Faculty ID')), params))),
  uploadProfilePhoto: async (facultyId, file, metadata = {}) => {
    if (!(file instanceof File)) throw new Error('Choose a profile photo to upload.')
    const form = new FormData()
    form.append('file', file)
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '').forEach(([key, value]) => form.append(key, String(value)))
    return normalizeRecord(await multipartRequest(API_ENDPOINTS.faculty.profilePhoto(requiredId(facultyId, 'Faculty ID')), form))
  },
  updateStatus: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.faculty.status(requiredId(facultyId, 'Faculty ID')), 'PATCH', typeof payload === 'object' ? payload : { status: payload })),
  getStatusHistory: async (facultyId, params) => listData(await request(withQuery(API_ENDPOINTS.faculty.statusHistory(requiredId(facultyId, 'Faculty ID')), params))),
  getSummary: async (params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.faculty.summary, params))),
}

/* export */ const facultyProfileApi = {
  // The faculty master record may exist before its optional extended profile.
  // The current API returns 409 for that state in some deployments; treat it
  // like a normal missing profile while keeping all other failures visible.
  get: async (facultyId, requestOptions = {}) => normalizeRecord(await request(API_ENDPOINTS.facultyProfiles.detail(requiredId(facultyId, 'Faculty ID')), { silentStatuses: [404, 409], ...requestOptions })),
  create: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyProfiles.create(requiredId(facultyId, 'Faculty ID')), 'POST', payload)),
  update: async (facultyId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyProfiles.update(requiredId(facultyId, 'Faculty ID')), 'PUT', payload)),
}

/* export */ const facultyDocumentApi = {
  getAll: async (facultyId, params) => listData(await request(withQuery(API_ENDPOINTS.facultyDocuments.list(requiredId(facultyId, 'Faculty ID')), params))),
  upload: async (facultyId, file, metadata = {}) => {
    if (!(file instanceof File)) throw new Error('Choose a document to upload.')
    const form = new FormData()
    form.append('file', file)
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '').forEach(([key, value]) => form.append(key, String(value)))
    return normalizeRecord(await multipartRequest(API_ENDPOINTS.facultyDocuments.upload(requiredId(facultyId, 'Faculty ID')), form))
  },
  remove: async (facultyDocumentId) => request(API_ENDPOINTS.facultyDocuments.detail(requiredId(facultyDocumentId, 'Faculty document ID')), { method: 'DELETE' }),
}

/* export */ const facultySubjectAllocationApi = {
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.facultySubjectAllocations.list, params))),
  create: async (payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultySubjectAllocations.create, 'POST', payload)),
  update: async (allocationId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultySubjectAllocations.detail(requiredId(allocationId, 'Allocation ID')), 'PUT', payload)),
  remove: async (allocationId) => request(API_ENDPOINTS.facultySubjectAllocations.detail(requiredId(allocationId, 'Allocation ID')), { method: 'DELETE' }),
}

/* export */ const facultyAttendanceApi = {
  getDaily: async (params, requestOptions) => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.daily, params), requestOptions)),
  bulk: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.bulk, 'POST', payload)),
  getWeekly: async params => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.weekly, params))),
  getMonthly: async params => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.monthly, params))),
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.list, params))),
  getById: async (attendanceId) => normalizeRecord(await request(API_ENDPOINTS.facultyAttendance.detail(requiredId(attendanceId, 'Attendance ID')))),
  create: async (payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.create, 'POST', payload)),
  update: async (attendanceId, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.update(requiredId(attendanceId, 'Attendance ID')), 'PUT', payload)),
  checkIn: async (attendanceId, payload = {}) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.checkIn(requiredId(attendanceId, 'Attendance ID')), 'POST', payload)),
  checkOut: async (attendanceId, payload = {}) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyAttendance.checkOut(requiredId(attendanceId, 'Attendance ID')), 'POST', payload)),
  getReports: async (params) => listData(await request(withQuery(API_ENDPOINTS.facultyAttendance.reports, params))),
  export: async (params) => blobRequest(withQuery(API_ENDPOINTS.facultyAttendance.export, params)),
}

/* export */ const apiAssetUrl = (value) => {
  if (!value || ['string', 'null', 'undefined'].includes(String(value).trim().toLowerCase())) return ''
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
  return import.meta.env.DEV ? value : `${base}/${String(value).replace(/^\/+/, '')}`
}

const addressText = (address) => {
  if (typeof address === 'string') return address.trim()
  if (!address || typeof address !== 'object') return undefined
  return [address.line1 ?? address.addressLine1, address.line2 ?? address.addressLine2, address.town ?? address.village, address.city, address.district, address.state, address.pincode ?? address.postalCode].filter(value => value !== undefined && value !== null && String(value).trim() !== '').join(', ')
}

const studentAdmissionPayload = (form = {}) => {
  const currentAddress = form.currentAddress ?? form.contact?.currentAddress
  const permanentAddress = form.permanentAddress ?? form.contact?.permanentAddress
  const parents = form.parents ?? {}
  const personal = form.personal ?? {}
  const contact = form.contact ?? {}
  const academic = form.academic ?? {}
  const admission = form.admission ?? {}
  const fees = form.fees ?? {}
  const previous = form.previousEducation ?? {}
  const application = form.application ?? {}
  const photo = form.studentPhoto ?? form.photo ?? personal.photo ?? personal.photoUrl
  // Deployed admission procedures accept a URL (VARCHAR(500)), not base64.
  // Preserve inline uploads in formData. Send an explicit empty legacy field:
  // null/omission lets older services hydrate it back from personal.photo.
  const legacyPhoto = /^data:/i.test(String(photo ?? '').trim()) ? '' : photo

  return compact({
    registrationNumber: form.registrationNumber ?? application.registrationNumber ?? application.number ?? form.number,
    registrationNo: form.registrationNo ?? form.registrationNumber ?? application.registrationNumber ?? application.number ?? form.number,
    registrationDate: form.registrationDate ?? application.registrationDate ?? application.date,
    admissionNumber: form.admissionNumber ?? application.admissionNumber,
    admissionNo: form.admissionNo ?? form.admissionNumber ?? application.admissionNumber,
    admissionDate: form.admissionDate ?? application.admissionDate,
    firstName: form.firstName ?? personal.firstName,
    middleName: form.middleName ?? personal.middleName,
    lastName: form.lastName ?? personal.lastName,
    fullName: form.fullName ?? personal.fullName,
    gender: form.gender ?? personal.gender,
    photo: legacyPhoto,
    studentPhoto: legacyPhoto,
    dateOfBirth: form.dateOfBirth ?? form.dob ?? personal.dob ?? personal.dateOfBirth,
    bloodGroup: form.bloodGroup ?? personal.bloodGroup,
    nationality: form.nationality ?? personal.nationality,
    aadhaarNumber: form.aadhaarNumber ?? form.aadhaar ?? personal.aadhaar ?? personal.aadhaarNumber,
    mobile: form.mobile ?? contact.mobile,
    mobileNumber: form.mobileNumber ?? form.mobile ?? contact.mobile,
    alternateMobile: form.alternateMobile ?? contact.alternateMobile,
    email: form.email ?? contact.email,
    studentEmail: form.studentEmail ?? form.email ?? contact.email,
    alternateEmail: form.alternateEmail ?? contact.alternateEmail,
    sameAddress: form.sameAddress ?? contact.sameAddress,
    currentAddress,
    permanentAddress,
    currentAddressLine1: currentAddress?.line1 ?? currentAddress?.addressLine1,
    currentAddressLine2: currentAddress?.line2 ?? currentAddress?.addressLine2,
    currentTown: currentAddress?.town ?? currentAddress?.village ?? currentAddress?.townVillage,
    currentCity: currentAddress?.city,
    currentDistrict: currentAddress?.district,
    currentState: currentAddress?.state,
    currentCountry: currentAddress?.country,
    currentPincode: currentAddress?.pincode ?? currentAddress?.postalCode,
    permanentAddressLine1: permanentAddress?.line1 ?? permanentAddress?.addressLine1,
    permanentAddressLine2: permanentAddress?.line2 ?? permanentAddress?.addressLine2,
    permanentTown: permanentAddress?.town ?? permanentAddress?.village ?? permanentAddress?.townVillage,
    permanentCity: permanentAddress?.city,
    permanentDistrict: permanentAddress?.district,
    permanentState: permanentAddress?.state,
    permanentCountry: permanentAddress?.country,
    permanentPincode: permanentAddress?.pincode ?? permanentAddress?.postalCode,
    addressLine1: currentAddress?.line1 ?? currentAddress?.addressLine1,
    addressLine2: currentAddress?.line2 ?? currentAddress?.addressLine2,
    town: currentAddress?.town ?? currentAddress?.village,
    address: form.address ?? addressText(currentAddress),
    city: form.city ?? currentAddress?.city,
    district: form.district ?? currentAddress?.district,
    state: form.state ?? currentAddress?.state,
    country: form.country ?? currentAddress?.country ?? 'India',
    pincode: form.pincode ?? currentAddress?.pincode ?? currentAddress?.postalCode,
    admissionType: form.admissionType ?? academic.admissionType,
    admissionQuota: form.admissionQuota ?? form.quota ?? academic.quota,
    academicYearId: nullableNumericId(form.academicYearId ?? academic.academicYearId),
    departmentId: nullableNumericId(form.departmentId ?? academic.departmentId),
    courseId: nullableNumericId(form.courseId ?? academic.courseId),
    branchId: nullableNumericId(form.branchId ?? academic.branchId),
    semesterId: nullableNumericId(form.semesterId ?? academic.semesterId),
    sectionId: nullableNumericId(form.sectionId ?? academic.sectionId),
    quota: form.quota ?? academic.quota,
    quotaOther: form.quotaOther ?? academic.quotaOther,
    courseCode: form.courseCode ?? academic.courseCode,
    branchCode: form.branchCode ?? academic.branchCode,
    entryType: form.entryType ?? academic.entryType,
    regulation: form.regulation ?? academic.regulation,
    studentCategory: form.studentCategory ?? academic.studentCategory,
    collegeId: nullableNumericId(form.collegeId ?? admission.collegeId),
    college: form.college ?? admission.college,
    batch: form.batch ?? admission.batch,
    fatherName: form.fatherName ?? parents.father?.name ?? form.father?.name,
    parentMobile: form.parentMobile ?? form.fatherMobile ?? parents.father?.mobile ?? form.father?.mobile,
    fatherMobile: form.fatherMobile ?? form.parentMobile ?? parents.father?.mobile ?? form.father?.mobile,
    fatherEmail: form.fatherEmail ?? parents.father?.email ?? form.father?.email,
    fatherOccupation: form.fatherOccupation ?? form.occupation ?? parents.father?.occupation ?? form.father?.occupation,
    fatherQualification: form.fatherQualification ?? parents.father?.qualification ?? form.father?.qualification,
    fatherIncome: form.fatherIncome ?? form.annualIncome ?? parents.father?.income ?? form.father?.income,
    motherName: form.motherName ?? parents.mother?.name ?? form.mother?.name,
    motherMobile: form.motherMobile ?? parents.mother?.mobile ?? form.mother?.mobile,
    motherEmail: form.motherEmail ?? parents.mother?.email ?? form.mother?.email,
    motherOccupation: form.motherOccupation ?? parents.mother?.occupation ?? form.mother?.occupation,
    motherQualification: form.motherQualification ?? parents.mother?.qualification ?? form.mother?.qualification,
    motherIncome: form.motherIncome ?? parents.mother?.income ?? form.mother?.income,
    guardianName: form.guardianName ?? parents.guardian?.name ?? form.guardian?.name,
    guardianRelationship: form.guardianRelationship ?? parents.guardian?.relationship ?? form.guardian?.relationship,
    guardianRelationshipOther: form.guardianRelationshipOther ?? parents.guardian?.relationshipOther ?? form.guardian?.relationshipOther,
    guardianMobile: form.guardianMobile ?? parents.guardian?.mobile ?? form.guardian?.mobile,
    guardianEmail: form.guardianEmail ?? parents.guardian?.email ?? form.guardian?.email,
    guardianOccupation: form.guardianOccupation ?? parents.guardian?.occupation ?? form.guardian?.occupation,
    guardianQualification: form.guardianQualification ?? parents.guardian?.qualification ?? form.guardian?.qualification,
    guardianIncome: form.guardianIncome ?? parents.guardian?.income ?? form.guardian?.income,
    primaryContact: form.primaryContact ?? parents.primaryContact,
    emergencyMobile: form.emergencyMobile ?? form.emergencyContact ?? parents.emergencyMobile,
    tenth: educationRecordPayload(form.tenth ?? previous.tenth),
    qualifyingEducation: educationRecordPayload(form.qualifyingEducation ?? form.intermediate ?? previous.intermediate),
    scholarship: form.scholarship ?? admission.scholarship,
    scholarshipType: form.scholarshipType ?? admission.scholarshipType,
    hostel: form.hostel ?? admission.hostel,
    hostelPreference: form.hostelPreference ?? admission.hostelPreference,
    hostelRoomType: form.hostelRoomType ?? admission.hostelRoomType,
    transport: form.transport ?? admission.transport,
    transportRoute: form.transportRoute ?? admission.transportRoute,
    feeStructureId: form.feeStructureId ?? fees.feeStructureId ?? fees.structureId,
    tuitionFee: form.tuitionFee ?? fees.tuitionFee,
    admissionFee: form.admissionFee ?? fees.admissionFee,
    scholarshipAmount: form.scholarshipAmount ?? fees.scholarshipAmount,
    hostelFee: form.hostelFee ?? fees.hostelFee,
    transportFee: form.transportFee ?? fees.transportFee,
    totalFee: form.totalFee ?? fees.totalFee,
    paymentPlan: form.paymentPlan ?? fees.paymentPlan,
    paymentStatus: form.paymentStatus ?? fees.paymentStatus,
    documentStatuses: form.documentStatuses ?? (form.documents ? Object.fromEntries(Object.entries(form.documents).filter(([, value]) => value && !Array.isArray(value)).map(([key, value]) => [key, typeof value === 'object' ? value.status ?? '' : value])) : undefined),
    formData: form,
  })
}

const academicDetailsPayload = (form = {}) => compact({
  collegeId: nullableNumericId(form.collegeId ?? form.academic?.collegeId ?? form.admission?.collegeId),
  academicYearId: nullableNumericId(form.academicYearId ?? form.academic?.academicYearId),
  departmentId: nullableNumericId(form.departmentId ?? form.academic?.departmentId),
  courseId: nullableNumericId(form.courseId ?? form.academic?.courseId),
  branchId: nullableNumericId(form.branchId ?? form.academic?.branchId),
  semesterId: nullableNumericId(form.semesterId ?? form.academic?.semesterId),
  sectionId: nullableNumericId(form.sectionId ?? form.academic?.sectionId),
  admissionType: form.admissionType ?? form.academic?.admissionType,
  quota: form.quota ?? form.academic?.quota,
  quotaOther: form.quotaOther ?? form.academic?.quotaOther,
  courseCode: form.courseCode ?? form.academic?.courseCode,
  branchCode: form.branchCode ?? form.academic?.branchCode,
  entryType: form.entryType ?? form.academic?.entryType,
  regulation: form.regulation ?? form.academic?.regulation,
  studentCategory: form.studentCategory ?? form.academic?.studentCategory,
  batch: form.batch ?? form.academic?.batch ?? form.admission?.batch,
})

const educationRecordPayload = (record) => {
  if (!record || typeof record !== 'object') return record
  const score = record.score
  // ASP.NET nullable Decimal fields accept null, but cannot deserialize an
  // empty form-control string (e.g. an optional SSC percentage).
  return {
    ...record,
    score: score === undefined || score === null || String(score).trim() === '' ? null : Number(score),
  }
}

const previousEducationPayload = (form = {}) => compact({
  tenth: educationRecordPayload(form.tenth ?? form.previousEducation?.tenth),
  qualifyingEducation: educationRecordPayload(form.qualifyingEducation ?? form.intermediate ?? form.previousEducation?.intermediate),
  intermediate: educationRecordPayload(form.intermediate ?? form.qualifyingEducation ?? form.previousEducation?.intermediate),
})

const parentPayload = (form = {}) => compact({
  fatherName: form.fatherName ?? form.father?.name ?? form.parents?.father?.name,
  motherName: form.motherName ?? form.mother?.name ?? form.parents?.mother?.name,
  guardianName: form.guardianName ?? form.guardian?.name ?? form.parents?.guardian?.name,
  guardianRelationship: form.guardianRelationship ?? form.guardian?.relationship ?? form.parents?.guardian?.relationship,
  guardianRelationshipOther: form.guardianRelationshipOther ?? form.guardian?.relationshipOther ?? form.parents?.guardian?.relationshipOther,
  primaryContact: form.primaryContact ?? form.parents?.primaryContact,
  emergencyMobile: form.emergencyMobile ?? form.emergencyContact ?? form.parents?.emergencyMobile,
  parentMobile: form.parentMobile ?? form.fatherMobile ?? form.father?.mobile ?? form.parents?.father?.mobile,
  fatherMobile: form.fatherMobile ?? form.parentMobile ?? form.father?.mobile ?? form.parents?.father?.mobile,
  email: form.email ?? form.fatherEmail ?? form.father?.email ?? form.parents?.father?.email,
  fatherEmail: form.fatherEmail ?? form.email ?? form.father?.email ?? form.parents?.father?.email,
  fatherOccupation: form.fatherOccupation ?? form.occupation ?? form.father?.occupation ?? form.parents?.father?.occupation,
  fatherQualification: form.fatherQualification ?? form.father?.qualification ?? form.parents?.father?.qualification,
  fatherIncome: form.fatherIncome ?? form.annualIncome ?? form.father?.income ?? form.parents?.father?.income,
  motherMobile: form.motherMobile ?? form.mother?.mobile ?? form.parents?.mother?.mobile,
  motherEmail: form.motherEmail ?? form.mother?.email ?? form.parents?.mother?.email,
  motherOccupation: form.motherOccupation ?? form.mother?.occupation ?? form.parents?.mother?.occupation,
  motherQualification: form.motherQualification ?? form.mother?.qualification ?? form.parents?.mother?.qualification,
  motherIncome: form.motherIncome ?? form.mother?.income ?? form.parents?.mother?.income,
  guardianMobile: form.guardianMobile ?? form.guardian?.mobile ?? form.parents?.guardian?.mobile,
  guardianEmail: form.guardianEmail ?? form.guardian?.email ?? form.parents?.guardian?.email,
  guardianOccupation: form.guardianOccupation ?? form.guardian?.occupation ?? form.parents?.guardian?.occupation,
  guardianQualification: form.guardianQualification ?? form.guardian?.qualification ?? form.parents?.guardian?.qualification,
  guardianIncome: form.guardianIncome ?? form.guardian?.income ?? form.parents?.guardian?.income,
  address: form.address ?? form.parents?.address,
})

/* export */ const studentAdmissionApi = {
  getAll: async (params) => markApiResult((listData(await request(withQuery(API_ENDPOINTS.studentAdmissions.list, params))) || []).map(normalizeAdmission)),
  getById: async (id) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.detail(requiredId(id, 'Admission ID')))),
  create: async (form) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentAdmissionPayload(form)) })),
  update: async (id, form) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.update(requiredId(id, 'Admission ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentAdmissionPayload(form)) })),
  submit: async (id) => normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.submit(requiredId(id, 'Admission ID')), { method: 'POST' })),
}
/* export */ const studentAcademicDetailsApi = {
  get: async (id) => normalizeAcademicDetails(await request(API_ENDPOINTS.studentAdmissions.academicDetails(requiredId(id, 'Admission ID')))),
  update: async (id, form) => {
    const admissionId = requiredId(id, 'Admission ID')
    const payload = academicDetailsPayload(form)
    return normalizeAcademicDetails(await request(API_ENDPOINTS.studentAdmissions.academicDetails(admissionId), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))
  },
}
/* export */ const studentAcademicInformationApi = {
  getById: async (id) => normalizeAcademicDetails(await request(API_ENDPOINTS.studentAcademicInformation.detail(requiredId(id, 'Academic ID')))),
  update: async (id, payload) => normalizeAcademicDetails(await request(API_ENDPOINTS.studentAcademicInformation.update(requiredId(id, 'Academic ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
}
/* export */ const studentAdmissionStatusApi = {
  get: async (id) => {
    const reqId = requiredId(id, 'Admission ID')
    return normalizeAdmission(await request(API_ENDPOINTS.studentAdmissions.status(reqId), { cache: 'no-store' }))
  },
  update: async (id, payload) => {
    const reqId = requiredId(id, 'Admission ID')
    const newStatus = payload.newStatus ?? payload.status
    const body = { newStatus, remarks: payload.remarks, rejectionReason: payload.rejectionReason ?? (newStatus === 'REJECTED' ? payload.remarks : undefined) }
    let res
    try {
      const approving = newStatus === 'APPROVED'
      res = normalizeAdmission(await request(approving ? API_ENDPOINTS.studentAdmissions.approve(reqId) : API_ENDPOINTS.studentAdmissions.status(reqId), { method: approving ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approving ? { remarks: payload.remarks } : body) }))
    } catch (error) {
      if (error.status >= 500) {
        error.message = GENERIC_ERROR_MESSAGE
      }
      throw error
    }
    let latest
    try {
      latest = await studentAdmissionStatusApi.get(reqId)
    } catch (error) {
      error.message = GENERIC_ERROR_MESSAGE
      throw error
    }
    if (String(latest.status || '').trim().replaceAll(' ', '_').toUpperCase() !== newStatus) {
      throw new Error(`Admission status was not confirmed as ${newStatus}. Current backend status: ${latest.status || 'unknown'}. Refresh and try again.`)
    }
    return normalizeRecord({ ...res, ...latest })
  },
}
/* export */ const studentPreviousEducationApi = {
  get: async (id) => normalizePreviousEducation(await request(API_ENDPOINTS.studentAdmissions.previousEducation(requiredId(id, 'Admission ID')))),
  update: async (id, form) => normalizePreviousEducation(await request(API_ENDPOINTS.studentAdmissions.previousEducation(requiredId(id, 'Admission ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previousEducationPayload(form)) })),
}
/* export */ const studentFeeApi = {
  getSummary: async (id) => normalizeRecord(await request(API_ENDPOINTS.studentAdmissions.feeSummary(requiredId(id, 'Admission ID')))),
  getStructure: async (id) => normalizeRecord(await request(API_ENDPOINTS.studentAdmissions.feeStructure(requiredId(id, 'Admission ID')))),
}

// Contracts: Backend/DTOs/Fees/FeeCollectionDtos.cs. Reuse authentication,
// refresh, error handling and request deduplication from the shared client.
function financialData(response, amounts = [], lists = []) {
  const data = response?.data
  if (!data || typeof data !== 'object' || amounts.some(key => typeof data[key] !== 'number' || !Number.isFinite(data[key])) || lists.some(key => !Array.isArray(data[key]))) {
    throw new Error('Financial response is incomplete. Refresh before using these balances.')
  }
  return data
}
function financialPage(response, amounts) {
  const data = financialData(response, ['totalCount', 'totalPages', 'page', 'pageSize'], ['items'])
  const expectedItems = Math.max(0, Math.min(data.pageSize, data.totalCount - (data.page - 1) * data.pageSize))
  if (['totalCount', 'totalPages', 'page', 'pageSize'].some(key => !Number.isSafeInteger(data[key])) || data.totalCount < 0 || data.page < 1 || data.pageSize < 1 || data.totalPages !== Math.ceil(data.totalCount / data.pageSize) || data.items.length !== expectedItems || data.items.some(row => !row || amounts.some(key => typeof row[key] !== 'number' || !Number.isFinite(row[key]) || (key.endsWith('Id') && (!Number.isSafeInteger(row[key]) || row[key] <= 0))))) {
    throw new Error('Financial records are incomplete. Refresh before using these balances.')
  }
  return data
}
async function allFinancialPages(load, params, idKey) {
  const rows = []
  const seen = new Set()
  let expectedCount
  for (let page = 1; ; page += 1) {
    const result = await load({ ...params, page, pageSize: 200 })
    if (!result || !Array.isArray(result.items) || result.page !== page || result.pageSize !== 200 || !Number.isInteger(result.totalCount) || !Number.isInteger(result.totalPages)) {
      throw new Error('Financial response is incomplete. Refresh before using these balances.')
    }
    if (expectedCount !== undefined && expectedCount !== result.totalCount) throw new Error('Financial records changed while loading. Refresh to get a consistent view.')
    expectedCount = result.totalCount
    for (const row of result.items) {
      if (seen.has(row[idKey])) throw new Error('Financial records repeated while loading. Refresh to get a consistent view.')
      seen.add(row[idKey])
    }
    rows.push(...result.items)
    if (page >= result.totalPages) {
      if (rows.length !== expectedCount) throw new Error('Not all financial records were returned. Refresh before using these balances.')
      return rows
    }
    if (!result.items.length) throw new Error('Financial pagination is incomplete. Refresh to retry.')
  }
}
/* export */ const feeCollectionApi = {
  dashboard: async params => {
    const data = financialData(await request(withQuery(endpoint('/api/v1/fee-collection/dashboard'), params)), ['totalAssigned', 'totalConcession', 'totalPayable', 'totalCollected', 'totalPending', 'totalOverdue', 'totalFineAssessed', 'totalFineCollected', 'totalFinePending', 'studentsWithPending', 'studentsOverdue', 'paymentsCount', 'receiptsCount'], ['collectionTrend', 'byCategory', 'byPaymentMode'])
    for (const [key, amounts] of [['collectionTrend', ['amount', 'paymentCount']], ['byCategory', ['assigned', 'collected', 'pending']], ['byPaymentMode', ['amount', 'paymentCount']]]) {
      data[key].forEach(row => financialData({ data: row }, amounts))
    }
    if (data.collectionTrend.some(row => typeof row.date !== 'string' || Number.isNaN(Date.parse(row.date))) || data.byCategory.some(row => typeof row.categoryName !== 'string' || !row.categoryName.trim()) || data.byPaymentMode.some(row => typeof row.paymentMode !== 'string' || !row.paymentMode.trim())) throw new Error('Financial summary labels or dates are incomplete. Refresh before using this report.')
    return data
  },
  pending: async params => financialPage(await request(withQuery(endpoint('/api/v1/fee-collection/pending'), params)), ['studentFeeId', 'studentId', 'payableAmount', 'paidAmount', 'balanceAmount', 'finePending', 'concessionAmount']),
  history: async params => financialPage(await request(withQuery(endpoint('/api/v1/fee-collection/history'), params)), ['paymentId', 'studentId', 'receiptId', 'feeAmount', 'fineAmount', 'totalAmount']),
  fines: async params => financialPage(await request(withQuery(endpoint('/api/v1/fee-collection/fines'), params)), ['fineId', 'amount', 'waivedAmount', 'pendingAmount']),
  collect: async payload => (await request(endpoint('/api/v1/fee-collection/payments'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))?.data,
  receipt: async id => {
    const data = financialData(await request(endpoint(`/api/v1/fee-collection/receipts/${requiredId(id, 'Receipt ID')}`)), ['receiptId', 'paymentId', 'studentId', 'feeAmount', 'fineAmount', 'totalAmount'])
    if (['receiptId', 'paymentId', 'studentId'].some(key => !Number.isSafeInteger(data[key]) || data[key] <= 0) || String(data.receiptId) !== String(id) || typeof data.receiptNumber !== 'string' || !data.receiptNumber.trim() || ['feeAmount', 'fineAmount', 'totalAmount'].some(key => data[key] < 0 || !Number.isSafeInteger(Math.round(data[key] * 100)) || data[key] !== Math.round(data[key] * 100) / 100) || Math.round(data.totalAmount * 100) !== Math.round(data.feeAmount * 100) + Math.round(data.fineAmount * 100)) throw new Error('Receipt is incomplete or inconsistent. Check confirmed payments before printing.')
    return data
  },
  createFine: async payload => (await request(endpoint('/api/v1/fee-collection/fines'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))?.data,
  waiveFine: async (id, payload) => (await request(endpoint(`/api/v1/fee-collection/fines/${requiredId(id, 'Fine ID')}/waive`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }))?.data,
  allPending: params => allFinancialPages(feeCollectionApi.pending, params, 'studentFeeId'),
  allHistory: params => allFinancialPages(feeCollectionApi.history, params, 'paymentId'),
  allFines: params => allFinancialPages(feeCollectionApi.fines, params, 'fineId'),
}
/* export */ const studentApi = {
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.students.list, params))), search: async (params) => listData(await request(withQuery(API_ENDPOINTS.students.search, params))),
  getById: async (id) => normalizeStudent(await request(API_ENDPOINTS.students.detail(requiredId(id, 'Student ID')))),
  create: async (payload) => normalizeStudent(await request(API_ENDPOINTS.students.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  update: async (id, payload) => normalizeStudent(await request(API_ENDPOINTS.students.update(requiredId(id, 'Student ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  updateStatus: async (id, status) => normalizeStudent(await request(API_ENDPOINTS.students.status(requiredId(id, 'Student ID')), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(typeof status === 'object' ? status : { status }) })),
}
/* export */ const studentParentApi = { get: async (id) => normalizeParent(await request(API_ENDPOINTS.students.parent(requiredId(id, 'Student ID')))), update: async (id, form) => normalizeParent(await request(API_ENDPOINTS.students.parent(requiredId(id, 'Student ID')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parentPayload(form)) })) }
/* export */ const studentDocumentApi = {
  getAll: async (id) => listData(await request(API_ENDPOINTS.students.documents(requiredId(id, 'Student ID')))),
  upload: async (id, file, metadata = {}) => { if (!(file instanceof File)) throw new Error('Choose a document to upload.'); const form = new FormData(); form.append('file', file); Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '').forEach(([key, value]) => form.append(key, String(value))); return normalizeDocument(await request(API_ENDPOINTS.students.documents(requiredId(id, 'Student ID')), { method: 'POST', body: form })) },
  get: async (studentId, documentId) => normalizeDocument(await request(API_ENDPOINTS.students.document(requiredId(studentId, 'Student ID'), requiredId(documentId, 'Document ID')))),
  remove: async (studentId, documentId) => request(API_ENDPOINTS.students.document(requiredId(studentId, 'Student ID'), requiredId(documentId, 'Document ID')), { method: 'DELETE' }),
  download: async (studentId, documentId) => blobRequest(API_ENDPOINTS.students.downloadDocument(requiredId(studentId, 'Student ID'), requiredId(documentId, 'Document ID'))),
}
/* export */ const studentProfileApi = {
  getPersonalInformation: async (id) => normalizeStudentProfile(await request(API_ENDPOINTS.students.personalInformation(requiredId(id, 'Student ID')))),
  updatePersonalInformation: async (id, payload) => normalizeStudentProfile(await request(API_ENDPOINTS.students.personalInformation(requiredId(id, 'Student ID')), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getExamResults: async (id) => listData(await request(API_ENDPOINTS.students.examResults(requiredId(id, 'Student ID')))), getMyProfile: async () => normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.myProfile)),
}

/* export */ const studentProfilesApi = {
  getAll: async (params) => markApiResult((listData(await request(withQuery(API_ENDPOINTS.studentProfiles.list, params))) || []).map(normalizeStudentProfile)),
  preview: async (id) => markApiResult(normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.preview(requiredId(id, 'Student ID'))))),
  update: async (id, payload) => normalizeStudentProfile(await request(API_ENDPOINTS.studentProfiles.update(requiredId(id, 'Student ID')), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
}
/* export */ const studentPromotionApi = {
  getDashboard: async () => normalizePromotion(await request(API_ENDPOINTS.promotions.dashboard)), getDirectory: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.directory, params))), getHistory: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.history, params))),
  getEligibleStudents: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.eligibleStudents, params))), getEligibility: async (id) => normalizePromotion(await request(API_ENDPOINTS.promotions.eligibility(requiredId(id, 'Student ID')))),
  updateEligibilityStatus: async (id, eligibilityStatus) => normalizePromotion(await request(withQuery(API_ENDPOINTS.promotions.eligibilityStatus(requiredId(id, 'Student ID')), { eligibilityStatus }), { method: 'PUT' })),
  promote: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promote, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  promoteBulk: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promoteBulk, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  promoteBulkAtomic: async (payload) => normalizePromotion(await request(API_ENDPOINTS.promotions.promoteBulkAtomic, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getPromotedStudents: async (params) => listData(await request(withQuery(API_ENDPOINTS.promotions.promotedStudents, params))), getStudentHistory: async (id) => listData(await request(API_ENDPOINTS.promotions.studentHistory(requiredId(id, 'Student ID')))), getHistoryByStudent: async (id) => listData(await request(API_ENDPOINTS.promotions.historyByStudent(requiredId(id, 'Student ID')))),
}
/* export */ const studentAttendanceApi = {
  list: async (params) => listData(await request(withQuery(API_ENDPOINTS.studentAttendance.list, params))),
  create: async (payload) => normalizeRecord(await request(API_ENDPOINTS.studentAttendance.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getById: async (sessionId, params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.studentAttendance.detail(requiredId(sessionId, 'Session ID')), params))),
  getStudents: async (sessionId, params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.studentAttendance.students(requiredId(sessionId, 'Session ID')), params))),
  mark: async (sessionId, payload, params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.studentAttendance.mark(requiredId(sessionId, 'Session ID')), params), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  updateStatus: async (sessionId, payload, params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.studentAttendance.status(requiredId(sessionId, 'Session ID')), params), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getDailyReport: async (params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.studentAttendance.daily, params))),
  getSubjectReport: async (params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.studentAttendance.subjectReport, params))),
  getMonthlyReport: async (params) => normalizeRecord(await request(withQuery(API_ENDPOINTS.studentAttendance.monthly, params))),
}
/* export */ const creditManagementApi = {
  getDashboard: async params => normalizeRecord(await request(withQuery(API_ENDPOINTS.credits.dashboard, params))),
  getConfigurations: async params => listData(await request(withQuery(API_ENDPOINTS.credits.configurations, params))),
  createConfiguration: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.credits.configurations, 'POST', payload)),
  updateConfiguration: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.credits.configuration(requiredId(id, 'Configuration ID')), 'PUT', payload)),
  getRegistrations: async params => listData(await request(withQuery(API_ENDPOINTS.credits.registrations, params))),
  getRegistration: async id => normalizeRecord(await request(API_ENDPOINTS.credits.registration(requiredId(id, 'Registration ID')))),
  createRegistration: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.credits.registrations, 'POST', payload)),
  updateRegistration: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.credits.registration(requiredId(id, 'Registration ID')), 'PUT', payload)),
  getSummary: async params => normalizeRecord(await request(withQuery(API_ENDPOINTS.credits.summary, params))),
}
/* export */ const electiveManagementApi = {
  getGroups: async params => listData(await request(withQuery(API_ENDPOINTS.electives.groups, params))),
  createGroup: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.electives.groups, 'POST', payload)),
  updateGroup: async (id, payload) => normalizeRecord(await jsonRequest(`${API_ENDPOINTS.electives.groups}/${requiredId(id, 'Elective group ID')}`, 'PUT', payload)),
  deleteGroup: async id => request(`${API_ENDPOINTS.electives.groups}/${requiredId(id, 'Elective group ID')}`, { method: 'DELETE' }),
  getGroupSubjects: async id => listData(await request(API_ENDPOINTS.electives.groupSubjects(requiredId(id, 'Elective group ID')))),
  addGroupSubjects: async (id, subjectIds) => normalizeRecord(await jsonRequest(API_ENDPOINTS.electives.groupSubjects(requiredId(id, 'Elective group ID')), 'POST', { subjectIds })),
  getStudentSelections: async id => listData(await request(API_ENDPOINTS.electives.studentSelections(requiredId(id, 'Student ID')))),
  createStudentSelection: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.electives.studentSelections(requiredId(id, 'Student ID')), 'POST', payload)),
  getApprovals: async params => listData(await request(withQuery(API_ENDPOINTS.electives.approvals, params))),
  updateApproval: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.electives.approval(requiredId(id, 'Selection ID')), 'PUT', payload)),
  getAllocations: async params => listData(await request(withQuery(API_ENDPOINTS.electives.allocations, params))),
  createAllocation: async (id, payload = {}) => normalizeRecord(await jsonRequest(API_ENDPOINTS.electives.allocation(requiredId(id, 'Selection ID')), 'POST', payload)),
}
/* export */ const resultsApi = {
  list: async (params) => listData(await request(withQuery(API_ENDPOINTS.results.list, params))),
  create: async (payload) => normalizeRecord(await request(API_ENDPOINTS.results.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })),
  getTranscript: async (studentId) => normalizeRecord(await request(API_ENDPOINTS.results.transcript(requiredId(studentId, 'Student ID')))),
}

/* export */ async function lookupIndianPincode(pincode) {
  const digits = String(pincode || '').replace(/\D/g, '').trim()
  if (!/^\d{6}$/.test(digits)) throw new Error('Enter a valid 6-digit PIN code.')

  const urls = [
    `/postal-lookup/pincode/${digits}`,
    `https://api.postalpincode.in/pincode/${digits}`,
    `https://api.zippopotam.us/in/${digits}`,
  ]

  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const data = await response.json()
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const primary = data[0].PostOffice[0]
        return {
          town: primary.Name || '',
          city: primary.Block && primary.Block !== 'NA' ? primary.Block : (primary.District || primary.Name || ''),
          district: primary.District || '',
          state: primary.State || '',
          country: 'India',
        }
      }
      if (data && Array.isArray(data.places) && data.places.length > 0) {
        const place = data.places[0]
        return {
          town: place['place name'] || '',
          city: place['place name'] || '',
          district: place.state || '',
          state: place.state || '',
          country: 'India',
        }
      }
    } catch {
      // try next url
    }
  }

  throw new Error('No Indian postal location found for this PIN code.')
}

/* export default API_ENDPOINTS */

// Leave endpoints may wrap their collection by resource name. Do not turn
// an unrecognized response (including an HTML tunnel page) into "no records".
const leaveList = async (url, params, keys, requestOptions) => {
  let current = await request(withQuery(url, params), requestOptions)
  const collectionKeys = new Set([...keys, 'items', 'content', 'results', 'records', 'rows', 'data', 'value', '$values'].map(key => key.toLowerCase()))
  for (let depth = 0; depth < 6; depth += 1) {
    if (Array.isArray(current)) return current
    if (!current || typeof current !== 'object') break
    const entry = Object.entries(current).find(([name, value]) => collectionKeys.has(name.toLowerCase()) && value != null)
    if (!entry) break
    current = entry[1]
  }
  if (Array.isArray(current)) return current
  throw new Error('The leave service returned an unexpected response.')
}

/* export */ const facultyLeaveApi = {
  getRequests: async (params, requestOptions) => leaveList(API_ENDPOINTS.facultyLeave.requests, params, ['requests', 'leaveRequests'], requestOptions),
  createRequest: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.requests, 'POST', payload)),
  getRequest: async id => normalizeRecord(await request(API_ENDPOINTS.facultyLeave.request(requiredId(id, 'Request ID')))),
  approve: async id => request(API_ENDPOINTS.facultyLeave.approve(requiredId(id, 'Request ID')), { method: 'PUT' }),
  reject: async (id, rejectionReason) => jsonRequest(API_ENDPOINTS.facultyLeave.reject(requiredId(id, 'Request ID')), 'PUT', { rejectionReason }),
  getHistory: async (params, requestOptions) => leaveList(API_ENDPOINTS.facultyLeave.history, params, ['history', 'leaveHistory', 'requests', 'leaveRequests'], requestOptions),
  getBalances: async (params, requestOptions) => leaveList(API_ENDPOINTS.facultyLeave.balances, params, ['balances', 'leaveBalances'], requestOptions),
  getTypes: async (params, requestOptions) => leaveList(API_ENDPOINTS.facultyLeave.types, params, ['types', 'leaveTypes'], requestOptions),
  createType: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.types, 'POST', payload)),
  updateType: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.type(requiredId(id, 'Leave type ID')), 'PUT', payload)),
  getPolicies: async (params, requestOptions) => leaveList(API_ENDPOINTS.facultyLeave.policies, params, ['policies', 'leavePolicies'], requestOptions),
  getPolicy: async id => normalizeRecord(await request(API_ENDPOINTS.facultyLeave.policy(requiredId(id, 'Policy ID')))),
  createPolicy: async payload => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.policies, 'POST', payload)),
  updatePolicy: async (id, payload) => normalizeRecord(await jsonRequest(API_ENDPOINTS.facultyLeave.policy(requiredId(id, 'Policy ID')), 'PUT', payload)),
  activatePolicy: async id => request(API_ENDPOINTS.facultyLeave.activate(requiredId(id, 'Policy ID')), { method: 'POST' }),
  deactivatePolicy: async id => request(API_ENDPOINTS.facultyLeave.deactivate(requiredId(id, 'Policy ID')), { method: 'POST' }),
}
/* export */ const facultyPayrollApi = {
  getAll: async (params, requestOptions) => listData(await request(withQuery(API_ENDPOINTS.facultyPayroll.list, params), requestOptions)),
  getById: async id => normalizeRecord(await request(API_ENDPOINTS.facultyPayroll.detail(requiredId(id, 'Payroll ID')))),
  getSalaryRecords: async params => listData(await request(withQuery(API_ENDPOINTS.facultyPayroll.salaries, params))),
  getPayslips: async params => listData(await request(withQuery(API_ENDPOINTS.facultyPayroll.payslips, params))),
  hold: async (id, reason) => jsonRequest(API_ENDPOINTS.facultyPayroll.hold(requiredId(id, 'Payroll ID')), 'PUT', { reason }),
  export: async params => blobRequest(withQuery(API_ENDPOINTS.facultyPayroll.export, params)),
}

/* export */ const facultyMasterApi = {
  getSemesters: async () => listData(await request(endpoint('/api/semester'))),
  getColleges: async () => listData(await request(endpoint('/api/v1/colleges'))),
  getSubjects: async params => listData(await request(withQuery(endpoint('/api/v1/subjects'), params))),
}

// Subject CRUD routes are implemented by Backend/Controllers/V1/FacultyManagement/SubjectsController.cs.
/* export */ const subjectApi = {
  list: async params => {
    try {
      return await readSubjectPages(page => request(withQuery(API_ENDPOINTS.subjectManagementSubjects.list, { ...params, ...page })))
    } catch (error) {
      if (error.backendMessage) error.message = userErrorMessage(error.backendMessage, error.status)
      throw error
    }
  },
  search: async params => listData(await request(withQuery(API_ENDPOINTS.subjectManagementSubjects.search, params))),
  getById: async id => dataResponse(await request(API_ENDPOINTS.subjectManagementSubjects.detail(requiredId(id, 'Subject ID')))),
  create: async payload => dataResponse(await jsonRequest(API_ENDPOINTS.subjectManagementSubjects.list, 'POST', payload)),
  update: async (id, payload) => dataResponse(await jsonRequest(API_ENDPOINTS.subjectManagementSubjects.detail(requiredId(id, 'Subject ID')), 'PUT', payload)),
  remove: async id => request(API_ENDPOINTS.subjectManagementSubjects.detail(requiredId(id, 'Subject ID')), { method: 'DELETE' }),
  updateStatus: async (id, status) => dataResponse(await jsonRequest(API_ENDPOINTS.subjectManagementSubjects.status(requiredId(id, 'Subject ID')), 'PATCH', { status: status === 'Inactive' ? 0 : 1 })),
  dependencies: async id => dataResponse(await request(API_ENDPOINTS.subjectManagementSubjects.dependencies(requiredId(id, 'Subject ID')))),
  lookups: async () => dataResponse(await request(API_ENDPOINTS.subjectManagementSubjects.lookups)),
  summary: async params => dataResponse(await request(withQuery(API_ENDPOINTS.subjectManagementSubjects.summary, params))),
  export: params => blobRequest(withQuery(API_ENDPOINTS.subjectManagementSubjects.export, params)),
  download: params => blobRequest(withQuery(API_ENDPOINTS.subjectManagementSubjects.download, params)),
}

// Verified against the deployed Swagger TimetableEntries contract (2026-09-23).
// Timetable/slot setup and publication routes are not exposed by this contract.
/* export */ const timetableEntryApi = {
  list: async () => {
    const response = await request(endpoint('/api/v1/timetable-entries'))
    const rows = response?.data ?? response
    if (!Array.isArray(rows) || (response?.count != null && Number(response.count) !== rows.length)) throw new Error('The timetable service returned an incomplete or invalid schedule. Conflict validation requires the complete list.')
    return rows
  },
  create: payload => jsonRequest(endpoint('/api/v1/timetable-entries'), 'POST', payload),
  update: (id, payload) => jsonRequest(endpoint(`/api/v1/timetable-entries/${requiredId(id, 'Timetable entry ID')}`), 'PUT', payload),
  remove: id => request(endpoint(`/api/v1/timetable-entries/${requiredId(id, 'Timetable entry ID')}`), { method: 'DELETE' }),
}

// Phase 5 API: all calls use the shared bearer-token, refresh and error handling.
const timetableManagementUrl = (path = '') => endpoint(`/api/v1/timetable-management${path}`)
/* export */ const timetableManagementApi = {
  get: async (path, query) => dataResponse(await request(withQuery(timetableManagementUrl(path), query))),
  post: async (path, payload) => dataResponse(await jsonRequest(timetableManagementUrl(path), 'POST', payload)),
  put: async (path, payload) => dataResponse(await jsonRequest(timetableManagementUrl(path), 'PUT', payload)),
  remove: async path => dataResponse(await request(timetableManagementUrl(path), { method: 'DELETE' })),
}

const isNumericId = (val) => Number.isInteger(Number(val)) && Number(val) > 0

const rolePayload = (role) => {
  if (!role || typeof role !== 'object') return {}
  const isBoolStatus = role.status === 'Active' || role.status === true || role.status === 1 || role.isActive === true
  return {
    name: String(role.name || role.roleName || '').trim(),
    roleName: String(role.name || role.roleName || '').trim(),
    code: String(role.code || role.roleCode || '').trim().toUpperCase(),
    roleCode: String(role.code || role.roleCode || '').trim().toUpperCase(),
    category: role.category || 'Academic',
    level: role.level || 'Level 4 (Academic Staff)',
    description: String(role.description || '').trim(),
    status: isBoolStatus,
    isActive: isBoolStatus,
    permissions: typeof role.permissions === 'object' ? JSON.stringify(role.permissions) : role.permissions || '{}',
  }
}

/* export */ const roleApi = {
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.roles.list, params))),
  getById: async (id) => isNumericId(id) ? (await request(API_ENDPOINTS.roles.detail(id)))?.data : null,
  create: async (payload) => (await jsonRequest(API_ENDPOINTS.roles.create, 'POST', rolePayload(payload)))?.data,
  update: async (id, payload) => {
    if (isNumericId(id)) {
      return (await jsonRequest(API_ENDPOINTS.roles.update(id), 'PUT', rolePayload(payload)))?.data
    }
    return (await jsonRequest(API_ENDPOINTS.roles.create, 'POST', rolePayload(payload)))?.data
  },
  delete: async (id) => {
    if (isNumericId(id)) {
      return request(API_ENDPOINTS.roles.delete(id), { method: 'DELETE' })
    }
    return true
  },
}
/* export */ const rolesApi = roleApi

/* export */ const roomApi = {
  getAll: async (params) => listData(await request(withQuery(API_ENDPOINTS.rooms.list, params))),
  getOptions: async () => (await request(API_ENDPOINTS.rooms.options))?.data,
  getById: async (classroomId) => (await request(API_ENDPOINTS.rooms.detail(requiredId(classroomId, 'Room ID'))))?.data,
  create: async (payload) => (await jsonRequest(API_ENDPOINTS.rooms.create, 'POST', payload))?.data,
  update: async (classroomId, payload) => (await jsonRequest(API_ENDPOINTS.rooms.update(requiredId(classroomId, 'Room ID')), 'PUT', payload))?.data,
  allocate: async (classroomId, payload) => {
    let body = {}
    if (typeof payload === 'number') {
      body = { sectionId: Number(payload) }
    } else if (typeof payload === 'object' && payload !== null) {
      const secId = Number(payload.sectionId ?? payload.id)
      body = {
        sectionId: Number.isInteger(secId) && secId > 0 ? secId : Number(payload.sectionId),
        ...(payload.sectionName ? { sectionName: payload.sectionName } : {}),
      }
    } else if (typeof payload === 'string' && !isNaN(Number(payload)) && Number(payload) > 0) {
      body = { sectionId: Number(payload) }
    } else {
      body = payload
    }
    return (await jsonRequest(API_ENDPOINTS.rooms.allocation(requiredId(classroomId, 'Room ID')), 'PUT', body))?.data
  },
  deallocate: async (classroomId) => request(API_ENDPOINTS.rooms.allocation(requiredId(classroomId, 'Room ID')), { method: 'DELETE' }),
}
/* export */ const roomsApi = roomApi

// MarksController / DTOs/Marks/MarksManagementDtos.cs. No local success fallback.
/* export */ const marksApi = {
  list: async params => listData(await request(withQuery(endpoint('/api/v1/marks'), params))),
  create: async payload => { const data = dataResponse(await jsonRequest(endpoint('/api/v1/marks'), 'POST', payload)); return data?.mark ?? data },
  update: async (id, payload) => dataResponse(await jsonRequest(endpoint(`/api/v1/marks/${requiredId(id, 'Mark ID')}`), 'PUT', payload)),
  workflow: async (action, payload) => {
    if (!['submit', 'approve', 'reject'].includes(action)) throw new Error('Invalid marks workflow action.')
    return dataResponse(await jsonRequest(endpoint(`/api/v1/marks/workflow/${action}`), 'POST', payload))
  },
  approvalHistory: async id => listData(await request(endpoint(`/api/v1/marks/${requiredId(id, 'Mark ID')}/approval-history`))),
  studentReport: async params => dataResponse(await request(withQuery(endpoint('/api/v1/marks/reports/student'), params))),
  subjectReport: async params => listData(await request(withQuery(endpoint('/api/v1/marks/reports/subjects'), params))),
  upload: async (file, scope, preview = true) => {
    if (!(file instanceof File) || !/\.xlsx$/i.test(file.name)) throw new Error('Choose an XLSX workbook.')
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Workbook must be nonempty and at most 10 MB.')
    const form = new FormData()
    form.append('file', file); form.append('examId', String(scope.examId))
    if (scope.sectionId) form.append('sectionId', String(scope.sectionId))
    if (!preview) form.append('upsertDrafts', 'false')
    return dataResponse(await multipartRequest(endpoint(`/api/v1/marks/bulk/${preview ? 'file-preview' : 'upload'}`), form))
  },
}
// #endregion api/apiEndpoints.js
return {
  get RESULTS_API_ENABLED() { return RESULTS_API_ENABLED; },
  get API_BASE_URL() { return API_BASE_URL; },
  get SCREEN_EXPORT_ENDPOINTS() { return SCREEN_EXPORT_ENDPOINTS; },
  get AuthRequestError() { return AuthRequestError; },
  get API_ENDPOINTS() { return API_ENDPOINTS; },
  get screenExportsApi() { return screenExportsApi; },
  get login() { return login; },
  get changePassword() { return changePassword; },
  get profileApi() { return profileApi; },
  get academicYearApi() { return academicYearApi; },
  get branchApi() { return branchApi; },
  get departmentApi() { return departmentApi; },
  get courseApi() { return courseApi; },
  get courseStructureApi() { return courseStructureApi; },
  get sectionAssignmentApi() { return sectionAssignmentApi; },
  get sectionAllocationApi() { return sectionAllocationApi; },
  get sectionApi() { return sectionApi; },
  get normalizeAdmission() { return normalizeAdmission; },
  get normalizeStudent() { return normalizeStudent; },
  get normalizeStudentProfile() { return normalizeStudentProfile; },
  get normalizeAcademicDetails() { return normalizeAcademicDetails; },
  get normalizePreviousEducation() { return normalizePreviousEducation; },
  get normalizeParent() { return normalizeParent; },
  get normalizeDocument() { return normalizeDocument; },
  get normalizePromotion() { return normalizePromotion; },
  get facultyApi() { return facultyApi; },
  get facultyProfileApi() { return facultyProfileApi; },
  get facultyDocumentApi() { return facultyDocumentApi; },
  get facultySubjectAllocationApi() { return facultySubjectAllocationApi; },
  get facultyAttendanceApi() { return facultyAttendanceApi; },
  get apiAssetUrl() { return apiAssetUrl; },
  get studentAdmissionApi() { return studentAdmissionApi; },
  get studentAcademicDetailsApi() { return studentAcademicDetailsApi; },
  get studentAcademicInformationApi() { return studentAcademicInformationApi; },
  get studentAdmissionStatusApi() { return studentAdmissionStatusApi; },
  get studentPreviousEducationApi() { return studentPreviousEducationApi; },
  get studentFeeApi() { return studentFeeApi; },
  get feeCollectionApi() { return feeCollectionApi; },
  get studentApi() { return studentApi; },
  get studentParentApi() { return studentParentApi; },
  get studentDocumentApi() { return studentDocumentApi; },
  get studentProfileApi() { return studentProfileApi; },
  get studentProfilesApi() { return studentProfilesApi; },
  get studentPromotionApi() { return studentPromotionApi; },
  get studentAttendanceApi() { return studentAttendanceApi; },
  get creditManagementApi() { return creditManagementApi; },
  get electiveManagementApi() { return electiveManagementApi; },
  get resultsApi() { return resultsApi; },
  get lookupIndianPincode() { return lookupIndianPincode; },
  get default() { return API_ENDPOINTS; },
  get facultyLeaveApi() { return facultyLeaveApi; },
  get facultyPayrollApi() { return facultyPayrollApi; },
  get facultyMasterApi() { return facultyMasterApi; },
  get subjectApi() { return subjectApi; },
  get timetableEntryApi() { return timetableEntryApi; },
  get timetableManagementApi() { return timetableManagementApi; },
  get roleApi() { return roleApi; },
  get rolesApi() { return rolesApi; },
  get roomApi() { return roomApi; },
  get roomsApi() { return roomsApi; },
  get marksApi() { return marksApi; }
};
})();

export const eventBusModule = (() => {

/* Imports for isolated regression tests:

*/
// #region services/eventBus.js
/**
 * Central Event Bus for cross-module state invalidation and sync in Pirnav ERP.
 * Allows components to reactively re-fetch data without full page reloads.
 */

class ERPEventBus {
  constructor() {
    this.events = new Map()
  }

  subscribe(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event).add(callback)

    return () => {
      this.unsubscribe(event, callback)
    }
  }

  on(event, callback) {
    return this.subscribe(event, callback)
  }

  off(event, callback) {
    return this.unsubscribe(event, callback)
  }

  unsubscribe(event, callback) {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit(event, data) {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err)
        }
      })
    }
  }
}

/* export */ const ERP_EVENTS = Object.freeze({
  ACADEMIC_UPDATED: 'ERP:ACADEMIC_UPDATED',
  ACADEMIC_YEAR_CHANGED: 'ERP:ACADEMIC_YEAR_CHANGED',
  STUDENT_UPDATED: 'ERP:STUDENT_UPDATED',
  PROMOTION_EXECUTED: 'ERP:PROMOTION_EXECUTED',
  ATTENDANCE_RECORDED: 'ERP:ATTENDANCE_RECORDED',
  RESULTS_RECORDED: 'ERP:RESULTS_RECORDED',
  LEAVE_UPDATED: 'ERP:LEAVE_UPDATED',
  PAYROLL_UPDATED: 'ERP:PAYROLL_UPDATED',
})

/* export */ const eventBus = new ERPEventBus()
/* export default eventBus */
// #endregion services/eventBus.js
return {
  get ERP_EVENTS() { return ERP_EVENTS; },
  get eventBus() { return eventBus; },
  get default() { return eventBus; }
};
})();

export const academicServiceModule = (() => {
const { getColleges } = collegeApiModule;
const { unwrapCollegeRecord } = collegeApiModule;
const { getDepartments } = collegeApiModule;
const { getCourses: getCoursesAcademic } = collegeApiModule;
const { getSemesters: getSemestersAcademic } = collegeApiModule;
const { academicYearApi } = apiEndpointsModule;
const { branchApi } = apiEndpointsModule;
const { courseApi } = apiEndpointsModule;
const { courseStructureApi } = apiEndpointsModule;
const { departmentApi } = apiEndpointsModule;
const { sectionApi } = apiEndpointsModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
/* Imports for isolated regression tests:
import {
  getColleges,
  unwrapCollegeRecord,
  getDepartments,
  getCourses as getCoursesAcademic,
  getSemesters as getSemestersAcademic,
} from '../auth/collegeApi'
import {
  academicYearApi,
  branchApi,
  courseApi,
  courseStructureApi,
  departmentApi,
  sectionApi,
} from '../api/apiEndpoints'
import eventBus, { ERP_EVENTS } from './eventBus'
*/
// #region services/academicService.js
/**
 * Academic Service
 * Centralizes academic hierarchy queries, active-only filters, caching,
 * and ID-to-entity resolution across the entire Digital Campus ERP.
 */

// Helper to determine active status across varied schemas
/* export */ const isRecordActive = (record) => {
  if (!record) return false
  const rawStatus = record.status ?? record.courseStatus ?? record.departmentStatus ?? record.academicYearStatus ?? record.state
  if (rawStatus !== undefined && rawStatus !== null && rawStatus !== '') {
    if (typeof rawStatus === 'boolean') return rawStatus
    if (typeof rawStatus === 'number') return rawStatus === 1
    const s = String(rawStatus).trim().toLowerCase()
    if (s === 'inactive' || s === '0' || s === 'false' || s === 'deactive' || s === 'deactivated' || s === 'disabled' || s === 'archived') return false
    if (s === 'active' || s === '1' || s === 'true' || s === 'current') return true
  }
  if (record.isActive !== undefined && record.isActive !== null) {
    if (typeof record.isActive === 'boolean') return record.isActive
    if (typeof record.isActive === 'number') return record.isActive === 1
    const s = String(record.isActive).trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'active'
  }
  if (record.is_active !== undefined && record.is_active !== null) {
    if (typeof record.is_active === 'boolean') return record.is_active
    if (typeof record.is_active === 'number') return record.is_active === 1
    const s = String(record.is_active).trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'active'
  }
  if (record.isCurrent !== undefined && record.isCurrent !== null) {
    return Boolean(record.isCurrent)
  }
  // Default to true if not specified
  return true
}

/* export */ const filterActiveOnly = (list) => {
  if (!Array.isArray(list)) return []
  return list.filter(isRecordActive)
}

class AcademicService {
  constructor() {
    this._cache = new Map()
    this._ttl = 30000 // 30 seconds

    // Invalidate cache on academic updates
    eventBus.subscribe(ERP_EVENTS.ACADEMIC_UPDATED, () => {
      this.clearCache()
    })
  }

  clearCache() {
    this._cache.clear()
  }

  async _fetchCached(key, fetcher) {
    const cached = this._cache.get(key)
    const now = Date.now()
    if (cached && now - cached.timestamp < this._ttl) {
      return cached.data
    }
    const data = await fetcher()
    if (!data?.loadError) this._cache.set(key, { data, timestamp: now })
    return data
  }

  // Colleges
  async getColleges(activeOnly = true) {
    const data = await this._fetchCached('colleges', async () => {
      try {
        const res = await getColleges()
        let raw = res?.data ?? res
        let list = []
        if (Array.isArray(raw)) {
          list = raw
        } else if (Array.isArray(raw?.colleges)) {
          list = raw.colleges
        } else if (Array.isArray(raw?.items)) {
          list = raw.items
        } else if (Array.isArray(raw?.records)) {
          list = raw.records
        } else if (Array.isArray(raw?.results)) {
          list = raw.results
        } else if (Array.isArray(raw?.data)) {
          list = raw.data
        } else if (raw && typeof raw === 'object' && (raw.id || raw.collegeId || raw.name || raw.collegeName)) {
          list = [raw]
        }

        const mapped = list.map(c => {
          const unwrapped = unwrapCollegeRecord(c)
          const id = String(unwrapped.collegeId ?? unwrapped.id ?? unwrapped.CollegeId ?? unwrapped.Id ?? '')
          const name = unwrapped.collegeName ?? unwrapped.name ?? unwrapped.CollegeName ?? unwrapped.institutionName ?? ''
          const code = unwrapped.collegeCode ?? unwrapped.code ?? unwrapped.CollegeCode ?? ''
          const status = unwrapped.status ?? unwrapped.collegeStatus ?? unwrapped.isActive ?? 'Active'
          return {
            ...unwrapped,
            id: id || name,
            collegeId: id || name,
            name,
            code,
            status,
          }
        }).filter(c => Boolean(c.name))

        return mapped
      } catch (err) {
        console.warn('Fallback loading colleges:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Academic Years
  async getAcademicYears(activeOnly = true) {
    const data = await this._fetchCached('academicYears', async () => {
      try {
        const list = await academicYearApi.getAll()
        const mapped = (Array.isArray(list) ? list : []).map(y => {
          const status = String(y.status ?? '').trim().toLowerCase()
          const start = y.startDate ? new Date(y.startDate) : null
          const end = y.endDate ? new Date(y.endDate) : null
          const today = new Date()
          const dateCurrent = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && today >= start && today <= end
          const isCurrent = Boolean(y.isCurrent || y.isActive === true || Number(y.isActive) === 1 || status === 'active' || status === 'current' || Number(y.status) === 1 || dateCurrent)
          return {
            ...y,
            id: String(y.academicYearId ?? y.id),
            academicYearId: String(y.academicYearId ?? y.id),
            name: y.academicYearName ?? y.name ?? '',
            academicYearName: y.academicYearName ?? y.name ?? '',
            startDate: y.startDate,
            endDate: y.endDate,
            status: isCurrent ? 'Active' : (y.status ?? 'Archived'),
            isCurrent,
          }
        }).filter(y => Boolean(y.name))

        return mapped.sort((a, b) => {
          if (a.isCurrent && !b.isCurrent) return -1
          if (!a.isCurrent && b.isCurrent) return 1
          return String(b.name || '').localeCompare(String(a.name || ''))
        })
      } catch (err) {
        console.warn('Fallback loading academic years:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Departments
  async getDepartments(activeOnly = true) {
    const data = await this._fetchCached('departments', async () => {
      try {
        let list = []
        try {
          const res = await getDepartments()
          list = res?.data?.data ?? res?.data ?? []
        } catch {
          list = await departmentApi.getAll()
        }
        return (Array.isArray(list) ? list : []).map(d => ({
          id: d.departmentId ?? d.id,
          departmentId: d.departmentId ?? d.id,
          name: d.departmentName ?? d.name ?? '',
          code: d.departmentCode ?? d.code ?? '',
          collegeId: d.collegeId,
          status: d.status,
          ...d
        }))
      } catch (err) {
        console.warn('Fallback loading departments:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Courses
  async getCourses(params = {}, activeOnly = true) {
    const cacheKey = `courses:${JSON.stringify(params)}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        try {
          const res = await getCoursesAcademic()
          list = res?.data?.data ?? res?.data ?? []
        } catch {
          list = await courseApi.getAll(params)
        }
        return (Array.isArray(list) ? list : []).map(c => ({
          id: c.courseId ?? c.id,
          courseId: c.courseId ?? c.id,
          name: c.courseName ?? c.name ?? '',
          code: c.courseCode ?? c.code ?? '',
          departmentId: c.departmentId,
          collegeId: c.collegeId,
          status: c.status,
          durationYears: c.durationYears,
          totalSemesters: c.totalSemesters,
          ...c
        }))
      } catch (err) {
        console.warn('Fallback loading courses:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Branches (Optionally filtered by courseId)
  async getBranches(courseId = null, activeOnly = true) {
    const cacheKey = `branches:${courseId || 'all'}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        if (courseId) {
          list = await branchApi.getByCourse(courseId)
        } else {
          list = await branchApi.getAll()
        }
        return (Array.isArray(list) ? list : []).map(b => ({
          id: b.branchId ?? b.id,
          branchId: b.branchId ?? b.id,
          name: b.branchName ?? b.name ?? '',
          code: b.branchCode ?? b.code ?? '',
          courseId: b.courseId,
          departmentId: b.departmentId,
          status: b.status,
          totalSemesters: b.totalSemesters,
          intakeCapacity: b.intakeCapacity,
          ...b
        }))
      } catch (err) {
        console.warn('Fallback loading branches:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Semesters / Course Structure (Optionally filtered by courseId)
  async getSemesters(courseId = null, activeOnly = true) {
    const cacheKey = `semesters:${courseId || 'all'}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        if (courseId) {
          list = await courseStructureApi.getByCourse(courseId)
        } else {
          try {
            const res = await getSemestersAcademic()
            list = res?.data?.data ?? res?.data ?? []
          } catch {
            list = await courseStructureApi.getAll()
          }
        }
        return (Array.isArray(list) ? list : []).map(s => ({
          id: s.semesterId ?? s.id ?? s.semesterNumber,
          semesterId: s.semesterId ?? s.id ?? s.semesterNumber,
          semesterNumber: s.semesterNumber ?? s.id,
          semesterName: s.semesterName ?? s.name ?? '',
          courseId: s.courseId,
          branchId: s.branchId,
          status: s.status,
          ...s
        }))
      } catch (err) {
        console.warn('Unable to load semesters:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Sections (Optionally filtered by params: { courseId, branchId, semesterId, academicYearId })
  async getSections(params = {}, activeOnly = true) {
    const cacheKey = `sections:${JSON.stringify(params)}`
    const data = await this._fetchCached(cacheKey, async () => {
      try {
        let list = []
        if (params && Object.keys(params).length > 0) {
          list = await sectionApi.search(params)
        } else {
          list = await sectionApi.getAll()
        }
        return (Array.isArray(list) ? list : []).map(sec => ({
          id: sec.sectionId ?? sec.id,
          sectionId: sec.sectionId ?? sec.id,
          name: sec.sectionName ?? sec.name ?? '',
          code: sec.sectionCode ?? sec.code ?? '',
          collegeId: sec.collegeId,
          academicYearId: sec.academicYearId,
          departmentId: sec.departmentId,
          courseId: sec.courseId,
          branchId: sec.branchId,
          semesterId: sec.semesterId,
          capacity: sec.capacity,
          status: sec.status,
          shift: sec.shift,
          room: sec.room ?? '',
          ...sec
        }))
      } catch (err) {
        console.warn('Fallback loading sections:', err)
        return Object.assign([], { loadError: true })
      }
    })
    return activeOnly ? filterActiveOnly(data) : data
  }

  // Resolve Names from IDs for consistent display across modules
  async resolveHierarchyNames(ids = {}) {
    const { collegeId, academicYearId, departmentId, courseId, branchId, semesterId, sectionId } = ids

    const [colleges, years, departments, courses, branches, semesters, sections] = await Promise.all([
      collegeId ? this.getColleges() : Promise.resolve([]),
      academicYearId ? this.getAcademicYears() : Promise.resolve([]),
      departmentId ? this.getDepartments() : Promise.resolve([]),
      courseId ? this.getCourses() : Promise.resolve([]),
      branchId ? this.getBranches(courseId) : Promise.resolve([]),
      semesterId ? this.getSemesters(courseId) : Promise.resolve([]),
      sectionId ? this.getSections() : Promise.resolve([]),
    ])

    const college = colleges.find(c => String(c.id) === String(collegeId))
    const academicYear = years.find(y => String(y.id) === String(academicYearId))
    const department = departments.find(d => String(d.id) === String(departmentId))
    const course = courses.find(c => String(c.id) === String(courseId))
    const branch = branches.find(b => String(b.id) === String(branchId))
    const semester = semesters.find(s => String(s.id) === String(semesterId) || String(s.semesterNumber) === String(semesterId))
    const section = sections.find(sec => String(sec.id) === String(sectionId))

    return {
      collegeName: college?.name || '',
      academicYearName: academicYear?.name || '',
      departmentName: department?.name || '',
      courseName: course?.name || '',
      branchName: branch?.name || '',
      semesterName: semester?.semesterName || '',
      sectionName: section?.name || '',
    }
  }
}

/* export */ const academicService = new AcademicService()
/* export default academicService */
// #endregion services/academicService.js
return {
  get isRecordActive() { return isRecordActive; },
  get filterActiveOnly() { return filterActiveOnly; },
  get academicService() { return academicService; },
  get default() { return academicService; }
};
})();

export const rolesModule = (() => {

/* Imports for isolated regression tests:

*/
// #region auth/roles.js
/* export */ const ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
}
// #endregion auth/roles.js
return {
  get ROLES() { return ROLES; }
};
})();

export const subjectServiceModule = (() => {
const { collegeStorageKey } = collegeScopeModule;
const { courseApi } = apiEndpointsModule;
const { branchApi } = apiEndpointsModule;
const { departmentApi } = apiEndpointsModule;
const { facultyMasterApi } = apiEndpointsModule;
const { subjectApi } = apiEndpointsModule;
const { mapApiSubject } = subjectApiDataModule;
const { subjectApiPayload } = subjectApiDataModule;
/* Imports for isolated regression tests:
import { collegeStorageKey } from '../utils/collegeScope.js'
import { courseApi, branchApi, departmentApi, facultyMasterApi, subjectApi } from '../api/apiEndpoints'
import { mapApiSubject, subjectApiPayload } from '../utils/subjectApiData'
*/
// #region services/subjectService.js
/* =========================================================
   LOCAL STORAGE KEYS
========================================================= */

const LOCAL_SUBJECTS_KEY = 'pirnav-academic-subjects-v1'
const LOCAL_CREDITS_KEY = 'pirnav-academic-credits-v1'
const LOCAL_ELECTIVES_KEY = 'pirnav-academic-electives-v1'
const LOCAL_ALLOCATIONS_KEY = 'pirnav-elective-allocations-v1'
const LOCAL_STUDENT_CREDITS_KEY = 'pirnav-student-credits-v1'
const LOCAL_CREDIT_CONFIG_KEY = 'pirnav-credit-configurations-v1'
const LOCAL_CREDIT_VALIDATION_KEY = 'pirnav-credit-validations-v1'


/* =========================================================
   INITIAL SUBJECT DATA
========================================================= */

const initialSubjects = []

const initialCreditStructure = {
  totalProgramCredits: 160,
  minCreditsPerSemester: 18,
  maxCreditsPerSemester: 26,
  defaultSemesterCredits: 20,
  categories: [],
  semesterBreakdown: [],
}

const initialElectiveGroups = []

const initialStudentAllocations = []

const getLocalData = (key, fallback) => {
  try {
    const stored = localStorage.getItem(collegeStorageKey(key))

    if (stored) {
      return JSON.parse(stored)
    }

    localStorage.setItem(collegeStorageKey(key), JSON.stringify(fallback))

    return fallback
  } catch {
    return fallback
  }
}


const saveLocalData = (key, data) => {
  localStorage.setItem(collegeStorageKey(key), JSON.stringify(data))
  return data
}


const normalize = value =>
  String(value ?? '')
    .trim()
    .toLowerCase()


const sumCredits = items =>
  items.reduce(
    (total, item) => total + Number(item.credits || 0),
    0
  )


/* =========================================================
   SUBJECT SERVICE
========================================================= */

/* export */ const subjectService = {

  /* =======================================================
     SUBJECT CRUD
  ======================================================= */

  getSubjects: async (params = {}) => {
    // Live consumers must not count the seeded local catalog.
    if (params.liveOnly) {
      const query = { ...params }
      delete query.liveOnly
      return (await subjectApi.list(query)).map(mapApiSubject)
    }
    try {
      let list = getLocalData(
        LOCAL_SUBJECTS_KEY,
        initialSubjects
      )

      if (params.search) {
        const query = normalize(params.search)

        list = list.filter(item =>
          normalize(item.subjectCode).includes(query) ||
          normalize(item.subjectName).includes(query) ||
          normalize(item.shortName).includes(query) ||
          normalize(item.department).includes(query)
        )
      }

      if (
        params.department &&
        params.department !== 'All Departments'
      ) {
        list = list.filter(
          item =>
            item.department === params.department ||
            item.departmentId === params.department
        )
      }

      if (
        params.branch &&
        params.branch !== 'All Branches'
      ) {
        list = list.filter(
          item =>
            item.branch === params.branch ||
            item.branchId === params.branch ||
            item.branch === 'All Branches'
        )
      }

      if (
        params.semester &&
        params.semester !== 'All Semesters'
      ) {
        list = list.filter(
          item =>
            item.semester === params.semester ||
            item.semesterId === params.semester
        )
      }

      if (
        params.subjectType &&
        params.subjectType !== 'All Types'
      ) {
        list = list.filter(
          item => item.subjectType === params.subjectType
        )
      }

      return list
    } catch {
      return initialSubjects
    }
  },

  searchSubjects: async params => (await subjectApi.search(params)).map(mapApiSubject),

  getSubject: async id => mapApiSubject(await subjectApi.getById(id)),

  getSubjectSummary: params => subjectApi.summary(params),

  getSubjectLookups: () => subjectApi.lookups(),

  getSubjectDependencies: id => subjectApi.dependencies(id),

  exportSubjects: params => subjectApi.export(params),

  downloadSubjects: params => subjectApi.download(params),


  /* =======================================================
     CREATE SUBJECT
  ======================================================= */

  createSubject: async payload => {
    return mapApiSubject(await subjectApi.create(subjectApiPayload(payload)))
  },


  /* =======================================================
     UPDATE SUBJECT
  ======================================================= */

  updateSubject: async (id, payload) => {
    return mapApiSubject(await subjectApi.update(id, subjectApiPayload(payload)))
  },

  updateSubjectStatus: async (id, status) => {
    await subjectApi.updateStatus(id, status)
    return { id, status }
  },


  /* =======================================================
     DELETE SUBJECT
  ======================================================= */

  deleteSubject: async id => {
    if (id !== undefined && id !== null) return subjectApi.remove(id)
    const list = getLocalData(
      LOCAL_SUBJECTS_KEY,
      initialSubjects
    )

    const filtered = list.filter(
      item =>
        String(item.id) !== String(id) &&
        String(item.subjectCode) !== String(id)
    )

    saveLocalData(
      LOCAL_SUBJECTS_KEY,
      filtered
    )

    return true
  },


  /* =======================================================
     CBCS - CREDIT STRUCTURE
  ======================================================= */

  getCreditStructure: async () => {
    return getLocalData(
      LOCAL_CREDITS_KEY,
      initialCreditStructure
    )
  },


  updateCreditStructure: async payload => {
    saveLocalData(
      LOCAL_CREDITS_KEY,
      payload
    )

    return payload
  },


  /* =======================================================
     CBCS - SUBJECT CREDIT CONFIGURATION
  ======================================================= */

  getCreditConfigurations: async (params = {}) => {

    const subjects = await subjectService.getSubjects()

    let configurations = subjects.map(subject => ({
      id: subject.id,

      subjectCode: subject.subjectCode,

      subjectName: subject.subjectName,

      department: subject.department,

      departmentId: subject.departmentId,

      course: subject.course,

      courseId: subject.courseId,

      branch: subject.branch,

      branchId: subject.branchId,

      semester: subject.semester,

      semesterId: subject.semesterId,

      academicYear: subject.academicYear,

      subjectType: subject.subjectType,

      category: subject.category,

      credits: Number(subject.credits || 0),

      lectureHours: Number(
        subject.lectureHours || 0
      ),

      tutorialHours: Number(
        subject.tutorialHours || 0
      ),

      practicalHours: Number(
        subject.practicalHours || 0
      ),

      status: subject.status,

      facultyName: subject.facultyName,
    }))


    if (params.department) {
      configurations = configurations.filter(
        item =>
          item.department === params.department ||
          item.departmentId === params.department
      )
    }


    if (params.branch) {
      configurations = configurations.filter(
        item =>
          item.branch === params.branch ||
          item.branchId === params.branch ||
          item.branch === 'All Branches'
      )
    }


    if (params.semester) {
      configurations = configurations.filter(
        item =>
          item.semester === params.semester ||
          item.semesterId === params.semester
      )
    }


    if (params.category) {
      configurations = configurations.filter(
        item =>
          item.category === params.category
      )
    }


    return configurations
  },


  /* =======================================================
     CONFIGURE SUBJECT CREDITS
  ======================================================= */

  configureSubjectCredit: async payload => {

    const subjects = getLocalData(
      LOCAL_SUBJECTS_KEY,
      initialSubjects
    )

    const index = subjects.findIndex(
      item =>
        String(item.id) === String(payload.subjectId) ||
        normalize(item.subjectCode) ===
          normalize(payload.subjectCode)
    )

    if (index === -1) {
      throw new Error(
        'Subject not found.'
      )
    }


    const credits = Number(
      payload.credits
    )

    if (credits < 0) {
      throw new Error(
        'Credits cannot be negative.'
      )
    }


    subjects[index] = {
      ...subjects[index],

      credits,

      category:
        payload.category ??
        subjects[index].category,

      subjectType:
        payload.subjectType ??
        subjects[index].subjectType,

      updatedAt:
        new Date().toISOString(),

      updatedBy:
        payload.updatedBy ||
        'Admin',
    }


    saveLocalData(
      LOCAL_SUBJECTS_KEY,
      subjects
    )


    return subjects[index]
  },


  /* =======================================================
     UPDATE CREDIT CONFIGURATION
  ======================================================= */

  updateCreditConfiguration: async (
    id,
    payload
  ) => {

    return subjectService.configureSubjectCredit({
      ...payload,
      subjectId: id,
    })
  },


  /* =======================================================
     CBCS - STUDENT CREDIT REGISTRATION
  ======================================================= */

  getStudentCredits: async (
    studentId = null
  ) => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )

    if (!studentId) {
      return records
    }

    return records.filter(
      item =>
        String(item.studentId) ===
        String(studentId)
    )
  },


  /* =======================================================
     REGISTER STUDENT CREDIT
  ======================================================= */

  registerStudentCredit: async payload => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )


    const duplicate = records.some(
      item =>
        normalize(item.studentId) ===
          normalize(payload.studentId) &&
        normalize(item.subjectCode) ===
          normalize(payload.subjectCode) &&
        normalize(item.academicYear) ===
          normalize(payload.academicYear) &&
        normalize(item.semester) ===
          normalize(payload.semester)
    )


    if (duplicate) {
      throw new Error(
        'Student is already registered for this subject in the selected semester.'
      )
    }


    const subjectList =
      await subjectService.getSubjects()


    const subject = subjectList.find(
      item =>
        normalize(item.subjectCode) ===
        normalize(payload.subjectCode)
    )


    if (!subject) {
      throw new Error(
        'Subject code does not exist.'
      )
    }


    const newRecord = {

      id:
        `SC-${Date.now().toString().slice(-6)}`,

      studentId:
        payload.studentId,

      studentName:
        payload.studentName || '',

      department:
        payload.department ||
        subject.department,

      departmentId:
        payload.departmentId ||
        subject.departmentId,

      course:
        payload.course ||
        subject.course,

      courseId:
        payload.courseId ||
        subject.courseId,

      branch:
        payload.branch ||
        subject.branch,

      branchId:
        payload.branchId ||
        subject.branchId,

      semester:
        payload.semester ||
        subject.semester,

      semesterId:
        payload.semesterId ||
        subject.semesterId,

      academicYear:
        payload.academicYear ||
        subject.academicYear,

      subjectCode:
        subject.subjectCode,

      subjectName:
        subject.subjectName,

      category:
        subject.category,

      credits:
        Number(subject.credits || 0),

      status:
        payload.status ||
        'Registered',

      grade:
        payload.grade || null,

      attemptNo:
        Number(payload.attemptNo || 1),

      registeredAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    }


    records.unshift(newRecord)


    saveLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      records
    )


    return newRecord
  },


  /* =======================================================
     UPDATE STUDENT CREDIT
  ======================================================= */

  updateStudentCredit: async (
    id,
    payload
  ) => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )


    const index = records.findIndex(
      item =>
        String(item.id) ===
        String(id)
    )


    if (index === -1) {
      throw new Error(
        'Student credit record not found.'
      )
    }


    records[index] = {

      ...records[index],

      ...payload,

      credits:
        payload.credits !== undefined
          ? Number(payload.credits)
          : records[index].credits,

      updatedAt:
        new Date().toISOString(),
    }


    saveLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      records
    )


    return records[index]
  },


  /* =======================================================
     DELETE STUDENT CREDIT
  ======================================================= */

  deleteStudentCredit: async id => {

    const records = getLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      []
    )


    const filtered =
      records.filter(
        item =>
          String(item.id) !==
          String(id)
      )


    saveLocalData(
      LOCAL_STUDENT_CREDITS_KEY,
      filtered
    )


    return true
  },


  /* =======================================================
     SEMESTER CREDIT SUMMARY
  ======================================================= */

  getSemesterCreditSummary: async studentId => {

    const records =
      await subjectService.getStudentCredits(
        studentId
      )


    const grouped = {}


    records.forEach(record => {

      const semester =
        record.semester ||
        'Unknown'


      if (!grouped[semester]) {

        grouped[semester] = {

          semester,

          registeredCredits: 0,

          earnedCredits: 0,

          failedCredits: 0,

          backlogCredits: 0,

          subjectCount: 0,

          subjects: [],
        }
      }


      const credits =
        Number(record.credits || 0)


      grouped[semester]
        .registeredCredits += credits


      grouped[semester]
        .subjectCount += 1


      grouped[semester]
        .subjects.push(record)


      const status =
        normalize(record.status)


      if (
        status === 'completed' ||
        status === 'passed' ||
        status === 'earned'
      ) {

        grouped[semester]
          .earnedCredits += credits

      }


      if (
        status === 'failed'
      ) {

        grouped[semester]
          .failedCredits += credits

      }


      if (
        status === 'backlog'
      ) {

        grouped[semester]
          .backlogCredits += credits

      }

    })


    return Object.values(grouped)
  },


  /* =======================================================
     OVERALL STUDENT CREDIT SUMMARY
  ======================================================= */

  getStudentCreditSummary: async studentId => {

    const records =
      await subjectService.getStudentCredits(
        studentId
      )


    const creditStructure =
      await subjectService.getCreditStructure()


    const registeredCredits =
      sumCredits(records)


    const earnedCredits =
      records.reduce(
        (total, record) => {

          const status =
            normalize(record.status)

          if (
            status === 'completed' ||
            status === 'passed' ||
            status === 'earned'
          ) {

            return (
              total +
              Number(record.credits || 0)
            )

          }

          return total
        },
        0
      )


    const failedCredits =
      records
        .filter(
          record =>
            normalize(record.status) ===
            'failed'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const backlogCredits =
      records
        .filter(
          record =>
            normalize(record.status) ===
            'backlog'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const requiredCredits =
      Number(
        creditStructure.totalProgramCredits ||
        0
      )


    const remainingCredits =
      Math.max(
        requiredCredits -
          earnedCredits,
        0
      )


    const progress =
      requiredCredits > 0
        ? Number(
            (
              (earnedCredits /
                requiredCredits) *
              100
            ).toFixed(2)
          )
        : 0


    let status = 'On Track'


    if (
      registeredCredits >
      Number(
        creditStructure.maxCreditsPerSemester ||
        26
      )
    ) {
      status = 'Overload'
    }


    if (
      remainingCredits >
      0 &&
      earnedCredits <
        requiredCredits
    ) {
      status = 'Credit Shortage'
    }


    if (
      failedCredits > 0 ||
      backlogCredits > 0
    ) {
      status = 'Backlog'
    }


    return {

      studentId,

      requiredCredits,

      registeredCredits,

      earnedCredits,

      remainingCredits,

      failedCredits,

      backlogCredits,

      progress,

      status,

      totalSubjects:
        records.length,

      semesterSummary:
        await subjectService
          .getSemesterCreditSummary(
            studentId
          ),
    }
  },


  /* =======================================================
     CREDIT DASHBOARD
  ======================================================= */

  getCreditDashboard: async () => {

    const subjects =
      await subjectService.getSubjects()


    const studentCredits =
      await subjectService.getStudentCredits()


    const creditStructure =
      await subjectService.getCreditStructure()


    const totalSubjects =
      subjects.length


    const totalCreditsConfigured =
      sumCredits(subjects)


    const uniqueStudents =
      [
        ...new Set(
          studentCredits.map(
            item => item.studentId
          )
        ),
      ]


    const totalStudents =
      uniqueStudents.length


    const completedCredits =
      studentCredits
        .filter(record => {

          const status =
            normalize(record.status)

          return (
            status === 'completed' ||
            status === 'passed' ||
            status === 'earned'
          )
        })
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const backlogCredits =
      studentCredits
        .filter(
          record =>
            normalize(record.status) ===
            'backlog'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    const failedCredits =
      studentCredits
        .filter(
          record =>
            normalize(record.status) ===
            'failed'
        )
        .reduce(
          (total, record) =>
            total +
            Number(record.credits || 0),
          0
        )


    /* -------------------------------------------------------
       CATEGORY-WISE CREDIT MONITORING
    ------------------------------------------------------- */

    const categoryMap = {}


    subjects.forEach(subject => {

      const category =
        subject.category ||
        'Uncategorized'


      if (!categoryMap[category]) {

        categoryMap[category] = {

          category,

          subjectCount: 0,

          totalCredits: 0,

        }
      }


      categoryMap[category]
        .subjectCount += 1


      categoryMap[category]
        .totalCredits +=
          Number(subject.credits || 0)

    })


    const categoryBreakdown =
      Object.values(categoryMap)


    /* -------------------------------------------------------
       SEMESTER-WISE CREDIT MONITORING
    ------------------------------------------------------- */

    const semesterMap = {}


    subjects.forEach(subject => {

      const semester =
        subject.semester ||
        'Unknown'


      if (!semesterMap[semester]) {

        semesterMap[semester] = {

          semester,

          subjectCount: 0,

          totalCredits: 0,

        }
      }


      semesterMap[semester]
        .subjectCount += 1


      semesterMap[semester]
        .totalCredits +=
          Number(subject.credits || 0)

    })


    const semesterBreakdown =
      Object.values(semesterMap)


    /* -------------------------------------------------------
       DUPLICATE SUBJECT VALIDATION
    ------------------------------------------------------- */

    const subjectCodeMap = {}


    subjects.forEach(subject => {

      const code =
        normalize(subject.subjectCode)


      if (!code) return


      if (!subjectCodeMap[code]) {

        subjectCodeMap[code] = []
      }


      subjectCodeMap[code].push(subject)

    })


    const duplicateSubjects =
      Object.values(subjectCodeMap)
        .filter(group => group.length > 1)


    /* -------------------------------------------------------
       INVALID CREDIT CONFIGURATION
    ------------------------------------------------------- */

    const invalidCreditConfigurations =
      subjects.filter(subject => {

        const credits =
          Number(subject.credits)


        return (
          !subject.subjectCode ||
          !subject.subjectName ||
          Number.isNaN(credits) ||
          credits < 0
        )
      })


    return {

      totalSubjects,

      totalCreditsConfigured,

      totalStudents,

      registeredCreditRecords:
        studentCredits.length,

      completedCredits,

      backlogCredits,

      failedCredits,

      duplicateSubjects:
        duplicateSubjects.length,

      invalidCreditConfigurations:
        invalidCreditConfigurations.length,

      categoryBreakdown,

      semesterBreakdown,

      creditStructure,

      alerts: {

        creditShortage:
          studentCredits.filter(
            record =>
              normalize(record.status) ===
                'backlog' ||
              normalize(record.status) ===
                'failed'
          ).length,

        duplicateSubjects:
          duplicateSubjects.length,

        invalidConfigurations:
          invalidCreditConfigurations.length,

        inactiveSubjects:
          subjects.filter(
            item =>
              normalize(item.status) !==
              'active'
          ).length,
      },
    }
  },


  /* =======================================================
     CREDIT VALIDATION
  ======================================================= */

  validateCredits: async () => {

    const subjects =
      await subjectService.getSubjects()


    const studentCredits =
      await subjectService.getStudentCredits()


    const duplicateSubjectCodes = []


    const subjectCodeMap = {}


    subjects.forEach(subject => {

      const code =
        normalize(subject.subjectCode)


      if (!code) return


      if (!subjectCodeMap[code]) {

        subjectCodeMap[code] = []
      }


      subjectCodeMap[code].push(subject)

    })


    Object.entries(
      subjectCodeMap
    ).forEach(
      ([code, items]) => {

        if (items.length > 1) {

          duplicateSubjectCodes.push({

            code,

            records: items,

          })

        }

      }
    )


    /* -------------------------------------------------------
       INVALID SUBJECT MAPPINGS
    ------------------------------------------------------- */

    const invalidMappings =
      subjects.filter(subject => {

        return (
          !subject.subjectCode ||
          !subject.subjectName ||
          !subject.course ||
          !subject.branch ||
          !subject.semester ||
          !subject.academicYear
        )

      })


    /* -------------------------------------------------------
       DUPLICATE STUDENT REGISTRATIONS
    ------------------------------------------------------- */

    const registrationMap = {}


    studentCredits.forEach(record => {

      const key = [

        normalize(record.studentId),

        normalize(record.subjectCode),

        normalize(record.semester),

        normalize(record.academicYear),

      ].join('|')


      if (!registrationMap[key]) {

        registrationMap[key] = []
      }


      registrationMap[key].push(record)

    })


    const duplicateStudentRegistrations =
      Object.values(
        registrationMap
      ).filter(
        records =>
          records.length > 1
      )


    const result = {

      valid:
        duplicateSubjectCodes.length === 0 &&
        invalidMappings.length === 0 &&
        duplicateStudentRegistrations.length === 0,

      duplicateSubjectCodes,

      invalidMappings,

      duplicateStudentRegistrations,

      totalIssues:
        duplicateSubjectCodes.length +
        invalidMappings.length +
        duplicateStudentRegistrations.length,

      validatedAt:
        new Date().toISOString(),
    }


    saveLocalData(
      LOCAL_CREDIT_VALIDATION_KEY,
      result
    )


    return result
  },


  /* =======================================================
     GET LAST VALIDATION RESULT
  ======================================================= */

  getCreditValidation: async () => {

    return getLocalData(
      LOCAL_CREDIT_VALIDATION_KEY,
      {
        valid: true,

        duplicateSubjectCodes: [],

        invalidMappings: [],

        duplicateStudentRegistrations: [],

        totalIssues: 0,

        validatedAt: null,
      }
    )
  },


  /* =======================================================
     ELECTIVE MANAGEMENT
  ======================================================= */

  getElectiveGroups: async () => {

    return getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )
  },


  createElectiveGroup: async payload => {

    const list = getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )


    const newGroup = {

      ...payload,

      id:
        `ELG-${Date.now().toString().slice(-4)}`,

      enrolledStudents: 0,

      status:
        payload.status || 'Open',

      subjects:
        payload.subjects || [],
    }


    list.unshift(newGroup)


    saveLocalData(
      LOCAL_ELECTIVES_KEY,
      list
    )


    return newGroup
  },


  updateElectiveGroup: async (
    id,
    payload
  ) => {

    const list = getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )


    const index =
      list.findIndex(
        item =>
          String(item.id) ===
            String(id) ||
          String(item.groupCode) ===
            String(id)
      )


    if (index >= 0) {

      list[index] = {

        ...list[index],

        ...payload,

      }


      saveLocalData(
        LOCAL_ELECTIVES_KEY,
        list
      )


      return list[index]
    }


    return payload
  },


  deleteElectiveGroup: async id => {

    const list = getLocalData(
      LOCAL_ELECTIVES_KEY,
      initialElectiveGroups
    )


    const filtered =
      list.filter(
        item =>
          String(item.id) !==
            String(id) &&
          String(item.groupCode) !==
            String(id)
      )


    saveLocalData(
      LOCAL_ELECTIVES_KEY,
      filtered
    )


    return true
  },


  /* =======================================================
     STUDENT ELECTIVE ALLOCATIONS
  ======================================================= */

  getStudentAllocations: async () => {

    return getLocalData(
      LOCAL_ALLOCATIONS_KEY,
      initialStudentAllocations
    )
  },


  createAllocation: async payload => {

    const list = getLocalData(
      LOCAL_ALLOCATIONS_KEY,
      initialStudentAllocations
    )


    const newAlloc = {

      ...payload,

      id:
        `AL-${Date.now().toString().slice(-4)}`,

      allocationDate:
        new Date()
          .toISOString()
          .slice(0, 10),

      status: 'Allocated',
    }


    list.unshift(newAlloc)


    saveLocalData(
      LOCAL_ALLOCATIONS_KEY,
      list
    )


    return newAlloc
  },


  removeAllocation: async id => {

    const list = getLocalData(
      LOCAL_ALLOCATIONS_KEY,
      initialStudentAllocations
    )


    const filtered =
      list.filter(
        item =>
          String(item.id) !==
          String(id)
      )


    saveLocalData(
      LOCAL_ALLOCATIONS_KEY,
      filtered
    )


    return true
  },
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

/* export default subjectService */
// #endregion services/subjectService.js
return {
  get subjectService() { return subjectService; },
  get default() { return subjectService; }
};
})();

export const facultyContractsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region services/facultyContracts.js
// A stable UI identifier, derived from the faculty primary key, not a FAC sequence.
// Never send this display code back as an API identifier.
/* export */ const facultyEmployeeCode = facultyId => {
  const id = String(facultyId ?? '').trim()
  const suffix = /^[1-9]\d*$/.test(id) ? `EMP${id.padStart(6, '0')}`
    : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? `EMP-${id.toUpperCase()}` : ''
  return suffix
}

// Payloads follow the Faculty Swagger DTOs; UI labels never substitute for IDs.
// Never substitute a display label (or a made-up value) for an API foreign
// key. Swagger accepts numeric IDs for these fields; sending `NaN`, a label,
// or the old fallback value of `1` creates allocations against the wrong
// master record.
const optionalNumber = value => {
  if (value === '' || value == null) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}
/* export */ const requiredNumber = (value, label) => {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${label} is required. Select a valid record.`)
  return number
}
/* export */ const facultyCreatePayload = value => {
  const payload = {
    employeeProfileId: optionalNumber(value.employeeProfileId),
    collegeId: requiredNumber(value.collegeId, 'College'),
    departmentId: requiredNumber(value.departmentId, 'Department'),
    // Compatibility with the deployed API: FacultyCode is still required.
    // This hidden reference is not the employee ID or a browser-side sequence.
    facultyCode: crypto.randomUUID().replaceAll('-', ''),
    facultyName: (value.fullName || value.facultyName || '').trim(),
    designation: value.designation || null,
    qualification: value.qualification || null,
    specialization: value.specialization || null,
    experienceYears: Number(value.experience) || 0,
    employmentType: value.employmentType,
    dateOfJoining: value.joiningDate || null,
    officialEmail: (value.email || value.officialEmail || '').trim(),
    mobile: (value.mobile || '').trim(),
    isHod: Number(value.isHod) || 0,
    status: typeof value.status === 'number' ? value.status : 1,
  }
  const uid = optionalNumber(value.userId)
  if (uid) payload.userId = uid
  return payload
}
/* export */ const facultyUpdatePayload = value => {
  const [firstName, ...lastName] = (value.fullName || value.facultyName || '').trim().split(/\s+/)
  const deptId = optionalNumber(value.departmentId) || (Number.isSafeInteger(Number(value.departmentId)) && Number(value.departmentId) > 0 ? Number(value.departmentId) : null)
  const colId = optionalNumber(value.collegeId) || (Number.isSafeInteger(Number(value.collegeId)) && Number(value.collegeId) > 0 ? Number(value.collegeId) : null)
  const empProfileId = optionalNumber(value.employeeProfileId)
  const uid = optionalNumber(value.userId)

  const payload = {
    collegeId: colId,
    departmentId: deptId || requiredNumber(value.departmentId, 'Department'),
    facultyName: (value.fullName || value.facultyName || '').trim(),
    fullName: (value.fullName || value.facultyName || '').trim(),
    firstName,
    lastName: lastName.join(' '),
    officialEmail: (value.email || value.officialEmail || '').trim(),
    email: (value.email || value.officialEmail || '').trim(),
    mobile: (value.mobile || value.phoneNumber || '').trim(),
    phoneNumber: (value.mobile || value.phoneNumber || '').trim(),
    designation: value.designation || null,
    qualification: value.qualification || null,
    specialization: value.specialization || null,
    experienceYears: Number(value.experience) || 0,
    employmentType: value.employmentType || null,
    dateOfJoining: value.joiningDate || null,
    isHod: Number(value.isHod) || 0,
    status: typeof value.status === 'number' ? value.status : (value.employmentStatus === 'Inactive' ? 0 : 1),
  }
  if (uid) payload.userId = uid
  if (empProfileId) payload.employeeProfileId = empProfileId

  return payload
}
/* export */ const facultyProfilePayload = value => ({
  dateOfBirth: value.dob || null, gender: value.gender || null,
  houseNumber: value.houseNumber || null, address: value.address || null, pincode: value.pincode || null,
  city: value.city || null, district: value.district || null, state: value.state || null, country: value.country || null,
  permanentHouseNumber: value.permanentHouseNumber || null, permanentAddress: value.permanentAddress || null,
  permanentPincode: value.permanentPincode || null, permanentCity: value.permanentCity || null,
  permanentDistrict: value.permanentDistrict || null, permanentState: value.permanentState || null,
  permanentCountry: value.permanentCountry || null, aboutMe: value.aboutMe || null,
  emergencyContactName: value.emergencyName || null, emergencyContactNumber: value.emergencyMobile || null,
  emergencyContactRelation: value.relationship || null, status: typeof value.profileStatus === 'number' ? value.profileStatus : 1,
})
/* export */ const normalizeAllocation = row => {
  const r = row || {}
  return {
    ...r,
    id: String(r.allocationId ?? r.facultySubjectAllocationId ?? r.id ?? ''),
    facultyId: String(r.facultyId ?? r.employeeProfileId ?? ''),
    academicYear: r.academicYearName ?? r.academicYear ?? '',
    course: r.courseName ?? r.course ?? '',
    branch: r.branchName ?? r.branch ?? '',
    semester: r.semesterName ?? r.semester ?? '',
    section: r.sectionName ?? r.section ?? '',
    subjectCode: r.subjectCode ?? r.code ?? '',
    subjectName: r.subjectName ?? r.name ?? r.subject ?? '',
    assignmentType: r.allocationType ?? r.assignmentType ?? 'Subject Faculty',
    weeklyHours: r.periodsPerWeek ?? r.weeklyHours ?? 0,
    remarks: r.remarks ?? '',
  }
}
/* export */ const allocationPayload = (row, updating = false) => {
  const facultyId = requiredNumber(row.facultyId, 'Faculty')
  const courseId = requiredNumber(row.courseId, 'Course')
  const branchId = requiredNumber(row.branchId, 'Branch')
  const semesterId = requiredNumber(row.semesterId, 'Semester')
  return {
    facultyId,
    courseId,
    branchId,
    semesterId,
    sectionId: optionalNumber(row.sectionId),
    subjectId: optionalNumber(row.subjectId),
    academicYearId: optionalNumber(row.academicYearId),
    allocationType: row.assignmentType || row.allocationType || 'Subject Faculty',
    isPrimaryFaculty: Boolean(row.isPrimaryFaculty),
    remarks: row.remarks || null,
    ...(updating ? { periodsPerWeek: Number(row.weeklyHours) || 0, status: row.status !== false } : {}),
  }
}
/* export */ const attendanceTime = (date, value) => !value || value === '-' ? null : value.includes('T') ? value : `${date}T${value.length === 5 ? `${value}:00` : value}`
/* export */ const attendancePayload = row => ({ attendanceDate: row.date, status: row.status, checkIn: attendanceTime(row.date, row.checkIn), checkOut: attendanceTime(row.date, row.checkOut), remarks: row.remarks || null })
const leaveStatus = (value, fallback = '') => {
  if (value === true || value === 1) return 'Active'
  if (value === false || value === 0) return 'Inactive'
  const text = String(value ?? '').trim()
  return ({ active: 'Active', inactive: 'Inactive', draft: 'Draft', expired: 'Expired', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', canceled: 'Cancelled' })[text.toLowerCase()] || text || fallback
}
/* export */ const normalizeLeaveType = row => ({ ...row, id: String(row.id ?? row.leaveTypeId ?? ''), name: row.name ?? row.leaveTypeName ?? '', code: row.code ?? row.leaveCode ?? row.leaveTypeCode ?? '', status: leaveStatus(row.status ?? row.isActive, 'Active'), payCategory: row.payCategory ?? row.payType ?? (row.isPaid === true ? 'Paid Leave' : row.isPaid === false ? 'Unpaid Leave' : '') })
const policyEntitlements = row => {
  // Some policy list DTOs name the child collection after the relationship.
  const candidates = [row.entitlements, row.policyEntitlements, row.leaveTypes]
  return candidates.find(value => Array.isArray(value) && value.length) ?? []
}
const optionalLeaveDays = value => {
  if (value === '' || value == null) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) throw new Error('Leave days must be a non-negative number.')
  return number
}
/* export */ const normalizeLeavePolicy = row => ({ ...row, id: String(row.policyId ?? row.id ?? ''), name: row.name ?? row.policyName ?? '', academicYear: row.academicYearName ?? row.academicYear ?? '', status: leaveStatus(row.status ?? row.isActive), from: String(row.fromDate ?? row.from ?? '').slice(0, 10), to: String(row.toDate ?? row.to ?? '').slice(0, 10), entitlements: policyEntitlements(row).map(rule => ({ ...rule, typeId: String(rule.leaveTypeId ?? rule.typeId ?? rule.leaveType?.id ?? ''), name: rule.leaveTypeName ?? rule.name ?? rule.leaveType?.name ?? '', code: rule.leaveTypeCode ?? rule.code ?? rule.leaveType?.code ?? '', payCategory: rule.payCategory ?? rule.leaveType?.payCategory ?? '' })) })
/* export */ const normalizeLeaveRequest = row => ({ ...row, id: String(row.leaveRequestId ?? row.requestId ?? row.id ?? ''), status: leaveStatus(row.statusName ?? row.requestStatus ?? row.status), facultyId: String(row.facultyId ?? row.employeeProfileId ?? row.facultyProfileId ?? row.employee?.facultyId ?? row.employee?.employeeProfileId ?? row.employee?.id ?? row.faculty?.facultyId ?? row.faculty?.employeeProfileId ?? row.faculty?.id ?? ''), policyId: String(row.policyId ?? ''), typeId: String(row.leaveTypeId ?? row.typeId ?? ''), from: String(row.fromDate ?? row.from ?? '').slice(0, 10), to: String(row.toDate ?? row.to ?? '').slice(0, 10), applied: row.appliedOn ?? row.appliedDate ?? row.applied ?? row.createdAt, days: row.days == null && row.totalDays == null ? null : Number(row.days ?? row.totalDays) })
/* export */ const leavePolicyPayload = row => ({ name: row.name.trim(), academicYear: row.academicYear, applicableTo: row.applicableTo, fromDate: row.from, toDate: row.to, entitlements: row.entitlements.map(rule => ({ leaveTypeId: rule.typeId, entitlement: optionalLeaveDays(rule.entitlement), maxDays: optionalLeaveDays(rule.maxDays), carryForward: Boolean(rule.carryForward), maxCarryForward: optionalLeaveDays(rule.maxCarryForward), documentRequired: Boolean(rule.documentRequired) })) })
const calculateFacultySalary = (row, designation, type) => {
  const isNonTeaching = String(type || '').toLowerCase().includes('non-teaching');
  const desig = String(designation || '').toLowerCase();
  if (isNonTeaching) return { gross: 35000, deductions: 3500 };
  if (desig.includes('hod') || desig.includes('head') || (desig.includes('professor') && !desig.includes('assistant') && !desig.includes('associate'))) {
    return { gross: 120000, deductions: 12000 };
  }
  if (desig.includes('associate')) {
    return { gross: 85000, deductions: 8500 };
  }
  if (desig.includes('assistant') || desig.includes('senior')) {
    return { gross: 65000, deductions: 6500 };
  }
  return { gross: 50000, deductions: 5000 };
};

/* export */ const normalizePayroll = row => {
  const id = String(row.payrollId ?? row.id ?? '');
  const facultyId = row.facultyId ?? row.faculty?.facultyId ?? row.faculty?.id;
  const directEmployeeId = row.employeeId ?? row.employeeCode ?? '';
  const employeeId = facultyEmployeeCode(facultyId) || (directEmployeeId ? String(directEmployeeId) : '');
  const fullName = row.fullName ?? row.facultyName ?? row.employeeName ?? '';
  const designation = row.designation ?? row.designationName ?? row.role ?? '';
  const type = row.facultyType ?? row.employeeCategory ?? row.type ?? (String(designation).toLowerCase().includes('lab') || (String(designation).toLowerCase().includes('assistant') && String(designation).toLowerCase().includes('admin')) ? 'Non-Teaching' : 'Teaching');
  const department = row.departmentName ?? row.department ?? '';

  // Zero is a valid value for a future payroll period. Do not use `||` here:
  // it previously converted zero assessed/present days into a full 26 days.
  const numeric = (value, fallback = 0) => value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? fallback : Number(value);
  const working = numeric(row.workingDays ?? row.working ?? row.totalWorkingDays ?? row.totalDays, 26);
  const presentSource = row.presentDays ?? row.present ?? row.totalPresent ?? row.attendedDays;
  const present = presentSource === null || presentSource === undefined || presentSource === ''
    ? Math.max(0, working - numeric(row.paidLeaveDays ?? row.paidLeave, 0) - numeric(row.lopDays ?? row.lop, 0))
    : numeric(presentSource, 0);
  const paidLeave = Number(row.paidLeaveDays ?? row.paidLeave ?? row.paidLeaves ?? row.leaveDays ?? row.approvedLeaves ?? 0) || 0;
  const lop = numeric(row.lopDays ?? row.lop ?? row.lossOfPayDays ?? row.lossOfPay ?? row.unpaidLeaveDays ?? row.unpaidLeaves, Math.max(0, working - present - paidLeave));

  const defaultSalary = calculateFacultySalary(row, designation, type);
  const grossSalary = row.grossSalary ?? row.gross ?? row.grossPay ?? row.basicSalary ?? row.baseSalary ?? row.salary ?? row.totalEarnings ?? row.monthlySalary ?? defaultSalary.gross;
  const baseDeduction = row.deductions ?? row.totalDeductions ?? row.deduction ?? row.totalDeduction ?? defaultSalary.deductions;
  const lopDeduction = lop > 0 && grossSalary ? Math.round((Number(grossSalary) / working) * lop) : 0;
  const totalDeductions = (baseDeduction != null ? Number(baseDeduction) : 0) + (row.deductions != null ? 0 : lopDeduction);
  const netSalary = row.netSalary ?? row.net ?? row.netPay ?? row.netAmount ?? (grossSalary != null ? Math.max(0, Number(grossSalary) - totalDeductions) : null);

  const status = row.status ?? row.payrollStatus ?? (lop > 0 ? 'Hold' : 'Processed');

  return {
    ...row,
    id,
    facultyId: facultyId ? String(facultyId) : undefined,
    employeeId,
    fullName,
    designation,
    type,
    department,
    working,
    present: Math.max(0, present),
    late: Number(row.lateDays ?? row.late ?? 0) || 0,
    halfDay: Number(row.halfDays ?? row.halfDay ?? 0) || 0,
    paidLeave,
    lop,
    month: row.payrollMonth ?? row.month,
    status: status || 'Processed',
    grossSalary,
    deductions: totalDeductions,
    netSalary
  };
};
// #endregion services/facultyContracts.js
return {
  get facultyEmployeeCode() { return facultyEmployeeCode; },
  get requiredNumber() { return requiredNumber; },
  get facultyCreatePayload() { return facultyCreatePayload; },
  get facultyUpdatePayload() { return facultyUpdatePayload; },
  get facultyProfilePayload() { return facultyProfilePayload; },
  get normalizeAllocation() { return normalizeAllocation; },
  get allocationPayload() { return allocationPayload; },
  get attendanceTime() { return attendanceTime; },
  get attendancePayload() { return attendancePayload; },
  get normalizeLeaveType() { return normalizeLeaveType; },
  get normalizeLeavePolicy() { return normalizeLeavePolicy; },
  get normalizeLeaveRequest() { return normalizeLeaveRequest; },
  get leavePolicyPayload() { return leavePolicyPayload; },
  get normalizePayroll() { return normalizePayroll; }
};
})();

export const newestFirstModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/newestFirst.js
// Creation timestamps take precedence; numeric record IDs break ties when dates are unavailable.
const created = new Map()
let sequence = 0
const idKeys = { colleges: 'collegeId', departments: 'departmentId', courses: 'courseId', branches: 'branchId', 'academic-years': 'academicYearId', semesters: 'semesterId', sections: 'sectionId', admissions: 'admissionId', 'college-settings': 'collegeSettingsId', 'student-profiles': 'studentId', 'course-mappings': 'courseSemesterMappingId', attendance: 'sessionId', results: 'sheetId', promotions: 'promotionId' }
/* export */ function recordId(record, module) {
  if (record == null) return ''
  if (typeof record !== 'object') return String(record)
  if (module === 'admissions' && record.studentAdmissionId != null) return String(record.studentAdmissionId)
  if (record[idKeys[module]] != null) return String(record[idKeys[module]])
  if (record.id != null) return String(record.id)
  for (const key of ['data', 'item', 'record', 'result', 'college', 'course', 'department']) {
    if (record[key]) { const id = recordId(record[key], module); if (id) return id }
  }
  return ''
}
/* export */ function rememberCreated(module, record) {
  const id = recordId(record, module)
  if (!id) return
  if (!created.has(module)) created.set(module, new Map())
  created.get(module).set(id, ++sequence)
}
/* export */ function newestFirst(module, rows) {
  const priority = created.get(module)
  const timestamp = row => {
    for (const key of ['createdAt', 'createdDate', 'createdOn', 'created_at', 'CreatedAt', 'CreatedDate', 'CreatedOn']) {
      const value = Date.parse(row[key]); if (Number.isFinite(value)) return value
    }
    return 0
  }
  const compareIds = (a, b) => {
    const left = recordId(a, module), right = recordId(b, module)
    if (!/^\d+$/.test(left) || !/^\d+$/.test(right)) return 0
    return BigInt(right) > BigInt(left) ? 1 : BigInt(right) < BigInt(left) ? -1 : 0
  }
  return [...rows].sort((a, b) => (priority?.get(recordId(b, module)) || 0) - (priority?.get(recordId(a, module)) || 0) || timestamp(b) - timestamp(a) || compareIds(a, b))
}
// #endregion utils/newestFirst.js
return {
  get recordId() { return recordId; },
  get rememberCreated() { return rememberCreated; },
  get newestFirst() { return newestFirst; }
};
})();

export const facultyServiceModule = (() => {
const { collegeStorageKey } = collegeScopeModule;
const { facultyCreatePayload } = facultyContractsModule;
const { facultyUpdatePayload } = facultyContractsModule;
const { facultyProfilePayload } = facultyContractsModule;
const { normalizeAllocation } = facultyContractsModule;
const { allocationPayload } = facultyContractsModule;
const { facultyEmployeeCode } = facultyContractsModule;
const { newestFirst } = newestFirstModule;
const { API_BASE_URL } = apiEndpointsModule;
const { facultyApi } = apiEndpointsModule;
const { facultyAttendanceApi } = apiEndpointsModule;
const { facultyDocumentApi } = apiEndpointsModule;
const { facultyLeaveApi } = apiEndpointsModule;
const { facultyPayrollApi } = apiEndpointsModule;
const { facultyProfileApi } = apiEndpointsModule;
const { facultySubjectAllocationApi } = apiEndpointsModule;
/* Imports for isolated regression tests:
import { collegeStorageKey } from '../utils/collegeScope.js'
import { facultyCreatePayload, facultyUpdatePayload, facultyProfilePayload, normalizeAllocation, allocationPayload, facultyEmployeeCode } from './facultyContracts'
import { newestFirst } from '../utils/newestFirst'
import { API_BASE_URL, facultyApi, facultyAttendanceApi, facultyDocumentApi, facultyLeaveApi, facultyPayrollApi, facultyProfileApi, facultySubjectAllocationApi } from '../api/apiEndpoints'
*/
// #region services/facultyService.js
const first = (source, keys, fallback = '') => keys.map(key => source?.[key]).find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? fallback
const list = value => Array.isArray(value) ? value : []
/* export */ const mergeFacultyData = (...records) => Object.assign({}, ...records.map(record => Object.fromEntries(Object.entries(record || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''))))
/* export */ const resolveFacultyPhoto = value => {
  if (typeof value !== 'string' || !value.trim()) return ''
  if (['string', 'null', 'undefined'].includes(value.trim().toLowerCase())) return ''
  const path = value.trim().replace(/\\/g, '/')
  if (/^(https?:|data:image\/|blob:)/i.test(path)) return path
  if (/^[a-z]+:/i.test(path)) return ''
  return API_BASE_URL + '/' + path.replace(/^\/+/, '')
}
const facultyPhoto = source => ['profilePhotoUrl', 'photoUrl', 'profilePhoto', 'photoPath', 'photo']
  .map(key => resolveFacultyPhoto(source?.[key])).find(Boolean) || ''

// Use the faculty primary key for a stable EMP display code across all screens.
/* export */ const normalizeFaculty = (source = {}) => {
  // A partially populated result (or a null item in a paginated response)
  // must not take down the Faculty directory.
  source = mergeFacultyData(source?.employeeProfile, source?.profile, source?.data, source)
  const id = String(first(source, ['facultyId', 'id', 'employeeProfileId', 'FacultyId', 'Id', 'EmployeeProfileId'], ''))
  const facultyId = first(source, ['facultyId', 'id', 'employeeProfileId', 'FacultyId', 'Id', 'EmployeeProfileId'], '')

  const rawDob = first(source, ['dob', 'dateOfBirth', 'DateOfBirth', 'DOB'])
  const dob = rawDob && String(rawDob) !== 'undefined' ? String(rawDob).slice(0, 10) : ''
  const rawJoining = first(source, ['joiningDate', 'dateOfJoining', 'DateOfJoining', 'JoiningDate'])
  const joiningDate = rawJoining && String(rawJoining) !== 'undefined' ? String(rawJoining).slice(0, 10) : ''

  const isHexUUID = str => !str || /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(str).trim()) || /^[0-9a-f]{32}$/i.test(String(str).trim())

  const rawEmpId = first(source, ['employeeId', 'employeeCode', 'EmployeeId', 'EmployeeCode'])
  const validEmployeeId = (rawEmpId && !isHexUUID(rawEmpId))
    ? rawEmpId
    : (id && !isHexUUID(id) && String(id).match(/^\d+$/) ? `FAC-${String(id).padStart(3, '0')}` : facultyEmployeeCode(id))

  return {
    ...source,
    id,
    facultyId,
    collegeId: first(source, ['collegeId', 'college_id', 'CollegeId', 'collId', 'CollId'], ''),
    facultyCode: isHexUUID(source.facultyCode) ? '' : (source.facultyCode || ''),
    employeeId: validEmployeeId,
    fullName: first(source, ['fullName', 'facultyName', 'name', 'FullName', 'FacultyName', 'userName', 'username'], [source.firstName, source.lastName].filter(Boolean).join(' ')),
    email: first(source, ['email', 'officialEmail', 'workEmail', 'Email', 'OfficialEmail'], ''),
    mobile: first(source, ['mobile', 'phoneNumber', 'phone', 'mobileNumber', 'Mobile', 'PhoneNumber', 'Phone', 'MobileNumber'], ''),
    department: first(source, ['departmentName', 'department', 'DepartmentName', 'Department', 'deptName', 'DeptName'], ''),
    departmentId: first(source, ['departmentId', 'DepartmentId', 'department_id', 'deptId', 'DeptId'], ''),
    branch: first(source, ['branchName', 'branch', 'BranchName', 'Branch', 'branchCode', 'BranchCode'], ''),
    branchId: first(source, ['branchId', 'BranchId', 'branch_id'], ''),
    designation: first(source, ['designation', 'title', 'Designation', 'Title', 'designationName', 'DesignationName'], ''),
    qualification: first(source, ['qualification', 'highestQualification', 'Qualification'], ''),
    qualificationOther: first(source, ['qualificationOther', 'QualificationOther'], ''),
    specialization: first(source, ['specialization', 'Specialization'], ''),
    university: first(source, ['university', 'institution', 'University', 'Institution'], ''),
    passingYear: first(source, ['passingYear', 'yearOfPassing', 'PassingYear', 'YearOfPassing'], ''),
    experience: first(source, ['experienceYears', 'experience', 'teachingExperience', 'ExperienceYears', 'Experience'], ''),
    teachingExperience: first(source, ['teachingExperience', 'TeachingExperience'], ''),
    industryExperience: first(source, ['industryExperience', 'IndustryExperience'], ''),
    employmentType: first(source, ['employmentType', 'appointmentType', 'EmploymentType'], ''),
    employmentStatus: first(source, ['employmentStatus', 'statusName', 'EmploymentStatus', 'StatusName'], typeof source.status === 'string' ? source.status : source.status === 0 ? 'Inactive' : 'Working'),
    gender: first(source, ['gender', 'genderName', 'sex', 'Gender'], ''),
    dob,
    joiningDate,
    photo: facultyPhoto(source),
    address: first(source, ['address', 'Address', 'currentAddress', 'CurrentAddress', 'permanentAddress', 'PermanentAddress'], ''),
    city: first(source, ['city', 'City', 'currentCity', 'permanentCity'], ''),
    state: first(source, ['state', 'State', 'currentState', 'permanentState'], ''),
    pincode: first(source, ['pincode', 'Pincode', 'pinCode', 'zipCode', 'postalCode'], ''),
    alternateMobile: first(source, ['alternateMobile', 'altMobile', 'AlternateMobile', 'AltMobile'], ''),
    personalEmail: first(source, ['personalEmail', 'PersonalEmail'], ''),
    emergencyName: first(source, ['emergencyName', 'emergencyContactName', 'EmergencyContactName'], ''),
    emergencyMobile: first(source, ['emergencyMobile', 'emergencyContactNumber', 'EmergencyContactNumber'], ''),
    relationship: first(source, ['relationship', 'emergencyContactRelation', 'EmergencyContactRelation'], ''),
    employeeCategoryOther: first(source, ['employeeCategoryOther', 'EmployeeCategoryOther'], ''),
    documents: source.documents || {},
    employeeCategory: (() => {
      const raw = first(source, ['employeeCategory', 'category', 'facultyType', 'EmployeeCategory', 'Category', 'FacultyType'], '')
      if (raw) {
        if (/non/i.test(raw) || /other/i.test(raw)) return 'Non-Teaching'
        if (/teaching/i.test(raw)) return 'Teaching'
      }
      const des = String(first(source, ['designation', 'title', 'Designation', 'Title', 'designationName', 'DesignationName', 'role', 'Role'], '')).trim().toLowerCase()
      const teachingRoles = ['professor', 'associate professor', 'assistant professor', 'senior lecturer', 'lecturer', 'visiting faculty', 'guest faculty', 'hod', 'dean']
      if (teachingRoles.some(r => r === des)) return 'Teaching'
      const nonTeachingRoles = ['librarian', 'assistant librarian', 'lab assistant', 'lab technician', 'system administrator', 'network administrator', 'network engineer', 'accountant', 'administrative officer', 'office assistant', 'junior assistant', 'attender', 'store keeper', 'technical assistant', 'clerk', 'warden', 'security guard', 'electrician', 'driver', 'plumber']
      const isNonTeaching = nonTeachingRoles.includes(des) || /\b(librar|lab|system|network|account|administrat|office|junior assistant|store|technical assistant|clerk|attender|warden|security|driver|electrician|plumber|staff|non[-\s]?teaching)\b/i.test(des)
      return isNonTeaching ? 'Non-Teaching' : 'Teaching'
    })(),
    assignments: list(source.assignments ?? source.subjectAllocations),
  }
}

const LOCAL_FACULTY_KEY = 'pirnav-faculty-local-records-v1'
const LOCAL_PROFILE_KEY = 'pirnav-faculty-local-profiles-v1'
const LOCAL_ALLOCATIONS_KEY = 'pirnav-faculty-local-allocations-v1'
const LOCAL_ATTENDANCE_KEY = 'pirnav-faculty-local-attendance-v1'

const getAttendanceFacultyId = row => {
  if (!row || typeof row !== 'object') return ''
  return String(
    row.facultyId ??
    row.FacultyId ??
    row.faculty?.facultyId ??
    row.faculty?.FacultyId ??
    row.faculty?.id ??
    row.faculty?.Id ??
    row.employeeProfileId ??
    row.EmployeeProfileId ??
    row.facultyProfileId ??
    row.FacultyProfileId ??
    row.employeeProfile?.id ??
    row.employeeProfile?.Id ??
    row.employeeId ??
    row.EmployeeId ??
    row.facultyCode ??
    row.FacultyCode ??
    row.id ??
    row.Id ??
    ''
  )
}

const getAttendanceDate = row => {
  if (!row || typeof row !== 'object') return ''
  const val = String(row.attendanceDate ?? row.AttendanceDate ?? row.date ?? row.Date ?? '')
  return val.includes('T') ? val.split('T')[0] : val.slice(0, 10)
}

const getLocalAttendance = () => {
  try {
    return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_ATTENDANCE_KEY))) || []
  } catch {
    return []
  }
}

/* export */ const saveLocalAttendanceRecord = (record) => {
  try {
    const list = getLocalAttendance()
    const facId = getAttendanceFacultyId(record)
    const date = getAttendanceDate(record)
    if (!facId || !date) return record
    const index = list.findIndex(item => (getAttendanceFacultyId(item) === facId || (item.employeeId && record.employeeId && item.employeeId === record.employeeId) || (item.facultyCode && record.facultyCode && item.facultyCode === record.facultyCode)) && getAttendanceDate(item) === date)
    const normalized = {
      ...record,
      id: record.id || record.attendanceId || (index >= 0 ? list[index].id : `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
      attendanceId: record.attendanceId || record.id || (index >= 0 ? list[index].attendanceId : null),
      facultyId: facId,
      date,
      attendanceDate: date,
      status: record.status || record.Status || record.attendanceStatus || record.AttendanceStatus || 'Present',
      checkIn: record.checkIn || record.CheckIn || record.checkInTime || record.CheckInTime || '',
      checkOut: record.checkOut || record.CheckOut || record.checkOutTime || record.CheckOutTime || '',
      remarks: record.remarks || record.Remarks || '',
    }
    if (index >= 0) {
      list[index] = { ...list[index], ...normalized }
    } else {
      list.push(normalized)
    }
    localStorage.setItem(collegeStorageKey(LOCAL_ATTENDANCE_KEY), JSON.stringify(list))
    return normalized
  } catch {
    return record
  }
}

// Faculty codes are only unique within a college. Legacy caches stored them
// in employeeId; normalize before comparing and never match unscoped codes.
const sameFaculty = (left, right) => {
  const a = normalizeFaculty(left); const b = normalizeFaculty(right)
  if (a.id && b.id && String(a.id) === String(b.id)) return true
  if (a.employeeId && b.employeeId && String(a.employeeId).toLowerCase() === String(b.employeeId).toLowerCase()) return true
  return Boolean(a.collegeId && b.collegeId && String(a.collegeId) === String(b.collegeId)
    && a.facultyCode && a.facultyCode === b.facultyCode)
}

const getLocalFaculty = () => {
  try {
    const list = JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_FACULTY_KEY))) || []
    return list.map(item => {
      if (String(item.id).startsWith('FAC-LOC-')) {
        const num = String(item.employeeId || '10').replace(/\D/g, '') || '10'
        return { ...item, id: num, facultyId: num }
      }
      if (typeof item.employeeId === 'string' && item.employeeId.match(/\d{5,}$/)) {
        const cleanEmpId = item.employeeId.replace(/\d{5,}$/, '').replace(/-+$/, '')
        return { ...item, employeeId: cleanEmpId }
      }
      return item
    })
  } catch {
    return []
  }
}

const saveLocalFaculty = (record) => {
  try {
    const list = getLocalFaculty()
    const index = list.findIndex(item => String(item.id) === String(record.id) || String(item.facultyId) === String(record.id) || (record.employeeId && item.employeeId && String(item.employeeId).toLowerCase() === String(record.employeeId).toLowerCase()) || sameFaculty(item, record))
    if (index >= 0) {
      list[index] = { ...list[index], ...record }
    } else {
      list.unshift(record)
    }
    localStorage.setItem(collegeStorageKey(LOCAL_FACULTY_KEY), JSON.stringify(list))
  } catch { /* ignore */ }
}

const getLocalProfile = (id) => {
  try {
    const profiles = JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_PROFILE_KEY))) || {}
    return profiles[String(id)] || profiles[id] || null
  } catch {
    return null
  }
}

const saveLocalProfile = (id, profile) => {
  try {
    const profiles = JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_PROFILE_KEY))) || {}
    profiles[String(id)] = { ...(profiles[String(id)] || {}), ...profile }
    localStorage.setItem(collegeStorageKey(LOCAL_PROFILE_KEY), JSON.stringify(profiles))
  } catch { /* ignore */ }
}

// Attendance fallback rows do not contain profile photos. Recover the photo
// from the profile store/API while retaining the faculty record's identity.
const withFacultyPhoto = async (row, requestOptions) => {
  const member = normalizeFaculty(row)
  if (member.photo || !member.id) return member
  const cachedPhoto = normalizeFaculty(getLocalProfile(member.id)).photo
  if (cachedPhoto) return { ...member, photo: cachedPhoto }
  try {
    const profile = await facultyProfileApi.get(member.id, requestOptions)
    const photo = normalizeFaculty(profile).photo
    if (photo) return { ...member, photo }
  } catch { /* A missing profile must not hide the faculty row. */ }
  return member
}

const getLocalAllocations = () => {
  try {
    return JSON.parse(localStorage.getItem(collegeStorageKey(LOCAL_ALLOCATIONS_KEY))) || []
  } catch {
    return []
  }
}

const saveLocalAllocation = (allocation) => {
  try {
    const list = getLocalAllocations()
    const index = list.findIndex(item => String(item.id) === String(allocation.id))
    if (index >= 0) {
      list[index] = { ...list[index], ...allocation }
    } else {
      list.push(allocation)
    }
    localStorage.setItem(collegeStorageKey(LOCAL_ALLOCATIONS_KEY), JSON.stringify(list))
  } catch { /* ignore */ }
}

const removeLocalAllocation = (id) => {
  try {
    const list = getLocalAllocations().filter(item => String(item.id) !== String(id))
    localStorage.setItem(collegeStorageKey(LOCAL_ALLOCATIONS_KEY), JSON.stringify(list))
  } catch { /* ignore */ }
}

const listFaculty = async (params, search = false, requestOptions) => {
  const records = []; let page = 1
  try {
    while (true) {
      const rows = await (search ? facultyApi.search : facultyApi.getAll)({ ...params, PageNumber: page, PageSize: 100 }, requestOptions)
      const validRows = rows.filter(row => row && typeof row === 'object')
      const fresh = validRows.filter(row => !records.some(existing => String(existing.facultyId ?? existing.id) === String(row.facultyId ?? row.id)))
      records.push(...fresh)
      if (rows.length < 100 || !fresh.length) break
      page++
    }
  } catch {
    // API request complete
  }

  // If backend GET /api/v1/faculty returns empty due to query join bug,
  // harvest active faculty records from live attendance, balances, and payroll endpoints:
  if (!records.length) {
    try {
      const dailyRows = await facultyAttendanceApi.getDaily({ date: new Date().toISOString().slice(0, 10) }, requestOptions)
      const dailyList = Array.isArray(dailyRows) ? dailyRows : (dailyRows?.rows || [])
      for (const row of dailyList) {
        if (row && (row.facultyId || row.id) && !records.some(r => String(r.facultyId ?? r.id) === String(row.facultyId ?? row.id))) {
          records.push(normalizeFaculty({
            ...row,
            id: String(row.facultyId ?? row.id),
            facultyId: row.facultyId ?? row.id,
            employeeId: row.employeeId,
            fullName: row.facultyName || row.fullName || row.name,
            designation: row.designation,
            department: row.department,
            employeeCategory: row.facultyType || row.employeeCategory || '',
            status: 'Working'
          }))
        }
      }
    } catch { /* ignore */ }
  }

  if (!records.length) {
    try {
      const balances = await facultyLeaveApi.getBalances(undefined, requestOptions)
      const balList = Array.isArray(balances) ? balances : []
      for (const row of balList) {
        if (row && (row.facultyId || row.id) && !records.some(r => String(r.facultyId ?? r.id) === String(row.facultyId ?? row.id))) {
          records.push(normalizeFaculty({
            ...row,
            id: String(row.facultyId ?? row.id),
            facultyId: row.facultyId ?? row.id,
            employeeId: row.employeeId,
            fullName: row.fullName || row.facultyName || row.name,
            designation: row.designation,
            department: row.department,
            employeeCategory: row.employeeCategory || '',
            status: 'Working'
          }))
        }
      }
    } catch { /* ignore */ }
  }

  if (!records.length) {
    try {
      const payroll = await facultyPayrollApi.getAll(undefined, requestOptions)
      const payList = Array.isArray(payroll) ? payroll : []
      for (const row of payList) {
        if (row?.facultyId && !records.some(r => String(r.facultyId ?? r.id) === String(row.facultyId))) {
          records.push(normalizeFaculty({
            ...row,
            id: String(row.facultyId),
            facultyId: row.facultyId,
            employeeId: row.employeeId,
            fullName: row.fullName || row.facultyName || row.name,
            designation: row.designation,
            department: row.department,
            employeeCategory: row.type || row.employeeCategory || '',
            status: 'Working'
          }))
        }
      }
    } catch { /* ignore */ }
  }

  // Merge user-entered / local faculty records so newly created faculty are always present
  const local = getLocalFaculty()
  for (const item of local) {
    if (item && (item.id || item.facultyId || item.fullName)) {
      const idx = records.findIndex(r =>
        sameFaculty(r, item) ||
        (item.id && String(r.facultyId ?? r.id) === String(item.id)) ||
        (item.facultyId && String(r.facultyId ?? r.id) === String(item.facultyId)) ||
        (item.employeeId && r.employeeId && String(r.employeeId).toLowerCase() === String(item.employeeId).toLowerCase())
      )
      if (idx >= 0) {
        records[idx] = normalizeFaculty(mergeFacultyData(records[idx], item))
      } else {
        records.unshift(normalizeFaculty(item))
      }
    }
  }

  const members = records.filter(row => row && typeof row === 'object').map(row => normalizeFaculty(row))
  const enriched = []
  // Bound requests when the backend list omits photos for many faculty.
  for (let index = 0; index < members.length; index += 4) {
    enriched.push(...await Promise.all(members.slice(index, index + 4).map(member => withFacultyPhoto(member, requestOptions))))
  }
  return newestFirst('faculty', enriched)
}

/* export */ const clearFacultyLocalStorage = () => {
  try {
    localStorage.removeItem(collegeStorageKey(LOCAL_FACULTY_KEY))
    localStorage.removeItem(collegeStorageKey(LOCAL_PROFILE_KEY))
    localStorage.removeItem(collegeStorageKey(LOCAL_ALLOCATIONS_KEY))
    localStorage.removeItem(collegeStorageKey(LOCAL_ATTENDANCE_KEY))
    localStorage.removeItem(collegeStorageKey('pirnav-faculty-local-payroll-status-v1'))
    localStorage.removeItem(collegeStorageKey('pirnav-faculty-local-salary-structures-v1'))
    localStorage.removeItem(collegeStorageKey('pirnav-faculty-local-leave-decisions-v1'))
    localStorage.removeItem(collegeStorageKey('pirnav-faculty-local-leave-policies-v1'))
    localStorage.removeItem(collegeStorageKey('pirnav-faculty-local-leave-types-v1'))
  } catch { /* ignore */ }
}

/* export */ const facultyService = {
  list: (params, requestOptions) => listFaculty(params, false, requestOptions),
  search: (params, requestOptions) => listFaculty(params, true, requestOptions),
  getById: async id => {
    const local = getLocalFaculty().find(item => String(item.id) === String(id) || String(item.facultyId) === String(id) || (item.employeeId && String(item.employeeId) === String(id)))
    try {
      const res = await facultyApi.getById(id)
      if (res && (res.id || res.facultyId || res.fullName || res.facultyName)) return withFacultyPhoto(mergeFacultyData(local, normalizeFaculty(res), local))
    } catch { /* fallback */ }
    try {
      const all = await listFaculty()
      const matched = all.find(item => String(item.id) === String(id) || String(item.facultyId) === String(id) || String(item.employeeId) === String(id))
      if (matched) return normalizeFaculty(mergeFacultyData(matched, local))
    } catch { /* fallback */ }
    if (local) return normalizeFaculty(local)
    return normalizeFaculty({ id: String(id), facultyId: String(id) })
  },
  create: async (payload, collegeId = payload.collegeId) => {
    const createCollegeId = Number(collegeId)
    const createData = { ...payload, collegeId: createCollegeId }
    const created = await facultyApi.create(facultyCreatePayload(createData), createCollegeId)
    if (!created?.id && !created?.facultyId) throw new Error('The server did not return the saved faculty record.')
    const isHexUUID = str => !str || /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(str).trim()) || /^[0-9a-f]{32}$/i.test(String(str).trim())
    const empId = payload.employeeId && !isHexUUID(payload.employeeId) ? payload.employeeId : (created.employeeId && !isHexUUID(created.employeeId) ? created.employeeId : '')
    const result = normalizeFaculty({
      ...mergeFacultyData(payload, created),
      ...payload,
      id: String(created.id || created.facultyId),
      facultyId: String(created.id || created.facultyId),
      employeeId: empId,
      employeeCategory: payload.employeeCategory || 'Teaching',
    })
    saveLocalFaculty(result)
    return result
  },
  update: async (id, payload) => {
    let response = null
    try {
      response = await facultyApi.update(id, facultyUpdatePayload(payload))
    } catch (err) {
      console.warn('Backend faculty update error, saving to local store:', err)
    }
    const updated = normalizeFaculty({ ...mergeFacultyData(payload, response), ...payload, id: String(id), facultyId: String(id) })
    saveLocalFaculty(updated)
    return updated
  },
  getSummary: async params => {
    try {
      return await facultyApi.getSummary(params)
    } catch {
      return null
    }
  },
  getWorkload: async id => {
    try {
      return await facultyApi.getWorkload(id)
    } catch {
      return null
    }
  },
  updateStatus: facultyApi.updateStatus,
  getStatusHistory: async id => {
    try {
      const res = await facultyApi.getStatusHistory(id)
      return Array.isArray(res) ? res : []
    } catch {
      return []
    }
  },
  uploadProfilePhoto: async (id, file, metadata = {}) => {
    try {
      const result = await facultyApi.uploadProfilePhoto(id, file, metadata)
      const photo = resolveFacultyPhoto(typeof result === 'string' ? result : first(result, ['profilePhotoUrl', 'photoUrl', 'profilePhoto', 'photoPath', 'photo', 'fileUrl', 'url']))
      if (photo) {
        const cached = getLocalFaculty().find(item => String(item.id) === String(id))
        saveLocalFaculty({ ...cached, id: String(id), photo, profilePhotoUrl: photo })
      }
      return result
    } catch (err) {
      console.warn('Backend photo upload failed:', err)
      return null
    }
  },
  getProfile: async id => {
    try {
      const res = await facultyProfileApi.get(id)
      if (res && typeof res === 'object' && Object.keys(res).length) return mergeFacultyData(getLocalProfile(id), res)
    } catch { /* fallback */ }
    return getLocalProfile(id)
  },
  createProfile: async (id, payload) => {
    saveLocalProfile(id, payload)
    try {
      return await facultyProfileApi.create(id, facultyProfilePayload(payload))
    } catch {
      return payload
    }
  },
  updateProfile: async (id, payload) => {
    saveLocalProfile(id, payload)
    try {
      return await facultyProfileApi.update(id, facultyProfilePayload(payload))
    } catch {
      return payload
    }
  },
  getDocuments: async id => {
    try {
      const res = await facultyDocumentApi.getAll(id)
      return Array.isArray(res) ? res : []
    } catch {
      return []
    }
  },
  uploadDocument: facultyDocumentApi.upload,
  deleteDocument: facultyDocumentApi.remove,
  getSubjectAllocations: async params => {
    let remote = []
    try {
      const res = await facultySubjectAllocationApi.getAll(params)
      remote = (Array.isArray(res) ? res : []).map(normalizeAllocation)
    } catch {
      // Continue to local
    }
    const local = getLocalAllocations().map(normalizeAllocation)
    const facultyFilter = params?.FacultyId || params?.facultyId
    const filteredLocal = facultyFilter ? local.filter(item => String(item.facultyId) === String(facultyFilter)) : local
    const merged = [...remote]
    for (const item of filteredLocal) {
      if (!merged.some(r => String(r.id) === String(item.id))) {
        merged.push(item)
      }
    }
    return merged
  },
  createSubjectAllocation: async payload => {
    let result = null
    try {
      const created = await facultySubjectAllocationApi.create(allocationPayload(payload))
      result = normalizeAllocation({ ...payload, ...created })
    } catch {
      // Fallback to local
    }
    const finalAllocation = result || normalizeAllocation({
      ...payload,
      id: String(payload.id || Date.now() + Math.random().toString(36).substr(2, 4)),
      facultyId: String(payload.facultyId),
    })
    saveLocalAllocation(finalAllocation)
    return finalAllocation
  },
  updateSubjectAllocation: async (id, payload) => {
    let result = null
    try {
      const updated = await facultySubjectAllocationApi.update(id, allocationPayload(payload, true))
      result = normalizeAllocation({ ...payload, ...updated, id: String(id) })
    } catch {
      // Fallback
    }
    const finalAllocation = result || normalizeAllocation({ ...payload, id: String(id) })
    saveLocalAllocation(finalAllocation)
    return finalAllocation
  },
  deleteSubjectAllocation: async id => {
    removeLocalAllocation(id)
    try {
      await facultySubjectAllocationApi.remove(id)
    } catch {
      // Fallback
    }
    return true
  },
  getAttendance: async params => {
    let remote = []
    try {
      remote = await facultyAttendanceApi.getAll(params)
    } catch { /* ignore */ }
    const local = getLocalAttendance()
    const list = Array.isArray(remote) ? [...remote] : []
    for (const item of local) {
      const itemFacId = getAttendanceFacultyId(item)
      const itemDate = getAttendanceDate(item)
      const matchIndex = list.findIndex(r => {
        const rFacId = getAttendanceFacultyId(r)
        const rDate = getAttendanceDate(r)
        return (rFacId === itemFacId || (r.employeeId && item.employeeId && r.employeeId === item.employeeId) || (r.facultyCode && item.facultyCode && r.facultyCode === item.facultyCode)) && rDate === itemDate
      })
      if (matchIndex >= 0) {
        list[matchIndex] = {
          ...list[matchIndex],
          ...item,
          status: item.status && item.status !== 'Not Marked' ? item.status : (list[matchIndex].status || list[matchIndex].Status || 'Not Marked'),
          checkIn: item.checkIn || list[matchIndex].checkIn || list[matchIndex].CheckIn || '',
          checkOut: item.checkOut || list[matchIndex].checkOut || list[matchIndex].CheckOut || '',
        }
      } else {
        list.push(item)
      }
    }
    return list
  },
  getAttendanceById: facultyAttendanceApi.getById,
  createAttendance: async payload => {
    let result = null
    const numFacultyId = Number(payload.facultyId)
    const validFacultyId = Number.isSafeInteger(numFacultyId) && numFacultyId > 0 ? numFacultyId : payload.facultyId
    try {
      result = await facultyAttendanceApi.create({ ...payload, facultyId: validFacultyId })
    } catch (err) {
      const targetDate = String(payload.attendanceDate || '').slice(0, 10)
      if (validFacultyId && targetDate) {
        try {
          result = await facultyAttendanceApi.bulk({
            facultyIds: [validFacultyId],
            attendanceDate: targetDate,
            status: payload.status,
            remarks: payload.remarks || null,
          })
        } catch { /* ignore fallback */ }
      }
      if (!result) {
        console.warn('Backend createAttendance error, saving locally:', err)
      }
    }
    const local = saveLocalAttendanceRecord({
      ...payload,
      ...(result || {}),
      id: result?.attendanceId || result?.id || `ATT-${Date.now()}`,
      attendanceId: result?.attendanceId || result?.id || `ATT-${Date.now()}`,
      facultyId: String(payload.facultyId),
      date: payload.attendanceDate,
    })
    return result || local
  },
  updateAttendance: async (id, payload) => {
    let result = null
    const numId = Number(id)
    const isBackendId = Number.isSafeInteger(numId) && numId > 0 && !String(id).startsWith('ATT-')
    const numFacultyId = Number(payload.facultyId)
    const validFacultyId = Number.isSafeInteger(numFacultyId) && numFacultyId > 0 ? numFacultyId : payload.facultyId
    const targetDate = String(payload.attendanceDate || payload.date || '').slice(0, 10)

    if (validFacultyId && targetDate) {
      try {
        await facultyAttendanceApi.bulk({
          facultyIds: [validFacultyId],
          attendanceDate: targetDate,
          status: payload.status,
          remarks: payload.remarks || null,
        })
      } catch (bulkErr) {
        console.warn('Bulk upsert during updateAttendance fallback:', bulkErr)
      }
    }

    if (isBackendId) {
      try {
        result = await facultyAttendanceApi.update(numId, payload)
      } catch (updateErr) {
        console.warn('Backend updateAttendance fallback:', updateErr)
      }
    }
    saveLocalAttendanceRecord({
      ...payload,
      id,
      attendanceId: id,
      date: targetDate,
    })
    return result || { id, ...payload }
  },
  checkIn: async (id, payload = {}) => {
    let result = null
    try {
      result = await facultyAttendanceApi.checkIn(id, payload)
    } catch { /* ignore */ }
    const timeVal = payload?.checkIn ? (payload.checkIn.includes('T') ? payload.checkIn.split('T')[1].slice(0, 5) : payload.checkIn) : ''
    const list = getLocalAttendance()
    const item = list.find(r => String(r.id) === String(id) || String(r.attendanceId) === String(id))
    if (item) {
      item.checkIn = timeVal
      localStorage.setItem(collegeStorageKey(LOCAL_ATTENDANCE_KEY), JSON.stringify(list))
    }
    return result || { success: true }
  },
  checkOut: async (id, payload = {}) => {
    let result = null
    try {
      result = await facultyAttendanceApi.checkOut(id, payload)
    } catch { /* ignore */ }
    const timeVal = payload?.checkOut ? (payload.checkOut.includes('T') ? payload.checkOut.split('T')[1].slice(0, 5) : payload.checkOut) : ''
    const list = getLocalAttendance()
    const item = list.find(r => String(r.id) === String(id) || String(r.attendanceId) === String(id))
    if (item) {
      item.checkOut = timeVal
      localStorage.setItem(collegeStorageKey(LOCAL_ATTENDANCE_KEY), JSON.stringify(list))
    }
    return result || { success: true }
  },
  getDailyAttendance: async params => {
    let remote = []
    try {
      remote = await facultyAttendanceApi.getDaily(params)
    } catch { /* ignore */ }
    const targetDate = String(params?.date || new Date().toISOString().slice(0, 10)).slice(0, 10)
    const local = getLocalAttendance().filter(item => getAttendanceDate(item) === targetDate)
    const list = Array.isArray(remote) ? [...remote] : []
    for (const item of local) {
      const itemFacId = getAttendanceFacultyId(item)
      const matchIndex = list.findIndex(r => {
        const rFacId = getAttendanceFacultyId(r)
        return rFacId === itemFacId || (r.employeeId && item.employeeId && r.employeeId === item.employeeId) || (r.facultyCode && item.facultyCode && r.facultyCode === item.facultyCode)
      })
      if (matchIndex >= 0) {
        list[matchIndex] = {
          ...list[matchIndex],
          ...item,
          status: item.status && item.status !== 'Not Marked' ? item.status : (list[matchIndex].status || list[matchIndex].Status || 'Not Marked'),
          attendanceId: list[matchIndex].attendanceId || list[matchIndex].AttendanceId || item.attendanceId || item.id,
          checkIn: item.checkIn || list[matchIndex].checkIn || list[matchIndex].CheckIn || '',
          checkOut: item.checkOut || list[matchIndex].checkOut || list[matchIndex].CheckOut || '',
        }
      } else {
        list.push(item)
      }
    }
    return list
  },
  bulkAttendance: async payload => {
    const result = await facultyAttendanceApi.bulk(payload)
    const facultyIds = payload.facultyIds || []
    const date = String(payload.attendanceDate || new Date().toISOString().slice(0, 10)).slice(0, 10)
    const status = payload.status || 'Present'
    const remarks = payload.remarks || ''
    for (const facId of facultyIds) {
      saveLocalAttendanceRecord({
        facultyId: String(facId),
        date,
        attendanceDate: date,
        status,
        checkIn: payload.checkIn || '',
        checkOut: payload.checkOut || '',
        remarks,
      })
    }
    return result || { success: true }
  },
  getWeeklyAttendance: async params => {
    try {
      return await facultyAttendanceApi.getWeekly(params)
    } catch {
      return []
    }
  },
  getMonthlyAttendance: async params => {
    try {
      return await facultyAttendanceApi.getMonthly(params)
    } catch {
      return []
    }
  },
  getAttendanceReports: async params => {
    try {
      return await facultyAttendanceApi.getReports(params)
    } catch {
      return []
    }
  },
  exportAttendance: facultyAttendanceApi.export,
}

/* export */ const facultyCapability = Object.freeze({ directory: true, details: true, facultyCrud: true, documents: true, subjectAllocation: true, workloadEndpoint: true, attendance: true })
/* export default facultyService */
// #endregion services/facultyService.js
return {
  get mergeFacultyData() { return mergeFacultyData; },
  get resolveFacultyPhoto() { return resolveFacultyPhoto; },
  get normalizeFaculty() { return normalizeFaculty; },
  get saveLocalAttendanceRecord() { return saveLocalAttendanceRecord; },
  get clearFacultyLocalStorage() { return clearFacultyLocalStorage; },
  get facultyService() { return facultyService; },
  get facultyCapability() { return facultyCapability; },
  get default() { return facultyService; }
};
})();

export const demoRequestModule = (() => {
const { GENERIC_ERROR_MESSAGE } = userErrorModule;
const { notifyApiUnavailable } = apiFailureNoticeModule;
/* Imports for isolated regression tests:
import { GENERIC_ERROR_MESSAGE } from '../utils/userError.js'
import { notifyApiUnavailable } from './apiFailureNotice'
*/
// #region api/demoRequest.js
/* export */ const demoModules = ['College Management', 'Academic Years', 'Courses', 'Departments', 'Branches', 'Semesters', 'Sections', 'Student Admission', 'Student Profile', 'Student Promotion', 'Attendance', 'Examinations', 'Results']
/* export */ const demoRoles = ['College Administrator', 'Principal', 'Director', 'Registrar', 'HOD', 'Faculty', 'IT Administrator', 'Management', 'Other']
/* export */ const demoTimes = ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM']
/* export */ const demoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
/* export */ const emptyDemo = { fullName: '', email: '', mobile: '', institution: '', role: '', otherRole: '', city: '', state: '', studentCount: '', interestedModules: [], preferredDate: '', preferredTime: '', message: '', consent: false }
/* export */ function normalizeDemo(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, key === 'studentCount' ? (value === '' ? null : Number(value)) : key === 'otherRole' && values.role !== 'Other' ? '' : typeof value === 'string' ? value.trim() : value]))
}
/* export */ function validateDemo(v) {
  const errors = {}
  if (v.fullName.trim().length < 2 || !/^\p{L}[\p{L}\p{M} .?'-]*$/u.test(v.fullName.trim())) errors.fullName = 'Enter your full name (at least 2 characters).'
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(v.email.trim())) errors.email = 'Enter a valid work or college email.'
  if (!/^[6-9]\d{9}$/.test(v.mobile.trim())) errors.mobile = 'Enter a 10-digit Indian mobile number starting with 6-9.'
  if (!v.institution.trim()) errors.institution = 'Enter your organization or college name.'
  if (!demoRoles.includes(v.role)) errors.role = 'Select your role.'
  if (v.role === 'Other' && !v.otherRole.trim()) errors.otherRole = 'Enter your designation.'
  if (v.studentCount !== '' && (!Number.isInteger(Number(v.studentCount)) || Number(v.studentCount) < 1)) errors.studentCount = 'Enter a positive whole number.'
  if (v.preferredDate && (!/^\d{4}-\d{2}-\d{2}$/.test(v.preferredDate) || v.preferredDate < demoToday())) errors.preferredDate = 'Choose today or a future date.'
  if (!v.consent) errors.consent = 'Please agree to be contacted about your demo.'
  return errors
}
/* export */ async function submitDemoRequest(request) {
  if (Object.keys(validateDemo({ ...request, studentCount: request.studentCount ?? '' })).length) throw new Error('Please check your details and try again.')
  const values = normalizeDemo(request)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(demoRequestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' },
      signal: controller.signal,
      body: JSON.stringify({
        fullName: values.fullName,
        email: values.email,
        mobile: values.mobile,
        institutionName: values.institution,
        role: values.role === 'Other' ? values.otherRole : values.role,
        city: values.city || null,
        state: values.state || null,
        numberOfStudents: values.studentCount,
        agreeToContact: values.consent,
      }),
    })
    if (response.status >= 500) { notifyApiUnavailable({ status: response.status }); throw new Error(GENERIC_ERROR_MESSAGE) }
    const text = await response.text()
    let body = null
    try { body = text ? JSON.parse(text) : null } catch { /* Reject unexpected proxy or HTML responses below. */ }
    if (!response.ok || body?.success === false || body?.isSuccess === false) {
      const errors = body?.errors
      const details = errors && typeof errors === 'object' ? Object.values(errors).flat().filter(value => typeof value === 'string').join(' ') : ''
      throw new Error(details || body?.message || body?.detail || body?.title || 'Unable to submit your demo request. Please try again.')
    }
    if (response.status !== 204 && (!body || typeof body !== 'object')) throw new Error('Your request could not be confirmed. Please try again later.')
    const data = body?.data ?? body
    return { success: true, reference: data?.reference || data?.requestId || data?.id }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again shortly.')
    if (error instanceof TypeError) {
      notifyApiUnavailable()
      throw new Error(GENERIC_ERROR_MESSAGE)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
const demoRequestUrl = `${import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://clarity-math-delouse.ngrok-free.dev').trim().replace(/\/+$/, '')}/api/v1/demo-requests`
// #endregion api/demoRequest.js
return {
  get demoModules() { return demoModules; },
  get demoRoles() { return demoRoles; },
  get demoTimes() { return demoTimes; },
  get demoToday() { return demoToday; },
  get emptyDemo() { return emptyDemo; },
  get normalizeDemo() { return normalizeDemo; },
  get validateDemo() { return validateDemo; },
  get submitDemoRequest() { return submitDemoRequest; }
};
})();

export const authApiModule = (() => {
const { GENERIC_ERROR_MESSAGE } = userErrorModule;
const { userErrorMessage } = userErrorModule;
const { getAccessToken } = authModule;
const { ROLES } = rolesModule;
const { notifyApiUnavailable } = apiFailureNoticeModule;
/* Imports for isolated regression tests:
import { GENERIC_ERROR_MESSAGE, userErrorMessage } from '../utils/userError.js'
import { getAccessToken } from './auth'
import { ROLES } from './roles'
import { notifyApiUnavailable } from '../api/apiFailureNotice'
*/
// #region auth/authApi.js
const fetchWithApiNotice = async (...args) => {
  let response
  try {
    response = await Reflect.apply(globalThis['fetch'], globalThis, args)
  } catch (error) {
    notifyApiUnavailable()
    throw error
  }
  if (response.status >= 500) notifyApiUnavailable({ status: response.status })
  return response
}

/* export */ class AuthRequestError extends Error {
  constructor(message = 'Invalid login credentials. Please check your details and try again.') {
    super(userErrorMessage(message))
    this.name = 'AuthRequestError'
  }
}

const DEFAULT_API_BASE_URL = 'https://abreast-curling-tutor.ngrok-free.dev'
const authEndpoint = import.meta.env.VITE_AUTH_API_URL || (import.meta.env.DEV ? '/api/v1/auth/login' : `${DEFAULT_API_BASE_URL}/api/v1/auth/login`)
const registrationBaseUrl = String(import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)).replace(/\/+$/, '')
const registrationEndpoint = import.meta.env.VITE_REGISTRATION_API_URL || (registrationBaseUrl ? `${registrationBaseUrl}/api/v1/access-requests` : import.meta.env.DEV ? '/api/v1/access-requests' : '')
const otpApiBaseUrl = (import.meta.env.DEV ? '' : (import.meta.env.VITE_OTP_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)).replace(/\/+$/, '')
const hasOtpRoute = import.meta.env.DEV || Boolean(otpApiBaseUrl)
const otpAuthToken = import.meta.env.VITE_OTP_AUTH_TOKEN

const combineUrl = (base, path) => {
  const cleanBase = String(base || '').replace(/\/+$/, '')
  const cleanPath = String(path || '').replace(/^\/+/, '')

  if (!cleanBase) return `/${cleanPath}`
  return `${cleanBase}/${cleanPath}`
}

const resolveOtpUrl = (path) => {
  const normalizedPath = String(path || '').replace(/^\/+/, '')

  // Prevent accidental `/api/api/...` URLs when VITE_OTP_API_URL already ends with `/api`.
  if (otpApiBaseUrl.endsWith('/api') && normalizedPath.startsWith('api/')) {
    return combineUrl(otpApiBaseUrl, normalizedPath.slice(4))
  }

  return combineUrl(otpApiBaseUrl, normalizedPath)
}

const readResponseBody = async (response) => {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

const otpPayload = ({ contact, otp, purpose = 'LOGIN' }) => {
  const value = contact.trim()
  const isMobile = /^\d+$/.test(value)

  return {
    email: isMobile ? '' : value,
    mobile: isMobile ? value : '',
    ...(otp ? { otpCode: otp } : {}),
    purpose,
  }
}

const otpRequest = async (path, payload) => {
  if (!hasOtpRoute) {
    throw new AuthRequestError(GENERIC_ERROR_MESSAGE)
  }

  const accessToken = otpAuthToken || localStorage.getItem('btech-access-token')
  let response
  try {
    response = await fetchWithApiNotice(resolveOtpUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new AuthRequestError('We couldn’t send the verification code. Please try again shortly.')
  }

  const data = await readResponseBody(response)
  if (!response.ok || data?.success === false) {
    const fallback = response.status >= 500
      ? GENERIC_ERROR_MESSAGE
      : response.status === 404
      ? GENERIC_ERROR_MESSAGE
      : 'The OTP request could not be completed.'
    throw new AuthRequestError(response.status >= 500 ? fallback : data?.message || fallback)
  }

  return data
}

/* export */ async function login({ identifier, password }, fallbackRole = ROLES.ADMIN) {
  if (!authEndpoint) {
    throw new AuthRequestError('Sign in is temporarily unavailable. Please try again later.')
  }

  let response
  try {
    response = await fetchWithApiNotice(authEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ loginId: identifier, identifier, username: identifier, password })
    })
  } catch {
    notifyApiUnavailable()
    throw new AuthRequestError(GENERIC_ERROR_MESSAGE)
  }

  if (!response.ok) {
    if (response.status >= 500) {
      notifyApiUnavailable({ status: response.status })
      throw new AuthRequestError(GENERIC_ERROR_MESSAGE)
    }
    throw new AuthRequestError()
  }

  try {
    const session = await response.json()
    if (!session?.user?.role) throw new Error('Malformed authentication response')
    return session
  } catch {
    throw new AuthRequestError(GENERIC_ERROR_MESSAGE)
  }
}

/**
 * Generate an OTP for an email address or mobile number.
 */
/* export */ async function generateOtp({ contact, purpose = 'LOGIN' }) {
  return otpRequest('/api/otp/generate', otpPayload({ contact, purpose }))
}

/** Resend a new OTP to the same email address or mobile number. */
/* export */ async function resendOtp({ contact, purpose = 'LOGIN' }) {
  return otpRequest('/api/otp/resend', otpPayload({ contact, purpose }))
}

// Retained for existing callers while the UI transitions to generateOtp.
/* export */ const sendOtp = generateOtp

/**
 * Verify entered OTP code
 */
/* export */ async function verifyOtp({ contact, otp, purpose = 'LOGIN' }) {
  return otpRequest('/api/otp/verify', otpPayload({ contact, otp, purpose }))
}

/**
 * Reset password after OTP verification
 */
/* export */ async function resetPassword({ contact, otp, password }) {
  if (!hasOtpRoute) {
    throw new AuthRequestError('Password reset is temporarily unavailable. Please try again later.')
  }

  try {
    const response = await fetchWithApiNotice(resolveOtpUrl('/api/otp/reset-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        contact: contact.trim(),
        otp,
        password,
      }),
    })

    const data = await readResponseBody(response)
    if (!response.ok || data?.success === false) {
      const validationMessage = data?.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat().find((message) => typeof message === 'string')
        : ''
      throw new AuthRequestError(validationMessage || data?.message || data?.detail || 'Unable to reset your password. Please try again.')
    }
    return data
  } catch (error) {
    if (error instanceof AuthRequestError) throw error
    throw new AuthRequestError('We couldn’t reset your password right now. Please try again shortly.')
  }
}

// Set VITE_REGISTRATION_API_URL when the pending-registration endpoint is available.
/* export */ async function register({ fullName, email, mobile, password, confirmPassword, agreeToTerms }) {
  if (!registrationEndpoint) {
    throw new AuthRequestError(GENERIC_ERROR_MESSAGE)
  }

  let response
  try {
    response = await fetchWithApiNotice(registrationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ fullName, email, mobile, password, confirmPassword, agreeToTerms: Boolean(agreeToTerms) }),
    })
  } catch {
    throw new AuthRequestError(GENERIC_ERROR_MESSAGE)
  }

  const result = await readResponseBody(response)
  if (!response.ok || result?.success === false) {
    const validationMessage = result?.errors && typeof result.errors === 'object'
      ? Object.values(result.errors).flat().find((message) => typeof message === 'string')
      : ''
    const fallback = response.status === 409
      ? 'An access request already exists for this email or mobile number.'
      : response.status >= 500
        ? GENERIC_ERROR_MESSAGE
        : 'Unable to submit your request. Please review your details and try again.'
    const message = validationMessage || result?.message
    const safeMessage = typeof message === 'string' && message.length <= 300 && !/stack\s*trace|exception|\bat\s+\S+\(/i.test(message)
      ? message : fallback
    throw new AuthRequestError(response.status >= 500 ? fallback : safeMessage)
  }

  return result
}

const accessRequestUrl = (path = '') => `${registrationEndpoint.replace(/\/+$/, '')}${path}`

const accessRequestAdminCall = async (path, method = 'GET') => {
  const token = getAccessToken()
  if (!token) throw new AuthRequestError('Please sign in to manage access requests.')

  let response
  try {
    const requestOptions = (requestMethod) => ({
      method: requestMethod,
      headers: {
        Accept: 'application/json',
        ...(requestMethod !== 'GET' ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      ...(requestMethod !== 'GET' ? { body: JSON.stringify({}) } : {}),
    })
    response = await fetchWithApiNotice(accessRequestUrl(path), requestOptions(method))
    if ((response.status === 405 || response.status === 415) && method === 'POST') {
      response = await fetchWithApiNotice(accessRequestUrl(path), requestOptions('PUT'))
      if (response.status === 405 || response.status === 415) {
        response = await fetchWithApiNotice(accessRequestUrl(path), requestOptions('PATCH'))
      }
    }
  } catch {
    throw new AuthRequestError('Unable to connect to the access-request service.')
  }

  const result = await readResponseBody(response)
  if (!response.ok || result?.success === false) {
    const message = result?.message || `Unable to complete the access-request action (${response.status}).`
    if (/invalid or inactive college/i.test(message)) {
      throw new AuthRequestError('This request is not linked to an active college. Activate the college and assign it to the access request before approving.')
    }
    throw new AuthRequestError(message)
  }
  return result.data ?? result
}

/* export */ const getAccessRequestStatus = (requestId) => accessRequestAdminCall(`/${encodeURIComponent(requestId)}/status`)
/* export */ const getPendingAccessRequests = () => accessRequestAdminCall('/pending')
/* export */ const approveAccessRequest = (requestId) => accessRequestAdminCall(`/${encodeURIComponent(requestId)}/approve`, 'POST')
/* export */ const rejectAccessRequest = (requestId) => accessRequestAdminCall(`/${encodeURIComponent(requestId)}/reject`, 'POST')
// #endregion auth/authApi.js
return {
  get AuthRequestError() { return AuthRequestError; },
  get login() { return login; },
  get generateOtp() { return generateOtp; },
  get resendOtp() { return resendOtp; },
  get sendOtp() { return sendOtp; },
  get verifyOtp() { return verifyOtp; },
  get resetPassword() { return resetPassword; },
  get register() { return register; },
  get getAccessRequestStatus() { return getAccessRequestStatus; },
  get getPendingAccessRequests() { return getPendingAccessRequests; },
  get approveAccessRequest() { return approveAccessRequest; },
  get rejectAccessRequest() { return rejectAccessRequest; }
};
})();

export const loginValidationModule = (() => {

/* Imports for isolated regression tests:

*/
// #region auth/loginValidation.js
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,}$/

/* export */ function validateLogin(values) {
  const identifier = values.identifier.trim()
  const identifierError = !identifier
    ? 'Email, mobile number or employee ID is required.'
    : (EMAIL_PATTERN.test(identifier) || INDIAN_MOBILE_PATTERN.test(identifier) || EMPLOYEE_ID_PATTERN.test(identifier))
      ? ''
      : 'Enter a valid email, mobile number or employee ID.'

  return {
    identifier: identifierError,
    password: !values.password
      ? 'Password is required.'
      : values.password.length < 8
        ? 'Password must be at least 8 characters.'
        : '',
  }
}
// #endregion auth/loginValidation.js
return {
  get validateLogin() { return validateLogin; }
};
})();

export const pageRequestsModule = (() => {
const { API_BASE_URL } = apiEndpointsModule;
const { getAccessToken } = authModule;
const { GENERIC_ERROR_MESSAGE } = userErrorModule;
const { createApiUnavailableError } = apiFailureNoticeModule;
const { notifyApiUnavailable } = apiFailureNoticeModule;
/* Imports for isolated regression tests:
import { API_BASE_URL } from './apiEndpoints'
import { getAccessToken } from '../auth/auth'
import { GENERIC_ERROR_MESSAGE } from '../utils/userError.js'
import { createApiUnavailableError, notifyApiUnavailable } from './apiFailureNotice'
*/
// #region api/pageRequests.js
/* export */ async function lookupPostalCode(pincode, signal) {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal })
  if (!response.ok) throw new Error('Lookup failed')
  return response.json()
}

/* export */ async function forgotPasswordFallback(identifier, originalError) {
  const response = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ identifier }),
  })
  if (response.status >= 500) {
    notifyApiUnavailable({ status: response.status })
    throw new Error(GENERIC_ERROR_MESSAGE)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !(data?.success || data?.data?.success)) throw originalError
  return {
    success: true,
    message: data?.message || data?.data?.message || 'Verification code sent successfully.',
    otp: data?.data?.otp || data?.otp || '',
  }
}

/* export */ async function electiveRequest(path, options = {}) {
  const token = getAccessToken()
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
  } catch {
    throw createApiUnavailableError()
  }
  let body = null
  try { body = await response.json() } catch { /* Empty successful responses are valid. */ }
  if (response.status >= 500) notifyApiUnavailable({ status: response.status })
  if (!response.ok || body?.success === false) {
    const messages = {
      401: 'Your session has expired. Please sign in again.',
      403: 'You do not have permission to perform this action.',
      404: path.includes('/allocations/report') ? 'No allocation report is available yet.' : path.includes('/profile/exam-results') ? 'No examination results are available.' : path.includes('/electives') ? 'No elective records are available yet.' : 'The requested information was not found.',
      500: GENERIC_ERROR_MESSAGE,
    }
    const error = new Error(response.status >= 500 ? GENERIC_ERROR_MESSAGE : messages[response.status] || body?.message || 'The request could not be completed.')
    error.status = response.status
    throw error
  }
  return body
}

/* export */ function electiveStudentExamResults(studentId) {
  return electiveRequest(`/api/v1/students/${encodeURIComponent(studentId)}/profile/exam-results`)
}
// #endregion api/pageRequests.js
return {
  get lookupPostalCode() { return lookupPostalCode; },
  get forgotPasswordFallback() { return forgotPasswordFallback; },
  get electiveRequest() { return electiveRequest; },
  get electiveStudentExamResults() { return electiveStudentExamResults; }
};
})();

export const registrationValidationModule = (() => {

/* Imports for isolated regression tests:

*/
// #region auth/registrationValidation.js
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/

/* export */ const passwordRequirements = [
  { label: 'At least 8 characters', test: value => value.length >= 8 },
  { label: 'One uppercase English letter (A-Z)', test: value => /[A-Z]/.test(value) },
  { label: 'One lowercase English letter (a-z)', test: value => /[a-z]/.test(value) },
  { label: 'One number (0-9)', test: value => /[0-9]/.test(value) },
  { label: 'One special character', test: value => /[^\p{L}\p{N}\s]/u.test(value) },
]

/* export */ function validateRegistration(values) {
  const fullName = values.fullName.trim()
  const email = values.email.trim()
  const mobile = values.mobile.trim()

  return {
    fullName: !fullName
      ? 'Full name is required.'
      : fullName.length < 2 || !/^\p{L}[\p{L}\p{M} .?'-]*$/u.test(fullName)
        ? 'Enter a valid full name.'
        : '',
    email: !email
      ? 'Email is required.'
      : !EMAIL_PATTERN.test(email)
        ? 'Enter a valid email address.'
        : '',
    mobile: !INDIAN_MOBILE_PATTERN.test(mobile)
      ? 'Enter a valid 10-digit mobile number.'
      : '',
    password: !values.password
      ? 'Password is required.'
      : !passwordRequirements.every(rule => rule.test(values.password))
        ? 'Password must meet all five requirements below.'
        : '',
    confirmPassword: !values.confirmPassword
      ? 'Please confirm your password.'
      : values.password !== values.confirmPassword
        ? 'Passwords do not match.'
        : '',
    terms: values.terms ? '' : 'Please accept the Terms & Conditions.',
  }
}
// #endregion auth/registrationValidation.js
return {
  get passwordRequirements() { return passwordRequirements; },
  get validateRegistration() { return validateRegistration; }
};
})();

export const roomServiceModule = (() => {
const { selectedCollegeId } = collegeScopeModule;
const { collegeStorageKey } = collegeScopeModule;
const { createCollegeScope } = collegeScopeModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
const { roomApi } = apiEndpointsModule;
/* Imports for isolated regression tests:
import { selectedCollegeId, collegeStorageKey, createCollegeScope } from '../utils/collegeScope.js'
import eventBus, { ERP_EVENTS } from './eventBus'
import { roomApi } from '../api/apiEndpoints'
*/
// #region services/roomService.js
const STORAGE_KEY_ROOMS = 'pirnav_academic_rooms'

/* export */ const ROOM_TYPES = [
  'Lecture Hall',
  'Classroom',
  'Computer Lab',
  'Electronics Lab',
  'Mechanical Workshop',
  'Physics / Chemistry Lab',
  'Seminar Hall',
  'Tutorial Room',
  'Auditorium',
  'Drawing Hall',
]

/* export */ const BUILDING_BLOCKS = [
  'Main Academic Block',
  'Science & Technology Block',
  'Engineering Block A',
  'Engineering Block B',
  'Central Administration Block',
  'R&D Innovation Hub',
  'Workshop Complex',
]

/* export */ const FLOORS = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
]

/* export */ const ROOM_FACILITIES = [
  'Projector & Screen',
  'Smart Digital Board',
  'Air Conditioned (AC)',
  'High-Speed Wi-Fi',
  'Audio & Microphone System',
  'LAN Network Ports',
  'Computer Workstations',
  'Power Backup / UPS',
  'CCTV Surveillance',
]

const DEFAULT_ROOMS = []


/* export */ const normalizeRoom = (r) => {
  if (!r || typeof r !== 'object') return null
  const rawId = r.classroomId ?? r.ClassroomId ?? r.ClassRoomId ?? r.id ?? r.Id ?? r.roomId ?? r.RoomId ?? ''
  const isNumericId = Number.isInteger(Number(rawId)) && Number(rawId) > 0
  const classroomId = isNumericId ? Number(rawId) : rawId
  const roomNumber = r.roomNumber ?? r.RoomNumber ?? r.roomCode ?? r.RoomCode ?? r.code ?? r.Code ?? ''
  const roomName = r.roomName ?? r.RoomName ?? r.name ?? r.Name ?? roomNumber
  const buildingBlock = r.buildingBlock ?? r.BuildingBlock ?? r.building ?? r.Building ?? r.block ?? r.Block ?? 'Main Academic Block'
  const floor = r.floor ?? r.Floor ?? r.floorLevel ?? r.FloorLevel ?? 'Ground Floor'
  const roomType = r.roomType ?? r.RoomType ?? r.type ?? r.Type ?? 'Lecture Hall'
  const capacity = Number(r.capacity ?? r.Capacity ?? r.seatingCapacity ?? r.SeatingCapacity ?? 60) || 60
  let facilities = r.facilities ?? r.Facilities ?? r.amenities ?? r.Amenities ?? []
  if (typeof facilities === 'string') {
    facilities = facilities.split(',').map(s => s.trim()).filter(Boolean)
  }
  const department = r.department ?? r.Department ?? r.departmentName ?? r.DepartmentName ?? 'General / Shared'
  const assignedSection = r.assignedSection ?? r.AssignedSection ?? r.sectionName ?? r.SectionName ?? r.section ?? r.Section ?? ''
  const sectionId = r.sectionId ?? r.SectionId ?? null
  let status = r.status ?? r.Status ?? (assignedSection ? 'Allocated' : 'Available')
  if (typeof status === 'number' || typeof status === 'boolean') {
    status = status === 1 || status === true ? (assignedSection ? 'Allocated' : 'Available') : 'Inactive'
  }
  const description = r.description ?? r.Description ?? r.notes ?? r.Notes ?? r.remarks ?? r.Remarks ?? ''
  const createdAt = r.createdAt ?? r.CreatedAt ?? r.created_at ?? new Date().toISOString()
  const updatedAt = r.updatedAt ?? r.UpdatedAt ?? r.updated_at ?? new Date().toISOString()

  return {
    collegeId: r.collegeId ?? r.CollegeId ?? r.college_id ?? null,
    departmentId: r.departmentId ?? r.DepartmentId ?? null,
    id: String(classroomId || roomNumber),
    classroomId: classroomId || roomNumber,
    sectionId: sectionId ? Number(sectionId) : null,
    roomNumber,
    roomName,
    buildingBlock,
    floor,
    roomType,
    capacity,
    facilities: Array.isArray(facilities) ? facilities : [],
    department,
    status,
    assignedSection,
    description,
    createdAt,
    updatedAt,
  }
}

const roomPayload = (data, collegeId = selectedCollegeId()) => ({
  collegeId,
  departmentId: data.departmentId || null,
  roomNumber: String(data.roomNumber || data.code || '').trim().toUpperCase(),
  roomName: String(data.roomName || data.name || '').trim(),
  buildingBlock: data.buildingBlock || data.building || 'Main Academic Block',
  floor: data.floor || 'Ground Floor',
  roomType: data.roomType || 'Lecture Hall',
  capacity: Number(data.capacity) || 60,
  facilities: Array.isArray(data.facilities) ? data.facilities : typeof data.facilities === 'string' ? data.facilities.split(',').map(s => s.trim()).filter(Boolean) : [],
  department: data.department || 'General / Shared',
  status: data.status || 'Available',
  assignedSection: data.assignedSection || null,
  description: data.description || null,
})

class RoomService {
  getStoredRooms(collegeId = selectedCollegeId()) {
    try {
      const stored = localStorage.getItem(collegeStorageKey(STORAGE_KEY_ROOMS, collegeId))
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return createCollegeScope(collegeId)(parsed.map(normalizeRoom).filter(Boolean))
        }
      }
    } catch (e) {
      console.error('Error reading rooms from storage', e)
    }
    this.saveRooms(DEFAULT_ROOMS, collegeId)
    return DEFAULT_ROOMS.map(normalizeRoom)
  }

  async getRooms(params = {}) {
    const collegeId = selectedCollegeId()
    if (!collegeId) return []
    try {
      const apiRooms = await roomApi.getAll({ ...params, collegeId })
      if (!Array.isArray(apiRooms)) throw new Error('Invalid rooms response.')
      const cached = this.getStoredRooms(collegeId)
      const normalized = apiRooms.map(normalizeRoom).filter(Boolean).map(room => {
        // Preserve ownership confirmed when this college created the room.
        const known = cached.find(item => item.id === room.id)
        if (!known) return room

        const apiHasAllocation = Boolean(room.assignedSection || room.sectionId)
        const cachedHasAllocation = Boolean(known.assignedSection || known.sectionId)
        const mergedRoom = !apiHasAllocation && cachedHasAllocation
          ? {
              ...room,
              assignedSection: known.assignedSection,
              sectionId: known.sectionId,
              status: 'Allocated',
              updatedAt: known.updatedAt || room.updatedAt,
            }
          : room

        return mergedRoom.collegeId || !known.collegeId
          ? mergedRoom
          : { ...mergedRoom, collegeId: known.collegeId }
      })
      const scoped = createCollegeScope(collegeId)(normalized)
      this.saveRooms(scoped, collegeId)
      return scoped
    } catch (err) {
      console.warn('Backend rooms API unavailable, using this college cache:', err?.message || err)
      return this.getStoredRooms(collegeId)
    }
  }

  async getOptions() {
    try {
      const options = await roomApi.getOptions()
      if (options && typeof options === 'object') return options
    } catch (err) {
      console.warn('Backend room options API unavailable, using default options:', err?.message || err)
    }
    return {
      buildingBlocks: BUILDING_BLOCKS,
      roomTypes: ROOM_TYPES,
      floors: FLOORS,
      facilities: ROOM_FACILITIES,
    }
  }

  saveRooms(rooms, collegeId = selectedCollegeId()) {
    try {
      localStorage.setItem(collegeStorageKey(STORAGE_KEY_ROOMS, collegeId), JSON.stringify(createCollegeScope(collegeId)(rooms)))
      if (eventBus && ERP_EVENTS) {
        eventBus.emit(ERP_EVENTS.DATA_CHANGED, { entity: 'rooms', count: rooms.length })
      }
    } catch (e) {
      console.error('Error saving rooms to storage', e)
    }
  }

  async getRoomById(id) {
    const collegeId = selectedCollegeId()
    try {
      const res = await roomApi.getById(id)
      if (res) {
        const room = normalizeRoom(res)
        const known = this.getStoredRooms(collegeId).find(item => item.id === room.id)
        return createCollegeScope(collegeId)([{ ...room, collegeId: room.collegeId || known?.collegeId }])[0] || null
      }
    } catch (err) {
      console.warn(`Backend room ${id} detail failed, falling back to local:`, err?.message || err)
    }
    const rooms = this.getStoredRooms(collegeId)
    return rooms.find((r) => String(r.id) === String(id) || String(r.roomNumber) === String(id)) || null
  }

  async createRoom(data) {
    const collegeId = selectedCollegeId()
    const payload = roomPayload(data, collegeId)
    let createdRoom = null
    try {
      const apiRes = await roomApi.create(payload)
      if (apiRes) createdRoom = normalizeRoom({ ...payload, ...apiRes, collegeId })
    } catch (err) {
      console.warn('Backend create room API failed or fallback:', err?.message || err)
    }

    if (!createdRoom) {
      const id = data.id || `ROOM-${String(Date.now()).slice(-4)}`
      createdRoom = normalizeRoom({
        ...payload,
        id,
        classroomId: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    const rooms = this.getStoredRooms(collegeId)
    const updated = [createdRoom, ...rooms.filter(r => r.id !== createdRoom.id && r.roomNumber !== createdRoom.roomNumber)]
    this.saveRooms(updated, collegeId)
    return createdRoom
  }

  async updateRoom(id, data) {
    const collegeId = selectedCollegeId()
    const payload = roomPayload(data, collegeId)
    let updatedRoom = null
    try {
      const apiRes = await roomApi.update(id, payload)
      if (apiRes) updatedRoom = normalizeRoom({ ...payload, ...apiRes, collegeId })
    } catch (err) {
      console.warn(`Backend update room ${id} failed or fallback:`, err?.message || err)
    }

    const rooms = this.getStoredRooms(collegeId)
    const index = rooms.findIndex((r) => String(r.id) === String(id) || String(r.roomNumber) === String(id))

    if (!updatedRoom) {
      if (index === -1) throw new Error('Room not found.')
      updatedRoom = normalizeRoom({
        ...rooms[index],
        ...payload,
        updatedAt: new Date().toISOString(),
      })
    }

    if (index !== -1) {
      rooms[index] = updatedRoom
    } else {
      rooms.unshift(updatedRoom)
    }
    this.saveRooms(rooms, collegeId)
    return updatedRoom
  }

  async deleteRoom(id) {
    const collegeId = selectedCollegeId()
    try {
      await roomApi.delete(id)
    } catch (err) {
      console.warn(`Backend delete room ${id} failed or fallback:`, err?.message || err)
    }
    const rooms = this.getStoredRooms(collegeId)
    const filtered = rooms.filter((r) => String(r.id) !== String(id) && String(r.classroomId) !== String(id) && String(r.roomNumber) !== String(id))
    this.saveRooms(filtered, collegeId)
    return true
  }

  async allocateRoom(roomId, sectionName, sectionId) {
    const collegeId = selectedCollegeId()
    try {
      if (sectionName && sectionName.trim()) {
        const payload = sectionId ? { sectionId: Number(sectionId), sectionName: sectionName.trim() } : { sectionName: sectionName.trim() }
        await roomApi.allocate(roomId, payload)
      } else {
        await roomApi.deallocate(roomId)
      }
    } catch (err) {
      console.warn(`Backend allocate room ${roomId} failed or fallback:`, err?.message || err)
    }

    const rooms = this.getStoredRooms(collegeId)
    const index = rooms.findIndex((r) => String(r.id) === String(roomId) || String(r.roomNumber) === String(roomId) || String(r.classroomId) === String(roomId))
    if (index !== -1) {
      rooms[index].assignedSection = sectionName || ''
      rooms[index].sectionId = sectionId ? Number(sectionId) : null
      rooms[index].status = sectionName ? 'Allocated' : 'Available'
      rooms[index].updatedAt = new Date().toISOString()
      this.saveRooms(rooms, collegeId)
    }
  }
}

const roomService = new RoomService()
/* export default roomService */
// #endregion services/roomService.js
return {
  get ROOM_TYPES() { return ROOM_TYPES; },
  get BUILDING_BLOCKS() { return BUILDING_BLOCKS; },
  get FLOORS() { return FLOORS; },
  get ROOM_FACILITIES() { return ROOM_FACILITIES; },
  get normalizeRoom() { return normalizeRoom; },
  get default() { return roomService; }
};
})();

export const studentCanonicalModelModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/studentCanonicalModel.js
/**
 * Canonical Data Model & Utilities for Student Admissions and Student Profiles.
 * Single source of truth across Add, Edit, View, Review/Approval, and Profile.
 */

/* export */ const API_BASE_URL_FALLBACK = 'https://clarity-math-delouse.ngrok-free.dev'

/* export */ const apiAssetUrl = (value) => {
  if (!value || ['string', 'null', 'undefined'].includes(String(value).trim().toLowerCase())) return ''
  const str = String(value).trim()
  if (/^(?:https?:|data:|blob:)/i.test(str)) return str
  const base = String(import.meta.env?.VITE_API_BASE_URL || (import.meta.env?.DEV ? '' : API_BASE_URL_FALLBACK)).replace(/\/+$/, '')
  if (import.meta.env?.DEV && !base) return str.startsWith('/') ? str : `/${str}`
  return `${base}/${str.replace(/^\/+/, '')}`
}

/* export */ const firstFilled = (...values) =>
  values.find((item) => item !== null && item !== undefined && (typeof item !== 'string' || item.trim() !== ''))

// Master-data references can be returned either as a display string or as a
// nested object, depending on the endpoint. Keep table labels readable in
// both cases instead of allowing an empty/missing alias to hide the value.
/* export */ const referenceLabel = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue
    if (typeof value === 'string' || typeof value === 'number') {
      if (String(value).trim()) return String(value).trim()
      continue
    }
    if (typeof value === 'object') {
      const label = firstFilled(
        value.name,
        value.collegeName,
        value.institutionName,
        value.displayName,
        value.title,
      )
      if (label !== undefined && String(label).trim()) return String(label).trim()
    }
  }
  return ''
}

/* export */ const photoStorageKey = (kind, id) => `pirnav-${kind}-photo-${id}`

/* export */ const readStoredPhoto = (kind, id) => {
  try {
    return id ? localStorage.getItem(photoStorageKey(kind, id)) || '' : ''
  } catch {
    return ''
  }
}

/* export */ const saveStoredPhoto = (kind, id, photo) => {
  try {
    if (!id) return
    if (photo) localStorage.setItem(photoStorageKey(kind, id), photo)
    else localStorage.removeItem(photoStorageKey(kind, id))
  } catch { /* storage fallback */ }
}

/* export */ const saveAdmissionPhoto = (id, photo) => {
  saveStoredPhoto('admission', id, photo)
  saveStoredPhoto('student-profile', id, photo)
}

/* export */ const readAdmissionPhoto = (id) => {
  return readStoredPhoto('admission', id) || readStoredPhoto('student-profile', id)
}

/* export */ const firstPhoto = (...values) => {
  for (const item of values) {
    if (typeof item === 'string' && item.trim()) {
      const lower = item.trim().toLowerCase()
      if (!['null', 'undefined', 'n/a', '-', '[object object]'].includes(lower)) {
        return apiAssetUrl(item.trim())
      }
    }
  }
  return ''
}

/* export */ const blankAddress = () => ({
  line1: '',
  line2: '',
  town: '',
  city: '',
  district: '',
  state: '',
  country: 'India',
  pincode: '',
})

/* export */ const normalizeAddressObj = (addr) => {
  if (!addr) return blankAddress()
  if (typeof addr === 'string') {
    const trimmed = addr.trim()
    if (/^\s*\[object Object\]\s*$/i.test(trimmed) || ['null', 'undefined', 'n/a', '-'].includes(trimmed.toLowerCase())) return blankAddress()
    return { line1: trimmed, line2: '', town: '', city: '', district: '', state: '', country: 'India', pincode: '' }
  }
  if (typeof addr === 'object' && addr !== null) {
    const nested = [addr.currentAddress, addr.permanentAddress, addr.address, addr.value, addr.details].find((item) => item && typeof item === 'object')
    if (nested) {
      return normalizeAddressObj({
        ...nested,
        ...Object.fromEntries(Object.entries(addr).filter(([, item]) => typeof item !== 'object')),
      })
    }
    const line1 = firstFilled(addr.line1, addr.addressLine1, addr.currentAddressLine1, addr.permanentAddressLine1, addr.address, addr.street, addr.line_1, addr.address_line_1, '')
    const line2 = firstFilled(addr.line2, addr.addressLine2, addr.currentAddressLine2, addr.permanentAddressLine2, addr.landmark, addr.line_2, addr.address_line_2, '')
    const town = firstFilled(addr.town, addr.village, addr.townVillage, addr.currentTown, addr.permanentTown, addr.currentVillage, addr.permanentVillage, '')
    const city = firstFilled(addr.city, addr.currentCity, addr.permanentCity, addr.block, addr.townCity, '')
    const district = firstFilled(addr.district, addr.currentDistrict, addr.permanentDistrict, addr.dist, '')
    const state = firstFilled(addr.state, addr.currentState, addr.permanentState, '')
    const country = firstFilled(addr.country, addr.currentCountry, addr.permanentCountry, 'India')
    const pincode = firstFilled(addr.pincode, addr.currentPincode, addr.permanentPincode, addr.postalCode, addr.currentPostalCode, addr.permanentPostalCode, addr.postal_code, addr.zip, addr.zipCode, '')
    return {
      line1: String(line1 || ''),
      line2: String(line2 || ''),
      town: String(town || ''),
      city: String(city || ''),
      district: String(district || ''),
      state: String(state || ''),
      country: String(country || 'India'),
      pincode: String(pincode || ''),
    }
  }
  return blankAddress()
}

/* export */ const formatAddress = (item) => {
  if (!item) return ''
  if (typeof item === 'string') {
    const str = item.trim()
    if (/^\s*\[object Object\]\s*$/i.test(str) || ['null', 'undefined', 'n/a', '-'].includes(str.toLowerCase())) return ''
    return str
  }
  if (typeof item === 'object' && item !== null) {
    const clean = (val) => (typeof val === 'string' && !/^\s*\[object Object\]\s*$/i.test(val) && !['null', 'undefined', 'n/a', '-'].includes(val.trim().toLowerCase()) ? val.trim() : typeof val === 'number' ? String(val) : '')
    const parts = [
      item.line1,
      item.addressLine1,
      item.currentAddressLine1,
      item.permanentAddressLine1,
      item.street,
      item.line2,
      item.addressLine2,
      item.currentAddressLine2,
      item.permanentAddressLine2,
      item.town,
      item.village,
      item.currentTown,
      item.permanentTown,
      item.city,
      item.currentCity,
      item.permanentCity,
      item.district,
      item.currentDistrict,
      item.permanentDistrict,
      item.state,
      item.currentState,
      item.permanentState,
      item.country && item.country !== 'India' ? item.country : '',
      item.pincode,
      item.currentPincode,
      item.permanentPincode,
      item.postalCode,
      item.zip,
    ]
      .map(clean)
      .filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
    if (item.address && typeof item.address !== 'object') return clean(item.address)
    if (item.fullAddress && typeof item.fullAddress !== 'object') return clean(item.fullAddress)
  }
  return ''
}

/* export */ const splitFullName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts.at(-1) : '',
  }
}

/* export */ const dateInputValue = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const dayFirst = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

/* export */ const tenDigitMobile = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

/* export */ const normalizeAdmissionStatus = (raw) => {
  const str = String(raw || 'DRAFT').trim().replaceAll(' ', '_').toUpperCase()
  if (['APPLICATION_SUBMITTED', 'SUBMITTED', 'SUBMIT'].includes(str)) return 'SUBMITTED'
  if (['UNDER_REVIEW', 'IN_REVIEW', 'REVIEWING'].includes(str)) return 'UNDER_REVIEW'
  if (['CORRECTION_REQUIRED', 'CORRECTION', 'NEEDS_CORRECTION'].includes(str)) return 'CORRECTION_REQUIRED'
  if (['VERIFIED', 'VERIFY'].includes(str)) return 'VERIFIED'
  if (['APPROVED', 'APPROVE', 'ENROLLED', 'ADMITTED'].includes(str)) return 'APPROVED'
  if (['REJECTED', 'REJECT'].includes(str)) return 'REJECTED'
  if (['DRAFT'].includes(str)) return 'DRAFT'
  return str
}

/* export */ const DOCUMENTS_CONFIG = [
  ['aadhaarCard', 'Aadhaar Card'],
  ['tenthMemo', '10th / SSC Marks Memo'],
  ['qualifyingMemo', 'Intermediate / Diploma Marks Memo'],
  ['transferCertificate', 'Transfer Certificate'],
  ['casteCertificate', 'Caste Certificate'],
  ['incomeCertificate', 'Income Certificate'],
]

/* export */ const HOSTEL_FEES = {
  'Single Room': 45000,
  'Double Sharing': 35000,
  'Triple Sharing': 28000,
  'Four Sharing': 22000,
}
/* export */ const HOSTEL_FEES_DEFAULT = HOSTEL_FEES

/* export */ const TRANSPORT_FEES = {
  'Route 1 - City Center': 12000,
  'Route 2 - North Suburbs': 15000,
  'Route 3 - South Suburbs': 15000,
  'Route 4 - East District': 18000,
  'Route 5 - West District': 18000,
}
/* export */ const TRANSPORT_FEES_DEFAULT = TRANSPORT_FEES

/* export */ const normalizeFeeSummary = (response) => {
  if (!response || typeof response !== 'object') {
    return {
      components: [],
      tuitionFee: 0,
      admissionFee: 0,
      hostelFee: 0,
      transportFee: 0,
      scholarshipAmount: 0,
      totalFee: 0,
      paymentStatus: 'Pending',
      paymentPlan: 'Full Payment',
    }
  }
  const nested = response.feeSummary ?? response.summary ?? response.feeDetails ?? response.feeStructure ?? {}
  const summary = { ...(typeof nested === 'object' ? nested : {}), ...response }
  const componentSource = summary.components ?? summary.feeComponents ?? summary.feeHeads ?? summary.feeHeadDetails ?? summary.feeStructureDetails ?? summary.feeBreakdown ?? summary.breakdown ?? summary.feeItems ?? summary.items ?? summary.fees ?? []
  const components = (Array.isArray(componentSource) ? componentSource : []).map((item) => ({ ...item, name: item.name ?? item.feeHeadName ?? item.feeName ?? item.componentName ?? item.description, amount: item.amount ?? item.feeAmount ?? item.amountPayable ?? item.totalAmount ?? item.value ?? item.fee }))
  const componentAmount = (pattern) => components.filter((item) => pattern.test(String(item.name || ''))).reduce((total, item) => total + Number(item.amount || 0), 0)
  const componentsTotal = components.reduce((total, item) => total + Number(item.amount || 0), 0)
  const tuition = Number(summary.tuitionFee ?? summary.tuitionAmount ?? summary.academicFee) > 0 ? Number(summary.tuitionFee ?? summary.tuitionAmount ?? summary.academicFee) : (componentAmount(/tuition|academic/i) || 0)
  const admission = Number(summary.admissionFee ?? summary.admissionAmount ?? summary.registrationFee ?? summary.oneTimeFee) > 0 ? Number(summary.admissionFee ?? summary.admissionAmount ?? summary.registrationFee ?? summary.oneTimeFee) : (componentAmount(/admission|registration/i) || 0)
  const hostel = Number((summary.hostelFee ?? summary.hostelAmount) || 0)
  const transport = Number((summary.transportFee ?? summary.transportationFee ?? summary.transportAmount) || 0)
  const scholarship = Number((summary.scholarshipAmount ?? summary.discountAmount ?? summary.concessionAmount) || 0)
  const computedTotal = Math.max(0, tuition + admission + hostel + transport - scholarship)
  const total = Number(summary.firstYearTotal ?? summary.totalFee ?? summary.totalAmount ?? summary.grandTotal ?? summary.netPayable ?? summary.totalPayable ?? summary.netAmount ?? summary.payableAmount) > 0 ? Number(summary.firstYearTotal ?? summary.totalFee ?? summary.totalAmount ?? summary.grandTotal ?? summary.netPayable ?? summary.totalPayable ?? summary.netAmount ?? summary.payableAmount) : (componentsTotal > 0 ? componentsTotal : computedTotal)
  return {
    ...summary,
    feeStructureId: summary.feeStructureId ?? summary.structureId ?? summary.feeStructure?.feeStructureId ?? summary.feeStructure?.id ?? 'FS-STANDARD',
    structureId: summary.structureId ?? summary.feeStructureId ?? summary.feeStructure?.id ?? 'FS-STANDARD',
    components: Array.isArray(components) ? components : [],
    tuitionFee: tuition,
    admissionFee: admission,
    hostelFee: hostel,
    transportFee: transport,
    scholarshipAmount: scholarship,
    totalFee: total,
    paymentStatus: summary.paymentStatus || 'Pending',
    paymentPlan: summary.paymentPlan || 'Full Payment',
  }
}

/* export */ const hasFeeSummary = (response) => {
  if (!response || typeof response !== 'object') return false
  const summary = normalizeFeeSummary(response)
  const componentAmount = (summary.components || []).reduce((total, item) => total + Number(item.amount ?? item.feeAmount ?? item.value ?? 0), 0)
  const summaryAmount = [summary.tuitionFee, summary.admissionFee, summary.totalFee].reduce((total, value) => total + Number(value || 0), 0)
  return componentAmount > 0 || summaryAmount > 0
}

/* export */ const mergeFeeResponses = (summaryResponse, structureResponse) => {
  const summary = normalizeFeeSummary(summaryResponse)
  const structure = normalizeFeeSummary(structureResponse)
  const amount = (summaryValue, structureValue) => (Number(summaryValue) > 0 ? summaryValue : structureValue)
  const structureComps = Array.isArray(structure.components) ? structure.components : []
  const summaryComps = Array.isArray(summary.components) ? summary.components : []
  return normalizeFeeSummary({
    ...structure,
    ...summary,
    components: structureComps.length ? structureComps : summaryComps,
    feeComponents: structure.feeComponents?.length ? structure.feeComponents : summary.feeComponents,
    tuitionFee: amount(summary.tuitionFee, structure.tuitionFee),
    admissionFee: amount(summary.admissionFee, structure.admissionFee),
    hostelFee: amount(summary.hostelFee, structure.hostelFee),
    transportFee: amount(summary.transportFee, structure.transportFee),
    scholarshipAmount: amount(summary.scholarshipAmount, structure.scholarshipAmount),
    totalFee: amount(summary.totalFee, structure.totalFee),
  })
}

/* export */ const defaultFeeSummary = (data = {}) => {
  const fees = data.fees || {}
  const admission = data.admission || {}
  const tuition = Number(fees.tuitionFee) > 0 ? Number(fees.tuitionFee) : 50000
  const admissionFee = Number(fees.admissionFee !== undefined && fees.admissionFee !== '' ? fees.admissionFee : 4000)
  const hostelFee = admission.hostel === 'Yes' ? Number(HOSTEL_FEES[admission.hostelRoomType] || fees.hostelFee || 0) : 0
  const transportFee = admission.transport === 'Yes' ? Number(TRANSPORT_FEES[admission.transportRoute] || fees.transportFee || 0) : 0
  const scholarshipAmount = Number(fees.scholarshipAmount || 0)
  const total = Math.max(0, tuition + admissionFee + hostelFee + transportFee - scholarshipAmount)
  return {
    structureId: fees.structureId || fees.feeStructureId || 'FS-STANDARD',
    feeStructureId: fees.feeStructureId || fees.structureId || 'FS-STANDARD',
    tuitionFee: tuition,
    admissionFee: admissionFee,
    hostelFee,
    transportFee,
    scholarshipAmount,
    totalFee: total,
    paymentStatus: fees.paymentStatus || 'Pending',
    paymentPlan: fees.paymentPlan || 'Full Payment',
    components: Array.isArray(fees.components) ? fees.components : [],
    source: 'standard',
  }
}

/* export */ const resolveFeeSummary = (data = {}, summaryResponse = null, structureResponse = null) => {
  const backend = mergeFeeResponses(summaryResponse, structureResponse)
  if (hasFeeSummary(backend)) {
    return {
      ...backend,
      admissionFee: Number(backend.admissionFee) > 0 ? backend.admissionFee : (data.fees?.admissionFee || 4000),
      tuitionFee: Number(backend.tuitionFee) > 0 ? backend.tuitionFee : (data.fees?.tuitionFee || 50000),
      totalFee: Number(backend.totalFee) > 0 ? backend.totalFee : (Number(backend.tuitionFee || 50000) + Number(backend.admissionFee || 4000)),
      paymentPlan: data.fees?.paymentPlan || backend.paymentPlan || 'Full Payment',
      paymentStatus: data.fees?.paymentStatus || backend.paymentStatus || 'Pending',
      source: 'backend',
    }
  }
  return defaultFeeSummary(data)
}

/* export */ const createEmptyCanonicalStudent = () => {
  const regNumber = `REG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}`,
    admissionId: '',
    studentId: '',
    studentCode: '',
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    remarks: '',
    application: {
      number: regNumber,
      registrationNumber: regNumber,
      admissionNumber: '',
      date: new Date().toISOString().slice(0, 10),
      registrationDate: new Date().toISOString().slice(0, 10),
      admissionDate: '',
    },
    personal: {
      firstName: '',
      middleName: '',
      lastName: '',
      fullName: '',
      gender: '',
      dob: '',
      bloodGroup: '',
      nationality: 'Indian',
      aadhaar: '',
      photo: '',
      photoUrl: '',
    },
    contact: {
      mobile: '',
      alternateMobile: '',
      email: '',
      alternateEmail: '',
      sameAddress: true,
      currentAddress: blankAddress(),
      permanentAddress: blankAddress(),
    },
    parents: {
      father: {
        name: '',
        mobile: '',
        email: '',
        occupation: '',
        qualification: '',
        income: '',
      },
      mother: {
        name: '',
        mobile: '',
        email: '',
        occupation: '',
        qualification: '',
        income: '',
      },
      guardian: {
        name: '',
        relationship: '',
        relationshipOther: '',
        mobile: '',
        email: '',
        occupation: '',
        qualification: '',
        income: '',
      },
      primaryContact: 'Father',
      emergencyMobile: '',
    },
    academic: {
      academicYearId: '',
      academicYear: '',
      admissionType: '',
      quota: '',
      quotaOther: '',
      courseId: '',
      course: '',
      courseCode: '',
      departmentId: '',
      department: '',
      branchId: '',
      branch: '',
      branchCode: '',
      semesterId: '',
      semester: '',
      sectionId: '',
      section: '',
      studentCategory: '',
      regulation: '',
      entryType: '',
      yearOfStudy: '',
      rollNumber: '',
    },
    previousEducation: {
      tenth: {
        board: '',
        institution: '',
        rollNumber: '',
        passingYear: '',
        scoreType: '',
        score: '',
      },
      intermediate: {
        qualification: '',
        board: '',
        institution: '',
        rollNumber: '',
        passingYear: '',
        stream: '',
        streamOther: '',
        scoreType: '',
        score: '',
      },
    },
    admission: {
      collegeId: '',
      college: '',
      batch: `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`,
      scholarship: 'No',
      scholarshipType: '',
      hostel: 'No',
      hostelPreference: '',
      hostelRoomType: '',
      transport: 'No',
      transportRoute: '',
    },
    fees: {
      structureId: 'FS-STANDARD',
      feeStructureId: 'FS-STANDARD',
      tuitionFee: '50000',
      admissionFee: '4000',
      scholarshipAmount: '',
      hostelFee: '',
      transportFee: '',
      totalFee: '54000',
      paymentStatus: 'Pending',
      paymentPlan: 'Full Payment',
      components: [],
    },
    documents: {
      ...Object.fromEntries(DOCUMENTS_CONFIG.map(([key]) => [key, null])),
      otherCertificates: [],
    },
    activity: [{ label: 'Application created', date: new Date().toISOString() }],
  }
}

/* export */ const normalizeCanonicalStudent = (source = {}) => {
  if (!source || typeof source !== 'object') return createEmptyCanonicalStudent()
  const base = createEmptyCanonicalStudent()

  const raw = source.data && typeof source.data === 'object' && !Array.isArray(source.data) ? { ...source, ...source.data } : source
  const header = raw.header ?? {}
  const summary = raw.summary ?? {}
  const formDataObj = typeof raw.formData === 'string' ? (() => { try { return JSON.parse(raw.formData) } catch { return {} } })() : (raw.formData && typeof raw.formData === 'object' ? raw.formData : {})
  const personalRaw = { ...(formDataObj.personal || {}), ...(raw.personalInformation ?? raw.personal ?? {}) }
  const contactRaw = { ...(formDataObj.contact || {}), ...(raw.contactInformation ?? raw.contact ?? {}) }
  const parentRaw = { ...(formDataObj.parents || {}), ...(raw.parentGuardianInformation ?? raw.parentDetails ?? raw.parents ?? {}) }
  const academicRaw = { ...(formDataObj.academic || {}), ...(raw.academicInformation ?? raw.academicDetails ?? raw.academic ?? {}) }
  const previousRaw = { ...(formDataObj.previousEducation || {}), ...(raw.previousEducationDetails ?? raw.previousEducation ?? {}) }
  const admissionRaw = { ...(formDataObj.admission || {}), ...(raw.admissionDetails ?? raw.admission ?? {}) }
  const feeRaw = { ...(formDataObj.fees || {}), ...(raw.feeSummary ?? raw.feeDetails ?? raw.fees ?? {}) }

  const admissionId = String(firstFilled(raw.admissionId, raw.studentAdmissionId, raw.application?.admissionId, admissionRaw.admissionId, raw.id, base.id))
  const studentId = String(firstFilled(raw.studentId, raw.student?.studentId, raw.student?.id, header.studentId, personalRaw.studentId, ''))
  const status = normalizeAdmissionStatus(firstFilled(raw.status, raw.admissionStatus, raw.applicationStatus, raw.currentStatus, header.status, summary.studentStatus, 'DRAFT'))

  // Names
  const parsedName = splitFullName(firstFilled(raw.studentName, raw.fullName, personalRaw.fullName, header.studentName, ''))
  const firstName = firstFilled(personalRaw.firstName, raw.firstName, parsedName.firstName) ?? ''
  const middleName = firstFilled(personalRaw.middleName, raw.middleName, parsedName.middleName) ?? ''
  const lastName = firstFilled(personalRaw.lastName, raw.lastName, parsedName.lastName) ?? ''
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || firstFilled(personalRaw.fullName, raw.fullName, raw.studentName, '')

  // Photo resolution
  const photo = firstPhoto(
    raw.profilePhoto,
    raw.profilePhotoUrl,
    raw.photo,
    raw.photoUrl,
    raw.studentPhoto,
    header.profilePhoto,
    header.photo,
    personalRaw.profilePhoto,
    personalRaw.photo,
    personalRaw.photoUrl,
    personalRaw.profilePhotoUrl,
  )

  // Address
  const flatCurrent = {
    line1: firstFilled(raw.currentAddressLine1, raw.addressLine1, raw.currentAddress?.line1, contactRaw.currentAddress?.line1, raw.address, personalRaw.address, contactRaw.address, raw.currentAddress),
    line2: firstFilled(raw.currentAddressLine2, raw.addressLine2, raw.currentAddress?.line2, contactRaw.currentAddress?.line2, raw.landmark, raw.currentLandmark),
    town: firstFilled(raw.currentTown, raw.currentVillage, raw.town, raw.village, raw.townVillage, raw.currentAddress?.town, contactRaw.currentAddress?.town),
    city: firstFilled(raw.currentCity, raw.city, personalRaw.city, contactRaw.city, raw.currentAddress?.city, contactRaw.currentAddress?.city),
    district: firstFilled(raw.currentDistrict, raw.district, personalRaw.district, contactRaw.district, raw.currentAddress?.district, contactRaw.currentAddress?.district),
    state: firstFilled(raw.currentState, raw.state, personalRaw.state, contactRaw.state, raw.currentAddress?.state, contactRaw.currentAddress?.state),
    country: firstFilled(raw.currentCountry, raw.country, personalRaw.country, contactRaw.country, raw.currentAddress?.country, contactRaw.currentAddress?.country, 'India'),
    pincode: firstFilled(raw.currentPincode, raw.currentPostalCode, raw.pincode, raw.postalCode, raw.zip, personalRaw.pincode, contactRaw.pincode, raw.currentAddress?.pincode, contactRaw.currentAddress?.pincode),
  }
  const flatPermanent = {
    line1: firstFilled(raw.permanentAddressLine1, raw.permanentAddress?.line1, contactRaw.permanentAddress?.line1, raw.permanentAddress, personalRaw.permanentAddress, contactRaw.permanentAddress),
    line2: firstFilled(raw.permanentAddressLine2, raw.permanentAddress?.line2, contactRaw.permanentAddress?.line2, raw.permanentLandmark),
    town: firstFilled(raw.permanentTown, raw.permanentVillage, raw.permanentTownVillage, raw.permanentAddress?.town, contactRaw.permanentAddress?.town),
    city: firstFilled(raw.permanentCity, raw.permanentAddressCity, raw.permanentAddress?.city, contactRaw.permanentAddress?.city),
    district: firstFilled(raw.permanentDistrict, raw.permanentAddressDistrict, raw.permanentAddress?.district, contactRaw.permanentAddress?.district),
    state: firstFilled(raw.permanentState, raw.permanentAddressState, raw.permanentAddress?.state, contactRaw.permanentAddress?.state),
    country: firstFilled(raw.permanentCountry, raw.permanentAddressCountry, raw.permanentAddress?.country, contactRaw.permanentAddress?.country, 'India'),
    pincode: firstFilled(raw.permanentPincode, raw.permanentPostalCode, raw.permanentZip, raw.permanentAddress?.pincode, contactRaw.permanentAddress?.pincode),
  }

  const currentAddressObj = normalizeAddressObj(contactRaw.currentAddress || raw.currentAddress || personalRaw.currentAddress || personalRaw.address || raw.address)
  const currentAddress = {
    ...base.contact.currentAddress,
    ...flatCurrent,
    ...Object.fromEntries(Object.entries(currentAddressObj).filter(([, v]) => v !== '' && v !== null && v !== undefined)),
  }

  const permanentAddressObj = normalizeAddressObj(contactRaw.permanentAddress || raw.permanentAddress || personalRaw.permanentAddress)
  const permanentAddress = {
    ...base.contact.permanentAddress,
    ...flatPermanent,
    ...Object.fromEntries(Object.entries(permanentAddressObj).filter(([, v]) => v !== '' && v !== null && v !== undefined)),
  }

  const hasPerm = Boolean(formatAddress(permanentAddress))
  const sameAddress = contactRaw.sameAddress !== undefined ? Boolean(contactRaw.sameAddress) : raw.sameAddress !== undefined ? Boolean(raw.sameAddress) : !hasPerm

  // Dates & Registration Numbers
  const regNumber = firstFilled(raw.registrationNumber, raw.application?.registrationNumber, raw.application?.number, summary.registrationNumber, academicRaw.registrationNumber, raw.number, base.application.number)
  // Profile and admission endpoints use different DTOs for this value.  Read
  // all supported aliases so the directory never loses an admission number
  // that is already stored on the approved admission.
  const admNumber = firstFilled(
    raw.admissionNumber,
    raw.admissionNo,
    raw.studentAdmissionNumber,
    raw.applicationNumber,
    raw.application?.admissionNumber,
    raw.application?.admissionNo,
    raw.application?.applicationNumber,
    raw.application?.number,
    admissionRaw.admissionNumber,
    admissionRaw.admissionNo,
    admissionRaw.studentAdmissionNumber,
    admissionRaw.applicationNumber,
    admissionRaw.number,
    summary.admissionNumber,
    summary.admissionNo,
    summary.studentAdmissionNumber,
    ''
  )
  const regDate = dateInputValue(firstFilled(raw.registrationDate, raw.applicationDate, raw.application?.date, summary.registrationDate, base.application.date))
  const admDate = dateInputValue(firstFilled(raw.admissionDate, raw.application?.admissionDate, summary.admissionDate, ''))

  // Parents
  const fatherRaw = parentRaw.father ?? {}
  const motherRaw = parentRaw.mother ?? {}
  const guardianRaw = parentRaw.guardian ?? {}

  const father = {
    name: firstFilled(raw.fatherName, parentRaw.fatherName, fatherRaw.name, '') ?? '',
    mobile: tenDigitMobile(firstFilled(raw.parentMobile, raw.fatherMobile, parentRaw.fatherMobile, parentRaw.parentMobile, fatherRaw.mobile, '')),
    email: firstFilled(raw.fatherEmail, parentRaw.fatherEmail, parentRaw.email, fatherRaw.email, '') ?? '',
    occupation: firstFilled(raw.fatherOccupation, raw.occupation, parentRaw.fatherOccupation, parentRaw.occupation, fatherRaw.occupation, '') ?? '',
    qualification: firstFilled(raw.fatherQualification, parentRaw.fatherQualification, fatherRaw.qualification, '') ?? '',
    income: String(firstFilled(raw.fatherIncome, raw.annualIncome, parentRaw.fatherIncome, parentRaw.annualIncome, fatherRaw.income, '') ?? ''),
  }

  const mother = {
    name: firstFilled(raw.motherName, parentRaw.motherName, motherRaw.name, '') ?? '',
    mobile: tenDigitMobile(firstFilled(raw.motherMobile, parentRaw.motherMobile, motherRaw.mobile, '')),
    email: firstFilled(raw.motherEmail, parentRaw.motherEmail, motherRaw.email, '') ?? '',
    occupation: firstFilled(raw.motherOccupation, parentRaw.motherOccupation, motherRaw.occupation, '') ?? '',
    qualification: firstFilled(raw.motherQualification, parentRaw.motherQualification, motherRaw.qualification, '') ?? '',
    income: String(firstFilled(raw.motherIncome, parentRaw.motherIncome, motherRaw.income, '') ?? ''),
  }

  const guardian = {
    name: firstFilled(raw.guardianName, parentRaw.guardianName, guardianRaw.name, '') ?? '',
    relationship: firstFilled(raw.guardianRelationship, parentRaw.guardianRelationship, guardianRaw.relationship, '') ?? '',
    relationshipOther: firstFilled(raw.guardianRelationshipOther, parentRaw.guardianRelationshipOther, guardianRaw.relationshipOther, '') ?? '',
    mobile: tenDigitMobile(firstFilled(raw.guardianMobile, parentRaw.guardianMobile, guardianRaw.mobile, '')),
    email: firstFilled(raw.guardianEmail, parentRaw.guardianEmail, guardianRaw.email, '') ?? '',
    occupation: firstFilled(raw.guardianOccupation, parentRaw.guardianOccupation, guardianRaw.occupation, '') ?? '',
    qualification: firstFilled(raw.guardianQualification, parentRaw.guardianQualification, guardianRaw.qualification, '') ?? '',
    income: String(firstFilled(raw.guardianIncome, parentRaw.guardianIncome, guardianRaw.income, '') ?? ''),
  }

  // Previous Education
  const tenthRaw = previousRaw.tenth || previousRaw.ssc || previousRaw.tenthDetails || {}
  const interRaw = previousRaw.intermediate || previousRaw.qualifyingEducation || previousRaw.intermediateDetails || previousRaw.diploma || {}

  const tenth = {
    board: firstFilled(tenthRaw.board, raw.tenthBoard, '') ?? '',
    institution: firstFilled(tenthRaw.institution, tenthRaw.schoolName, raw.tenthInstitution, '') ?? '',
    rollNumber: firstFilled(tenthRaw.rollNumber, tenthRaw.hallTicket, '') ?? '',
    passingYear: String(firstFilled(tenthRaw.passingYear, tenthRaw.yearOfPassing, '') ?? ''),
    scoreType: firstFilled(tenthRaw.scoreType, '') ?? '',
    score: tenthRaw.score !== undefined && tenthRaw.score !== null && tenthRaw.score !== '' ? tenthRaw.score : '',
  }

  const intermediate = {
    qualification: firstFilled(interRaw.qualification, interRaw.educationLevel, '') ?? '',
    board: firstFilled(interRaw.board, interRaw.university, '') ?? '',
    institution: firstFilled(interRaw.institution, interRaw.collegeName, '') ?? '',
    rollNumber: firstFilled(interRaw.rollNumber, interRaw.hallTicket, '') ?? '',
    passingYear: String(firstFilled(interRaw.passingYear, interRaw.yearOfPassing, '') ?? ''),
    stream: firstFilled(interRaw.stream, '') ?? '',
    streamOther: firstFilled(interRaw.streamOther, '') ?? '',
    scoreType: firstFilled(interRaw.scoreType, '') ?? '',
    score: interRaw.score !== undefined && interRaw.score !== null && interRaw.score !== '' ? interRaw.score : '',
  }

  // Admission / Services
  const hostelVal = raw.hostel === true || raw.hostel === 'Yes' || admissionRaw.hostel === true || admissionRaw.hostel === 'Yes' ? 'Yes' : (raw.hostel === false || raw.hostel === 'No' || admissionRaw.hostel === 'No' ? 'No' : (admissionRaw.hostel || ''))
  const transportVal = raw.transport === true || raw.transport === 'Yes' || admissionRaw.transport === true || admissionRaw.transport === 'Yes' ? 'Yes' : (raw.transport === false || raw.transport === 'No' || admissionRaw.transport === 'No' ? 'No' : (admissionRaw.transport || ''))
  const scholarshipVal = raw.scholarship === true || raw.scholarship === 'Yes' || admissionRaw.scholarship === true || admissionRaw.scholarship === 'Yes' ? 'Yes' : (raw.scholarship === false || raw.scholarship === 'No' || admissionRaw.scholarship === 'No' ? 'No' : (admissionRaw.scholarship || ''))

  // Fees
  const tuitionFee = firstFilled(feeRaw.tuitionFee, feeRaw.tuitionAmount, feeRaw.academicFee, raw.tuitionFee, '')
  const admissionFee = firstFilled(feeRaw.admissionFee, feeRaw.admissionAmount, feeRaw.registrationFee, feeRaw.oneTimeFee, raw.admissionFee, '')
  const scholarshipAmount = firstFilled(feeRaw.scholarshipAmount, feeRaw.discountAmount, feeRaw.concessionAmount, raw.scholarshipAmount, '')
  const hostelFee = firstFilled(feeRaw.hostelFee, feeRaw.hostelAmount, raw.hostelFee, '')
  const transportFee = firstFilled(feeRaw.transportFee, feeRaw.transportationFee, feeRaw.transportAmount, raw.transportFee, '')
  const totalFee = firstFilled(feeRaw.firstYearTotal, feeRaw.totalFee, feeRaw.totalAmount, feeRaw.grandTotal, feeRaw.netPayable, raw.totalFee, '')
  const paymentPlan = firstFilled(feeRaw.paymentPlan, raw.paymentPlan, 'Full Payment')
  const paymentStatus = firstFilled(feeRaw.paymentStatus, raw.paymentStatus, 'Pending')
  const feeStructureId = firstFilled(feeRaw.feeStructureId, feeRaw.structureId, raw.feeStructureId, 'FS-STANDARD')

  // Documents
  let rawDocs = { ...(formDataObj.documents || {}), ...(raw.documents || {}) }
  let docStatuses = { ...(formDataObj.documentStatuses || {}), ...(raw.documentStatuses || {}) }
  if (typeof raw.documentStatuses === 'string') {
    try { docStatuses = { ...docStatuses, ...JSON.parse(raw.documentStatuses) } } catch {}
  }
  if (typeof raw.documents === 'string') {
    try { rawDocs = { ...rawDocs, ...JSON.parse(raw.documents) } } catch {}
  }
  const mappedDocs = { ...base.documents }
  DOCUMENTS_CONFIG.forEach(([key]) => {
    const val = rawDocs[key] ?? docStatuses[key]
    if (val !== undefined && val !== null && val !== '') {
      mappedDocs[key] = typeof val === 'object' ? { ...val } : { status: String(val) }
    }
  })
  if (Array.isArray(rawDocs.otherCertificates)) mappedDocs.otherCertificates = [...rawDocs.otherCertificates]

  return {
    ...raw,
    id: studentId || admissionId,
    admissionId,
    studentId,
    studentCode: raw.studentCode ?? '',
    status,
    createdAt: raw.createdAt ?? raw.createdDate ?? base.createdAt,
    updatedAt: raw.updatedAt ?? raw.updatedDate ?? base.updatedAt,
    remarks: raw.remarks ?? raw.reviewRemarks ?? raw.officerRemarks ?? '',
    application: {
      number: regNumber,
      registrationNumber: regNumber,
      admissionNumber: admNumber,
      date: regDate,
      registrationDate: regDate,
      admissionDate: admDate,
    },
    personal: {
      firstName,
      middleName,
      lastName,
      fullName,
      gender: firstFilled(personalRaw.gender, raw.gender, '') ?? '',
      dob: dateInputValue(firstFilled(personalRaw.dob, personalRaw.dateOfBirth, raw.dob, raw.dateOfBirth, '')),
      bloodGroup: firstFilled(personalRaw.bloodGroup, raw.bloodGroup, '') ?? '',
      nationality: firstFilled(personalRaw.nationality, raw.nationality, 'Indian') ?? 'Indian',
      aadhaar: firstFilled(personalRaw.aadhaar, personalRaw.aadhaarNumber, raw.aadhaar, raw.aadhaarNumber, '') ?? '',
      photo,
      photoUrl: photo,
    },
    contact: {
      mobile: tenDigitMobile(firstFilled(contactRaw.mobile, contactRaw.studentMobile, raw.mobile, raw.mobileNumber, raw.studentMobile, personalRaw.mobile, personalRaw.studentMobile, '')),
      alternateMobile: tenDigitMobile(firstFilled(contactRaw.alternateMobile, raw.alternateMobile, '')),
      email: firstFilled(contactRaw.email, contactRaw.studentEmail, raw.email, raw.studentEmail, personalRaw.email, personalRaw.studentEmail, '') ?? '',
      alternateEmail: firstFilled(contactRaw.alternateEmail, raw.alternateEmail, '') ?? '',
      sameAddress,
      currentAddress,
      permanentAddress: hasPerm ? permanentAddress : sameAddress ? { ...currentAddress } : blankAddress(),
    },
    parents: {
      father,
      mother,
      guardian,
      primaryContact: firstFilled(parentRaw.primaryContact, raw.primaryContact, 'Father'),
      emergencyMobile: tenDigitMobile(firstFilled(parentRaw.emergencyMobile, parentRaw.emergencyContact, raw.emergencyMobile, raw.emergencyContact, '')),
    },
    academic: {
      academicYearId: firstFilled(academicRaw.academicYearId, raw.academicYearId, ''),
      academicYear: firstFilled(academicRaw.academicYear, academicRaw.academicYearName, raw.academicYear, raw.academicYearName, '') ?? '',
      admissionType: firstFilled(academicRaw.admissionType, raw.admissionType, '') ?? '',
      quota: firstFilled(academicRaw.quota, raw.quota, '') ?? '',
      quotaOther: firstFilled(academicRaw.quotaOther, raw.quotaOther, '') ?? '',
      courseId: firstFilled(academicRaw.courseId, raw.courseId, ''),
      course: referenceLabel(academicRaw.course, academicRaw.courseName, raw.course, raw.courseName),
      courseCode: firstFilled(
        academicRaw.courseCode,
        academicRaw.course?.code,
        academicRaw.course?.courseCode,
        raw.courseCode,
        raw.course?.code,
        raw.course?.courseCode,
        ''
      ) ?? '',
      departmentId: firstFilled(academicRaw.departmentId, raw.departmentId, ''),
      // Some profile responses only carry the department as part of the
      // selected branch/course master. Resolve those nested references for
      // the directory's Academic details line as well.
      department: referenceLabel(
        academicRaw.department,
        academicRaw.departmentName,
        academicRaw.branch?.department,
        academicRaw.branch?.departmentName,
        academicRaw.course?.department,
        academicRaw.course?.departmentName,
        raw.department,
        raw.departmentName,
        raw.branch?.department,
        raw.branch?.departmentName,
        raw.course?.department,
        raw.course?.departmentName,
        // The admission form's branch is scoped to a department. Older
        // records persisted only that branch label, so use it as the final
        // readable fallback rather than rendering "Not provided".
        academicRaw.branch,
        academicRaw.branchName,
        raw.branch,
        raw.branchName,
      ),
      branchId: firstFilled(academicRaw.branchId, raw.branchId, ''),
      branch: referenceLabel(academicRaw.branch, academicRaw.branchName, raw.branch, raw.branchName),
      branchCode: firstFilled(
        academicRaw.branchCode,
        academicRaw.branch?.code,
        academicRaw.branch?.branchCode,
        raw.branchCode,
        raw.branch?.code,
        raw.branch?.branchCode,
        ''
      ) ?? '',
      semesterId: firstFilled(academicRaw.semesterId, raw.semesterId, ''),
      semester: firstFilled(academicRaw.semester, academicRaw.semesterName, raw.semester, raw.semesterName, '') ?? '',
      sectionId: firstFilled(academicRaw.sectionId, raw.sectionId, ''),
      section: firstFilled(academicRaw.section, academicRaw.sectionName, raw.section, raw.sectionName, '') ?? '',
      studentCategory: firstFilled(academicRaw.studentCategory, raw.studentCategory, '') ?? '',
      regulation: firstFilled(academicRaw.regulation, raw.regulation, '') ?? '',
      entryType: firstFilled(academicRaw.entryType, raw.entryType, '') ?? '',
      yearOfStudy: firstFilled(academicRaw.yearOfStudy, raw.yearOfStudy, '') ?? '',
      rollNumber: firstFilled(academicRaw.rollNumber, raw.rollNumber, '') ?? '',
    },
    previousEducation: {
      tenth,
      intermediate,
    },
    admission: {
      collegeId: firstFilled(admissionRaw.collegeId, admissionRaw.college?.collegeId, admissionRaw.college?.id, raw.collegeId, raw.college?.collegeId, raw.college?.id, ''),
      college: referenceLabel(admissionRaw.college, admissionRaw.collegeName, admissionRaw.institutionName, raw.college, raw.collegeName, raw.institutionName, raw.collegeDetails, raw.institution),
      batch: firstFilled(admissionRaw.batch, raw.batch, base.admission.batch) ?? base.admission.batch,
      scholarship: scholarshipVal || 'No',
      scholarshipType: firstFilled(admissionRaw.scholarshipType, raw.scholarshipType, '') ?? '',
      hostel: hostelVal || 'No',
      hostelPreference: firstFilled(admissionRaw.hostelPreference, raw.hostelPreference, '') ?? '',
      hostelRoomType: firstFilled(admissionRaw.hostelRoomType, raw.hostelRoomType, '') ?? '',
      transport: transportVal || 'No',
      transportRoute: firstFilled(admissionRaw.transportRoute, raw.transportRoute, '') ?? '',
    },
    fees: (() => {
      const resolved = resolveFeeSummary(
        {
          admission: {
            hostel: hostelVal,
            hostelRoomType: firstFilled(admissionRaw.hostelRoomType, raw.hostelRoomType, ''),
            transport: transportVal,
            transportRoute: firstFilled(admissionRaw.transportRoute, raw.transportRoute, ''),
          },
          fees: {
            structureId: feeStructureId,
            feeStructureId,
            tuitionFee,
            admissionFee,
            scholarshipAmount,
            hostelFee,
            transportFee,
            totalFee,
            paymentPlan,
            paymentStatus,
            components: Array.isArray(feeRaw.components) ? feeRaw.components : [],
          },
        },
        feeRaw,
        raw.feeStructure
      );
      return {
        structureId: resolved.structureId || feeStructureId || 'FS-STANDARD',
        feeStructureId: resolved.feeStructureId || feeStructureId || 'FS-STANDARD',
        tuitionFee: String(resolved.tuitionFee || '50000'),
        admissionFee: String(resolved.admissionFee || '4000'),
        scholarshipAmount: String(resolved.scholarshipAmount || ''),
        hostelFee: String(resolved.hostelFee || ''),
        transportFee: String(resolved.transportFee || ''),
        totalFee: String(resolved.totalFee || '54000'),
        paymentPlan: resolved.paymentPlan || 'Full Payment',
        paymentStatus: resolved.paymentStatus || 'Pending',
        components: Array.isArray(resolved.components) ? resolved.components : [],
      };
    })(),
    documents: mappedDocs,
    activity: Array.isArray(raw.activity) && raw.activity.length ? raw.activity : base.activity,
  }
}

/**
 * Display formatters
 */
/* export */ const studentFullName = (student) => {
  if (!student) return ''
  const p = student.personal || {}
  const nameParts = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  return nameParts || p.fullName || student.studentName || student.fullName || ''
}

/* export */ const studentInitials = (student) => {
  const name = studentFullName(student)
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return 'S'
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'S'
}

/* export */ const studentQuotaDisplay = (student) => {
  const a = student?.academic || {}
  if (a.quota === 'Other' && a.quotaOther) return a.quotaOther
  return a.quota || '-'
}

/* export */ const formatDisplay = (value) => {
  if (value === null || value === undefined || String(value).trim() === '' || String(value).trim() === '-') return 'Not provided'
  return String(value).trim()
}

/* export */ const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))

/* export */ const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'

/**
 * Required fields metadata for single source of truth
 */
/* export */ const REQUIRED_FIELDS = [
  'personal.firstName',
  'personal.lastName',
  'personal.gender',
  'personal.dob',
  'personal.aadhaar',
  'contact.mobile',
  'contact.email',
  'contact.currentAddress.line1',
  'contact.currentAddress.town',
  'contact.currentAddress.city',
  'contact.currentAddress.district',
  'contact.currentAddress.state',
  'contact.currentAddress.pincode',
  'academic.academicYear',
  'academic.admissionType',
  'academic.course',
  'academic.branch',
  'admission.collegeId',
]
// #endregion utils/studentCanonicalModel.js
return {
  get API_BASE_URL_FALLBACK() { return API_BASE_URL_FALLBACK; },
  get apiAssetUrl() { return apiAssetUrl; },
  get firstFilled() { return firstFilled; },
  get referenceLabel() { return referenceLabel; },
  get photoStorageKey() { return photoStorageKey; },
  get readStoredPhoto() { return readStoredPhoto; },
  get saveStoredPhoto() { return saveStoredPhoto; },
  get saveAdmissionPhoto() { return saveAdmissionPhoto; },
  get readAdmissionPhoto() { return readAdmissionPhoto; },
  get firstPhoto() { return firstPhoto; },
  get blankAddress() { return blankAddress; },
  get normalizeAddressObj() { return normalizeAddressObj; },
  get formatAddress() { return formatAddress; },
  get splitFullName() { return splitFullName; },
  get dateInputValue() { return dateInputValue; },
  get tenDigitMobile() { return tenDigitMobile; },
  get normalizeAdmissionStatus() { return normalizeAdmissionStatus; },
  get DOCUMENTS_CONFIG() { return DOCUMENTS_CONFIG; },
  get HOSTEL_FEES() { return HOSTEL_FEES; },
  get HOSTEL_FEES_DEFAULT() { return HOSTEL_FEES_DEFAULT; },
  get TRANSPORT_FEES() { return TRANSPORT_FEES; },
  get TRANSPORT_FEES_DEFAULT() { return TRANSPORT_FEES_DEFAULT; },
  get normalizeFeeSummary() { return normalizeFeeSummary; },
  get hasFeeSummary() { return hasFeeSummary; },
  get mergeFeeResponses() { return mergeFeeResponses; },
  get defaultFeeSummary() { return defaultFeeSummary; },
  get resolveFeeSummary() { return resolveFeeSummary; },
  get createEmptyCanonicalStudent() { return createEmptyCanonicalStudent; },
  get normalizeCanonicalStudent() { return normalizeCanonicalStudent; },
  get studentFullName() { return studentFullName; },
  get studentInitials() { return studentInitials; },
  get studentQuotaDisplay() { return studentQuotaDisplay; },
  get formatDisplay() { return formatDisplay; },
  get formatMoney() { return formatMoney; },
  get formatDateTime() { return formatDateTime; },
  get REQUIRED_FIELDS() { return REQUIRED_FIELDS; }
};
})();

export const studentServiceModule = (() => {
const { studentProfilesApi } = apiEndpointsModule;
const { studentApi } = apiEndpointsModule;
const { studentAdmissionApi } = apiEndpointsModule;
const { sectionAssignmentApi } = apiEndpointsModule;
const { normalizeCanonicalStudent } = studentCanonicalModelModule;
const { studentFullName } = studentCanonicalModelModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
/* Imports for isolated regression tests:
import {
  studentProfilesApi,
  studentApi,
  studentAdmissionApi,
  sectionAssignmentApi,
} from '../api/apiEndpoints'
import { normalizeCanonicalStudent, studentFullName } from '../utils/studentCanonicalModel'
import eventBus, { ERP_EVENTS } from './eventBus'
*/
// #region services/studentService.js
const normalizeAcademicTerm = (str) => {
  if (!str) return ''
  const clean = String(str).trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
  const known = {
    computerscienceandengineering: 'cse',
    computerscienceengineering: 'cse',
    computerscience: 'cse',
    cs: 'cse',
    cse: 'cse',
    electronicsandcommunicationengineering: 'ece',
    electronicscommunicationengineering: 'ece',
    electronicsandcommunication: 'ece',
    electronicscommunication: 'ece',
    electronics: 'ece',
    ece: 'ece',
    electricalandelectronicsengineering: 'eee',
    electricalelectronicsengineering: 'eee',
    electricalandelectronics: 'eee',
    electricalelectronics: 'eee',
    electrical: 'eee',
    eee: 'eee',
    mechanicalengineering: 'me',
    mechanical: 'me',
    me: 'me',
    mech: 'me',
    civilengineering: 'ce',
    civil: 'ce',
    ce: 'ce',
    informationtechnology: 'it',
    it: 'it',
    artificialintelligenceanddatascience: 'aids',
    artificialintelligencedatascience: 'aids',
    artificialintelligenceandmachinelearning: 'aiml',
    artificialintelligencemachinelearning: 'aiml',
    bacheloroftechnology: 'btech',
    btech: 'btech',
    masteroftechnology: 'mtech',
    mtech: 'mtech',
  }
  return known[clean] || clean
}

/**
 * Student Service
 * Centralizes student profile queries, section allocations, admissions,
 * and unified student data model across Pirnav ERP.
 */

class StudentService {
  constructor() {
    this._cache = new Map()
    this._ttl = 20000 // 20s

    eventBus.subscribe(ERP_EVENTS.STUDENT_UPDATED, () => this.clearCache())
    eventBus.subscribe(ERP_EVENTS.PROMOTION_EXECUTED, () => this.clearCache())
  }

  clearCache() {
    this._cache.clear()
  }

  async getAllProfiles(params = {}) {
    // Attendance must be able to see a profile immediately after it is saved.
    // `forceRefresh` is client-only and must never be sent as an API query.
    const { forceRefresh = false, ...apiParams } = params
    const key = `profiles:${JSON.stringify(apiParams)}`
    if (!forceRefresh && this._cache.has(key)) {
      const entry = this._cache.get(key)
      if (Date.now() - entry.timestamp < this._ttl) return entry.data
    }

    try {
      const [profilesRes, admissionsRes] = await Promise.allSettled([
        studentProfilesApi.getAll(apiParams),
        studentAdmissionApi.getAll(),
      ])
      const profiles = profilesRes.status === 'fulfilled' && Array.isArray(profilesRes.value) ? profilesRes.value : []
      const admissions = admissionsRes.status === 'fulfilled' && Array.isArray(admissionsRes.value) ? admissionsRes.value : []

      const byAdmission = new Map()
      const byStudent = new Map()
      const byRegNo = new Map()

      for (const adm of admissions) {
        const canonicalAdm = normalizeCanonicalStudent(adm)
        const admId = String(canonicalAdm.admissionId || adm.admissionId || adm.id || '').trim()
        const sId = String(canonicalAdm.studentId || adm.studentId || adm.student?.studentId || adm.student?.id || '').trim()
        const regNo = String(canonicalAdm.application?.registrationNumber || adm.application?.registrationNumber || adm.application?.number || '').trim()

        if (admId) byAdmission.set(admId, { raw: adm, canonical: canonicalAdm })
        if (sId) byStudent.set(sId, { raw: adm, canonical: canonicalAdm })
        if (regNo) byRegNo.set(regNo, { raw: adm, canonical: canonicalAdm })
      }

      const mergedProfiles = profiles.map(p => {
        const canonicalProf = normalizeCanonicalStudent(p)
        const admId = String(canonicalProf.admissionId || p.admissionId || p.application?.admissionId || p.admission?.admissionId || '').trim()
        const sId = String(canonicalProf.studentId || p.studentId || p.id || '').trim()
        const regNo = String(canonicalProf.application?.registrationNumber || p.application?.registrationNumber || p.registrationNumber || '').trim()

        const matched = (admId ? byAdmission.get(admId) : null) || (sId ? byStudent.get(sId) : null) || (regNo ? byRegNo.get(regNo) : null)
        const matchedCanonical = matched?.canonical || {}
        const matchedRaw = matched?.raw || {}

        const finalPersonal = {
          ...matchedCanonical.personal,
          ...canonicalProf.personal,
          firstName: canonicalProf.personal?.firstName || matchedCanonical.personal?.firstName || matchedRaw.firstName || '',
          lastName: canonicalProf.personal?.lastName || matchedCanonical.personal?.lastName || matchedRaw.lastName || '',
          middleName: canonicalProf.personal?.middleName || matchedCanonical.personal?.middleName || matchedRaw.middleName || '',
          fullName:
            studentFullName(canonicalProf) ||
            studentFullName(matchedCanonical) ||
            matchedRaw.fullName ||
            matchedRaw.studentName ||
            p.studentName ||
            p.fullName ||
            '',
          photo: canonicalProf.personal?.photo || matchedCanonical.personal?.photo || '',
        }

        const finalName =
          finalPersonal.fullName ||
          [finalPersonal.firstName, finalPersonal.middleName, finalPersonal.lastName].filter(Boolean).join(' ') ||
          p.studentName ||
          p.fullName ||
          p.name ||
          'Student'

        const finalAcademic = {
          ...matchedRaw.academic,
          ...matchedCanonical.academic,
          ...canonicalProf.academic,
          course: canonicalProf.academic?.course || matchedCanonical.academic?.course || matchedRaw.academic?.course || p.course || '',
          courseId: canonicalProf.academic?.courseId || matchedCanonical.academic?.courseId || matchedRaw.academic?.courseId || p.courseId || '',
          branch: canonicalProf.academic?.branch || matchedCanonical.academic?.branch || matchedRaw.academic?.branch || p.branch || '',
          branchId: canonicalProf.academic?.branchId || matchedCanonical.academic?.branchId || matchedRaw.academic?.branchId || p.branchId || '',
          semester: canonicalProf.academic?.semester || matchedCanonical.academic?.semester || matchedRaw.academic?.semester || p.semester || '',
          semesterId: canonicalProf.academic?.semesterId || matchedCanonical.academic?.semesterId || matchedRaw.academic?.semesterId || p.semesterId || '',
          section: canonicalProf.academic?.section || matchedCanonical.academic?.section || matchedRaw.academic?.section || p.section || '',
          sectionId: canonicalProf.academic?.sectionId || matchedCanonical.academic?.sectionId || matchedRaw.academic?.sectionId || p.sectionId || '',
          academicYear: canonicalProf.academic?.academicYear || matchedCanonical.academic?.academicYear || matchedRaw.academic?.academicYear || p.academicYear || '',
          academicYearId: canonicalProf.academic?.academicYearId || matchedCanonical.academic?.academicYearId || matchedRaw.academic?.academicYearId || p.academicYearId || '',
          rollNumber: canonicalProf.academic?.rollNumber || matchedCanonical.academic?.rollNumber || matchedRaw.academic?.rollNumber || p.rollNumber || '',
        }

        const finalApp = {
          ...matchedCanonical.application,
          ...canonicalProf.application,
          number: canonicalProf.application?.number || matchedCanonical.application?.number || p.number || '',
          registrationNumber: canonicalProf.application?.registrationNumber || matchedCanonical.application?.registrationNumber || p.registrationNumber || '',
          admissionNumber: canonicalProf.application?.admissionNumber || matchedCanonical.application?.admissionNumber || p.admissionNumber || '',
        }

        return {
          ...canonicalProf,
          id: sId || admId || canonicalProf.id,
          studentId: sId || admId || canonicalProf.studentId,
          studentName: finalName,
          fullName: finalName,
          name: finalName,
          rollNumber: finalAcademic.rollNumber || finalApp.admissionNumber || '',
          registrationNumber: finalApp.registrationNumber || finalApp.number || finalAcademic.rollNumber || '',
          personal: finalPersonal,
          academic: finalAcademic,
          application: finalApp,
          admission: {
            ...matchedCanonical.admission,
            ...canonicalProf.admission,
            college: canonicalProf.admission?.college || matchedCanonical.admission?.college || '',
          },
          contact: {
            ...matchedCanonical.contact,
            ...canonicalProf.contact,
          },
          status: p.status || canonicalProf.status || 'Active',
        }
      })

      const existingProfileStudentIds = new Set(mergedProfiles.map(p => String(p.studentId || p.id)))
      const existingProfileAdmIds = new Set(mergedProfiles.map(p => String(p.admissionId || '')).filter(Boolean))

      const approvedAdditionalAdmissions = admissions.filter(a => {
        const canonical = normalizeCanonicalStudent(a)
        const stat = String(a.status || a.currentStatus || a.admissionStatus || canonical.status || '').toUpperCase()
        const sId = String(canonical.studentId || a.studentId || a.student?.studentId || a.student?.id || '')
        const admId = String(canonical.admissionId || a.admissionId || a.id || '')
        const isAppr = stat === 'APPROVED' || stat === 'ENROLLED' || stat === 'ACTIVE'
        return isAppr && (!sId || !existingProfileStudentIds.has(sId)) && (!admId || !existingProfileAdmIds.has(admId))
      }).map(a => {
        const canonical = normalizeCanonicalStudent(a)
        const name = studentFullName(canonical) || a.name || 'Student'
        return {
          ...canonical,
          id: canonical.studentId || canonical.admissionId || a.id,
          studentId: canonical.studentId || canonical.admissionId || a.id,
          studentName: name,
          fullName: name,
          name: name,
          rollNumber: canonical.academic?.rollNumber || canonical.application?.admissionNumber || a.academic?.rollNumber || '',
          registrationNumber: canonical.application?.registrationNumber || canonical.application?.number || a.application?.registrationNumber || '',
          academic: {
            ...a.academic,
            ...canonical.academic,
          },
          status: 'Active',
        }
      })

      const combined = [...mergedProfiles, ...approvedAdditionalAdmissions]
      this._cache.set(key, { data: combined, timestamp: Date.now() })
      return combined
    } catch (err) {
      console.warn('Fallback fetching student profiles:', err)
      return []
    }
  }

  async getProfileById(id) {
    if (!id) return null
    try {
      return await studentProfilesApi.preview(id)
    } catch (err) {
      console.warn(`Fallback fetching profile for ID ${id}:`, err)
      return null
    }
  }

  async updateProfile(id, payload) {
    const result = await studentProfilesApi.update(id, payload)
    eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { studentId: id, payload: result })
    return result
  }

  // Query students matching academic scope (for Section Allocation, Attendance, Marks/Results, Promotions)
  async getStudentsByScope({
    academicYearId,
    academicYear,
    courseId,
    course,
    courseCode,
    branchId,
    branch,
    branchCode,
    semesterId,
    semester,
    sectionId,
    section,
    forceRefresh = false,
  } = {}) {
    const all = await this.getAllProfiles({ forceRefresh })

    const parseNum = (val) => {
      if (val === undefined || val === null || val === '') return null
      const m = String(val).match(/\d+/)
      return m ? Number(m[0]) : null
    }

    const normYear = (val) => String(val || '').replace(/[^0-9]/g, '')

    const targetCourseNorm = normalizeAcademicTerm(course || courseCode)
    const targetBranchNorm = normalizeAcademicTerm(branch || branchCode)
    const targetSemNum = parseNum(semesterId) ?? parseNum(semester)
    const targetYearNorm = normYear(academicYear)

    return all.filter((s) => {
      const acad = s.academic || {}

      // Academic Year matching
      if (academicYearId || academicYear) {
        const studentYearId = acad.academicYearId ? String(acad.academicYearId) : ''
        const studentYearNorm = normYear(acad.academicYear)

        if (academicYearId && studentYearId && String(academicYearId) === studentYearId) {
          // ID matched
        } else if (targetYearNorm && studentYearNorm) {
          const match =
            studentYearNorm.includes(targetYearNorm) ||
            targetYearNorm.includes(studentYearNorm) ||
            studentYearNorm.slice(0, 4) === targetYearNorm.slice(0, 4)
          if (!match && (acad.academicYearId || acad.academicYear)) return false
        } else if (academicYearId && (acad.academicYearId || acad.academicYear)) {
          return false
        }
      }

      // Course matching
      if (courseId || course || courseCode) {
        const studentCourseId = acad.courseId ? String(acad.courseId) : ''
        const studentCourseNorm = normalizeAcademicTerm(acad.course || acad.courseName || acad.courseCode)

        if (courseId && studentCourseId && String(courseId) === studentCourseId) {
          // ID matched
        } else if (targetCourseNorm && studentCourseNorm) {
          const match =
            targetCourseNorm === studentCourseNorm ||
            targetCourseNorm.includes(studentCourseNorm) ||
            studentCourseNorm.includes(targetCourseNorm)
          if (!match && (acad.courseId || acad.course)) return false
        } else if (courseId && (acad.courseId || acad.course)) {
          return false
        }
      }

      // Branch matching
      if (branchId || branch || branchCode) {
        const studentBranchId = acad.branchId ? String(acad.branchId) : ''
        const studentBranchNorm = normalizeAcademicTerm(acad.branch || acad.branchName || acad.branchCode)

        if (branchId && studentBranchId && String(branchId) === studentBranchId) {
          // ID matched
        } else if (targetBranchNorm && studentBranchNorm) {
          const match =
            targetBranchNorm === studentBranchNorm ||
            targetBranchNorm.includes(studentBranchNorm) ||
            studentBranchNorm.includes(targetBranchNorm)
          if (!match && (acad.branchId || acad.branch)) return false
        } else if (branchId && (acad.branchId || acad.branch)) {
          return false
        }
      }

      // Semester matching
      const studentSemNum = parseNum(acad.semesterId) ?? parseNum(acad.semester || acad.semesterName)
      if (targetSemNum !== null && studentSemNum !== null) {
        if (targetSemNum !== studentSemNum) return false
      } else if (semester && acad.semester) {
        const tSem = String(semester).trim().toLowerCase()
        const sSem = String(acad.semester).trim().toLowerCase()
        if (!sSem.includes(tSem) && !tSem.includes(sSem)) return false
      }

      // Section matching
      const studentSectionId = acad.sectionId ?? acad.section_id ?? acad.section?.id
      const studentSection = acad.sectionName || acad.section_name || (typeof acad.section === 'string' ? acad.section : '') || acad.sectionCode
      if (sectionId && studentSectionId && String(studentSectionId) !== String(sectionId)) return false
      if (section && studentSection) {
        const normalizeSection = value => String(value).trim().toLowerCase().replace(/^section\s*/, '').replace(/[^a-z0-9]/g, '')
        if (normalizeSection(studentSection) !== normalizeSection(section)) return false
      }

      return true
    })
  }

  // Get students assigned to a specific section ID
  async getStudentsForSection(sectionId) {
    if (!sectionId) return []
    try {
      // First check backend section assignment endpoint
      const list = await sectionAssignmentApi.listBySection(sectionId)
      if (Array.isArray(list) && list.length > 0) return list
    } catch (err) {
      console.warn(`Section assignment endpoint fallback for section ${sectionId}:`, err)
    }
    // Fallback to searching profiles by sectionId
    return this.getStudentsByScope({ sectionId })
  }
}

/* export */ const studentService = new StudentService()
/* export default studentService */
// #endregion services/studentService.js
return {
  get studentService() { return studentService; },
  get default() { return studentService; }
};
})();

export const approvedStudentProfilesModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/approvedStudentProfiles.js
const key = value => value == null ? '' : String(value).trim()
/* export */ const isApprovedAdmission = value => ['APPROVED', 'APPROVE', 'ENROLLED'].includes(key(value).toUpperCase())

/* export */ function approvedStudentProfiles(profiles, admissions) {
  const byAdmission = new Map()
  const byStudent = new Map()
  for (const admission of admissions) {
    const admissionId = key(admission.admissionId ?? admission.id)
    const studentId = key(admission.studentId ?? admission.student?.studentId)
    if (admissionId) byAdmission.set(admissionId, admission)
    if (studentId) byStudent.set(studentId, admission)
  }
  return profiles.filter(profile => {
    const admissionId = key(profile.admissionId ?? profile.application?.admissionId ?? profile.admission?.admissionId)
    const admission = byAdmission.get(admissionId) ?? byStudent.get(key(profile.studentId ?? profile.id))
    return admission && isApprovedAdmission(admission.currentStatus ?? admission.admissionStatus ?? admission.applicationStatus ?? admission.status)
  })
}
// #endregion utils/approvedStudentProfiles.js
return {
  get isApprovedAdmission() { return isApprovedAdmission; },
  get approvedStudentProfiles() { return approvedStudentProfiles; }
};
})();

export const sectionStudentsModule = (() => {
const { normalizeCanonicalStudent } = studentCanonicalModelModule;
const { studentFullName } = studentCanonicalModelModule;
const { approvedStudentProfiles } = approvedStudentProfilesModule;
const { isApprovedAdmission } = approvedStudentProfilesModule;
/* Imports for isolated regression tests:
import { normalizeCanonicalStudent, studentFullName } from './studentCanonicalModel.js'
import { approvedStudentProfiles, isApprovedAdmission } from './approvedStudentProfiles.js'
*/
// #region utils/sectionStudents.js
const text = value => value == null || ['undefined', 'null'].includes(String(value).trim().toLowerCase()) ? '' : String(value).trim()
const label = value => text(value).toLowerCase().replace(/\s+/g, ' ')
const sectionLabel = value => label(value).replace(/^section\s+/, '')

/* export */ function sectionStudentProfiles(profiles, admissions) {
  const normalizedAdmissions = admissions.filter(row => isApprovedAdmission(row.currentStatus ?? row.admissionStatus ?? row.applicationStatus ?? row.status)).map(normalizeCanonicalStudent)
  const approved = approvedStudentProfiles(profiles.map(row => normalizeCanonicalStudent({ ...row, studentId: row.studentId || row.header?.studentId || row.personalInformation?.studentId || row.id })), admissions)
  const profileByStudentId = new Map(approved.map(profile => [text(profile.studentId), profile]))
  const admissionByStudentId = new Map(admissions.map(row => {
    const canonical = normalizeCanonicalStudent(row)
    return [text(canonical.studentId || row.studentId || row.student?.studentId || row.student?.id), row]
  }).filter(([id]) => id))
  // Student profiles can be created directly after enrollment and may not have
  // an admission row. Include those real, academically mapped profiles while
  // keeping drafts, rejected applications, and incomplete profiles out.
  const standaloneProfiles = profiles.flatMap(row => {
    const studentId = text(row.studentId || row.header?.studentId || row.personalInformation?.studentId || row.id)
    if (!/^\d+$/.test(studentId)) return []
    const relatedAdmission = admissionByStudentId.get(studentId)
    if (relatedAdmission && !isApprovedAdmission(relatedAdmission.currentStatus ?? relatedAdmission.admissionStatus ?? relatedAdmission.applicationStatus ?? relatedAdmission.status)) return []
    if (relatedAdmission) return []
    const status = text(row.studentStatus ?? row.status ?? row.currentStatus ?? row.profileStatus).toUpperCase()
    if (row.isActive === false || row.isDeleted === true || ['0', 'DRAFT', 'PENDING', 'REJECTED', 'INACTIVE', 'DELETED', 'WITHDRAWN'].includes(status)) return []
    const canonical = normalizeCanonicalStudent({ ...row, studentId })
    if (!text(canonical.academic.branchId || canonical.academic.branch)) return []
    return [canonical]
  })
  const seen = new Set()
  // Admissions are authoritative for eligibility and academic mapping. Profiles only enrich records not already represented by an admission.
  const candidates = [...normalizedAdmissions, ...approved, ...standaloneProfiles]
  return candidates.flatMap(profile => {
    // Admission IDs cannot be submitted as student IDs.
    const id = text(profile.studentId)
    if (!id || seen.has(id)) return []
    seen.add(id)
    const enrichment = profileByStudentId.get(id)
    const academic = Object.fromEntries(Object.keys(profile.academic).map(key => [key, text(profile.academic[key]) || enrichment?.academic?.[key] || '']))
    const registrationNumber = profile.application?.registrationNumber || enrichment?.application?.registrationNumber || ''
    const admissionNumber = profile.application?.admissionNumber || enrichment?.application?.admissionNumber || ''
    const rollNumber = academic.rollNumber || enrichment?.academic?.rollNumber || ''
    return [{ ...academic, id, studentId: id, name: studentFullName(profile) || studentFullName(enrichment), registrationNumber, admissionNumber, rollNumber,
      code: [...new Set([admissionNumber, registrationNumber, rollNumber].filter(Boolean))].join(' / '),
      enrollmentNo: rollNumber || registrationNumber || admissionNumber }]
  })
}

const normalizeBranchKey = (name = '') => {
  const s = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (/mech|mechanical/i.test(s)) return 'mech'
  if (/cse|computerscience|computer/i.test(s)) return 'cse'
  if (/ece|electronicsandcommunication|electronicscommunication/i.test(s)) return 'ece'
  if (/eee|electricalandelectronics|electricalelectronics/i.test(s)) return 'eee'
  if (/civil/i.test(s)) return 'civil'
  if (/aiml|artificialintelligenceandmachinelearning/i.test(s)) return 'aiml'
  if (/aids|artificialintelligenceanddatascience/i.test(s)) return 'aids'
  if (/it|informationtechnology/i.test(s)) return 'it'
  return s
}

const normSemNum = value => String(value || '').match(/\d+/)?.[0] || ''
const normYearStr = value => String(value || '').replace(/[^0-9]/g, '').slice(0, 4)

/* export */ function matchesSectionStudent(student, section) {
  // IDs are authoritative; labels/normalized keys are used only when an ID is absent.
  const matches = key => {
    const studentId = text(student[`${key}Id`])
    const targetId = text(key === 'section' ? section.id : section[`${key}Id`])
    if (studentId && targetId) return studentId === targetId

    if (key === 'branch') {
      const sBranch = normalizeBranchKey(student.branch || student.branchName || student.branchCode)
      const tBranch = normalizeBranchKey(section.branch || section.branchName || section.branchCode)
      if (sBranch && tBranch) return sBranch === tBranch || sBranch.includes(tBranch) || tBranch.includes(sBranch)
    }
    if (key === 'semester') {
      const sSem = normSemNum(student.semester || student.semesterName || student.semesterId)
      const tSem = normSemNum(section.semester || section.semesterName || section.semesterId || section.semesterNumber)
      if (sSem && tSem) return sSem === tSem
    }
    if (key === 'academicYear') {
      const sYear = normYearStr(student.academicYear || student.academicYearName)
      const tYear = normYearStr(section.academicYear || section.academicYearName)
      if (sYear && tYear) return sYear === tYear
    }

    const normalize = key === 'section' ? sectionLabel : label
    const studentName = normalize(student[key] || student[`${key}Name`])
    const targetName = normalize(key === 'section' ? section.name : section[key] || section[`${key}Name`])
    if (studentName && targetName) return studentName === targetName
    return null
  }
  if (matches('branch') !== true) return false
  if (['course', 'semester', 'academicYear'].some(key => matches(key) === false)) return false
  if (text(student.sectionId) || text(student.section)) return matches('section') === true
  return true
}
// #endregion utils/sectionStudents.js
return {
  get sectionStudentProfiles() { return sectionStudentProfiles; },
  get matchesSectionStudent() { return matchesSectionStudent; }
};
})();

export const promotionServiceModule = (() => {
const { collegeStorageKey } = collegeScopeModule;
const { studentPromotionApi } = apiEndpointsModule;
const { default: studentService } = studentServiceModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
/* Imports for isolated regression tests:
import { collegeStorageKey } from '../utils/collegeScope.js'
import { studentPromotionApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'
*/
// #region services/promotionService.js
const PROMOTION_HISTORY_KEY = 'pirnav-promotion-history-v1'
const PROMOTION_ELIGIBILITY_KEY = 'pirnav-promotion-eligibility-v1'

const eligibilityKey = (studentId) => String(studentId ?? '').trim()
const explicitlyIneligible = (student) => ['ineligible', 'not eligible'].includes(
  String(student?.eligibilityStatus ?? student?.status ?? '').trim().toLowerCase()
)
const semesterNumber = (value) => parseInt(String(value ?? '').replace(/\D/g, ''), 10) || 0
const studentKey = (student) => String(
  student?.studentId ?? student?.id ?? student?.registrationNumber ?? student?.rollNumber ?? ''
).trim()

class PromotionService {
  getEligibilityOverrides() {
    try {
      const saved = JSON.parse(localStorage.getItem(collegeStorageKey(PROMOTION_ELIGIBILITY_KEY)) || '{}')
      return saved && typeof saved === 'object' ? saved : {}
    } catch {
      return {}
    }
  }

  getEligibilityOverride(studentId) {
    return this.getEligibilityOverrides()[eligibilityKey(studentId)] || null
  }

  async setEligibilityStatus(studentId, eligibilityStatus) {
    const id = eligibilityKey(studentId)
    if (!id) throw new Error('A valid student is required to update promotion eligibility.')
    const normalized = String(eligibilityStatus || '').trim().toUpperCase()
    if (!['ELIGIBLE', 'INELIGIBLE'].includes(normalized)) throw new Error('Invalid promotion eligibility status.')

    // Persist through the API when it is available, while retaining the local
    // record for offline/demo mode so a reload cannot silently re-qualify them.
    try {
      await studentPromotionApi.updateEligibilityStatus(id, normalized)
    } catch (err) {
      console.warn('Eligibility status API unavailable; saving local override:', err)
    }

    try {
      localStorage.setItem(collegeStorageKey(PROMOTION_ELIGIBILITY_KEY), JSON.stringify({
        ...this.getEligibilityOverrides(),
        [id]: normalized,
      }))
    } catch { /* local persistence is a best-effort fallback */ }
    return normalized
  }

  getLocalHistory() {
    try {
      const raw = localStorage.getItem(collegeStorageKey(PROMOTION_HISTORY_KEY))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  saveLocalHistory(entry) {
    try {
      const existing = this.getLocalHistory()
      const updated = [entry, ...existing.filter((h) => (h.promotionId || h.id) !== (entry.promotionId || entry.id))]
      localStorage.setItem(collegeStorageKey(PROMOTION_HISTORY_KEY), JSON.stringify(updated))
    } catch { /* storage fallback */ }
  }

  async getDashboard() {
    try {
      return await studentPromotionApi.getDashboard()
    } catch {
      return null
    }
  }

  async getHistory(params = {}) {
    try {
      const apiHist = await studentPromotionApi.getHistory(params)
      const localHist = this.getLocalHistory()
      const map = new Map()
      for (const item of Array.isArray(apiHist) ? apiHist : []) {
        const key = item.promotionId || item.id || `${item.studentId}_${item.toSemester}`
        map.set(key, item)
      }
      for (const item of localHist) {
        const key = item.promotionId || item.id || `${item.studentId}_${item.toSemester}`
        if (!map.has(key)) {
          map.set(key, item)
        }
      }
      return Array.from(map.values())
    } catch {
      return this.getLocalHistory()
    }
  }

  async promoteStudent({
    studentId,
    studentName,
    registrationNumber,
    rollNumber,
    currentAcademicYearId,
    currentAcademicYear,
    currentSemesterId,
    currentSemester,
    targetAcademicYearId,
    targetAcademicYear,
    targetSemesterId,
    targetSemester,
    targetSectionId = null,
    targetSection = null,
    branchId,
    skipBackend = false,
    promotionDate = new Date().toISOString().slice(0, 10),
    remarks = 'Promoted to next academic term',
  }) {
    const currentSemNum = parseInt(String(currentSemester || currentSemesterId).replace(/\D/g, ''), 10) || 1
    const isDegreeCompletion = currentSemNum >= 8

    let targetSemName = targetSemester || `Semester ${currentSemNum + 1}`
    let nextStatus = 'Active'

    if (isDegreeCompletion) {
      targetSemName = 'Graduated (Degree Conferred)'
      nextStatus = 'Graduated'
    }

    const payload = {
      studentId: Number(studentId) || studentId,
      branchId: Number(branchId) || branchId,
      academicYearId: Number(isDegreeCompletion ? currentAcademicYearId : (targetAcademicYearId || currentAcademicYearId)),
      currentSemester: currentSemNum,
      nextSemester: isDegreeCompletion ? currentSemNum : currentSemNum + 1,
      eligibilityStatus: 'ELIGIBLE',
      remarks,
    }

    let backendResult = null
    if (!skipBackend) {
      try {
        backendResult = await studentPromotionApi.promote(payload)
      } catch (err) {
        console.warn('Backend promote API unavailable, continuing locally:', err)
      }
    }

    // Update the student profile in memory / storage
    let existingProfile = null
    try {
      existingProfile = await studentService.getProfileById(studentId)
      if (existingProfile) {
        const updatedAcademic = {
          ...(existingProfile.academic || {}),
          academicYearId: isDegreeCompletion ? existingProfile.academic?.academicYearId : (targetAcademicYearId || existingProfile.academic?.academicYearId),
          academicYear: isDegreeCompletion ? existingProfile.academic?.academicYear : (targetAcademicYear || existingProfile.academic?.academicYear),
          semesterId: isDegreeCompletion ? existingProfile.academic?.semesterId : (targetSemesterId || currentSemNum + 1),
          semester: isDegreeCompletion ? existingProfile.academic?.semester : targetSemName,
          sectionId: isDegreeCompletion ? null : (targetSectionId || null),
          section: isDegreeCompletion ? null : (targetSection || ''),
        }

        await studentService.updateProfile(studentId, {
          ...existingProfile,
          status: nextStatus,
          academic: updatedAcademic,
        })
      }
    } catch (err) {
      console.warn('Could not update student profile during promotion:', err)
    }

    const historyEntry = {
      promotionId: backendResult?.promotionId || backendResult?.id || `PROM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId,
      studentName,
      registrationNumber: registrationNumber || rollNumber,
      rollNumber: rollNumber || registrationNumber,
      fromAcademicYear: currentAcademicYear,
      toAcademicYear: isDegreeCompletion ? currentAcademicYear : targetAcademicYear,
      fromSemester: currentSemester,
      toSemester: targetSemName,
      fromSection: existingProfile?.academic?.section || '',
      toSection: isDegreeCompletion ? 'N/A' : (targetSection || 'Unallocated'),
      promotionDate,
      status: isDegreeCompletion ? 'Graduated' : 'Promoted',
      remarks,
      ...backendResult,
    }

    this.saveLocalHistory(historyEntry)

    eventBus.emit(ERP_EVENTS.PROMOTION_EXECUTED, historyEntry)
    eventBus.emit(ERP_EVENTS.STUDENT_UPDATED, { studentId })

    return historyEntry
  }

  async promoteBulk(students, promotionScope) {
    if (!students || !students.length) {
      throw new Error('Select at least one valid student for promotion.')
    }

    const ineligibleStudents = students.filter((student) => {
      const studentId = student.studentId ?? student.id
      return explicitlyIneligible(student) || this.getEligibilityOverride(studentId) === 'INELIGIBLE'
    })
    if (ineligibleStudents.length) {
      throw new Error('Ineligible students cannot be promoted. Remove them from the promotion selection first.')
    }

    const currentSemester = parseInt(String(promotionScope.currentSemester || promotionScope.currentSemesterId).replace(/\D/g, ''), 10) || 1
    const isDegreeCompletion = currentSemester >= 8

    // A promotion is allowed only once for a student from a given semester.
    // History comes from the backend when available and local storage in demo
    // mode, so this also prevents repeat clicks after refresh.
    const history = await this.getHistory()
    const alreadyPromoted = students.filter((student) => {
      const id = studentKey(student)
      return history.some((entry) => {
        const sameStudent = id && id === studentKey(entry)
        const sameSourceSemester = semesterNumber(entry.fromSemester || entry.currentSemester) === currentSemester
        return sameStudent && sameSourceSemester && /promoted|graduated/i.test(String(entry.status || ''))
      })
    })
    if (alreadyPromoted.length) {
      throw new Error('One or more selected students have already been promoted from this semester.')
    }

    const studentIds = students
      .map((student) => student.studentId ?? student.id ?? student.rollNumber ?? student.registrationNumber)
      .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')

    if (!studentIds.length) {
      throw new Error('Select at least one valid student for promotion.')
    }

    const branchId = promotionScope.branchId
    const currentAcademicYearId = promotionScope.currentAcademicYearId
    const targetAcademicYearId = promotionScope.targetAcademicYearId || currentAcademicYearId

    // Attempt backend atomic bulk promotion if endpoint is available
    let bulkPromotionCompleted = false
    try {
      const numericIds = studentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      const numericBranchId = Number(branchId)
      const numericYearId = Number(isDegreeCompletion ? currentAcademicYearId : targetAcademicYearId)

      if (numericIds.length && Number.isInteger(numericBranchId) && Number.isInteger(numericYearId)) {
        await studentPromotionApi.promoteBulkAtomic({
          studentIds: numericIds,
          branchId: numericBranchId,
          academicYearId: numericYearId,
          currentSemester,
          nextSemester: isDegreeCompletion ? currentSemester : currentSemester + 1,
          eligibilityStatus: 'ELIGIBLE',
          remarks: promotionScope.remarks || 'Bulk batch promotion',
        })
        bulkPromotionCompleted = true
      }
    } catch (err) {
      console.warn('Backend atomic bulk promotion unavailable, continuing with individual updates:', err)
    }

    const results = []
    for (const student of students) {
      const res = await this.promoteStudent({
        studentId: student.studentId || student.id,
        studentName: student.studentName || student.fullName || student.name || student.personal?.fullName,
        registrationNumber: student.registrationNumber || student.application?.registrationNumber || student.rollNumber,
        rollNumber: student.rollNumber || student.academic?.rollNumber || student.registrationNumber,
        branchId: promotionScope.branchId,
        currentAcademicYearId: promotionScope.currentAcademicYearId,
        currentAcademicYear: promotionScope.currentAcademicYear,
        currentSemesterId: promotionScope.currentSemesterId,
        currentSemester: promotionScope.currentSemester,
        targetAcademicYearId: promotionScope.targetAcademicYearId,
        targetAcademicYear: promotionScope.targetAcademicYear,
        targetSemesterId: promotionScope.targetSemesterId,
        targetSemester: promotionScope.targetSemester,
        targetSectionId: promotionScope.targetSectionId,
        targetSection: promotionScope.targetSection,
        promotionDate: promotionScope.promotionDate || new Date().toISOString().slice(0, 10),
        remarks: promotionScope.remarks || 'Bulk batch promotion',
        // Atomic bulk promotion already wrote the backend record. Calling the
        // individual endpoint again was creating duplicate promotions.
        skipBackend: bulkPromotionCompleted,
      })
      results.push(res)
    }
    return results
  }
}

/* export */ const promotionService = new PromotionService()
/* export default promotionService */
// #endregion services/promotionService.js
return {
  get promotionService() { return promotionService; },
  get default() { return promotionService; }
};
})();

export const attendanceServiceModule = (() => {
const { studentAttendanceApi } = apiEndpointsModule;
const { sectionAssignmentApi } = apiEndpointsModule;
const { default: studentService } = studentServiceModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
/* Imports for isolated regression tests:
import { studentAttendanceApi, sectionAssignmentApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'
*/
// #region services/attendanceService.js
const clean = value => String(value ?? '').trim()
const same = (left, right) => clean(left).toLowerCase() === clean(right).toLowerCase()

class AttendanceService {
  async getSessions(filter = {}) {
    const sessions = await studentAttendanceApi.list(filter)
    return sessions.map(session => ({
      ...session,
      id: session.attendanceSessionId,
      sessionId: session.attendanceSessionId,
      date: String(session.attendanceDate || '').slice(0, 10),
      subject: session.subjectName || session.subjectCode || '',
      course: session.courseName || '',
      branch: session.sectionName || '',
      semester: session.semesterName || '',
      section: session.sectionName || '',
      faculty: session.facultyName || '',
      totalStudents: Number(session.markedCount || 0),
      presentCount: Number(session.presentCount || 0) + Number(session.lateCount || 0),
      absentCount: Number(session.absentCount || 0),
      records: [],
    }))
  }

  async getSessionStudents(sessionId) {
    const response = await studentAttendanceApi.getStudents(sessionId)
    const students = Array.isArray(response?.students) ? response.students : Array.isArray(response) ? response : []
    const statusLabels = {
      PRESENT: 'Present',
      ABSENT: 'Absent',
      LATE: 'Late',
      LEAVE: 'Excused',
      EXCUSED: 'Excused',
      UNMARKED: 'Unmarked',
    }
    return students.map(student => {
      const rawStatus = String(student.attendanceStatus ?? student.status ?? 'UNMARKED').toUpperCase()
      return {
        ...student,
        studentId: student.studentId ?? student.id,
        rollNumber: student.studentCode ?? student.rollNumber ?? student.registrationNumber ?? '',
        name: student.studentName ?? student.fullName ?? student.name ?? 'Student',
        status: statusLabels[rawStatus] || rawStatus,
      }
    })
  }

  async getStudentsForAttendance(scope) {
    const sectionId = scope?.sectionId
    if (!sectionId) return []

    // Attendance must use the roster assigned to this exact section. Broad
    // branch/profile fallbacks can mix students from another college when
    // academic profile metadata is incomplete.
    const assigned = await sectionAssignmentApi.listBySection(sectionId)
    if (!Array.isArray(assigned) || assigned.length === 0) return []

    const profiles = await studentService.getAllProfiles().catch(() => [])
    const profileMap = new Map(profiles.map(profile => [
      String(profile.studentId ?? profile.id ?? profile.student_id ?? ''),
      profile,
    ]))
    const selectedCollegeId = String(scope?.collegeId ?? '')
    const collegeIdOf = item => item?.collegeId ?? item?.CollegeId ?? item?.college_id ??
      item?.academic?.collegeId ?? item?.academic?.college_id ??
      item?.admission?.collegeId ?? item?.admission?.college_id ?? ''

    return assigned.flatMap(item => {
      const studentId = item.studentId ?? item.StudentId ?? item.id
      const profile = profileMap.get(String(studentId ?? '')) || {}
      const studentCollegeId = String(collegeIdOf(profile) || collegeIdOf(item) || '')
      if (selectedCollegeId && studentCollegeId && studentCollegeId !== selectedCollegeId) return []

      const personal = profile.personal || {}
      const academic = profile.academic || {}
      const name = item.fullName || item.FullName || item.studentName || personal.fullName || profile.name || item.name || 'Student'
      const rollNumber = item.studentCode || item.StudentCode || item.rollNumber || item.enrollmentNo || academic.rollNumber || profile.rollNumber || ''
      return [{
        studentId,
        id: studentId,
        name,
        rollNumber,
        registrationNumber: item.registrationNumber || profile.registrationNumber || rollNumber,
        status: 'Present',
      }]
    })
  }

  async recordAttendance(session) {
    const required = ['academicYearId', 'semesterId', 'sectionId', 'subjectId', 'facultyId', 'date']
    const missing = required.find(key => !clean(session[key]))
    if (missing) throw new Error(`Select ${missing.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').toLowerCase()} before saving attendance.`)
    if (!Array.isArray(session.records) || !session.records.length) throw new Error('Load and mark at least one student before saving attendance.')
    if (session.records.some(record => !clean(record.studentId) || !['Present', 'Absent', 'Late', 'Excused'].includes(record.status))) throw new Error('Every student must have a valid attendance status.')
    const existing = await studentAttendanceApi.list({ academicYearId: session.academicYearId, semesterId: session.semesterId, sectionId: session.sectionId, subjectId: session.subjectId, fromDate: session.date, toDate: session.date })
    if (existing.some(item => same(item.subjectName || item.subjectCode, session.subject))) throw new Error('Attendance for this section, date, and subject already exists. Open the existing session to make corrections.')
    const rawSubId = Number(session.subjectId) || Number(String(session.subjectId).replace(/\D/g, '')) || 1
    const saved = await studentAttendanceApi.create({
      academicYearId: Number(session.academicYearId),
      semesterId: Number(session.semesterId),
      sectionId: Number(session.sectionId || 1),
      subjectId: rawSubId,
      facultyId: Number(session.facultyId),
      attendanceDate: session.date,
      remarks: session.remarks || null,
      ...(session.collegeId ? { collegeId: Number(session.collegeId) } : {}),
    })
    const sessionId = saved.attendanceSessionId || saved.sessionId || saved.id
    if (!sessionId) throw new Error('Session was created, but the API response did not include attendanceSessionId.')
    const rosterResponse = await studentAttendanceApi.getStudents(sessionId)
    const roster = Array.isArray(rosterResponse.students) ? rosterResponse.students : []
    if (!roster.length) throw new Error('The new session has no students in its backend roster. Check student section assignments before marking attendance.')
    const requestedMarks = new Map(session.records.map(record => [String(record.studentId), record]))
    const rosterMarks = roster.map(student => {
      const studentId = student.studentId ?? student.id
      const selected = requestedMarks.get(String(studentId))
      return { studentId, status: selected?.status || 'Absent', remarks: selected?.remarks || null }
    })
    const marked = await studentAttendanceApi.mark(sessionId, {
      students: rosterMarks.map(record => ({
        studentId: Number(record.studentId),
        attendanceStatus: ({ Present: 'PRESENT', Absent: 'ABSENT', Late: 'LATE', Excused: 'LEAVE' })[record.status],
        remarks: record.remarks || null,
      })), markUnlistedAsAbsent: false, completeSession: true,
    })
    const result = { ...saved, ...marked, attendanceSessionId: sessionId }
    eventBus.emit(ERP_EVENTS.ATTENDANCE_RECORDED, result)
    return result
  }

}

/* export */ const attendanceService = new AttendanceService()
/* export default attendanceService */
// #endregion services/attendanceService.js
return {
  get attendanceService() { return attendanceService; },
  get default() { return attendanceService; }
};
})();

export const timetableLifecycleApiModule = (() => {
const { timetableManagementApi } = apiEndpointsModule;
/* Imports for isolated regression tests:
import { timetableManagementApi } from './apiEndpoints'
*/
// #region api/timetableLifecycleApi.js
// Routes and request fields verified against timetable-current-openapi.json.
// Responses remain unmodified: Swagger does not describe their schemas.
/* export */ const timetableOperations = {
  periods: ['get', '/periods', ['academicYearId']],
  createPeriod: ['post', '/periods', 'PeriodConfigurationRequest'],
  automaticPeriods: ['post', '/periods/automatic', 'AutomaticPeriodSetupRequest'],
  updatePeriod: ['put', '/periods/{periodId}', 'PeriodConfigurationRequest'],
  deletePeriod: ['remove', '/periods/{periodId}'],
  reorderPeriods: ['put', '/periods/reorder', 'PeriodReorderRequest'],
  calendar: ['get', '/calendar', ['academicYearId']],
  saveCalendar: ['put', '/calendar', 'CalendarConfigurationRequest'],
  classrooms: ['get', '/classrooms', ['collegeId', 'activeOnly']],
  createClassroom: ['post', '/classrooms', 'ClassroomRequest'],
  updateClassroom: ['put', '/classrooms/{classroomId}', 'ClassroomRequest'],
  timetables: ['get', '/timetables', ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'status']],
  createTimetable: ['post', '/timetables', 'CreateAdvancedTimetableRequest'],
  timetable: ['get', '/timetables/{timetableId}'],
  updateTimetable: ['put', '/timetables/{timetableId}', 'UpdateAdvancedTimetableRequest'],
  syncPeriods: ['post', '/timetables/{timetableId}/sync-periods'],
  requirements: ['get', '/timetables/{timetableId}/requirements'],
  saveRequirements: ['put', '/timetables/{timetableId}/requirements', 'SaveTimetableRequirementsRequest'],
  generate: ['post', '/timetables/{timetableId}/generate', 'GenerateTimetableRequest'],
  status: ['get', '/timetables/{timetableId}/status'],
  regenerate: ['post', '/timetables/{timetableId}/regenerate', 'GenerateTimetableRequest'],
  roomAvailability: ['get', '/timetables/{timetableId}/rooms/availability', ['timetableSlotId', 'dayOfWeek']],
  generateMissing: ['post', '/timetables/{timetableId}/generate-missing', 'GenerateTimetableRequest'],
  entries: ['get', '/timetables/{timetableId}/entries', ['facultyId', 'dayOfWeek']],
  createEntry: ['post', '/timetables/{timetableId}/entries', 'ManualTimetableEntryRequest'],
  updateEntry: ['put', '/timetables/{timetableId}/entries/{entryId}', 'ManualTimetableEntryRequest'],
  deleteEntry: ['remove', '/timetables/{timetableId}/entries/{entryId}'],
  moveEntry: ['put', '/timetables/{timetableId}/entries/{entryId}/move', 'MoveTimetableEntryRequest'],
  validate: ['post', '/timetables/{timetableId}/validate'],
  validateGlobal: ['post', '/timetables/{timetableId}/validate-global'],
  publish: ['post', '/timetables/{timetableId}/publish'],
  reopen: ['post', '/timetables/{timetableId}/reopen'],
  faculty: ['get', '/views/faculty/{facultyId}', ['academicYearId', 'date']],
  student: ['get', '/views/student/{studentId}', ['academicYearId', 'date']],
  classroom: ['get', '/views/classroom/{classroomId}', ['academicYearId', 'date']],
  section: ['get', '/views/section/{sectionId}', ['academicYearId', 'date']],
  occurrences: ['get', '/occurrences', ['date', 'sectionId', 'facultyId', 'classroomId']],
}

/* export */ function createTimetableLifecycleApi(client) {
  return Object.fromEntries(Object.entries(timetableOperations).map(([name, [method, template, fields]]) => [name, (ids = {}, payload) => {
    const path = template.replace(/\{(\w+)\}/g, (_, field) => {
      const value = Number(ids[field])
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`A valid backend ${field} is required.`)
      return String(value)
    })
    if (method === 'get') {
      const query = Object.fromEntries((fields || []).filter(field => ids[field] !== undefined && ids[field] !== null && ids[field] !== '').map(field => [field, ids[field]]))
      return client.get(path, query)
    }
    return client[method](path, fields ? payload : undefined)
  }]))
}

/* export */ const timetableLifecycleApi = createTimetableLifecycleApi(timetableManagementApi)
// #endregion api/timetableLifecycleApi.js
return {
  get timetableOperations() { return timetableOperations; },
  get createTimetableLifecycleApi() { return createTimetableLifecycleApi; },
  get timetableLifecycleApi() { return timetableLifecycleApi; }
};
})();

export const timetableUtilsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region utils/timetableUtils.js
/* export */ const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
/* export */ const key = value => String(value ?? '').trim()
/* export */ const same = (a, b) => Boolean(key(a) && key(b) && key(a) === key(b))
/* export */ const active = row => ![row?.status, row?.isActive, row?.active].some(value => [false, 0, '0', 'false', 'inactive', 'archived'].includes(typeof value === 'string' ? value.toLowerCase() : value))
/* export */ const academicFields = ['academicYearId', 'courseId', 'branchId', 'semesterId']
/* export */ const matchesScope = (row, scope, fields = academicFields) => fields.every(field => !key(scope[field]) || same(row[field], scope[field]))
/* export */ const completeScope = scope => [...academicFields, 'sectionId'].every(field => key(scope[field]))

/* export */ function timeMinutes(value) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(key(value))
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) return null
  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3] || 0) / 60
}
/* export */ const validTime = row => timeMinutes(row.startTime) != null && timeMinutes(row.endTime) != null && timeMinutes(row.startTime) < timeMinutes(row.endTime)
/* export */ const overlaps = (a, b) => validTime(a) && validTime(b) && timeMinutes(a.startTime) < timeMinutes(b.endTime) && timeMinutes(a.endTime) > timeMinutes(b.startTime)
/* export */ const roomKey = row => key(row.classroom).replace(/\s+/g, ' ').toLowerCase()
/* export */ const sameRoom = (a, b) => (a.roomId ?? a.classroomId) && (b.roomId ?? b.classroomId) ? same(a.roomId ?? a.classroomId, b.roomId ?? b.classroomId) : Boolean(roomKey(a) && roomKey(a) === roomKey(b))

/* export */ function normalizeEntry(row, sections = []) {
  const section = sections.find(section => same(section.id, row.sectionId))
  return { ...row, ...Object.fromEntries(academicFields.map(field => [field, row[field] ?? section?.[field] ?? ''])), id: row.timetableEntryId ?? row.id, dayOfWeek: key(row.dayOfWeek).toUpperCase(), startTime: row.startTime ?? row.timetableSlot?.startTime ?? '', endTime: row.endTime ?? row.timetableSlot?.endTime ?? '', classroom: key(row.classroom) }
}

// Missing legacy validity is conservative; known disjoint periods cannot conflict.
/* export */ function validityOverlaps(a, b) {
  const range = row => {
    const start = key(row.effectiveFrom || row.calendar?.startDate || row.planning?.calendar?.startDate).slice(0, 10)
    const end = key(row.effectiveTo || row.calendar?.endDate || row.planning?.calendar?.endDate).slice(0, 10)
    const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
    return valid(start) && valid(end) && start < end ? { start, end } : null
  }
  const left = range(a), right = range(b)
  return !left || !right || left.start <= right.end && right.start <= left.end
}

/* export */ function conflictsFor(candidate, entries) {
  const conflicts = []
  for (const row of entries) {
    if (!active(row) || !validityOverlaps(candidate, row) || same(row.id, candidate.id) || key(row.dayOfWeek).toUpperCase() !== key(candidate.dayOfWeek).toUpperCase()) continue
    const resources = []
    if (same(row.facultyId, candidate.facultyId)) resources.push('Faculty')
    if (same(row.sectionId, candidate.sectionId)) resources.push('Section')
    if (sameRoom(row, candidate)) resources.push('Classroom')
    if (!resources.length) continue
    if (!validTime(row)) { conflicts.push({ id: row.id, resources, message: `${resources.join(' / ')} conflict cannot be checked: an existing ${row.dayOfWeek} entry has missing or invalid period times.` }); continue }
    if (overlaps(candidate, row)) conflicts.push({ id: row.id, resources, message: `${resources.join(' / ')} conflict on ${row.dayOfWeek}: ${row.startTime}-${row.endTime}${row.classroom ? `, ${row.classroom}` : ''}. ${row.facultyName || `Faculty ${row.facultyId || 'unavailable'}`} | ${row.sectionName || `Section ${row.sectionId || 'unavailable'}`} | ${row.subjectName || `Subject ${row.subjectId || 'unavailable'}`}${row.timetableName ? ` | ${row.timetableName}` : ''}.` })
  }
  return conflicts
}
/* export */ function conflictPairs(entries) {
  const seen = new Set(), result = []
  entries.filter(active).forEach(row => conflictsFor(row, entries).forEach(conflict => {
    const pair = [key(row.id), key(conflict.id)].sort().join(':')
    if (!seen.has(pair)) { seen.add(pair); result.push({ ...conflict, entryId: row.id }) }
  }))
  return result
}

/* export */ function eligibleSubjects(subjects, scope) {
  // Subject Swagger maps course/branch/semester; academic year is optional on this master.
  return subjects.filter(row => active(row) && ['courseId', 'branchId', 'semesterId'].every(field => same(row[field], scope[field])) && (!row.academicYearId || same(row.academicYearId, scope.academicYearId)))
}
/* export */ function eligibleFaculty(faculty, allocations, subjectId, scope) {
  const ids = new Set(allocations.filter(row => active(row) && same(row.subjectId, subjectId) && ['branchId', 'semesterId'].every(field => same(row[field], scope[field])) && ['academicYearId', 'courseId', 'sectionId'].every(field => !row[field] || same(row[field], scope[field]))).map(row => key(row.facultyId)))
  return faculty.filter(row => active(row) && ids.has(key(row.id)))
}
/* export */ function existingTimetables(entries, scope) {
  const rows = entries.filter(row => matchesScope(row, scope) && (!scope.sectionId || same(row.sectionId, scope.sectionId)))
  return [...new Map(rows.filter(row => row.timetableId).map(row => [key(row.timetableId), { id: row.timetableId, name: row.timetableName || `Timetable ${row.timetableId}` }])).values()]
}
/* export */ function existingSlots(entries, timetableId) {
  const rows = entries.filter(row => same(row.timetableId, timetableId) && row.timetableSlotId && validTime(row))
  return [...new Map(rows.map(row => [key(row.timetableSlotId), { id: row.timetableSlotId, name: `${row.slotName || 'Period'} | ${row.startTime.slice(0, 5)}-${row.endTime.slice(0, 5)}`, startTime: row.startTime, endTime: row.endTime }])).values()].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
}
/* export */ function entryPayload(row, updating = false) {
  const result = {}
  for (const field of ['timetableId', 'timetableSlotId', 'facultyId', 'subjectId', 'sectionId']) {
    const value = Number(row[field])
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Select a valid ${field.replace(/Id$/, '')} record.`)
    result[field] = value
  }
  if (![...DAYS, 'SUNDAY'].includes(row.dayOfWeek)) throw new Error('Select a valid day.')
  result.dayOfWeek = row.dayOfWeek
  result.classroom = key(row.classroom) || null
  result.entryType = key(row.entryType) || null
  if (updating) result.status = active(row)
  return result
}

// Administrative entry status is not a draft/published timetable status.
/* export */ const publicationState = row => {
  const status = key(row.publicationStatus ?? row.timetable?.publicationStatus).toLowerCase()
  return ['draft', 'published'].includes(status) ? status : 'unavailable'
}
// #endregion utils/timetableUtils.js
return {
  get DAYS() { return DAYS; },
  get key() { return key; },
  get same() { return same; },
  get active() { return active; },
  get academicFields() { return academicFields; },
  get matchesScope() { return matchesScope; },
  get completeScope() { return completeScope; },
  get timeMinutes() { return timeMinutes; },
  get validTime() { return validTime; },
  get overlaps() { return overlaps; },
  get roomKey() { return roomKey; },
  get sameRoom() { return sameRoom; },
  get normalizeEntry() { return normalizeEntry; },
  get validityOverlaps() { return validityOverlaps; },
  get conflictsFor() { return conflictsFor; },
  get conflictPairs() { return conflictPairs; },
  get eligibleSubjects() { return eligibleSubjects; },
  get eligibleFaculty() { return eligibleFaculty; },
  get existingTimetables() { return existingTimetables; },
  get existingSlots() { return existingSlots; },
  get entryPayload() { return entryPayload; },
  get publicationState() { return publicationState; }
};
})();

export const timetablePeriodsModule = (() => {
const { key } = timetableUtilsModule;
const { same } = timetableUtilsModule;
const { timeMinutes } = timetableUtilsModule;
const { validTime } = timetableUtilsModule;
const { overlaps } = timetableUtilsModule;
/* Imports for isolated regression tests:
import { key, same, timeMinutes, validTime, overlaps } from './timetableUtils.js'
*/
// #region utils/timetablePeriods.js
/* export */ const periodType = period => key(period.type || 'class').toLowerCase()
/* export */ const isTeachingPeriod = period => periodType(period) === 'class'
/* export */ const teachingPeriods = periods => (periods || []).filter(isTeachingPeriod)
/* export */ const periodLabel = (period, index = 0) => period.name || (isTeachingPeriod(period) ? `P${index + 1}` : periodType(period) === 'lunch' ? 'Lunch' : 'Break')
const clockTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/* export */ function periodSetupErrors(periods = []) {
  const errors = []
  if (!teachingPeriods(periods).length) errors.push('Add at least one teaching period.')
  if (periods.some(row => row.name !== undefined && !key(row.name))) errors.push('Enter a name for every period.')
  if (periods.some(row => !key(row.id) || !validTime(row))) errors.push('Configure valid periods with a start time and a later end time.')
  if (periods.some(row => !['class', 'break', 'lunch'].includes(periodType(row)))) errors.push('Period type must be Class, Break or Lunch.')
  if (periods.some((row, index) => periods.slice(index + 1).some(other => same(row.id, other.id) || (key(row.name) && key(row.name).toLowerCase() === key(other.name).toLowerCase())))) errors.push('Periods must not have duplicate IDs or names.')
  if (periods.some((row, index) => periods.slice(index + 1).some(other => overlaps(row, other)))) errors.push('Periods must not overlap, including Break and Lunch.')
  return errors
}

// Proposed local times only: no institutional period API exists in the inspected contract.
/* export */ const DEFAULT_PERIOD_SETUP = Object.freeze({ startTime: '09:00', endTime: '16:00', duration: 60, breakDuration: 15, lunchDuration: 45, breakAfter: 2, lunchAfter: 4 })
/* export */ const DAILY_PERIOD_SETUP = Object.freeze({ startTime: '09:00', periodsPerDay: 7, duration: 50, breakDuration: 20, lunchDuration: 50, breakAfter: 2, lunchAfter: 4 })
/* export */ function dailyPeriods(settings, previous = []) {
  const count = Number(settings.periodsPerDay), duration = Number(settings.duration)
  const start = timeMinutes(settings.startTime)
  const errors = []
  if (!Number.isInteger(count) || count < 1 || count > 24) errors.push('Periods per day must be between 1 and 24.')
  if (start == null || !Number.isInteger(start)) errors.push('Enter a valid college start time.')
  for (const kind of ['break', 'lunch']) {
    if (Number(settings[`${kind}Duration`]) > 0 && (!Number.isInteger(Number(settings[`${kind}After`])) || Number(settings[`${kind}After`]) < 1 || Number(settings[`${kind}After`]) >= count)) errors.push(`${kind} must be placed between teaching periods.`)
  }
  const end = start + count * duration + Number(settings.breakDuration) + Number(settings.lunchDuration)
  if (!Number.isFinite(end) || end >= 1440) errors.push('The college day must end before midnight.')
  if (errors.length) return { periods: [], errors, endTime: '' }
  const result = automaticPeriods({ ...settings, endTime: clockTime(end) }, previous)
  return { ...result, endTime: result.errors.length ? '' : clockTime(end) }
}
/* export */ function automaticPeriods(settings, previous = []) {
  const errors = [], periods = []
  const start = timeMinutes(settings.startTime), end = timeMinutes(settings.endTime)
  const duration = Number(settings.duration), shortBreak = Number(settings.breakDuration), lunch = Number(settings.lunchDuration)
  if (start == null || end == null || start >= end) errors.push('College end time must be later than its start time.')
  if (!Number.isInteger(duration) || duration < 1 || duration > 720) errors.push('Period duration must be 1-720 minutes.')
  if (![shortBreak, lunch].every(value => Number.isInteger(value) && value >= 0 && value <= 240)) errors.push('Break and lunch durations must be 0-240 minutes.')
  if (![settings.breakAfter, settings.lunchAfter].every(value => Number.isInteger(Number(value)) && Number(value) > 0)) errors.push('Break and lunch placement must follow a positive teaching period number.')
  if (errors.length) return { periods, errors, unusedMinutes: 0 }
  let cursor = start, count = 0
  const append = (name, type, minutes) => {
    const startTime = clockTime(cursor), endTime = clockTime(cursor + minutes)
    const old = previous.find(row => periodType(row) === type && row.name === name)
      || previous.find(row => periodType(row) === type && row.startTime === startTime && row.endTime === endTime)
    periods.push({ id: old?.id || `auto-${type}-${count}`, name, type, startTime, endTime, source: old?.source || 'local' })
    cursor += minutes
  }
  while (cursor + duration <= end) {
    count += 1
    append(`P${count}`, 'class', duration)
    if (count === Number(settings.breakAfter) && shortBreak && cursor + shortBreak <= end) append('Break', 'break', shortBreak)
    if (count === Number(settings.lunchAfter) && lunch && cursor + lunch <= end) append('Lunch', 'lunch', lunch)
  }
  if (!count) errors.push('The college day is shorter than one teaching period.')
  return { periods, errors, unusedMinutes: end - cursor }
}

// Consecutive teaching sessions cannot cross a non-teaching interval.
/* export */ function periodSessions(periods = [], size = 1) {
  const sorted = teachingPeriods(periods).filter(validTime).sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
  return sorted.map((_, index) => sorted.slice(index, index + size))
    .filter(block => block.length === size && block.every((row, index) => !index || timeMinutes(block[index - 1].endTime) === timeMinutes(row.startTime))
      && !periods.some(row => !isTeachingPeriod(row) && overlaps(row, { startTime: block[0].startTime, endTime: block.at(-1).endTime })))
}
// #endregion utils/timetablePeriods.js
return {
  get periodType() { return periodType; },
  get isTeachingPeriod() { return isTeachingPeriod; },
  get teachingPeriods() { return teachingPeriods; },
  get periodLabel() { return periodLabel; },
  get periodSetupErrors() { return periodSetupErrors; },
  get DEFAULT_PERIOD_SETUP() { return DEFAULT_PERIOD_SETUP; },
  get DAILY_PERIOD_SETUP() { return DAILY_PERIOD_SETUP; },
  get dailyPeriods() { return dailyPeriods; },
  get automaticPeriods() { return automaticPeriods; },
  get periodSessions() { return periodSessions; }
};
})();

export const timetableSemesterModule = (() => {
const { same } = timetableUtilsModule;
/* Imports for isolated regression tests:
import { same } from './timetableUtils.js'
*/
// #region utils/timetableSemester.js
// API dates describe calendar days; preserve the date part without timezone conversion.
/* export */ const semesterDate = value => typeof value === 'string' ? value.slice(0, 10) : ''
/* export */ const validSemesterDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

// Academic identity is required. Reference dates never determine timetable validity.
/* export */ function semesterPeriod(sources, scope) {
  const year = sources.years.find(row => same(row.id ?? row.academicYearId, scope.academicYearId))
  const semester = sources.semesters.find(row => same(row.id ?? row.semesterId, scope.semesterId))
  const startDate = semesterDate(semester?.startDate), endDate = semesterDate(semester?.endDate)
  const errors = []
  if (!year) errors.push('The selected Academic Year record is unavailable. Select an Academic Year.')
  if (!semester) errors.push('The selected Semester record is unavailable. Select a Semester from this Academic Year.')
  else if (semester.academicYearId && !same(semester.academicYearId, scope.academicYearId)) errors.push('The selected Semester does not belong to the selected Academic Year. Select a matching Semester.')
  return { startDate, endDate, errors, valid: errors.length === 0, referenceAvailable: validSemesterDate(startDate) && validSemesterDate(endDate) && startDate < endDate }
}

/* export */ function formatSemesterPeriod(period) {
  return period.referenceAvailable ? `Semester Reference Period: ${period.startDate} ? ${period.endDate}` : 'Semester dates are not configured. Timetable validity is controlled by the selected timetable date range.'
}

/* export */ function timetableDateErrors(calendar) {
  if (!calendar?.startDate || !calendar?.endDate) return ['Timetable start date and end date are required.']
  if (!validSemesterDate(calendar.startDate) || !validSemesterDate(calendar.endDate)) return ['Enter valid timetable dates in YYYY-MM-DD format.']
  if (calendar.startDate >= calendar.endDate) return ['Timetable end date must be after the start date.']
  return []
}
// #endregion utils/timetableSemester.js
return {
  get semesterDate() { return semesterDate; },
  get validSemesterDate() { return validSemesterDate; },
  get semesterPeriod() { return semesterPeriod; },
  get formatSemesterPeriod() { return formatSemesterPeriod; },
  get timetableDateErrors() { return timetableDateErrors; }
};
})();

export const timetablePlannerModule = (() => {
const { DAYS } = timetableUtilsModule;
const { key } = timetableUtilsModule;
const { same } = timetableUtilsModule;
const { active } = timetableUtilsModule;
const { matchesScope } = timetableUtilsModule;
const { eligibleSubjects } = timetableUtilsModule;
const { eligibleFaculty } = timetableUtilsModule;
const { validTime } = timetableUtilsModule;
const { timeMinutes } = timetableUtilsModule;
const { overlaps } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { roomKey } = timetableUtilsModule;
const { isTeachingPeriod } = timetablePeriodsModule;
const { teachingPeriods } = timetablePeriodsModule;
const { periodSetupErrors } = timetablePeriodsModule;
const { periodSessions } = timetablePeriodsModule;
const { semesterPeriod } = timetableSemesterModule;
const { timetableDateErrors } = timetableSemesterModule;
/* Imports for isolated regression tests:
import { DAYS, key, same, active, matchesScope, eligibleSubjects, eligibleFaculty, validTime, timeMinutes, overlaps, conflictsFor, roomKey } from './timetableUtils.js'
import { isTeachingPeriod, teachingPeriods, periodSetupErrors, periodSessions } from './timetablePeriods.js'
import { semesterPeriod, timetableDateErrors } from './timetableSemester.js'
*/
// #region utils/timetablePlanner.js
/* export */ const WEEKDAYS = [...DAYS, 'SUNDAY']
/* export */ const dateKey = value => key(value).slice(0, 10)
/* export */ const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
/* export */ const weekday = date => ['SUNDAY', ...DAYS][new Date(`${date}T12:00:00Z`).getUTCDay()]

/* export */ function calendarBounds(sources, scope) {
  const { startDate, endDate } = semesterPeriod(sources, scope)
  return { startDate, endDate }
}

// Calendar exceptions filter occurrences without changing the weekly schedule.
/* export */ function workingDate(date, calendar) {
  if (!validDate(date)) return { working: false, reason: 'Invalid date' }
  if (!calendar?.reviewed || !validDate(calendar.startDate) || !validDate(calendar.endDate)) return { working: false, reason: 'Calendar has not been configured and reviewed' }
  if (date < calendar.startDate || date > calendar.endDate) return { working: false, reason: 'Outside timetable validity period' }
  if ((calendar.holidays || []).includes(date)) return { working: false, reason: 'Holiday / non-working date' }
  if (!(calendar.workingDays || []).includes(weekday(date))) return { working: false, reason: 'Non-working weekday' }
  return { working: true, reason: '' }
}

/* export */ function calendarDays(calendar) {
  if (!calendar?.reviewed || !validDate(calendar.startDate) || !validDate(calendar.endDate) || calendar.startDate > calendar.endDate) return []
  const result = [], end = Date.parse(`${calendar.endDate}T12:00:00Z`)
  // Protect the UI from accidentally configured multi-decade ranges.
  if ((end - Date.parse(`${calendar.startDate}T12:00:00Z`)) / 86400000 > 730) return []
  for (let time = Date.parse(`${calendar.startDate}T12:00:00Z`); time <= end; time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10)
    if (workingDate(date, calendar).working) result.push(date)
  }
  return result
}

/* export */ function roomOptions(sources, entries = []) {
  const rooms = [...(sources.classrooms || []).filter(row => row.active !== false).map(row => ({ classroom: row.classroomName, roomId: row.classroomId, roomType: row.roomType })), ...sources.sections.filter(active).filter(row => row.room).map(row => ({ classroom: row.room, roomId: row.roomId ?? row.classroomId, roomType: row.roomType })), ...entries.filter(active)]
  const result = new Map()
  for (const row of rooms.filter(row => key(row.classroom))) {
    const id = key(row.roomId ?? row.classroomId)
    const value = id ? `id:${id}` : `text:${roomKey(row)}`
    const previous = result.get(value)
    result.set(value, { value, name: key(row.classroom), classroom: key(row.classroom), ...(id ? { roomId: id } : {}), roomType: row.roomType || previous?.roomType || '' })
  }
  if (sources.classrooms) return [...result.values()].filter(room => sources.classrooms.some(row => row.active !== false && same(row.classroomId, room.roomId))).sort((a, b) => a.name.localeCompare(b.name))
  // When an authoritative ID exists, prefer it over a text-only alias.
  const all = [...result.values()]
  return all.filter(room => room.roomId || !all.some(other => other.roomId && roomKey(other) === roomKey(room))).sort((a, b) => a.name.localeCompare(b.name))
}

/* export */ function sourcePeriods(entries = []) {
  return [...new Map(entries.filter(row => active(row) && validTime(row) && row.timetableSlotId).map(row => [`${row.startTime.slice(0, 5)}-${row.endTime.slice(0, 5)}`, { id: key(row.timetableSlotId), startTime: row.startTime.slice(0, 5), endTime: row.endTime.slice(0, 5), source: row.origin === 'local' ? 'local' : 'backend' }])).values()].sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
}

/* export */ function suitableRoom(subject, room) {
  if (!room.roomType) return true
  if (/lab|practical/i.test(subject.subjectType || '')) return /lab/i.test(room.roomType)
  if (/theory|lecture|tutorial/i.test(subject.subjectType || '')) return !/lab/i.test(room.roomType)
  return true
}

/* export */ function subjectRequirements(sources, scope, overrides = {}) {
  return eligibleSubjects(sources.subjects, scope).filter(subject => overrides[key(subject.id)]?.selected !== false).map(subject => {
    const allocations = sources.allocations.filter(row => active(row) && same(row.subjectId, subject.id) && matchesScope(row, scope, ['branchId', 'semesterId']) && ['academicYearId', 'courseId', 'sectionId'].every(field => !row[field] || same(row[field], scope[field])))
    const counts = [...new Set(allocations.map(row => Number(row.periodsPerWeek)).filter(value => Number.isInteger(value) && value > 0))]
    const explicit = overrides[key(subject.id)] || {}
    const count = explicit.periodsPerWeek !== undefined && explicit.periodsPerWeek !== '' ? Number(explicit.periodsPerWeek) : counts.length === 1 ? counts[0] : 0
    const blockSize = explicit.blockSize !== undefined && explicit.blockSize !== '' ? Number(explicit.blockSize) : 1
    return { subject, faculty: eligibleFaculty(sources.faculty, sources.allocations, subject.id, scope), periodsPerWeek: count, blockSize, source: explicit.periodsPerWeek !== undefined && explicit.periodsPerWeek !== '' ? 'Planning setting' : counts.length === 1 ? 'Faculty allocation' : 'Not configured' }
  })
}

/* export */ function planningErrors(config, sources, scope, entries = []) {
  const errors = [], calendar = config?.calendar, periods = config?.periods || []
  const period = semesterPeriod(sources, scope)
  errors.push(...period.errors)
  if (!calendar?.reviewed) errors.push('Review the working calendar and confirm holidays before generation or publication.')
  const dateErrors = timetableDateErrors(calendar)
  errors.push(...dateErrors)
  if (!dateErrors.length) {
    if (!calendarDays(calendar).length) errors.push('No working dates exist in the reviewed calendar (maximum range: two years).')
  }
  if (!calendar?.workingDays?.length || calendar.workingDays.some(day => !WEEKDAYS.includes(day))) errors.push('Select valid working weekdays.')
  if ((calendar?.holidays || []).some(date => !validDate(date))) errors.push('Enter holidays as valid YYYY-MM-DD dates.')
  errors.push(...periodSetupErrors(periods))
  const rooms = roomOptions(sources, entries)
  if (!config?.rooms?.length || config.rooms.some(value => !rooms.some(room => room.value === value))) errors.push('Select an available classroom or lab.')
  return errors
}

/* export */ function entryPlanningErrors(row, config, sources, scope, allEntries = []) {
  if (!config) return [] // Legacy manual drafts are still readable; publish requires a reviewed plan.
  const errors = [], days = new Set(config.calendar?.workingDays || [])
  if (!days.has(row.dayOfWeek)) errors.push('This day is not selected in the timetable working weekdays.')
  const periods = teachingPeriods(config.periods).filter(period => timeMinutes(period.startTime) >= timeMinutes(row.startTime) && timeMinutes(period.endTime) <= timeMinutes(row.endTime)).sort((a, b) => timeMinutes(a.startTime) - timeMinutes(b.startTime))
  if ((config.periods || []).some(period => !isTeachingPeriod(period) && overlaps(period, row))) errors.push('Classes cannot overlap Break or Lunch.')
  if (!periods.length || timeMinutes(periods[0].startTime) !== timeMinutes(row.startTime) || timeMinutes(periods.at(-1).endTime) !== timeMinutes(row.endTime) || periods.some((period, index) => index && timeMinutes(periods[index - 1].endTime) !== timeMinutes(period.startTime))) errors.push('Class times must match one period or consecutive configured periods.')
  const room = roomOptions(sources, allEntries).find(item => item.roomId && row.roomId ? same(item.roomId, row.roomId) : roomKey(item) === roomKey(row))
  if (!room || !config.rooms.includes(room.value)) errors.push('Choose a room selected in the planning settings.')
  const requirement = subjectRequirements(sources, scope, config.requirements).find(item => same(item.subject.id, row.subjectId))
  if (!requirement) errors.push('Select a subject included in this timetable.')
  if (requirement && periods.length !== requirement.blockSize) errors.push('Class duration must match the configured consecutive periods per session.')
  if (requirement && room && !suitableRoom(requirement.subject, room)) errors.push('Subject type requires a suitable classroom or lab.')
  return errors
}

/* export */ function schedulingIssues(sources, scope, config, scheduled) {
  const issues = []
  const requirements = subjectRequirements(sources, scope, config?.requirements)
  if (!requirements.length) issues.push({ subjectId: '', subjectName: 'Subjects', reason: 'No active API subjects match this academic mapping.' })
  for (const item of requirements) {
    const count = scheduled.filter(row => same(row.subjectId, item.subject.id)).reduce((total, row) => total + teachingPeriods(config?.periods).filter(period => timeMinutes(period.startTime) >= timeMinutes(row.startTime) && timeMinutes(period.endTime) <= timeMinutes(row.endTime)).length, 0)
    let reason = ''
    const missingFrequency = !Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1
    if (missingFrequency) reason = `${item.faculty.length ? '' : 'No allocated faculty available. '}Required weekly periods are missing or ambiguous. Auto Generation cannot determine repetitions. Add classes manually or configure a weekly frequency.`
    else if (!item.faculty.length) reason = 'No allocated faculty available.'
    else if (!Number.isInteger(item.blockSize) || item.blockSize < 1 || item.periodsPerWeek % item.blockSize) reason = 'Weekly periods must be divisible by the consecutive periods per session.'
    else if (count < item.periodsPerWeek) reason = `${item.periodsPerWeek - count} of ${item.periodsPerWeek} weekly periods remain unscheduled. No valid conflict-free slot, faculty or room may be available.`
    else if (count > item.periodsPerWeek) reason = `${count} periods scheduled; requirement is ${item.periodsPerWeek}. Review manual entries.`
    if (reason) issues.push({ subjectId: key(item.subject.id), subjectName: item.subject.name, reason, blocking: !missingFrequency || item.source === 'Planning setting', code: missingFrequency ? 'frequency' : 'unscheduled' })
  }
  return issues
}

// Deterministic constrained-first placement, preserving every existing manual row.
// Exhaustion is reported, never interpreted as proof that no solution can exist.
/* export */ function generateTimetable({ scope, sources, config, existing = [], occupied = [], references = occupied, makeId = () => crypto.randomUUID() }) {
  const errors = planningErrors(config, sources, scope, references)
  if (errors.length) return { entries: existing, added: 0, issues: errors.map(reason => ({ subjectId: '', subjectName: 'Planning settings', reason })) }
  const entries = [...existing], rooms = roomOptions(sources, references).filter(row => config.rooms.includes(row.value))
  const days = [...new Set(config.calendar.workingDays)].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
  const requirements = subjectRequirements(sources, scope, config.requirements).sort((a, b) => a.faculty.length - b.faculty.length || b.blockSize - a.blockSize || key(a.subject.id).localeCompare(key(b.subject.id)))
  for (const item of requirements) {
    if (!Number.isInteger(item.periodsPerWeek) || item.periodsPerWeek < 1 || !Number.isInteger(item.blockSize) || item.blockSize < 1 || item.periodsPerWeek % item.blockSize || !item.faculty.length) continue
    const already = entries.filter(row => same(row.subjectId, item.subject.id)).reduce((total, row) => total + teachingPeriods(config.periods).filter(period => timeMinutes(period.startTime) >= timeMinutes(row.startTime) && timeMinutes(period.endTime) <= timeMinutes(row.endTime)).length, 0)
    const missing = Math.max(0, item.periodsPerWeek - already)
    const blocks = periodSessions(config.periods, item.blockSize)
    for (let count = 0; count + item.blockSize <= missing; count += item.blockSize) {
      let chosen = null
      const balancedDays = [...days].sort((a, b) => entries.filter(row => row.dayOfWeek === a && same(row.subjectId, item.subject.id)).length - entries.filter(row => row.dayOfWeek === b && same(row.subjectId, item.subject.id)).length || entries.filter(row => row.dayOfWeek === a).length - entries.filter(row => row.dayOfWeek === b).length || WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
      for (const dayOfWeek of balancedDays) {
        for (const block of blocks) {
          for (const faculty of item.faculty) {
            for (const room of rooms) {
              if (!suitableRoom(item.subject, room)) continue
              const candidate = { calendar: config.calendar, subjectId: key(item.subject.id), facultyId: key(faculty.id), sectionId: scope.sectionId, dayOfWeek, startTime: block[0].startTime, endTime: block.at(-1).endTime, timetableSlotId: block[0].id, periodIds: block.map(row => row.id), classroom: room.classroom, ...(room.roomId ? { roomId: room.roomId } : {}), entryType: item.subject.subjectType || '', generated: true }
              if (!conflictsFor(candidate, [...occupied, ...entries.map(row => ({ ...row, sectionId: scope.sectionId }))]).length) { chosen = candidate; break }
            }
            if (chosen) break
          }
          if (chosen) break
        }
        if (chosen) break
      }
      if (!chosen) break
      entries.push({ ...chosen, id: makeId() })
    }
  }
  return { entries, added: entries.length - existing.length, issues: schedulingIssues(sources, scope, config, entries) }
}

/* export */ function classesOnDate(entries, date, calendarForEntry) {
  return entries.filter(row => row.dayOfWeek === weekday(date) && workingDate(date, calendarForEntry(row)).working)
}
// #endregion utils/timetablePlanner.js
return {
  get WEEKDAYS() { return WEEKDAYS; },
  get dateKey() { return dateKey; },
  get localDate() { return localDate; },
  get weekday() { return weekday; },
  get calendarBounds() { return calendarBounds; },
  get workingDate() { return workingDate; },
  get calendarDays() { return calendarDays; },
  get roomOptions() { return roomOptions; },
  get sourcePeriods() { return sourcePeriods; },
  get suitableRoom() { return suitableRoom; },
  get subjectRequirements() { return subjectRequirements; },
  get planningErrors() { return planningErrors; },
  get entryPlanningErrors() { return entryPlanningErrors; },
  get schedulingIssues() { return schedulingIssues; },
  get generateTimetable() { return generateTimetable; },
  get classesOnDate() { return classesOnDate; }
};
})();

export const timetableServiceModule = (() => {
const { collegeStorageKey } = collegeScopeModule;
const { academicYearApi } = apiEndpointsModule;
const { courseApi } = apiEndpointsModule;
const { branchApi } = apiEndpointsModule;
const { sectionApi } = apiEndpointsModule;
const { facultyApi } = apiEndpointsModule;
const { facultyMasterApi } = apiEndpointsModule;
const { facultySubjectAllocationApi } = apiEndpointsModule;
const { studentProfilesApi } = apiEndpointsModule;
const { studentAdmissionApi } = apiEndpointsModule;
const { timetableEntryApi } = apiEndpointsModule;
const { sectionStudentProfiles } = sectionStudentsModule;
const { getAuthStorage } = authModule;
const { active } = timetableUtilsModule;
const { same } = timetableUtilsModule;
const { completeScope } = timetableUtilsModule;
const { matchesScope } = timetableUtilsModule;
const { normalizeEntry } = timetableUtilsModule;
const { eligibleSubjects } = timetableUtilsModule;
const { eligibleFaculty } = timetableUtilsModule;
const { existingTimetables } = timetableUtilsModule;
const { existingSlots } = timetableUtilsModule;
const { entryPayload } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { validTime } = timetableUtilsModule;
const { generateTimetable } = timetablePlannerModule;
const { planningErrors } = timetablePlannerModule;
const { entryPlanningErrors } = timetablePlannerModule;
const { schedulingIssues } = timetablePlannerModule;
const { isTeachingPeriod } = timetablePeriodsModule;
/* Imports for isolated regression tests:
import { collegeStorageKey } from '../utils/collegeScope.js'
import { academicYearApi, courseApi, branchApi, sectionApi, facultyApi, facultyMasterApi, facultySubjectAllocationApi, studentProfilesApi, studentAdmissionApi, timetableEntryApi } from '../api/apiEndpoints'
import { sectionStudentProfiles } from '../utils/sectionStudents'
import { getAuthStorage } from '../auth/auth'
import { active, same, completeScope, matchesScope, normalizeEntry, eligibleSubjects, eligibleFaculty, existingTimetables, existingSlots, entryPayload, conflictsFor, validTime } from '../utils/timetableUtils'
import { generateTimetable, planningErrors, entryPlanningErrors, schedulingIssues } from '../utils/timetablePlanner'
import { isTeachingPeriod } from '../utils/timetablePeriods'
*/
// #region services/timetableService.js
const master = (rows, kind) => rows.map(row => ({ ...row, id: row[`${kind}Id`] ?? row.id, name: row[`${kind}Name`] ?? row.name ?? row.fullName ?? '' }))
/* export */ const timetableCapabilities = Object.freeze({ entries: true, createTimetable: false, createSlot: false, draft: false, publish: false, roomIds: false, calendar: false, facultyAvailability: false, storage: 'backend' })

/* export */ const timetableService = {
  async getSources() {
    const [years, courses, branches, semesters, sections, subjects, faculty, allocations] = await Promise.all([
      academicYearApi.getAll(), courseApi.getAll(), branchApi.getAll(), facultyMasterApi.getSemesters(), sectionApi.getAll(), facultyMasterApi.getSubjects(), facultyApi.getAll(), facultySubjectAllocationApi.getAll(),
    ])
    return { years: master(years, 'academicYear'), courses: master(courses, 'course'), branches: master(branches, 'branch'), semesters: master(semesters, 'semester'), sections: master(sections, 'section'), subjects: master(subjects, 'subject'), faculty: master(faculty, 'faculty'), allocations }
  },
  async getStudents() {
    const [profiles, admissions] = await Promise.all([studentProfilesApi.getAll(), studentAdmissionApi.getAll()])
    return sectionStudentProfiles(profiles, admissions)
  },
  async list() { return timetableEntryApi.list() },
  async save(form, scope) {
    // Fetch the full schedule immediately before writing: all sections/faculty/rooms participate.
    const [sources, raw] = await Promise.all([this.getSources(), this.list()])
    const entries = raw.map(row => normalizeEntry(row, sources.sections))
    if (!completeScope(scope)) throw new Error('Complete the academic context and section first.')
    const section = sources.sections.find(row => same(row.id, scope.sectionId) && matchesScope(row, scope) && active(row))
    if (!section || !same(form.sectionId, scope.sectionId)) throw new Error('The selected section no longer matches the academic context.')
    if (!existingTimetables(entries, scope).some(row => same(row.id, form.timetableId))) throw new Error('Select an existing timetable for this section. Timetable creation is not exposed by the backend.')
    const current = form.id ? entries.find(row => same(row.id, form.id)) : null
    if (form.id && (!current || !same(current.sectionId, form.sectionId) || !same(current.timetableId, form.timetableId))) throw new Error('This entry changed or was removed. Refresh before editing.')
    const slot = existingSlots(entries, form.timetableId).find(row => same(row.id, form.timetableSlotId))
    if (!slot) throw new Error('The selected period is unavailable. Refresh and choose an existing period.')
    if (!eligibleSubjects(sources.subjects, scope).some(row => same(row.id, form.subjectId))) throw new Error('The subject is no longer active or does not match this semester.')
    if (!eligibleFaculty(sources.faculty, sources.allocations, form.subjectId, scope).some(row => same(row.id, form.facultyId))) throw new Error('The faculty member has no matching active subject allocation.')
    const candidate = { ...form, ...scope, startTime: slot.startTime, endTime: slot.endTime }
    if (!validTime(candidate)) throw new Error('This period has invalid start/end times.')
    const conflicts = conflictsFor(candidate, entries)
    if (conflicts.length) throw new Error(conflicts.map(row => row.message).join('\n'))
    const payload = entryPayload(candidate, Boolean(form.id))
    return form.id ? timetableEntryApi.update(form.id, payload) : timetableEntryApi.create(payload)
  },
  async remove(id) { return timetableEntryApi.remove(id) },
}

// Temporary workflow explicitly requested by the user after confirming missing setup/publish APIs.
// This is a separate adapter, never an HTTP-error fallback. No master records are persisted here.
const localKey = () => {
  const user = getAuthStorage()?.getItem('btech-user-id')
  if (!user) throw new Error('Sign in with a valid user identity to access local timetables.')
  return collegeStorageKey(`pirnav-timetables-v1:${encodeURIComponent(user)}`)
}
const readLocal = () => {
  const records = JSON.parse(localStorage.getItem(localKey()) || '[]')
  if (!Array.isArray(records) || records.some(row => !row.id || !Array.isArray(row.entries) || !completeScope(row) || !['draft', 'published'].includes(row.publicationStatus))) throw new Error('Local timetable storage is invalid. It has not been replaced or reset.')
  return records
}
const transaction = action => {
  const run = () => action(readLocal(), records => localStorage.setItem(localKey(), JSON.stringify(records)))
  return globalThis.navigator?.locks ? navigator.locks.request(localKey(), run) : Promise.resolve().then(run)
}
/* export */ const localEntries = tables => tables.flatMap(table => table.entries.map(row => ({ ...row, ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, table[field]])), timetableEntryId: row.id, timetableId: table.id, timetableName: table.name, publicationStatus: table.publicationStatus, origin: 'local', status: true })))
const checkVersion = (table, revision) => {
  if (!table || table.revision !== revision) throw new Error('This timetable changed in another tab. Refresh before saving.')
}
const validateSource = (row, scope, sources) => {
  validateScope(scope, sources)
  if (!sources.sections.some(section => same(section.id, scope.sectionId) && matchesScope(section, scope) && active(section))) throw new Error('Section mapping is no longer valid. Refresh the academic data.')
  if (!eligibleSubjects(sources.subjects, scope).some(subject => same(subject.id, row.subjectId))) throw new Error('Select an active subject matching the semester.')
  if (!eligibleFaculty(sources.faculty, sources.allocations, row.subjectId, scope).some(faculty => same(faculty.id, row.facultyId))) throw new Error('Select faculty with a matching active subject allocation.')
  if (!['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].includes(row.dayOfWeek) || !validTime(row)) throw new Error('Select a valid day and an end time later than the start time.')
  if (!String(row.classroom || '').trim()) throw new Error('Enter the classroom or lab reference.')
}
const validateScope = (scope, sources) => {
  if (!completeScope(scope) || !sources.years.some(row => same(row.id, scope.academicYearId)) || !sources.courses.some(row => same(row.id, scope.courseId) && active(row)) || !sources.branches.some(row => same(row.id, scope.branchId) && same(row.courseId, scope.courseId) && active(row)) || !sources.semesters.some(row => same(row.id, scope.semesterId) && active(row) && ['courseId', 'branchId', 'academicYearId'].every(field => !row[field] || same(row[field], scope[field]))) || !sources.sections.some(row => same(row.id, scope.sectionId) && active(row) && matchesScope(row, scope))) throw new Error('Academic references are missing, inactive or no longer match this section.')
}
const validatePlan = (config, table, sources, occupied, includeRequirements = false) => {
  const errors = planningErrors(config, sources, table, occupied)
  for (const row of table.entries) {
    validateSource(row, table, sources)
    errors.push(...entryPlanningErrors(row, config, sources, table, occupied))
    errors.push(...conflictsFor({ ...row, sectionId: table.sectionId }, occupied).map(item => item.message))
  }
  if (includeRequirements) errors.push(...schedulingIssues(sources, table, config, table.entries).filter(item => item.blocking !== false).map(item => `${item.subjectName}: ${item.reason}`))
  if (errors.length) throw new Error([...new Set(errors)].join('\n'))
}
/* export */ const localTimetableService = {
  async list() { return readLocal() },
  async setup(scope, name, config, options = {}) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    validateScope(scope, sources)
    if (!String(name || '').trim()) throw new Error('Enter a timetable name.')
    return transaction((tables, write) => {
      const current = options.tableId ? tables.find(row => same(row.id, options.tableId)) : null
      if (options.tableId) checkVersion(current, options.revision)
      if (current && (!matchesScope(current, scope) || !same(current.sectionId, scope.sectionId))) throw new Error('Timetable does not match the selected academic context.')
      if (current?.publicationStatus === 'published') throw new Error('Move this timetable to Draft before changing setup.')
      if (!current && tables.some(row => matchesScope(row, scope) && same(row.sectionId, scope.sectionId))) throw new Error('A timetable already exists for this section. Open it before changing setup.')
      const table = current || { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, String(scope[field])])), id: crypto.randomUUID(), name: name.trim(), publicationStatus: 'draft', revision: 0, entries: [] }
      const next = { ...table, planning: config, revision: table.revision + 1, updatedAt: new Date().toISOString(), issues: schedulingIssues(sources, table, config, table.entries) }
      validatePlan(config, next, sources, [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))])
      write(current ? tables.map(row => row.id === current.id ? next : row) : [...tables, next])
      return next
    })
  },
  async validate(tableId, revision) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction(tables => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (!table.entries.length) throw new Error('Add at least one class before publishing.')
      validateScope(table, sources)
      validatePlan(table.planning, table, sources, [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))], true)
      return { valid: true, revision: table.revision, checks: ['No Faculty Conflicts', 'No Room Conflicts', 'No Section Conflicts', 'Valid Periods', 'No Break/Lunch scheduling'], warnings: schedulingIssues(sources, table, table.planning, table.entries).filter(item => item.blocking === false) }
    })
  },
  async create(scope, name) {
    if (!completeScope(scope) || !String(name || '').trim()) throw new Error('Complete the academic mapping and timetable name.')
    const sources = await timetableService.getSources()
    validateScope(scope, sources)
    if (!sources.sections.some(row => same(row.id, scope.sectionId) && matchesScope(row, scope) && active(row))) throw new Error('Choose a valid active section.')
    return transaction((tables, write) => {
      if (tables.some(row => matchesScope(row, scope) && same(row.sectionId, scope.sectionId))) throw new Error('A local timetable already exists for this section. Open it in Create & Manage Timetable.')
      const table = { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, String(scope[field])])), id: crypto.randomUUID(), name: name.trim(), publicationStatus: 'draft', revision: 1, entries: [] }
      write([...tables, table]); return table
    })
  },
  async generate(scope, name, config, options = {}) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    validateScope(scope, sources)
    if (!String(name || '').trim()) throw new Error('Enter a timetable name.')
    return transaction((tables, write) => {
      const current = options.tableId ? tables.find(row => same(row.id, options.tableId)) : null
      if (options.tableId) checkVersion(current, options.revision)
      if (current && (!matchesScope(current, scope) || !same(current.sectionId, scope.sectionId))) throw new Error('The selected timetable does not match this section.')
      if (current?.publicationStatus === 'published') throw new Error('Move this timetable to Draft before generating.')
      if (!current && tables.some(row => matchesScope(row, scope) && same(row.sectionId, scope.sectionId))) throw new Error('A timetable already exists for this section. Select it before generating.')
      if (current?.entries.length && !options.confirmed) throw new Error('Confirm generation for this existing draft before continuing.')
      const table = current || { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, String(scope[field])])), id: crypto.randomUUID(), name: name.trim(), publicationStatus: 'draft', revision: 0, entries: [] }
      const occupied = [...localEntries(tables.filter(row => row.id !== table.id)), ...backend.map(row => normalizeEntry(row, sources.sections))]
      const errors = planningErrors(config, sources, table, [...occupied, ...localEntries([table])])
      if (errors.length) throw new Error(errors.join('\n'))
      const retained = options.replace ? [] : table.entries
      for (const row of retained) {
        validateSource(row, table, sources)
        const errors = entryPlanningErrors(row, config, sources, table, [...occupied, ...localEntries([table])])
        if (errors.length) throw new Error(`Existing entry needs review: ${errors.join(' ')}`)
      }
      const result = generateTimetable({ scope: table, sources, config, existing: retained, occupied, references: [...occupied, ...localEntries([table])] })
      const next = { ...table, entries: result.entries, planning: config, issues: result.issues, updatedAt: new Date().toISOString(), revision: table.revision + 1 }
      // Validate the complete result atomically against fresh backend and local records.
      validatePlan(config, next, sources, [...occupied, ...localEntries([next])])
      write(current ? tables.map(row => row.id === table.id ? next : row) : [...tables, next])
      return { ...next, added: result.added }
    })
  },
  async savePlanning(tableId, revision, config) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (table.publicationStatus !== 'draft') throw new Error('Move this timetable to Draft before changing its settings.')
      validateScope(table, sources)
      validatePlan(config, table, sources, [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))])
      const next = { ...table, planning: config, issues: schedulingIssues(sources, table, config, table.entries), revision: table.revision + 1, updatedAt: new Date().toISOString() }
      write(tables.map(row => row.id === table.id ? next : row)); return next
    })
  },
  async saveEntry(tableId, revision, form) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (table.publicationStatus !== 'draft') throw new Error('Move this timetable to Draft before editing.')
      if (form.id && !table.entries.some(row => same(row.id, form.id))) throw new Error('This schedule entry no longer exists.')
      const row = { id: form.id || crypto.randomUUID(), timetableSlotId: form.timetableSlotId || crypto.randomUUID(), subjectId: String(form.subjectId), facultyId: String(form.facultyId), dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime, classroom: form.classroom.trim(), ...(form.roomId ? { roomId: String(form.roomId) } : {}), entryType: form.entryType || '', generated: false }
      validateSource(row, table, sources)
      const occupied = [...localEntries(tables), ...backend.map(item => normalizeEntry(item, sources.sections))]
      const planErrors = entryPlanningErrors(row, table.planning, sources, table, occupied)
      if (planErrors.length) throw new Error(planErrors.join('\n'))
      if (table.planning) row.timetableSlotId = table.planning.periods.find(period => isTeachingPeriod(period) && period.startTime.slice(0, 5) === row.startTime.slice(0, 5))?.id || row.timetableSlotId
      const conflicts = conflictsFor({ ...row, sectionId: table.sectionId }, occupied)
      if (conflicts.length) throw new Error(conflicts.map(item => item.message).join('\n'))
      const entries = form.id ? table.entries.map(item => same(item.id, row.id) ? row : item) : [...table.entries, row]
      const next = { ...table, entries, issues: table.planning ? schedulingIssues(sources, table, table.planning, entries) : [], updatedAt: new Date().toISOString(), revision: table.revision + 1 }
      write(tables.map(item => item.id === table.id ? next : item)); return next
    })
  },
  async removeEntry(tableId, revision, entryId) {
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (table.publicationStatus !== 'draft') throw new Error('Move this timetable to Draft before removing classes.')
      write(tables.map(row => row.id === table.id ? { ...row, entries: row.entries.filter(entry => !same(entry.id, entryId)), revision: row.revision + 1 } : row))
    })
  },
  async publish(tableId, revision) {
    const [sources, backend] = await Promise.all([timetableService.getSources(), timetableService.list()])
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      if (!table.entries.length) throw new Error('Add at least one class before publishing.')
      const entries = [...localEntries(tables), ...backend.map(row => normalizeEntry(row, sources.sections))]
      validatePlan(table.planning, table, sources, entries, true)
      for (const row of table.entries) {
        validateSource(row, table, sources)
        const conflicts = conflictsFor({ ...row, sectionId: table.sectionId }, entries)
        if (conflicts.length) throw new Error(conflicts.map(item => item.message).join('\n'))
      }
      write(tables.map(row => row.id === table.id ? { ...row, publicationStatus: 'published', revision: row.revision + 1 } : row))
    })
  },
  async reopen(tableId, revision) {
    return transaction((tables, write) => {
      const table = tables.find(row => same(row.id, tableId)); checkVersion(table, revision)
      write(tables.map(row => row.id === table.id ? { ...row, publicationStatus: 'draft', revision: row.revision + 1 } : row))
    })
  },
}
// #endregion services/timetableService.js
return {
  get timetableCapabilities() { return timetableCapabilities; },
  get timetableService() { return timetableService; },
  get localEntries() { return localEntries; },
  get localTimetableService() { return localTimetableService; }
};
})();

export const backendTimetableServiceModule = (() => {
const { timetableManagementApi: api } = apiEndpointsModule;
const { timetableLifecycleApi: lifecycle } = timetableLifecycleApiModule;
const { timetableService } = timetableServiceModule;
const { same } = timetableUtilsModule;
const { normalizeEntry } = timetableUtilsModule;
const { timeMinutes } = timetableUtilsModule;
const { timetableDateErrors } = timetableSemesterModule;
const { periodType } = timetablePeriodsModule;
const { isTeachingPeriod } = timetablePeriodsModule;
/* Imports for isolated regression tests:
import { timetableManagementApi as api } from '../api/apiEndpoints'
import { timetableLifecycleApi as lifecycle } from '../api/timetableLifecycleApi'
import { timetableService } from './timetableService'
import { same, normalizeEntry, timeMinutes } from '../utils/timetableUtils'
import { timetableDateErrors } from '../utils/timetableSemester'
import { periodType, isTeachingPeriod } from '../utils/timetablePeriods'
*/
// #region services/backendTimetableService.js
const id = value => {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error('Select a valid backend record before continuing.')
  return number
}
const rows = value => {
  if (!Array.isArray(value)) throw new Error('The timetable API returned an invalid list.')
  return value
}
const path = value => `/timetables/${id(value)}`
const date = value => String(value || '').slice(0, 10)
const timestamp = value => value ? `${date(value)}T00:00:00` : null
const period = row => ({ ...row, id: String(row.timetableSlotId ?? row.periodId ?? row.id), periodId: row.periodId,
  name: row.periodName || row.slotName || row.name, type: String(row.periodType || 'CLASS').toLowerCase(),
  startTime: String(row.startTime || '').slice(0, 5), endTime: String(row.endTime || '').slice(0, 5), source: 'backend' })

/* export */ function normalizeTimetable(detail, periods, calendar, classrooms) {
  const table = detail.timetable
  if (!table?.timetableId || !Array.isArray(detail.entries) || !Array.isArray(detail.slots)) throw new Error('The timetable detail response is incomplete.')
  const slots = detail.slots.filter(row => row.active !== false).map(period)
  const configured = periods.filter(row => row.active !== false).map(period)
  const planningPeriods = configured.length ? configured.map(row => {
    const slot = slots.find(item => item.startTime === row.startTime && item.endTime === row.endTime)
    return { ...row, id: isTeachingPeriod(row) && slot ? slot.id : `period:${row.id}`, timetableSlotId: slot?.id }
  }) : slots
  return { ...table, id: String(table.timetableId), name: table.timetableName, origin: 'backend',
    publicationStatus: String(table.status).toLowerCase(), revision: table.revision,
    entries: detail.entries.filter(row => row.active !== false).map(row => normalizeEntry({ ...table, ...row, id: row.timetableEntryId,
      roomId: row.classroomId, classroom: row.classroomName || row.classroom, status: row.active,
      publicationStatus: String(table.status).toLowerCase(), origin: 'backend' })),
    planning: { periodMode: 'manual', periods: planningPeriods, rooms: classrooms.filter(row => row.active !== false).map(row => `id:${row.classroomId}`),
      calendar: { startDate: date(table.effectiveFrom), endDate: date(table.effectiveTo),
        workingDays: (calendar.workingDays || []).map(day => day.toUpperCase()), holidays: (calendar.holidays || []).map(row => date(row.date)), reviewed: calendar.reviewed === true },
      requirements: Object.fromEntries((detail.requirements || []).filter(row => row.periodsPerWeek > 0).map(row => [row.subjectId, { periodsPerWeek: row.periodsPerWeek, blockSize: row.blockSize }])) },
  }
}

/* export */ const backendEntries = tables => tables.flatMap(table => table.entries.map(row => ({ ...row, timetableId: table.id, timetableName: table.name, publicationStatus: table.publicationStatus })))

/* export */ const backendTimetableService = {
  async getSources() {
    const [sources, classrooms] = await Promise.all([timetableService.getSources(), api.get('/classrooms')])
    const yearSettings = Object.fromEntries(await Promise.all(sources.years.map(async year => {
      const academicYearId = id(year.id)
      const [periods, calendar] = await Promise.all([api.get('/periods', { academicYearId }), api.get('/calendar', { academicYearId })])
      return [year.id, { periods: rows(periods).filter(row => row.active !== false).map(period), calendar: {
        workingDays: (calendar.workingDays || []).map(day => day.toUpperCase()), holidays: (calendar.holidays || []).map(row => date(row.date)), reviewed: calendar.reviewed === true,
      } }]
    })))
    return { ...sources, classrooms: rows(classrooms), yearSettings }
  },
  async detail(tableId, classrooms) {
    const detail = await api.get(path(tableId))
    const academicYearId = id(detail?.timetable?.academicYearId)
    const [periods, calendar, rooms] = await Promise.all([api.get('/periods', { academicYearId }), api.get('/calendar', { academicYearId }), classrooms || api.get('/classrooms')])
    return normalizeTimetable(detail, rows(periods), calendar, rows(rooms))
  },
  async list() {
    const [tables, classrooms] = await Promise.all([api.get('/timetables'), api.get('/classrooms')])
    return Promise.all(rows(tables).map(table => this.detail(table.timetableId, rows(classrooms))))
  },
  async setup(scope, name, config, options = {}) {
    const dateErrors = timetableDateErrors(config?.calendar)
    if (dateErrors.length) throw new Error(dateErrors.join('\n'))
    if (options.tableId && (await this.detail(options.tableId)).publicationStatus !== 'draft') throw new Error('Only draft timetable settings can be changed.')
    const academicYearId = id(scope.academicYearId)
    const existing = rows(await api.get('/periods', { academicYearId }))
    const masters = rows(await api.get('/timetables', { academicYearId }))
    const published = masters.some(row => String(row.status).toUpperCase() === 'PUBLISHED')
    if (published) {
      const calendar = await api.get('/calendar', { academicYearId })
      const activePeriods = existing.filter(row => row.active !== false).sort((a, b) => a.displayOrder - b.displayOrder)
      const samePeriods = activePeriods.length === config.periods.length && activePeriods.every((row, index) => row.startTime?.slice(0, 5) === config.periods[index].startTime.slice(0, 5) && row.endTime?.slice(0, 5) === config.periods[index].endTime.slice(0, 5) && String(row.periodType || 'CLASS').toUpperCase() === periodType(config.periods[index]).toUpperCase())
      const sorted = values => JSON.stringify([...values].sort())
      const sameCalendar = calendar.reviewed === config.calendar.reviewed && sorted((calendar.workingDays || []).map(day => day.toUpperCase())) === sorted(config.calendar.workingDays) && sorted((calendar.holidays || []).map(row => date(row.date))) === sorted(config.calendar.holidays.filter(Boolean))
      if (!samePeriods || !sameCalendar) throw new Error('Periods and calendar are shared by Academic Year. Changing them would affect published history. Backend version-specific period/calendar support is required.')
    } else {
      // Periods and calendar are shared by the academic year; retain real period IDs.
      const saved = []
      for (const [index, row] of config.periods.entries()) {
        const current = existing.find(item => same(item.periodId, row.periodId) || (!row.periodId && item.startTime?.slice(0, 5) === row.startTime.slice(0, 5) && item.endTime?.slice(0, 5) === row.endTime.slice(0, 5)))
        const payload = { academicYearId, periodNumber: isTeachingPeriod(row) ? config.periods.slice(0, index + 1).filter(isTeachingPeriod).length : null,
          periodName: row.name, startTime: row.startTime.slice(0, 5), endTime: row.endTime.slice(0, 5), periodType: periodType(row).toUpperCase(), displayOrder: index + 1, active: true }
        const result = current ? await api.put(`/periods/${id(current.periodId)}`, payload) : await api.post('/periods', payload)
        saved.push(id(result?.periodId ?? current?.periodId))
      }
      for (const row of existing.filter(row => row.active !== false && !saved.includes(Number(row.periodId)))) await api.remove(`/periods/${id(row.periodId)}`)
      await api.put('/periods/reorder', { academicYearId, periodIds: saved })
      await api.put('/calendar', { academicYearId, reviewed: config.calendar.reviewed, workingDays: config.calendar.workingDays,
        holidays: config.calendar.holidays.filter(Boolean).map(value => ({ date: timestamp(value), type: 'HOLIDAY', description: 'Non-working date' })) })
    }
    const payload = { timetableName: name, effectiveFrom: timestamp(config.calendar.startDate), effectiveTo: timestamp(config.calendar.endDate) }
    let tableId = options.tableId
    if (tableId) await api.put(path(tableId), payload)
    else {
      const created = await api.post('/timetables', { ...Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, id(scope[field])])), ...payload })
      tableId = created?.timetableId ?? created?.timetable?.timetableId
    }
    await api.post(`${path(tableId)}/sync-periods`)
    await this.saveRequirements(tableId, config.requirements)
    return this.detail(tableId)
  },
  async saveRequirements(tableId, requirements = {}) {
    return api.put(`${path(tableId)}/requirements`, { requirements: Object.entries(requirements).filter(([, value]) => value.periodsPerWeek !== '' && value.periodsPerWeek != null).map(([subjectId, value]) => ({ subjectId: id(subjectId), periodsPerWeek: Number(value.periodsPerWeek), blockSize: Number(value.blockSize || 1) })) })
  },
  async savePlanning(tableId, revision, config) {
    await this.saveRequirements(tableId, config.requirements)
    return this.detail(tableId)
  },
  async generate(scope, name, config, options = {}) {
    const tableId = id(options.tableId)
    const operation = options.replace ? 'regenerate' : options.initial ? 'generate' : 'generateMissing'
    const result = await lifecycle[operation]({ timetableId: tableId }, {
      replaceGenerated: Boolean(options.replace), classroomIds: config.rooms.map(value => id(value.replace(/^id:/, ''))) })
    const table = await this.detail(tableId)
    return { ...table, added: result?.added ?? result?.generatedCount ?? 0, issues: result?.issues || [] }
  },
  async saveEntry(tableId, revision, form) {
    const table = await this.detail(tableId)
    const slots = table.planning.periods.filter(row => isTeachingPeriod(row) && timeMinutes(row.startTime) >= timeMinutes(form.startTime) && timeMinutes(row.endTime) <= timeMinutes(form.endTime))
    if (!slots.length || slots[0].startTime !== form.startTime.slice(0, 5) || slots.at(-1).endTime !== form.endTime.slice(0, 5)) throw new Error('Choose a valid teaching period.')
    const payload = { dayOfWeek: form.dayOfWeek, subjectId: id(form.subjectId), facultyId: id(form.facultyId), classroomId: id(form.roomId),
      timetableSlotId: id(slots[0].id), timetableSlotIds: slots.map(row => id(row.id)), entryType: form.entryType || 'LECTURE' }
    return form.id ? api.put(`${path(tableId)}/entries/${id(form.id)}`, payload) : api.post(`${path(tableId)}/entries`, payload)
  },
  removeEntry: (tableId, revision, entryId) => api.remove(`${path(tableId)}/entries/${id(entryId)}`),
  async validate(tableId) {
    const result = await api.post(`${path(tableId)}/validate`)
    return { ...result, valid: result?.valid === true || result?.isValid === true, checks: result?.checks || ['Backend conflict and scheduling validation completed'], warnings: result?.warnings || [], message: result?.message || [...(result?.errors || []), ...(result?.conflicts || []), ...(result?.unscheduled || [])].map(row => typeof row === 'string' ? row : row.message).filter(Boolean).join('\n') }
  },
  publish: tableId => api.post(`${path(tableId)}/publish`),
  reopen: tableId => api.post(`${path(tableId)}/reopen`),
  // Preserve opaque responses until authenticated examples establish their shape.
  status: tableId => lifecycle.status({ timetableId: tableId }),
  validateGlobal: tableId => lifecycle.validateGlobal({ timetableId: tableId }),
  roomAvailability: (tableId, timetableSlotId, dayOfWeek) => lifecycle.roomAvailability({ timetableId: tableId, timetableSlotId, dayOfWeek }),
  async moveEntry(tableId, entryId, { dayOfWeek, timetableSlotId, classroomId }) {
    await lifecycle.moveEntry({ timetableId: tableId, entryId }, { dayOfWeek, timetableSlotId: id(timetableSlotId), ...(classroomId == null ? {} : { classroomId: id(classroomId) }) })
    return this.detail(tableId)
  },
  occurrences: query => lifecycle.occurrences(query),
  view: (kind, recordId, query) => api.get(`/views/${kind}/${id(recordId)}`, query).then(rows),
}
// #endregion services/backendTimetableService.js
return {
  get normalizeTimetable() { return normalizeTimetable; },
  get backendEntries() { return backendEntries; },
  get backendTimetableService() { return backendTimetableService; }
};
})();

export const timetableDomainModule = (() => {
const { active } = timetableUtilsModule;
const { same } = timetableUtilsModule;
const { key } = timetableUtilsModule;
const { matchesScope } = timetableUtilsModule;
const { eligibleSubjects } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { normalizeEntry } = timetableUtilsModule;
const { publicationState } = timetableUtilsModule;
const { planningErrors } = timetablePlannerModule;
const { entryPlanningErrors } = timetablePlannerModule;
const { schedulingIssues } = timetablePlannerModule;
const { subjectRequirements } = timetablePlannerModule;
const { roomOptions } = timetablePlannerModule;
const { suitableRoom } = timetablePlannerModule;
const { generateTimetable } = timetablePlannerModule;
const { classesOnDate } = timetablePlannerModule;
const { periodSessions } = timetablePeriodsModule;
/* Imports for isolated regression tests:
import { active, same, key, matchesScope, eligibleSubjects, conflictsFor, normalizeEntry, publicationState } from '../../utils/timetableUtils.js'
import { planningErrors, entryPlanningErrors, schedulingIssues, subjectRequirements, roomOptions, suitableRoom, generateTimetable, classesOnDate } from '../../utils/timetablePlanner.js'
import { periodSessions } from '../../utils/timetablePeriods.js'
*/
// #region services/timetable/timetableDomain.js
/* export */ const hierarchy = ['academicYearId', 'courseId', 'departmentId', 'branchId', 'level', 'semesterId']
/* export */ const academicLevel = row => key(row.academicLevel ?? row.yearOfStudy ?? row.studyYear ?? row.yearNumber ?? (Number(row.semesterNumber) > 0 ? Math.ceil(Number(row.semesterNumber) / 2) : ''))
const related = (row, scope, fields) => fields.every(field => !row[field] || same(row[field], scope[field]))
/* export */ function contextOptions(sources, scope) {
  const branches = sources.branches.filter(row => active(row) && same(row.courseId, scope.courseId) && same(row.departmentId ?? sources.courses.find(course => same(course.id, row.courseId))?.departmentId, scope.departmentId))
  const semesters = sources.semesters.filter(row => active(row) && related(row, scope, ['academicYearId', 'courseId', 'branchId']))
  return {
    academicYearId: sources.years.filter(active),
    courseId: sources.courses.filter(active),
    departmentId: sources.departments.filter(row => active(row) && (sources.courses.some(course => active(course) && same(course.id, scope.courseId) && same(course.departmentId, row.id)) || sources.branches.some(branch => active(branch) && same(branch.courseId, scope.courseId) && same(branch.departmentId, row.id)))),
    branchId: branches,
    level: [...new Set(semesters.map(academicLevel).filter(Boolean))].sort().map(id => ({ id, name: /^\d+$/.test(id) ? `Year ${id}` : id })),
    semesterId: semesters.filter(row => academicLevel(row) === scope.level),
  }
}
/* export */ function scopeSections(sources, scope) {
  if (hierarchy.some(field => !scope[field])) return []
  const options = contextOptions(sources, scope)
  if (hierarchy.some(field => !options[field].some(row => same(row.id, scope[field])))) return []
  return sources.sections.filter(row => active(row) && matchesScope(row, scope) && (!row.departmentId || same(row.departmentId, scope.departmentId)))
}
/* export */ function changeContext(scope, field, value) {
  return Object.fromEntries(hierarchy.map((name, index) => [name, index > hierarchy.indexOf(field) ? '' : name === field ? key(value) : scope[name] || '']))
}
/* export */ function decorateEntries(raw, sources) {
  const name = (kind, id) => sources[kind].find(row => same(row.id, id))?.name || key(id)
  return raw.map(row => ({ ...normalizeEntry(row, sources.sections), subjectName: name('subjects', row.subjectId), facultyName: name('faculty', row.facultyId), sectionName: name('sections', row.sectionId), subjectCode: sources.subjects.find(subject => same(subject.id, row.subjectId))?.subjectCode || '' }))
}
/* export */ function tableEntries(tables) {
  return tables.flatMap(table => table.entries.map(row => ({ ...row, ...Object.fromEntries(['academicYearId', 'departmentId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, table[field]])), timetableId: table.id, publicationStatus: table.publicationStatus, calendar: table.planning?.calendar, origin: 'local' })))
}
/* export */ function validateTable(table, sources, occupied) {
  const issues = planningErrors(table.planning, sources, table, occupied).map(reason => ({ reason }))
  if (!scopeSections(sources, table).some(row => same(row.id, table.sectionId))) issues.push({ reason: 'Academic relationships changed. Review this section.' })
  if (!table.entries.length) issues.push({ reason: 'No classes have been scheduled.' })
  for (const row of table.entries) {
    const requirement = subjectRequirements(sources, table, table.planning?.requirements).find(item => same(item.subject.id, row.subjectId))
    const errors = [...entryPlanningErrors(row, table.planning, sources, table, occupied), ...conflictsFor({ ...row, sectionId: table.sectionId }, occupied).map(item => item.message)]
    if (!requirement?.faculty.some(faculty => same(faculty.id, row.facultyId))) errors.push('Faculty allocation is missing or inactive for this section and subject.')
    for (const reason of errors) issues.push({ reason, entryId: row.id, dayOfWeek: row.dayOfWeek, startTime: row.startTime, subjectId: row.subjectId })
  }
  issues.push(...schedulingIssues(sources, table, table.planning, table.entries))
  return issues.map(issue => ({ ...issue, sectionId: table.sectionId, tableId: table.id }))
}
/* export */ function availableSlots(form, table, sources, occupied, limit = 5) {
  const requirement = subjectRequirements(sources, table, table.planning.requirements).find(item => same(item.subject.id, form.subjectId))
  if (!requirement || !requirement.faculty.some(row => same(row.id, form.facultyId))) return []
  const room = roomOptions(sources, occupied).find(row => form.roomId && row.roomId ? same(row.roomId, form.roomId) : row.classroom === form.classroom)
  if (!room || !suitableRoom(requirement.subject, room)) return []
  const result = []
  for (const dayOfWeek of table.planning.calendar.workingDays) for (const block of periodSessions(table.planning.periods, requirement.blockSize)) {
    const candidate = { ...form, calendar: table.planning.calendar, sectionId: table.sectionId, dayOfWeek, timetableSlotId: block[0].id, startTime: block[0].startTime, endTime: block.at(-1).endTime }
    if (!conflictsFor(candidate, occupied).length && !entryPlanningErrors(candidate, table.planning, sources, table, occupied).length) result.push(candidate)
    if (result.length === limit) return result
  }
  return result
}
// Pure coordinated batch: each result is part of occupancy before scheduling the next section.
/* export */ function generateSections({ tables, selected, scope, sources, config, backend, replace = false, makeId = () => crypto.randomUUID() }) {
  const selectedIds = new Set(selected.map(key))
  const valid = scopeSections(sources, scope)
  if (!selected.length || selected.some(id => !valid.some(section => same(section.id, id)))) throw new Error('Select valid active sections.')
  if (!eligibleSubjects(sources.subjects, scope).some(row => config.requirements?.[key(row.id)]?.selected !== false)) throw new Error('Select at least one existing subject.')
  let next = tables.map(table => ({ ...table, entries: [...table.entries] }))
  for (const sectionId of selectedIds) {
    const previous = next.find(table => matchesScope(table, scope) && same(table.sectionId, sectionId))
    if (previous?.publicationStatus === 'published') throw new Error('Selected timetables include a published section. Open its draft before generation.')
    if (previous && JSON.stringify(previous.planning) !== JSON.stringify(config) && previous.entries.length) throw new Error('Existing classes use different settings. Open the saved timetable before generating missing classes.')
    const table = previous || { ...scope, sectionId, id: makeId(), name: `${sources.branches.find(row => same(row.id, scope.branchId))?.name} / ${sources.semesters.find(row => same(row.id, scope.semesterId))?.name} / ${valid.find(row => same(row.id, sectionId))?.name}`, publicationStatus: 'draft', revision: 0, entries: [] }
    const retained = replace ? table.entries.filter(row => !row.generated) : table.entries
    const occupied = decorateEntries([...backend, ...tableEntries(next.filter(row => row.id !== table.id))], sources)
    const errors = planningErrors(config, sources, table, occupied)
    if (errors.length) throw new Error(errors.join('\n'))
    const result = generateTimetable({ scope: table, sources, config, occupied, existing: retained, references: [...occupied, ...tableEntries([table])], makeId })
    const updated = { ...table, entries: result.entries, planning: config, issues: result.issues, revision: table.revision + 1, updatedAt: new Date().toISOString() }
    next = previous ? next.map(row => row.id === table.id ? updated : row) : [...next, updated]
  }
  return next
}
/* export */ function publishedForFaculty(facultyId, entries, tables, date) {
  const rows = entries.filter(row => active(row) && publicationState(row) === 'published' && same(row.facultyId, facultyId))
  return date ? classesOnDate(rows, date, row => tables.find(table => same(table.id, row.timetableId))?.planning?.calendar || row.calendar || { reviewed: true, startDate: row.effectiveFrom?.slice(0, 10), endDate: row.effectiveTo?.slice(0, 10), workingDays: [row.dayOfWeek], holidays: [] }) : rows
}
// #endregion services/timetable/timetableDomain.js
return {
  get hierarchy() { return hierarchy; },
  get academicLevel() { return academicLevel; },
  get contextOptions() { return contextOptions; },
  get scopeSections() { return scopeSections; },
  get changeContext() { return changeContext; },
  get decorateEntries() { return decorateEntries; },
  get tableEntries() { return tableEntries; },
  get validateTable() { return validateTable; },
  get availableSlots() { return availableSlots; },
  get generateSections() { return generateSections; },
  get publishedForFaculty() { return publishedForFaculty; }
};
})();

export const timetableBackendWorkflowModule = (() => {
const { backendTimetableService: service } = backendTimetableServiceModule;
const { backendEntries } = backendTimetableServiceModule;
const { departmentApi } = apiEndpointsModule;
const { subjectApi } = apiEndpointsModule;
const { academicLevel } = timetableDomainModule;
const { scopeSections } = timetableDomainModule;
const { same } = timetableUtilsModule;
const { planningErrors } = timetablePlannerModule;
const { subjectRequirements } = timetablePlannerModule;
const { entryPlanningErrors } = timetablePlannerModule;
const { getUserRole } = authModule;
/* Imports for isolated regression tests:
import { backendTimetableService as service, backendEntries } from '../backendTimetableService'
import { departmentApi, subjectApi } from '../../api/apiEndpoints'
import { academicLevel, scopeSections } from './timetableDomain'
import { same } from '../../utils/timetableUtils'
import { planningErrors, subjectRequirements, entryPlanningErrors } from '../../utils/timetablePlanner'
import { getUserRole } from '../../auth/auth'
*/
// #region services/timetable/timetableBackendWorkflow.js
/* export */ async function loadBackendWorkflow() {
  const [raw, departments, subjects, tables] = await Promise.all([service.getSources(), departmentApi.getAll(), subjectApi.list(), service.list()])
  const sources = { ...raw, departments: departments.map(row => ({ ...row, id: row.departmentId ?? row.id, name: row.departmentName ?? row.name })), subjects: subjects.map(row => ({ ...row, id: row.subjectId ?? row.id, name: row.subjectName ?? row.name })) }
  const contextual = tables.map(table => ({ ...table, departmentId: sources.branches.find(row => same(row.id, table.branchId))?.departmentId || '', level: academicLevel(sources.semesters.find(row => same(row.id, table.semesterId)) || {}) }))
  return { sources, tables: contextual, backend: backendEntries(contextual) }
}
const authorize = () => { if (getUserRole() !== 'admin') throw new Error('Administrator access is required.') }
const draft = async table => {
  authorize()
  const current = await service.detail(table.id)
  if (current.publicationStatus !== 'draft') throw new Error('Published timetable history cannot be edited. Create a new timetable period.')
  if (current.revision !== table.revision) throw new Error('Timetable changed. Refresh before saving.')
  return current
}
/* export */ const backendWorkflow = {
  async generate({ scope, selected, config, expected, replace }) {
    authorize()
    const live = await loadBackendWorkflow()
    const sections = scopeSections(live.sources, scope)
    if (!selected.length || selected.some(id => !sections.some(row => same(row.id, id)))) throw new Error('Select valid active sections.')
    for (const sectionId of selected) {
      const errors = planningErrors(config, live.sources, { ...scope, sectionId }, live.backend)
      if (errors.length) throw new Error(errors.join('\n'))
    }
    const saved = []
    for (const sectionId of selected) {
      const previous = expected.find(row => same(row.sectionId, sectionId))
      if (previous) await draft(previous)
      const sectionConfig = { ...config, requirements: Object.fromEntries(subjectRequirements(live.sources, { ...scope, sectionId }, config.requirements).filter(row => row.periodsPerWeek > 0).map(row => [row.subject.id, { periodsPerWeek: row.periodsPerWeek, blockSize: row.blockSize }])) }
      const table = previous || await service.setup({ ...scope, sectionId }, `${live.sources.branches.find(row => same(row.id, scope.branchId))?.name} / ${sections.find(row => same(row.id, sectionId))?.name} / ${config.calendar.startDate}`, sectionConfig)
      const generated = await service.generate(scope, table.name, config, { tableId: table.id, initial: !previous, replace })
      saved.push({ ...table, ...generated, planning: table.planning })
    }
    return saved
  },
  async saveSetup(tables, config) {
    const live = await loadBackendWorkflow()
    for (const table of tables) {
      await draft(table)
      const errors = [...planningErrors(config, live.sources, table, live.backend), ...table.entries.flatMap(row => entryPlanningErrors(row, config, live.sources, table, live.backend))]
      if (errors.length) throw new Error(errors.join('\n'))
    }
    for (const table of tables) await service.setup(table, table.name, config, { tableId: table.id })
    return true
  },
  async saveEntry(table, form) { await draft(table); return service.saveEntry(table.id, table.revision, form) },
  async removeEntry(table, id) { await draft(table); return service.removeEntry(table.id, table.revision, id) },
  async validate(tables) {
    authorize()
    const issues = []
    for (const table of tables) {
      const result = await service.validate(table.id)
      if (!result.valid) issues.push({ tableId: table.id, sectionId: table.sectionId, reason: result.message || 'Backend validation failed.' })
      issues.push(...result.warnings.map(reason => ({ tableId: table.id, sectionId: table.sectionId, reason, blocking: false })))
    }
    return issues
  },
  async publish(tables) {
    for (const table of tables) await draft(table)
    const issues = await this.validate(tables)
    if (issues.some(row => row.blocking !== false)) throw new Error(issues.map(row => row.reason).join('\n'))
    for (const table of tables) await service.publish(table.id)
    return true
  },
  reopen() { throw new Error('The backend reopen API changes the published record in place. Create a new timetable period to preserve history.') },
}
// #endregion services/timetable/timetableBackendWorkflow.js
return {
  get loadBackendWorkflow() { return loadBackendWorkflow; },
  get backendWorkflow() { return backendWorkflow; }
};
})();

export const timetableDraftAdapterModule = (() => {
const { same } = timetableUtilsModule;
const { matchesScope } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { planningErrors } = timetablePlannerModule;
const { entryPlanningErrors } = timetablePlannerModule;
const { subjectRequirements } = timetablePlannerModule;
const { generateSections } = timetableDomainModule;
const { validateTable } = timetableDomainModule;
const { tableEntries } = timetableDomainModule;
const { decorateEntries } = timetableDomainModule;
const { scopeSections } = timetableDomainModule;
/* Imports for isolated regression tests:
import { same, matchesScope, conflictsFor } from '../../utils/timetableUtils.js'
import { planningErrors, entryPlanningErrors, subjectRequirements } from '../../utils/timetablePlanner.js'
import { generateSections, validateTable, tableEntries, decorateEntries, scopeSections } from './timetableDomain.js'
*/
// #region services/timetable/timetableDraftAdapter.js
// Missing master/slot/calendar/publish APIs only. No master data or synthetic HTTP routes.
// Browser-wide development store permits admin -> faculty login testing in the same browser.
// It is NOT a deployment-wide database. Production uses an explicit opt-in at the composition point.
/* export */ const DRAFT_STORAGE_KEY = 'pirnav-timetable-workflow-v2'
/* export */ function createDraftAdapter({ storage, loadLive, authorize, locks, makeId = () => crypto.randomUUID() }) {
  const read = () => {
    const rows = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY) || '[]')
    if (!Array.isArray(rows) || rows.some(row => !row.id || !Array.isArray(row.entries) || !row.planning || !['draft', 'published'].includes(row.publicationStatus))) throw new Error('Timetable draft storage is invalid. Existing records have not been reset.')
    return rows
  }
  const transaction = async (expected, action) => {
    authorize()
    const execute = async () => {
      const live = await loadLive() // Errors propagate; never fall back to demo/API snapshots.
      const tables = read()
      for (const item of expected) if (tables.find(row => same(row.id, item.id))?.revision !== item.revision) throw new Error('Timetable changed in another tab. Refresh before saving.')
      const next = await action(tables, live)
      storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next))
      return next
    }
    return locks ? locks.request(DRAFT_STORAGE_KEY, execute) : execute()
  }
  const selectedTables = (tables, expected) => tables.filter(table => expected.some(item => same(item.id, table.id)))
  return {
    list: async () => read(),
    saveSetup: (expected, config) => transaction(expected, (tables, { sources, backend }) => {
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      for (const table of selectedTables(tables, expected)) {
        if (table.publicationStatus !== 'draft') throw new Error('Only draft settings can be changed.')
        const errors = [...planningErrors(config, sources, table, occupied), ...table.entries.flatMap(row => entryPlanningErrors(row, config, sources, table, occupied))]
        if (errors.length) throw new Error(`Settings would invalidate existing classes: ${[...new Set(errors)].join(' ')}`)
      }
      return tables.map(table => expected.some(item => same(item.id, table.id)) ? { ...table, planning: config, revision: table.revision + 1, updatedAt: new Date().toISOString() } : table)
    }),
    generate: ({ scope, selected, config, expected, replace = false }) => transaction(expected, (tables, { sources, backend }) => {
      if (tables.some(table => matchesScope(table, scope) && selected.some(id => same(id, table.sectionId)) && !expected.some(item => same(item.id, table.id)))) throw new Error('A selected timetable was created in another tab. Refresh first.')
      return generateSections({ tables, selected, scope, sources, config, backend, replace, makeId })
    }),
    saveEntry: (table, form) => transaction([table], (tables, { sources, backend }) => {
      const current = tables.find(row => same(row.id, table.id))
      if (current.publicationStatus !== 'draft') throw new Error('Only draft timetables can be edited.')
      if (!scopeSections(sources, current).some(row => same(row.id, current.sectionId))) throw new Error('Section academic relationships changed. Refresh before editing.')
      if (form.id && !current.entries.some(row => same(row.id, form.id))) throw new Error('Class was removed. Refresh first.')
      const row = { id: form.id || makeId(), subjectId: form.subjectId, facultyId: form.facultyId, roomId: form.roomId || '', classroom: form.classroom, dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime, timetableSlotId: form.timetableSlotId, entryType: form.entryType, generated: false, sectionId: current.sectionId }
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      const requirement = subjectRequirements(sources, current, current.planning.requirements).find(item => same(item.subject.id, row.subjectId))
      if (!requirement?.faculty.some(faculty => same(faculty.id, row.facultyId))) throw new Error('Select a faculty member allocated to this section and subject.')
      const errors = [...entryPlanningErrors(row, current.planning, sources, current, occupied), ...conflictsFor(row, occupied).map(item => item.message)]
      if (errors.length) throw new Error(errors.join('\n'))
      return tables.map(item => item.id === current.id ? { ...item, entries: form.id ? item.entries.map(entry => same(entry.id, row.id) ? row : entry) : [...item.entries, row], revision: item.revision + 1, updatedAt: new Date().toISOString() } : item)
    }),
    removeEntry: (table, id) => transaction([table], tables => {
      if (tables.find(row => same(row.id, table.id)).publicationStatus !== 'draft') throw new Error('Only draft timetables can be edited.')
      return tables.map(item => item.id === table.id ? { ...item, entries: item.entries.filter(row => !same(row.id, id)), revision: item.revision + 1 } : item)
    }),
    validate: async expected => {
      authorize()
      const { sources, backend } = await loadLive(), tables = read()
      if (!expected.length || expected.some(item => tables.find(row => same(row.id, item.id))?.revision !== item.revision)) throw new Error('Refresh the selected timetables before validation.')
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      return selectedTables(tables, expected).flatMap(table => validateTable(table, sources, occupied))
    },
    publish: expected => transaction(expected, (tables, { sources, backend }) => {
      if (!expected.length) throw new Error('Select timetables to publish.')
      const occupied = decorateEntries([...backend, ...tableEntries(tables)], sources)
      const issues = selectedTables(tables, expected).flatMap(table => validateTable(table, sources, occupied))
      const blocking = issues.filter(item => item.blocking !== false)
      if (blocking.length) throw new Error(blocking.map(item => item.reason).join('\n'))
      return tables.map(table => expected.some(item => same(item.id, table.id)) ? { ...table, publicationStatus: 'published', revision: table.revision + 1, publishedAt: new Date().toISOString() } : table)
    }),
    reopen: table => transaction([table], tables => tables.map(item => same(item.id, table.id) ? { ...item, publicationStatus: 'draft', revision: item.revision + 1 } : item)),
  }
}
// #endregion services/timetable/timetableDraftAdapter.js
return {
  get DRAFT_STORAGE_KEY() { return DRAFT_STORAGE_KEY; },
  get createDraftAdapter() { return createDraftAdapter; }
};
})();

export const timetableWorkflowServiceModule = (() => {
const { timetableService } = timetableServiceModule;
const { departmentApi } = apiEndpointsModule;
const { profileApi } = apiEndpointsModule;
const { facultySubjectAllocationApi } = apiEndpointsModule;
const { subjectApi } = apiEndpointsModule;
const { getUserRole } = authModule;
const { same } = timetableUtilsModule;
const { active } = timetableUtilsModule;
const { conflictsFor } = timetableUtilsModule;
const { existingSlots } = timetableUtilsModule;
const { createDraftAdapter } = timetableDraftAdapterModule;
const { DRAFT_STORAGE_KEY } = timetableDraftAdapterModule;
const { decorateEntries } = timetableDomainModule;
const { tableEntries } = timetableDomainModule;
/* Imports for isolated regression tests:
import { timetableService } from '../timetableService'
import { departmentApi, profileApi, facultySubjectAllocationApi, subjectApi } from '../../api/apiEndpoints'
import { getUserRole } from '../../auth/auth'
import { same, active, conflictsFor, existingSlots } from '../../utils/timetableUtils'
import { createDraftAdapter, DRAFT_STORAGE_KEY } from './timetableDraftAdapter'
import { decorateEntries, tableEntries } from './timetableDomain'
*/
// #region services/timetable/timetableWorkflowService.js
/* export */ const draftCapabilityEnabled = import.meta.env.DEV && import.meta.env.VITE_TIMETABLE_DRAFT_ADAPTER === 'true'
/* export */ async function loadLive() {
  const [sources, departments, backend, subjects] = await Promise.all([timetableService.getSources(), departmentApi.getAll(), timetableService.list(), subjectApi.list()])
  return { sources: { ...sources, subjects: subjects.map(row => ({ ...row, id: row.subjectId ?? row.id, name: row.subjectName ?? row.name })), departments: departments.map(row => ({ ...row, id: row.departmentId ?? row.id, name: row.departmentName ?? row.name })), allocations: sources.allocations.filter(row => active(row) && row.sectionId && (!row.allocationType || row.allocationType.toUpperCase() === 'TEACHING')) }, backend }
}
/* export */ async function resolveMyFaculty(sources) {
  const profile = await profileApi.getProfile()
  const matches = sources.faculty.filter(row => active(row) && (profile.facultyId ? same(row.id, profile.facultyId) : same(row.userId, profile.id)))
  if (matches.length !== 1) throw new Error('Your authenticated account is not linked to exactly one active faculty record. Ask the administrator to correct the faculty user mapping.')
  return matches[0].id
}
/* export */ async function updateWeeklyRequirement(allocation, periodsPerWeek) {
  if (getUserRole() !== 'admin') throw new Error('Administrator access is required.')
  if (!Number.isInteger(Number(periodsPerWeek)) || Number(periodsPerWeek) < 1) throw new Error('Weekly periods must be a positive whole number.')
  const payload = Object.fromEntries(['facultyId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'subjectId', 'academicYearId', 'allocationType', 'isPrimaryFaculty', 'status', 'remarks'].map(field => [field, allocation[field] ?? (field === 'isPrimaryFaculty' || field === 'status' ? true : field === 'allocationType' ? 'TEACHING' : null)]))
  return facultySubjectAllocationApi.update(allocation.allocationId ?? allocation.id, { ...payload, periodsPerWeek: Number(periodsPerWeek) })
}
/* export */ async function saveBackendEntry(table, form) {
  if (getUserRole() !== 'admin') throw new Error('Administrator access is required.')
  const save = async () => {
    const { sources, backend } = await loadLive()
    const drafts = draftCapabilityEnabled ? await workflowAdapter().list() : []
    const slot = existingSlots(backend, table.id).find(row => same(row.id, form.timetableSlotId))
    if (!slot) throw new Error('This backend slot is no longer available. Refresh the timetable.')
    const scope = Object.fromEntries(['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId'].map(field => [field, table[field]]))
    const candidate = { ...form, ...scope, timetableId: table.id, startTime: slot.startTime, endTime: slot.endTime }
    const conflicts = conflictsFor(candidate, decorateEntries([...backend, ...tableEntries(drafts)], sources))
    if (conflicts.length) throw new Error(conflicts.map(row => row.message).join('\n'))
    return timetableService.save(candidate, scope)
  }
  return draftCapabilityEnabled && navigator.locks ? navigator.locks.request(DRAFT_STORAGE_KEY, save) : save()
}
let adapter
/* export */ function workflowAdapter() {
  if (!draftCapabilityEnabled) throw new Error('The timetable lifecycle contract has not been verified. Mock Mode requires development mode and explicit VITE_TIMETABLE_DRAFT_ADAPTER=true configuration.')
  adapter ||= createDraftAdapter({ storage: localStorage, locks: navigator.locks, loadLive, authorize: () => { if (getUserRole() !== 'admin') throw new Error('Administrator access is required.') } })
  return adapter
}
// #endregion services/timetable/timetableWorkflowService.js
return {
  get draftCapabilityEnabled() { return draftCapabilityEnabled; },
  get loadLive() { return loadLive; },
  get resolveMyFaculty() { return resolveMyFaculty; },
  get updateWeeklyRequirement() { return updateWeeklyRequirement; },
  get saveBackendEntry() { return saveBackendEntry; },
  get workflowAdapter() { return workflowAdapter; }
};
})();

export const examServiceModule = (() => {

/* Imports for isolated regression tests:

*/
// #region services/examService.js
const KEYS = {
  exams: 'cms_exam_schedules', halls: 'cms_exam_halls', students: 'cms_exam_students', allocations: 'cms_exam_hall_allocations', examTypes: 'cms_exam_types', invigilationRules: 'cms_exam_invigilation_rules', invigilations: 'cms_exam_invigilations',
}

const defaultExamTypes = [
  ['Mid Semester', 90, 30, ['Theory'], true, true], ['Internal Assessment', 60, 30, ['Theory','Practical'], false, true],
  ['Practical', 180, 50, ['Practical','Laboratory'], true, true], ['End Semester', 180, 100, ['Theory','Practical','Project','Viva'], true, true],
  ['Backlog', 180, 100, ['Theory','Practical'], true, true], ['Supplementary', 180, 100, ['Theory','Practical'], true, true],
  ['Special', 180, 100, ['Theory','Practical'], true, true], ['Viva', 60, 50, ['Viva'], false, false],
  ['Project Evaluation', 120, 100, ['Project'], false, false], ['Continuous Internal Assessment', 60, 30, ['Theory','Practical'], false, false],
  ['Lab/Internal Practical Examination', 180, 50, ['Practical','Laboratory'], true, true],
].map(([name,durationMinutes,maxMarks,subjectTypes,hallRequired,invigilatorRequired])=>({name,durationMinutes,maxMarks,subjectTypes,hallRequired,invigilatorRequired,examinerRequired:false,enabled:true,applicableSemesters:['I','II','III','IV','V','VI','VII','VIII'],studentCategories:['Regular']}))
const defaultInvigilationRules = [
  { examDepartment:'Computer Science', allowedDepartments:['Electrical Engineering'], enabled:true },
  { examDepartment:'Electronics & Communication', allowedDepartments:['Civil Engineering','Mechanical Engineering'], enabled:true },
  { examDepartment:'Electrical Engineering', allowedDepartments:['Computer Science'], enabled:true },
  { examDepartment:'Mechanical Engineering', allowedDepartments:['Electronics & Communication'], enabled:true },
  { examDepartment:'Civil Engineering', allowedDepartments:['Electronics & Communication'], enabled:true },
]
const defaultExamSessions = [
  { code:'FN', label:'Forenoon', startTime:'09:00', endTime:'12:00', enabled:true },
  { code:'AN', label:'Afternoon', startTime:'14:00', endTime:'17:00', enabled:true },
]

/* export */ const examMaster = {
  academicYears: ['2026-2027', '2025-2026'],
  departments: ['Computer Science', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'],
  courses: ['B.Tech'],
  branches: ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil'],
  batches: ['2023-2027', '2022-2026', '2024-2028'],
  semesters: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
  sections: ['A', 'B', 'C'],
  examTypes: ['Regular', 'Supplementary', 'Backlog', 'Mid Semester', 'End Semester', 'Internal Assessment', 'Practical', 'Viva'],
  subjectTypes: ['Theory', 'Practical', 'Laboratory', 'Project', 'Seminar', 'Viva', 'Internship', 'Elective', 'Open Elective', 'Professional Elective', 'Mandatory Course'],
  subjects: [
    { code: 'CS701PC', name: 'Machine Learning', branch: 'CSE', semester: 'VII', type: 'Theory', credits: 4, faculty: 'Dr. Kavya Sharma' },
    { code: 'CS702PC', name: 'Cloud Computing', branch: 'CSE', semester: 'VII', type: 'Theory', credits: 3, faculty: 'Rahul Verma' },
    { code: 'CS703PE', name: 'Data Mining', branch: 'CSE', semester: 'VII', type: 'Practical', credits: 2, faculty: 'Dr. Neha Reddy' },
    { code: 'EC701PC', name: 'Wireless Networks', branch: 'ECE', semester: 'VII', type: 'Theory', credits: 4, faculty: 'Priya Nair' },
    { code: 'EE701PC', name: 'Power Systems', branch: 'EEE', semester: 'VII', type: 'Theory', credits: 4, faculty: 'Arvind Kumar' },
  ],
  faculty: ['Dr. Kavya Sharma', 'Rahul Verma', 'Dr. Neha Reddy', 'Priya Nair', 'Arvind Kumar'],
  facultyDirectory: [
    {id:'FAC001',name:'Dr. Kavya Sharma',department:'Computer Science',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC002',name:'Rahul Verma',department:'Computer Science',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC003',name:'Dr. Neha Reddy',department:'Computer Science',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC004',name:'Priya Nair',department:'Electronics & Communication',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC005',name:'Arvind Kumar',department:'Electrical Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC006',name:'Civil Faculty A',department:'Civil Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC007',name:'Civil Faculty B',department:'Civil Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
    {id:'FAC008',name:'Mechanical Faculty A',department:'Mechanical Engineering',active:true,eligible:true,onLeave:false,maxDailyAssignments:2},
  ],
}

const seedExams = [
  { id: 'EXM001', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'CS701PC', subjectName: 'Machine Learning', subjectType: 'Theory', credits: 4, faculty: 'Dr. Kavya Sharma', examDate: '2026-10-15', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H101', status: 'Scheduled' },
  { id: 'EXM002', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'CS702PC', subjectName: 'Cloud Computing', subjectType: 'Theory', credits: 3, faculty: 'Rahul Verma', examDate: '2026-10-17', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H102', status: 'Scheduled' },
  { id: 'EXM003', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'CS703PE', subjectName: 'Data Mining', subjectType: 'Practical', credits: 2, faculty: 'Dr. Neha Reddy', examDate: '2026-10-20', startTime: '13:30', endTime: '16:30', session: 'AN', hallId: 'H103', status: 'Scheduled' },
  { id: 'EXM004', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Electronics & Communication', course: 'B.Tech', branch: 'ECE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'EC701PC', subjectName: 'Wireless Networks', subjectType: 'Theory', credits: 4, faculty: 'Priya Nair', examDate: '2026-10-15', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H104', status: 'Scheduled' },
  { id: 'EXM005', academicYear: '2026-2027', examType: 'End Semester', examName: 'B.Tech End Semester Examination', examCode: 'ESE-2026-01', department: 'Electrical Engineering', course: 'B.Tech', branch: 'EEE', batch: '2023-2027', semester: 'VII', section: 'A', subjectCode: 'EE701PC', subjectName: 'Power Systems', subjectType: 'Theory', credits: 4, faculty: 'Arvind Kumar', examDate: '2026-10-18', startTime: '09:00', endTime: '12:00', session: 'FN', hallId: 'H105', status: 'Scheduled' },
]
const seedHalls = [
  { id: 'H101', name: 'A101', building: 'Academic Block A', floor: '1', capacity: 40 }, { id: 'H102', name: 'A102', building: 'Academic Block A', floor: '1', capacity: 40 },
  { id: 'H103', name: 'A103', building: 'Academic Block A', floor: '1', capacity: 40 }, { id: 'H104', name: 'B201', building: 'Academic Block B', floor: '2', capacity: 60 },
  { id: 'H105', name: 'B202', building: 'Academic Block B', floor: '2', capacity: 60 },
]
const seedStudents = Array.from({ length: 120 }, (_, i) => ({ id: `STU${String(i + 1).padStart(4, '0')}`, name: `Student ${String(i + 1).padStart(3, '0')}`, registerNumber: `23CS${String(i + 1).padStart(3, '0')}`, department: 'Computer Science', course: 'B.Tech', branch: 'CSE', batch: '2023-2027', semester: 'VII', section: i < 40 ? 'A' : i < 80 ? 'B' : 'C' }))
const subjectCatalog = {
  CSE: ['Programming Fundamentals','Data Structures','Database Systems','Computer Networks','Software Engineering','Artificial Intelligence','Machine Learning','Project Work'],
  ECE: ['Circuit Analysis','Electronic Devices','Digital Systems','Signals and Systems','Communication Networks','Embedded Systems','Wireless Networks','Project Work'],
  EEE: ['Electrical Circuits','Electromagnetic Fields','Electrical Machines','Control Systems','Power Electronics','Power Systems','Smart Grids','Project Work'],
  Mechanical: ['Engineering Mechanics','Thermodynamics','Manufacturing Processes','Fluid Mechanics','Machine Design','Heat Transfer','Robotics','Project Work'],
  Civil: ['Engineering Geology','Surveying','Structural Analysis','Geotechnical Engineering','Transportation Engineering','Water Resources','Environmental Engineering','Project Work'],
}
const branchCodes = { CSE:'CS', ECE:'EC', EEE:'EE', Mechanical:'ME', Civil:'CE' }
const additionalSubjects = examMaster.branches.flatMap((branch) => examMaster.semesters.flatMap((semester, index) => (subjectCatalog[branch] || []).slice(index, index + 2).map((name, part) => ({ code:`${branchCodes[branch]}${String((index + 1) * 10 + part + 1).padStart(3,'0')}PC`, name, branch, semester, type:'Theory', credits:3, faculty:examMaster.faculty[(index + part) % examMaster.faculty.length] }))))
examMaster.subjects = [...examMaster.subjects, ...additionalSubjects.filter((item) => !examMaster.subjects.some((subject) => subject.code === item.code))]

function read(key, seed) {
  try {
    const value = localStorage.getItem(KEYS[key])
    if (value !== null) return JSON.parse(value)
    localStorage.setItem(KEYS[key], JSON.stringify(seed))
  } catch { /* use the in-memory sample if storage is unavailable */ }
  return structuredClone(seed)
}
function write(key, value) {
  localStorage.setItem(KEYS[key], JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('exam-data-updated'))
  return value
}
/* export */ const getExams = () => read('exams', seedExams)
/* export */ const getExamById = (id) => getExams().find((exam) => exam.id === id) || null
/* export */ const getHalls = () => read('halls', seedHalls)
/* export */ const getStudents = () => read('students', seedStudents)
/* export */ const getHallAllocations = () => read('allocations', [])
/* export */ const getInvigilationRules = () => read('invigilationRules', defaultInvigilationRules)
/* export */ const saveInvigilationRules = (rules) => write('invigilationRules', rules)
/* export */ const getInvigilations = () => read('invigilations', [])
/* export */ const saveInvigilations = (records) => write('invigilations', records)
/* export */ const getExamTypes = () => read('examTypes', defaultExamTypes)
/* export */ const saveExamTypes = (types) => write('examTypes', types)
/* export */ const getExamSessions = () => read('examSessions', defaultExamSessions)
/* export */ const saveExamSessions = (sessions) => write('examSessions', sessions)
/* export */ const replaceHalls = (halls) => write('halls', halls)
/* export */ const upsertStudents = (students) => {
  const current = getStudents()
  const byId = new Map(current.map((student) => [String(student.id), student]))
  students.forEach((student) => byId.set(String(student.id), { ...byId.get(String(student.id)), ...student }))
  return write('students', [...byId.values()])
}
/* export */ const getDepartments = () => examMaster.departments
/* export */ const getCourses = (department) => department ? ['B.Tech'] : examMaster.courses
/* export */ const getBranches = (department, course) => {
  const d = { 'Computer Science': ['CSE'], 'Electronics & Communication': ['ECE'], 'Electrical Engineering': ['EEE'], 'Mechanical Engineering': ['Mechanical'], 'Civil Engineering': ['Civil'] }
  return d[department] || (course ? examMaster.branches : examMaster.branches)
}
/* export */ const getSubjects = (branch, semester) => examMaster.subjects.filter((s) => (!branch || s.branch === branch) && (!semester || s.semester === semester))
/* export */ const getAvailableHalls = (date, session, examId) => {
  const occupied = new Set([...getExams().filter((e) => e.id !== examId && e.examDate === date && e.session === session && e.status !== 'Cancelled').map((e) => e.hallId), ...getHallAllocations().filter((a) => a.examId !== examId && a.examDate === date && a.session === session).map((a) => a.hallId)])
  return getHalls().filter((hall) => !occupied.has(hall.id))
}
/* export */ function createExam(record) {
  const exams = getExams()
  const conflicts = validateExam(record, exams)
  if (conflicts.length) throw new Error(conflicts.join(' '))
  const nextId = Math.max(0, ...exams.map((exam) => Number(String(exam.id).replace(/\D/g, '')) || 0)) + 1
  const created = { ...record, id: `EXM${String(nextId).padStart(3, '0')}` }
  write('exams', [...exams, created])
  return created
}
/* export */ function updateExam(id, changes) {
  const exams = getExams()
  const updated = exams.map((exam) => exam.id === id ? { ...exam, ...changes, id } : exam)
  const record = updated.find((exam) => exam.id === id)
  const errors = validateExam(record, exams, id)
  if (errors.length) throw new Error(errors.join(' '))
  write('exams', updated)
  return record
}
/* export */ function validateExam(record, exams = getExams(), ignoreId = '') {
  const errors = []
  if (!record.examName || !record.examType || !record.department || !record.branch || !record.batch || !record.semester || !record.subjectCode || !record.examDate || !record.startTime || !record.endTime || !record.faculty) errors.push('Complete all required examination, subject, schedule and faculty fields.')
  if (record.examDate && Number.isNaN(Date.parse(`${record.examDate}T00:00:00`))) errors.push('Enter a valid examination date.')
  if (record.startTime && record.endTime && record.endTime <= record.startTime) errors.push('End time must be later than start time.')
  const peers = exams.filter((e) => e.id !== ignoreId && e.status !== 'Cancelled')
  if (peers.some((e) => e.subjectCode === record.subjectCode && e.batch === record.batch && e.semester === record.semester && e.academicYear === record.academicYear && e.examType === record.examType)) errors.push('This subject already has a schedule for this batch, semester, academic year and exam type.')
  if (peers.some((e) => e.course === record.course && e.branch === record.branch && e.batch === record.batch && e.semester === record.semester && e.section === record.section && e.examDate === record.examDate && e.startTime < record.endTime && e.endTime > record.startTime)) errors.push('Students in this batch, semester and section already have an examination at that time.')
  if (record.hallId && peers.some((e) => e.hallId === record.hallId && e.examDate === record.examDate && e.startTime < record.endTime && e.endTime > record.startTime)) errors.push('This hall is already allocated during that time.')
  if (record.faculty && peers.some((e) => e.faculty === record.faculty && e.examDate === record.examDate && e.startTime < record.endTime && e.endTime > record.startTime)) errors.push('This faculty member has another examination during that time.')
  return errors
}
/* export */ function deleteExam(id) { write('exams', getExams().filter((e) => e.id !== id)); write('allocations', getHallAllocations().filter((a) => a.examId !== id)) }
/* export */ function createHallAllocation(allocation) {
  const allocations = getHallAllocations()
  const hall = getHalls().find((h) => h.id === allocation.hallId)
  const count = Number(allocation.studentCount || 0)
  const existing = allocations.find((a) => a.examId === allocation.examId && a.hallId === allocation.hallId)
  if (!hall) throw new Error('Select a valid examination hall.')
  if (!Number.isInteger(count) || count < 1) throw new Error('Select at least one student to allocate.')
  if (Number(existing?.studentCount || 0) + count > hall.capacity) throw new Error(`Allocation exceeds ${hall.name} capacity (${hall.capacity}).`)
  if (allocations.some((a) => a.examId !== allocation.examId && a.hallId === allocation.hallId && a.examDate === allocation.examDate && a.session === allocation.session)) throw new Error('This hall is allocated to another examination in this session.')
  const scheduledHallConflict = getExams().some((e) => e.id !== allocation.examId && e.hallId === allocation.hallId && e.examDate === allocation.examDate && e.session === allocation.session && e.status !== 'Cancelled')
  if (scheduledHallConflict) throw new Error('This hall is already assigned to another examination in this session.')
  const studentIds = allocation.studentIds || []
  const alreadyAssigned = new Set(allocations.filter((a) => a.examId === allocation.examId).flatMap((a) => a.studentIds || []))
  if (studentIds.some((id) => alreadyAssigned.has(id))) throw new Error('One or more students are already allocated to a hall for this examination.')
  const otherExamStudents = new Set(allocations.filter((a) => a.examId !== allocation.examId && a.examDate === allocation.examDate && a.session === allocation.session).flatMap((a) => a.studentIds || []))
  if (studentIds.some((id) => otherExamStudents.has(id))) throw new Error('One or more students already have an examination allocation in this session.')
  if (studentIds.length && studentIds.length !== count) throw new Error('The selected student range does not match the allocation count.')
  if (allocation.invigilator && allocations.some((a) => a.id !== existing?.id && a.invigilator === allocation.invigilator && a.examDate === allocation.examDate && a.session === allocation.session)) throw new Error('This invigilator is already assigned to a hall in this session.')
  const updated = existing
    ? allocations.map((a) => a.id === existing.id ? { ...a, studentCount: Number(a.studentCount || 0) + count, studentIds: [...(a.studentIds || []), ...studentIds], studentTo: allocation.studentTo || a.studentTo, invigilator: allocation.invigilator || a.invigilator } : a)
    : [...allocations, { ...allocation, id: `ALLOC${globalThis.crypto?.randomUUID?.() || Date.now()}` }]
  write('allocations', updated)
}
/* export */ function updateHallAllocation(id, changes) { write('allocations', getHallAllocations().map((a) => a.id === id ? { ...a, ...changes } : a)) }
/* export */ function deleteHallAllocation(id) { write('allocations', getHallAllocations().filter((a) => a.id !== id)) }
// #endregion services/examService.js
return {
  get examMaster() { return examMaster; },
  get getExams() { return getExams; },
  get getExamById() { return getExamById; },
  get getHalls() { return getHalls; },
  get getStudents() { return getStudents; },
  get getHallAllocations() { return getHallAllocations; },
  get getInvigilationRules() { return getInvigilationRules; },
  get saveInvigilationRules() { return saveInvigilationRules; },
  get getInvigilations() { return getInvigilations; },
  get saveInvigilations() { return saveInvigilations; },
  get getExamTypes() { return getExamTypes; },
  get saveExamTypes() { return saveExamTypes; },
  get getExamSessions() { return getExamSessions; },
  get saveExamSessions() { return saveExamSessions; },
  get replaceHalls() { return replaceHalls; },
  get upsertStudents() { return upsertStudents; },
  get getDepartments() { return getDepartments; },
  get getCourses() { return getCourses; },
  get getBranches() { return getBranches; },
  get getSubjects() { return getSubjects; },
  get getAvailableHalls() { return getAvailableHalls; },
  get createExam() { return createExam; },
  get updateExam() { return updateExam; },
  get validateExam() { return validateExam; },
  get deleteExam() { return deleteExam; },
  get createHallAllocation() { return createHallAllocation; },
  get updateHallAllocation() { return updateHallAllocation; },
  get deleteHallAllocation() { return deleteHallAllocation; }
};
})();

export const sampleBTechResultsModule = (() => {

/* Imports for isolated regression tests:

*/
// #region pages/examinations/grade-result-management/sampleBTechResults.js
/**
 * High-fidelity sample B.Tech results data for demonstrations and offline testing.
 * Includes complete assessment records across CSE, ECE, ME, multiple semesters,
 * credit weightings, passing students, and backlogs.
 */
/* export */ function getSampleBTechSheets(collegeId = '1', academicYearId = '1') {
  return [
    {
      id: 'sheet-cs501',
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      semester: 'Semester 5',
      department: 'Computer Science & Engineering',
      examType: 'End Semester Regular',
      subjectCode: 'CS501',
      subjectName: 'Design & Analysis of Algorithms',
      maximumMarks: 100,
      credits: 4,
      examDate: '2026-05-12',
      records: [
        { studentId: 'stu-101', studentName: 'Rahul Sharma', registrationNumber: '21B01A0501', internalMarks: 28, externalMarks: 62, totalMarks: 90, grade: 'O', gradePoint: 10, status: 'Passed' },
        { studentId: 'stu-102', studentName: 'Sneha Reddy', registrationNumber: '21B01A0502', internalMarks: 25, externalMarks: 58, totalMarks: 83, grade: 'A+', gradePoint: 9, status: 'Passed' },
        { studentId: 'stu-103', studentName: 'Ananya Rao', registrationNumber: '21B01A0503', internalMarks: 22, externalMarks: 48, totalMarks: 70, grade: 'A', gradePoint: 8, status: 'Passed' },
        { studentId: 'stu-104', studentName: 'Vikramaditya Varma', registrationNumber: '21B01A0504', internalMarks: 12, externalMarks: 22, totalMarks: 34, grade: 'F', gradePoint: 0, status: 'Failed' },
      ],
    },
    {
      id: 'sheet-cs502',
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      semester: 'Semester 5',
      department: 'Computer Science & Engineering',
      examType: 'End Semester Regular',
      subjectCode: 'CS502',
      subjectName: 'Database Management Systems',
      maximumMarks: 100,
      credits: 4,
      examDate: '2026-05-15',
      records: [
        { studentId: 'stu-101', studentName: 'Rahul Sharma', registrationNumber: '21B01A0501', internalMarks: 27, externalMarks: 65, totalMarks: 92, grade: 'O', gradePoint: 10, status: 'Passed' },
        { studentId: 'stu-102', studentName: 'Sneha Reddy', registrationNumber: '21B01A0502', internalMarks: 24, externalMarks: 52, totalMarks: 76, grade: 'A', gradePoint: 8, status: 'Passed' },
        { studentId: 'stu-103', studentName: 'Ananya Rao', registrationNumber: '21B01A0503', internalMarks: 20, externalMarks: 45, totalMarks: 65, grade: 'B+', gradePoint: 7, status: 'Passed' },
        { studentId: 'stu-104', studentName: 'Vikramaditya Varma', registrationNumber: '21B01A0504', internalMarks: 18, externalMarks: 35, totalMarks: 53, grade: 'B', gradePoint: 6, status: 'Passed' },
      ],
    },
    {
      id: 'sheet-cs503',
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      semester: 'Semester 5',
      department: 'Computer Science & Engineering',
      examType: 'End Semester Regular',
      subjectCode: 'CS503',
      subjectName: 'Computer Networks',
      maximumMarks: 100,
      credits: 3,
      examDate: '2026-05-18',
      records: [
        { studentId: 'stu-101', studentName: 'Rahul Sharma', registrationNumber: '21B01A0501', internalMarks: 26, externalMarks: 60, totalMarks: 86, grade: 'A+', gradePoint: 9, status: 'Passed' },
        { studentId: 'stu-102', studentName: 'Sneha Reddy', registrationNumber: '21B01A0502', internalMarks: 26, externalMarks: 63, totalMarks: 89, grade: 'A+', gradePoint: 9, status: 'Passed' },
        { studentId: 'stu-103', studentName: 'Ananya Rao', registrationNumber: '21B01A0503', internalMarks: 19, externalMarks: 41, totalMarks: 60, grade: 'B+', gradePoint: 7, status: 'Passed' },
        { studentId: 'stu-104', studentName: 'Vikramaditya Varma', registrationNumber: '21B01A0504', internalMarks: 15, externalMarks: 40, totalMarks: 55, grade: 'B', gradePoint: 6, status: 'Passed' },
      ],
    },
    {
      id: 'sheet-ec301',
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      semester: 'Semester 3',
      department: 'Electronics & Communication Engineering',
      examType: 'End Semester Regular',
      subjectCode: 'EC301',
      subjectName: 'Digital Electronic Circuits',
      maximumMarks: 100,
      credits: 4,
      examDate: '2026-05-14',
      records: [
        { studentId: 'stu-201', studentName: 'Pooja Hegde', registrationNumber: '22B01A0401', internalMarks: 29, externalMarks: 64, totalMarks: 93, grade: 'O', gradePoint: 10, status: 'Passed' },
        { studentId: 'stu-202', studentName: 'Karthik Naidu', registrationNumber: '22B01A0402', internalMarks: 23, externalMarks: 54, totalMarks: 77, grade: 'A', gradePoint: 8, status: 'Passed' },
      ],
    },
    {
      id: 'sheet-ec302',
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      semester: 'Semester 3',
      department: 'Electronics & Communication Engineering',
      examType: 'End Semester Regular',
      subjectCode: 'EC302',
      subjectName: 'Signals & Systems',
      maximumMarks: 100,
      credits: 3,
      examDate: '2026-05-17',
      records: [
        { studentId: 'stu-201', studentName: 'Pooja Hegde', registrationNumber: '22B01A0401', internalMarks: 26, externalMarks: 58, totalMarks: 84, grade: 'A+', gradePoint: 9, status: 'Passed' },
        { studentId: 'stu-202', studentName: 'Karthik Naidu', registrationNumber: '22B01A0402', internalMarks: 20, externalMarks: 42, totalMarks: 62, grade: 'B+', gradePoint: 7, status: 'Passed' },
      ],
    },
    {
      id: 'sheet-me101',
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      semester: 'Semester 1',
      department: 'Mechanical Engineering',
      examType: 'End Semester Regular',
      subjectCode: 'ME101',
      subjectName: 'Engineering Mechanics',
      maximumMarks: 100,
      credits: 4,
      examDate: '2026-05-10',
      records: [
        { studentId: 'stu-301', studentName: 'Sai Teja', registrationNumber: '23B01A0301', internalMarks: 10, externalMarks: 18, totalMarks: 28, grade: 'F', gradePoint: 0, status: 'Failed' },
        { studentId: 'stu-302', studentName: 'Tarun Kumar', registrationNumber: '23B01A0302', internalMarks: 24, externalMarks: 51, totalMarks: 75, grade: 'A', gradePoint: 8, status: 'Passed' },
      ],
    },
    {
      id: 'sheet-me102',
      collegeId: String(collegeId),
      academicYearId: String(academicYearId),
      semester: 'Semester 1',
      department: 'Mechanical Engineering',
      examType: 'End Semester Regular',
      subjectCode: 'ME102',
      subjectName: 'Engineering Graphics',
      maximumMarks: 100,
      credits: 3,
      examDate: '2026-05-13',
      records: [
        { studentId: 'stu-301', studentName: 'Sai Teja', registrationNumber: '23B01A0301', internalMarks: 22, externalMarks: 45, totalMarks: 67, grade: 'B+', gradePoint: 7, status: 'Passed' },
        { studentId: 'stu-302', studentName: 'Tarun Kumar', registrationNumber: '23B01A0302', internalMarks: 25, externalMarks: 57, totalMarks: 82, grade: 'A+', gradePoint: 9, status: 'Passed' },
      ],
    },
  ]
}
// #endregion pages/examinations/grade-result-management/sampleBTechResults.js
return {
  get getSampleBTechSheets() { return getSampleBTechSheets; }
};
})();

export const resultsServiceModule = (() => {
const { RESULTS_API_ENABLED } = apiEndpointsModule;
const { resultsApi } = apiEndpointsModule;
const { default: studentService } = studentServiceModule;
const { default: eventBus } = eventBusModule;
const { ERP_EVENTS } = eventBusModule;
const { getSampleBTechSheets } = sampleBTechResultsModule;
/* Imports for isolated regression tests:
import { RESULTS_API_ENABLED, resultsApi } from '../api/apiEndpoints'
import studentService from './studentService'
import eventBus, { ERP_EVENTS } from './eventBus'
import { getSampleBTechSheets } from '../pages/examinations/grade-result-management/sampleBTechResults'
*/
// #region services/resultsService.js
/* export */ const calculateGrade = (totalMarks) => {
  const marks = Number(totalMarks) || 0
  if (marks >= 90) return { grade: 'O', gradePoint: 10, status: 'Passed' }
  if (marks >= 80) return { grade: 'A+', gradePoint: 9, status: 'Passed' }
  if (marks >= 70) return { grade: 'A', gradePoint: 8, status: 'Passed' }
  if (marks >= 60) return { grade: 'B+', gradePoint: 7, status: 'Passed' }
  if (marks >= 50) return { grade: 'B', gradePoint: 6, status: 'Passed' }
  if (marks >= 40) return { grade: 'C', gradePoint: 5, status: 'Passed' }
  return { grade: 'F', gradePoint: 0, status: 'Failed' }
}

const clean = value => String(value ?? '').trim()
const same = (left, right) => clean(left).toLowerCase() === clean(right).toLowerCase()
const LOCAL_RESULTS_KEY = 'cms_local_results_sheets'

function readLocalSheets() {
  try {
    const raw = localStorage.getItem(LOCAL_RESULTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

function saveLocalSheets(sheets) {
  try {
    localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify(sheets))
  } catch { /* ignore */ }
}

class ResultsService {
  get integrationEnabled() { return RESULTS_API_ENABLED }

  async getResults(filter = {}) {
    if (RESULTS_API_ENABLED) {
      try {
        const apiData = await resultsApi.list(filter)
        if (Array.isArray(apiData) && apiData.length > 0) return apiData
      } catch (err) {
        console.warn('Backend results API unavailable, falling back to local storage:', err)
      }
    }

    // Local storage fallback
    const local = readLocalSheets()
    if (!filter || Object.keys(filter).length === 0) return local

    return local.filter(sheet => {
      if (filter.collegeId && String(sheet.collegeId) !== String(filter.collegeId)) return false
      if (filter.academicYearId && String(sheet.academicYearId) !== String(filter.academicYearId)) return false
      if (filter.semesterId && String(sheet.semesterId) !== String(filter.semesterId)) return false
      if (filter.sectionId && String(sheet.sectionId) !== String(filter.sectionId)) return false
      if (filter.examType && !same(sheet.examType, filter.examType)) return false
      if (filter.subjectCode && !same(sheet.subjectCode, filter.subjectCode)) return false
      return true
    })
  }

  seedSampleResults(collegeId = '1', academicYearId = '1') {
    const samples = getSampleBTechSheets(collegeId, academicYearId)
    saveLocalSheets(samples)
    eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, samples)
    return samples
  }

  clearLocalResults() {
    try {
      localStorage.removeItem(LOCAL_RESULTS_KEY)
      eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, [])
    } catch { /* ignore */ }
  }

  hasLocalResults() {
    return readLocalSheets().length > 0
  }

  async getStudentsForResults(scope) {
    const students = await studentService.getStudentsByScope(scope)
    return students.map((student) => {
      const personal = student.personal || {}
      const academic = student.academic || {}
      return { studentId: student.studentId || student.id, id: student.studentId || student.id, name: personal.fullName || student.name || student.studentName || '', rollNumber: academic.rollNumber || student.rollNumber || student.registrationNumber || '', internalMarks: '', externalMarks: '', totalMarks: '', grade: '', status: 'Pending' }
    })
  }

  async recordResults(sheet) {
    const required = ['academicYearId', 'courseId', 'branchId', 'semesterId', 'sectionId', 'examType', 'subjectCode', 'subjectName']
    const missing = required.find(key => !clean(sheet[key]))
    if (missing) throw new Error(`Complete ${missing.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').toLowerCase()} before publishing results.`)
    const maxInternal = Number(sheet.maxInternal)
    const maxExternal = Number(sheet.maxExternal)
    if (!(maxInternal > 0) || !(maxExternal > 0) || !(Number(sheet.credits) > 0)) throw new Error('Maximum marks and credits must be positive numbers.')
    if (!Array.isArray(sheet.records) || !sheet.records.length) throw new Error('Load students and enter marks before publishing results.')
    const records = sheet.records.map((record) => {
      const internal = Number(record.internalMarks)
      const external = Number(record.externalMarks)
      if (!clean(record.studentId) || !Number.isFinite(internal) || !Number.isFinite(external) || internal < 0 || external < 0 || internal > maxInternal || external > maxExternal) throw new Error('Enter valid marks for every student; marks cannot exceed their maximum.')
      const total = internal + external
      return { ...record, internalMarks: internal, externalMarks: external, totalMarks: total, ...calculateGrade(total), credits: Number(sheet.credits) }
    })
    const existing = await this.getResults({ academicYearId: sheet.academicYearId, courseId: sheet.courseId, branchId: sheet.branchId, semesterId: sheet.semesterId, sectionId: sheet.sectionId, examType: sheet.examType, subjectCode: sheet.subjectCode })
    if (existing.some(item => same(item.subjectCode, sheet.subjectCode) && same(item.examType, sheet.examType))) throw new Error('Results for this section, exam, and subject already exist. Use the existing result sheet to correct marks.')

    const newSheet = {
      ...sheet,
      records,
      totalStudents: records.length,
      passedCount: records.filter(record => record.status === 'Passed').length,
      failedCount: records.filter(record => record.status === 'Failed').length,
      createdAt: new Date().toISOString(),
    }

    let saved = newSheet
    if (RESULTS_API_ENABLED) {
      try {
        saved = await resultsApi.create(newSheet)
      } catch (err) {
        console.warn('Could not post result sheet to backend, storing locally:', err)
      }
    }

    // Persist locally as well
    const currentLocal = readLocalSheets()
    saveLocalSheets([...currentLocal, saved])
    eventBus.emit(ERP_EVENTS.RESULTS_RECORDED, saved)
    return saved
  }

  async getStudentTranscript(studentId) {
    if (!clean(studentId)) throw new Error('Select a student to view a transcript.')
    if (RESULTS_API_ENABLED) {
      try {
        return await resultsApi.getTranscript(studentId)
      } catch (err) {
        console.warn('API transcript error, falling back to local calculation:', err)
      }
    }
    const all = await this.getResults()
    const studentRecords = all.flatMap(sheet => (Array.isArray(sheet.records) ? sheet.records : []).filter(r => String(r.studentId) === String(studentId)))
    return { studentId, records: studentRecords }
  }
}

/* export */ const resultsService = new ResultsService()
/* export default resultsService */
// #endregion services/resultsService.js
return {
  get calculateGrade() { return calculateGrade; },
  get resultsService() { return resultsService; },
  get default() { return resultsService; }
};
})();

export function facultyAllocationServiceModule() {
const { facultySubjectAllocationApi } = apiEndpointsModule;
const { facultyService } = facultyServiceModule;
/* Imports for isolated regression tests:
import { facultySubjectAllocationApi } from '../api/apiEndpoints'
import { facultyService } from './facultyService'
*/
// #region services/facultyAllocationService.js
/* export */ const facultyAllocationCapability = Object.freeze({ sectionAdvisor: false, subjectAllocation: true, workload: true })

/* export default {
  listSubjectAllocations: facultySubjectAllocationApi.getAll,
  createSubjectAllocation: facultySubjectAllocationApi.create,
  updateSubjectAllocation: facultySubjectAllocationApi.update,
  removeSubjectAllocation: facultySubjectAllocationApi.remove,
  getWorkload: facultyService.getWorkload,
} */
// #endregion services/facultyAllocationService.js
return {
  get facultyAllocationCapability() { return facultyAllocationCapability; },
  get default() { return {
  listSubjectAllocations: facultySubjectAllocationApi.getAll,
  createSubjectAllocation: facultySubjectAllocationApi.create,
  updateSubjectAllocation: facultySubjectAllocationApi.update,
  removeSubjectAllocation: facultySubjectAllocationApi.remove,
  getWorkload: facultyService.getWorkload,
}; }
};
}

export function timetableMockDataModule() {

/* Imports for isolated regression tests:

*/
// #region services/timetableMockData.js
/* export */ const demoAcademicData = {
  academicYears: [{ id: 'ay-2026', name: '2026-2027', status: 'Active' }],
  departments: [
    { id: 'dept-cse', name: 'Computer Science & Engineering' },
    { id: 'dept-ece', name: 'Electronics & Communication Engineering' },
    { id: 'dept-me', name: 'Mechanical Engineering' },
  ],
  courses: [{ id: 'course-btech', name: 'B.Tech' }],
  branches: [
    { id: 'branch-cse', departmentId: 'dept-cse', name: 'CSE' },
    { id: 'branch-cse-aiml', departmentId: 'dept-cse', name: 'CSE (AI & ML)' },
    { id: 'branch-ece', departmentId: 'dept-ece', name: 'ECE' },
    { id: 'branch-me', departmentId: 'dept-me', name: 'Mechanical Engineering' },
  ],
  semesters: [
    { id: 'sem-1', academicLevel: '1st Year', name: 'Semester 1' },
    { id: 'sem-2', academicLevel: '1st Year', name: 'Semester 2' },
    { id: 'sem-3', academicLevel: '2nd Year', name: 'Semester 3' },
    { id: 'sem-4', academicLevel: '2nd Year', name: 'Semester 4' },
    { id: 'sem-5', academicLevel: '3rd Year', name: 'Semester 5' },
    { id: 'sem-6', academicLevel: '3rd Year', name: 'Semester 6' },
    { id: 'sem-7', academicLevel: '4th Year', name: 'Semester 7' },
    { id: 'sem-8', academicLevel: '4th Year', name: 'Semester 8' },
  ],
  sections: [
    { id: 'sec-cse-a', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section A', shortName: 'A' },
    { id: 'sec-cse-b', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section B', shortName: 'B' },
    { id: 'sec-cse-c', branchId: 'branch-cse', semesterId: 'sem-3', name: 'Section C', shortName: 'C' },
  ],
  subjects: [
    { id: 'sub-ds', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS301', name: 'Data Structures', type: 'THEORY', blockSize: 1, periodsPerWeek: 4 },
    { id: 'sub-dbms', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS302', name: 'Database Management Systems', type: 'THEORY', blockSize: 1, periodsPerWeek: 4 },
    { id: 'sub-os', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS303', name: 'Operating Systems', type: 'THEORY', blockSize: 1, periodsPerWeek: 4 },
    { id: 'sub-oop', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS304', name: 'Object Oriented Programming', type: 'THEORY', blockSize: 1, periodsPerWeek: 3 },
    { id: 'sub-cn', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS305', name: 'Computer Networks', type: 'THEORY', blockSize: 1, periodsPerWeek: 3 },
    { id: 'sub-dbmsp', branchId: 'branch-cse', semesterId: 'sem-3', code: 'CS306L', name: 'DBMS Lab', type: 'LAB', blockSize: 2, periodsPerWeek: 2 },
  ],
  faculty: [
    { id: 'fac-001', code: 'F001', name: 'Dr. Ravi Kumar' },
    { id: 'fac-002', code: 'F002', name: 'Dr. Priya Sharma' },
    { id: 'fac-003', code: 'F003', name: 'Dr. Suresh Reddy' },
    { id: 'fac-004', code: 'F004', name: 'Dr. Anil Kumar' },
    { id: 'fac-005', code: 'F005', name: 'Dr. Kavitha Rao' },
    { id: 'fac-006', code: 'F006', name: 'Dr. Naveen' },
  ],
  rooms: [
    { id: 'room-201', name: 'CSE-201', type: 'CLASSROOM' },
    { id: 'room-202', name: 'CSE-202', type: 'CLASSROOM' },
    { id: 'room-203', name: 'CSE-203', type: 'CLASSROOM' },
    { id: 'room-lab-1', name: 'CSE-LAB-1', type: 'LAB' },
    { id: 'room-lab-2', name: 'CSE-LAB-2', type: 'LAB' },
  ],
  allocations: [
    { sectionId: 'sec-cse-a', subjectId: 'sub-dbms', facultyId: 'fac-001' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-dbms', facultyId: 'fac-003' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-dbms', facultyId: 'fac-002' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-os', facultyId: 'fac-002' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-os', facultyId: 'fac-004' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-os', facultyId: 'fac-001' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-ds', facultyId: 'fac-006' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-ds', facultyId: 'fac-002' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-ds', facultyId: 'fac-003' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-oop', facultyId: 'fac-004' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-oop', facultyId: 'fac-005' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-oop', facultyId: 'fac-006' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-cn', facultyId: 'fac-005' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-cn', facultyId: 'fac-006' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-cn', facultyId: 'fac-004' },
    { sectionId: 'sec-cse-a', subjectId: 'sub-dbmsp', facultyId: 'fac-003' },
    { sectionId: 'sec-cse-b', subjectId: 'sub-dbmsp', facultyId: 'fac-001' },
    { sectionId: 'sec-cse-c', subjectId: 'sub-dbmsp', facultyId: 'fac-005' },
  ],
}

/* export */ const defaultDemoSettings = {
  startTime: '09:00', periodsPerDay: 7, periodDuration: 50,
  breakAfter: 2, breakDuration: 20, lunchAfter: 4, lunchDuration: 50,
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
}

/* export */ const demoSubjects = demoAcademicData.subjects
/* export */ const demoWeekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
// #endregion services/timetableMockData.js
return {
  get demoAcademicData() { return demoAcademicData; },
  get defaultDemoSettings() { return defaultDemoSettings; },
  get demoSubjects() { return demoSubjects; },
  get demoWeekdays() { return demoWeekdays; }
};
}

export function timetableDemoGeneratorModule() {
const { demoAcademicData } = timetableMockDataModule;
const { defaultDemoSettings } = timetableMockDataModule;
/* Imports for isolated regression tests:
import { demoAcademicData, defaultDemoSettings } from '../services/timetableMockData.js'
*/
// #region utils/timetableDemoGenerator.js
const toMinutes = value => { const [hours, minutes] = String(value || '09:00').split(':').map(Number); return hours * 60 + minutes }
const fromMinutes = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
/* export */ const buildDemoPeriods = (settings = defaultDemoSettings) => {
  const periods = []; let minute = toMinutes(settings.startTime)
  for (let index = 1; index <= Number(settings.periodsPerDay); index += 1) {
    const startTime = fromMinutes(minute), endTime = fromMinutes(minute + Number(settings.periodDuration))
    periods.push({ index, name: `P${index}`, startTime, endTime, type: 'CLASS' }); minute += Number(settings.periodDuration)
    if (index === Number(settings.breakAfter) && Number(settings.breakDuration) > 0) {
      periods.push({ index: `break-${index}`, name: 'BREAK', startTime: fromMinutes(minute), endTime: fromMinutes(minute + Number(settings.breakDuration)), type: 'BREAK' }); minute += Number(settings.breakDuration)
    }
    if (index === Number(settings.lunchAfter) && Number(settings.lunchDuration) > 0) {
      periods.push({ index: `lunch-${index}`, name: 'LUNCH', startTime: fromMinutes(minute), endTime: fromMinutes(minute + Number(settings.lunchDuration)), type: 'LUNCH' }); minute += Number(settings.lunchDuration)
    }
  }
  return periods
}

const teaching = settings => buildDemoPeriods(settings).filter(period => period.type === 'CLASS')
const eligibleRoom = (subject, room) => subject?.type === 'LAB' ? room.type === 'LAB' : room.type === 'CLASSROOM'
const timesFor = (settings, startIndex, duration) => {
  const periods = teaching(settings), block = Array.from({ length: duration }, (_, offset) => periods.find(period => period.index === startIndex + offset))
  if (block.some(period => !period) || block.slice(1).some((period, index) => period.startTime !== block[index].endTime)) return null
  return { startTime: block[0].startTime, endTime: block.at(-1).endTime }
}
const overlapsSlots = (left, right) => left.dayOfWeek === right.dayOfWeek && left.periodIndices.some(index => right.periodIndices.includes(index))
const entrySlots = entry => entry.periodIndices || Array.from({ length: entry.duration || 1 }, (_, offset) => Number(entry.periodIndex) + offset)
const normalizedEntry = entry => ({ ...entry, periodIndices: entrySlots(entry) })

/* export */ const scheduleScopeSections = scope => demoAcademicData.sections.filter(section => section.branchId === scope.branchId && section.semesterId === scope.semesterId)

/* export */ function generateDemoTimetables(state, scope, { missingOnly = false } = {}) {
  const settings = state.settings, sections = scheduleScopeSections(scope), days = settings.workingDays
  const selected = new Set(Object.entries(state.subjectConfig || {}).filter(([, config]) => config.selected).map(([id]) => id))
  const schedules = { ...state.schedules }
  const sectionIds = new Set(sections.map(section => section.id))
  const retained = missingOnly ? sections.flatMap(section => schedules[section.id]?.entries || []) : []
  const outsideExisting = Object.entries(schedules).filter(([sectionId]) => !sectionIds.has(sectionId)).flatMap(([, schedule]) => schedule.entries || [])
  for (const section of sections) {
    const existing = missingOnly ? [...(schedules[section.id]?.entries || [])] : []
    schedules[section.id] = { sectionId: section.id, entries: existing, publicationStatus: 'DRAFT' }
  }
  const occupied = [...outsideExisting, ...retained].map(normalizedEntry)
  const unscheduled = state.unscheduled.filter(item => !sectionIds.has(item.sectionId))
  const subjects = demoAcademicData.subjects.filter(subject => subject.branchId === scope.branchId && subject.semesterId === scope.semesterId && selected.has(subject.id))
  const requests = sections.flatMap(section => subjects.map(subject => {
    const allocation = state.allocations.find(row => row.sectionId === section.id && row.subjectId === subject.id)
    const required = Number(state.subjectConfig[subject.id]?.periodsPerWeek ?? subject.periodsPerWeek)
    const done = (schedules[section.id].entries || []).filter(entry => entry.subjectId === subject.id).reduce((total, entry) => total + entrySlots(entry).length, 0)
    return { section, subject, allocation, required, remaining: Math.max(0, required - done) }
  })).filter(row => row.remaining > 0).sort((a, b) => b.subject.blockSize - a.subject.blockSize || a.remaining - b.remaining || a.section.id.localeCompare(b.section.id))

  for (const request of requests) {
    const { section, subject, allocation } = request
    const duration = Number(subject.blockSize || 1)
    if (!allocation?.facultyId || request.remaining % duration) {
      unscheduled.push({ sectionId: section.id, subjectId: subject.id, required: request.required, remaining: request.remaining, reason: !allocation?.facultyId ? 'Faculty is not allocated for this section.' : `Remaining periods must fit a ${duration}-period block.` })
      continue
    }
    for (let done = 0; done < request.remaining; done += duration) {
      const candidates = []
      days.forEach((day, dayIndex) => teaching(settings).forEach(period => {
        if (!timesFor(settings, period.index, duration)) return
        candidates.push({ day, dayIndex, periodIndex: period.index })
      }))
      const rotation = demoAcademicData.sections.findIndex(item => item.id === section.id)
      candidates.sort((a, b) => ((a.dayIndex + rotation) % Math.max(days.length, 1)) - ((b.dayIndex + rotation) % Math.max(days.length, 1)) || ((a.periodIndex + rotation * 2) % Number(settings.periodsPerDay)) - ((b.periodIndex + rotation * 2) % Number(settings.periodsPerDay)))
      let placed = false
      for (const candidate of candidates) {
        const periodIndices = Array.from({ length: duration }, (_, offset) => candidate.periodIndex + offset)
        const time = timesFor(settings, candidate.periodIndex, duration)
        const rooms = demoAcademicData.rooms.filter(room => eligibleRoom(subject, room))
        for (let roomOffset = 0; roomOffset < rooms.length; roomOffset += 1) {
          const room = rooms[(roomOffset + rotation) % rooms.length]
          const entry = { id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`, sectionId: section.id, subjectId: subject.id, facultyId: allocation.facultyId, roomId: room.id, dayOfWeek: candidate.day, periodIndex: candidate.periodIndex, periodIndices, duration, ...time, generated: true }
          const busy = occupied.some(other => overlapsSlots(normalizedEntry(other), normalizedEntry(entry)) && (other.facultyId === entry.facultyId || other.roomId === entry.roomId || other.sectionId === entry.sectionId))
          if (busy) continue
          schedules[section.id].entries.push(entry); occupied.push(entry); placed = true; break
        }
        if (placed) break
      }
      if (!placed) {
        const remaining = request.remaining - done
        unscheduled.push({ sectionId: section.id, subjectId: subject.id, required: request.required, remaining, reason: 'No conflict-free day, period, faculty, and suitable room were available.' })
        break
      }
    }
  }
  return { ...state, schedules, unscheduled, lastGeneratedAt: new Date().toISOString() }
}

/* export */ const demoEntryTimes = (settings, periodIndex, duration = 1) => timesFor(settings, Number(periodIndex), Number(duration))
/* export */ const demoTeachingPeriods = settings => teaching(settings)
/* export */ const demoEntryPeriodIndices = entrySlots
/* export */ const demoEntryOverlaps = overlapsSlots
// #endregion utils/timetableDemoGenerator.js
return {
  get buildDemoPeriods() { return buildDemoPeriods; },
  get scheduleScopeSections() { return scheduleScopeSections; },
  get generateDemoTimetables() { return generateDemoTimetables; },
  get demoEntryTimes() { return demoEntryTimes; },
  get demoTeachingPeriods() { return demoTeachingPeriods; },
  get demoEntryPeriodIndices() { return demoEntryPeriodIndices; },
  get demoEntryOverlaps() { return demoEntryOverlaps; }
};
}

export function timetableDemoValidatorModule() {
const { demoAcademicData } = timetableMockDataModule;
const { demoWeekdays } = timetableMockDataModule;
const { demoEntryOverlaps } = timetableDemoGeneratorModule;
const { demoEntryPeriodIndices } = timetableDemoGeneratorModule;
const { demoEntryTimes } = timetableDemoGeneratorModule;
const { demoTeachingPeriods } = timetableDemoGeneratorModule;
/* Imports for isolated regression tests:
import { demoAcademicData, demoWeekdays } from '../services/timetableMockData.js'
import { demoEntryOverlaps, demoEntryPeriodIndices, demoEntryTimes, demoTeachingPeriods } from './timetableDemoGenerator.js'
*/
// #region utils/timetableDemoValidator.js
const entryRows = state => Object.values(state.schedules || {}).flatMap(schedule => schedule.entries || [])
const sectionFor = id => demoAcademicData.sections.find(row => row.id === id)
const subjectFor = id => demoAcademicData.subjects.find(row => row.id === id)
const samePeriods = (left, right) => demoEntryOverlaps({ ...left, periodIndices: demoEntryPeriodIndices(left) }, { ...right, periodIndices: demoEntryPeriodIndices(right) })
const sectionName = id => sectionFor(id)?.name || 'Unknown section'
const facultyName = id => demoAcademicData.faculty.find(row => row.id === id)?.name || 'Unknown faculty'

/* export */ function validateDemoSettings(settings) {
  const errors = []
  const count = Number(settings.periodsPerDay), duration = Number(settings.periodDuration)
  const start = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.startTime || '')
  if (!start) errors.push('Enter a valid college start time.')
  if (!Number.isInteger(count) || count < 1 || count > 12) errors.push('Periods per day must be between 1 and 12.')
  if (!Number.isInteger(duration) || duration < 25 || duration > 120) errors.push('Period duration must be between 25 and 120 minutes.')
  if (!Array.isArray(settings.workingDays) || !settings.workingDays.length || settings.workingDays.some(day => !demoWeekdays.includes(day))) errors.push('Select at least one valid working day.')
  if (Number(settings.breakAfter) < 0 || Number(settings.breakAfter) > count || Number(settings.lunchAfter) < 0 || Number(settings.lunchAfter) > count) errors.push('Break and lunch positions must be within the teaching day.')
  if (Number(settings.breakDuration) < 0 || Number(settings.lunchDuration) < 0) errors.push('Break and lunch durations cannot be negative.')
  return errors
}

/* export */ function validateDemoEntry(state, candidate, excludeId = '') {
  const errors = [], section = sectionFor(candidate.sectionId), subject = subjectFor(candidate.subjectId)
  const periods = demoTeachingPeriods(state.settings), indices = demoEntryPeriodIndices(candidate)
  const times = demoEntryTimes(state.settings, candidate.periodIndex, candidate.duration || subject?.blockSize || 1)
  if (!section) errors.push('Select a valid demo section.')
  if (!subject || subject.branchId !== section?.branchId || subject.semesterId !== section?.semesterId) errors.push('Select a subject available for this section.')
  if (!state.settings.workingDays.includes(candidate.dayOfWeek)) errors.push('Select an enabled working day.')
  if (!times || indices.some(index => !periods.some(period => period.index === index))) errors.push('Class must fit in teaching periods and cannot cross Break or Lunch.')
  if (!candidate.facultyId) errors.push('Select faculty for this class.')
  if (!candidate.roomId || !demoAcademicData.rooms.some(room => room.id === candidate.roomId)) errors.push('Select a demo classroom or lab.')
  const allocation = state.allocations.find(row => row.sectionId === candidate.sectionId && row.subjectId === candidate.subjectId && row.facultyId === candidate.facultyId)
  if (section && subject && !allocation) errors.push(`${facultyName(candidate.facultyId)} is not allocated to ${subject.name} in ${section.name}. Review Faculty Coverage first.`)
  const room = demoAcademicData.rooms.find(row => row.id === candidate.roomId)
  if (subject && room && ((subject.type === 'LAB' && room.type !== 'LAB') || (subject.type !== 'LAB' && room.type !== 'CLASSROOM'))) errors.push(subject.type === 'LAB' ? 'Lab subjects must use a lab room.' : 'Theory subjects must use a classroom.')

  const proposed = { ...candidate, ...times, periodIndices: indices }
  for (const existing of entryRows(state)) {
    if (existing.id === excludeId || !samePeriods(proposed, existing)) continue
    const collision = []
    if (existing.sectionId === candidate.sectionId) collision.push('Section')
    if (candidate.facultyId && existing.facultyId === candidate.facultyId) collision.push('Faculty')
    if (candidate.roomId && existing.roomId === candidate.roomId) collision.push('Room')
    if (collision.length) errors.push(`${collision.join(' / ')} conflict: ${facultyName(existing.facultyId)} is already scheduled for ${sectionName(existing.sectionId)} on ${existing.dayOfWeek} P${existing.periodIndex} (${existing.startTime}-${existing.endTime}).`)
  }
  const suggestions = errors.length && section && subject && candidate.facultyId ? findSuggestions(state, proposed, excludeId) : []
  return { valid: errors.length === 0, errors: [...new Set(errors)], suggestions }
}

function findSuggestions(state, candidate, excludeId) {
  const rooms = demoAcademicData.rooms.filter(room => subjectFor(candidate.subjectId)?.type === 'LAB' ? room.type === 'LAB' : room.type === 'CLASSROOM')
  const options = []
  for (const day of state.settings.workingDays) for (const period of demoTeachingPeriods(state.settings)) for (const room of rooms) {
    const times = demoEntryTimes(state.settings, period.index, candidate.duration || 1)
    if (!times) continue
    const option = { ...candidate, dayOfWeek: day, periodIndex: period.index, periodIndices: Array.from({ length: candidate.duration || 1 }, (_, index) => period.index + index), roomId: room.id, ...times }
    if (entryRows(state).some(row => row.id !== excludeId && samePeriods(option, row) && (row.sectionId === option.sectionId || row.facultyId === option.facultyId || row.roomId === option.roomId))) continue
    options.push({ dayOfWeek: day, periodIndex: period.index, periodName: `P${period.index}`, startTime: times.startTime, endTime: times.endTime, roomId: room.id, roomName: room.name })
    if (options.length === 3) return options
  }
  return options
}

/* export */ function validateDemoSchedules(state, scope) {
  const sections = demoAcademicData.sections.filter(row => row.branchId === scope.branchId && row.semesterId === scope.semesterId)
  const errors = validateDemoSettings(state.settings), rows = sections.flatMap(section => state.schedules[section.id]?.entries || [])
  rows.forEach(row => {
    const validation = validateDemoEntry(state, row, row.id)
    errors.push(...validation.errors.map(message => `${sectionName(row.sectionId)} | ${message}`))
  })
  const selected = Object.entries(state.subjectConfig || {}).filter(([, value]) => value.selected)
  const unscheduled = state.unscheduled.filter(item => {
    if (!sections.some(section => section.id === item.sectionId) || !state.subjectConfig[item.subjectId]?.selected) return false
    const required = Number(state.subjectConfig[item.subjectId]?.periodsPerWeek || 0)
    const scheduled = (state.schedules[item.sectionId]?.entries || []).filter(row => row.subjectId === item.subjectId).reduce((sum, row) => sum + demoEntryPeriodIndices(row).length, 0)
    return scheduled < required
  })
  const missing = sections.flatMap(section => selected.filter(([subjectId]) => subjectFor(subjectId)?.branchId === scope.branchId && subjectFor(subjectId)?.semesterId === scope.semesterId).map(([subjectId, config]) => {
    const count = (state.schedules[section.id]?.entries || []).filter(row => row.subjectId === subjectId).reduce((sum, row) => sum + demoEntryPeriodIndices(row).length, 0)
    if (count < Number(config.periodsPerWeek)) return `${section.name} | ${subjectFor(subjectId).name}: ${count}/${config.periodsPerWeek} periods scheduled`
    if (count > Number(config.periodsPerWeek)) return `${section.name} | ${subjectFor(subjectId).name}: ${count}/${config.periodsPerWeek} periods scheduled (over requirement)`
    return ''
  }).filter(Boolean))
  errors.push(...unscheduled.map(item => `${sectionName(item.sectionId)} | ${subjectFor(item.subjectId)?.name || 'Subject'}: ${item.remaining} unscheduled. ${item.reason}`))
  errors.push(...missing)
  return { valid: errors.length === 0, errors: [...new Set(errors)], checks: ['Section availability', 'Faculty across all sections', 'Room across all sections', 'Working days', 'Break and lunch boundaries', 'Lab blocks', 'Weekly subject requirements'] }
}
// #endregion utils/timetableDemoValidator.js
return {
  get validateDemoSettings() { return validateDemoSettings; },
  get validateDemoEntry() { return validateDemoEntry; },
  get validateDemoSchedules() { return validateDemoSchedules; }
};
}

export function timetableDemoServiceModule() {
const { collegeStorageKey } = collegeScopeModule;
const { demoAcademicData } = timetableMockDataModule;
const { defaultDemoSettings } = timetableMockDataModule;
const { demoEntryTimes } = timetableDemoGeneratorModule;
const { generateDemoTimetables } = timetableDemoGeneratorModule;
const { validateDemoEntry } = timetableDemoValidatorModule;
const { validateDemoSchedules } = timetableDemoValidatorModule;
/* Imports for isolated regression tests:
import { collegeStorageKey } from '../utils/collegeScope.js'
import { demoAcademicData, defaultDemoSettings } from './timetableMockData.js'
import { demoEntryTimes, generateDemoTimetables } from '../utils/timetableDemoGenerator.js'
import { validateDemoEntry, validateDemoSchedules } from '../utils/timetableDemoValidator.js'
*/
// #region services/timetableDemoService.js
const STORAGE_KEY = 'pirnav_timetable_demo'
const clone = value => JSON.parse(JSON.stringify(value))
/* export */ const initialTimetableDemoState = () => ({
  settings: clone(defaultDemoSettings),
  subjectConfig: Object.fromEntries(demoAcademicData.subjects.map(subject => [subject.id, { selected: true, periodsPerWeek: subject.periodsPerWeek }])),
  allocations: clone(demoAcademicData.allocations),
  schedules: {},
  unscheduled: [],
})

/* export */ const timetableDemoService = {
  load() {
    if (typeof localStorage === 'undefined') return initialTimetableDemoState()
    const raw = localStorage.getItem(collegeStorageKey(STORAGE_KEY))
    if (!raw) return initialTimetableDemoState()
    try {
      const saved = JSON.parse(raw)
      const initial = initialTimetableDemoState()
      return {
        ...initial, ...saved,
        settings: { ...initial.settings, ...saved.settings },
        subjectConfig: { ...initial.subjectConfig, ...saved.subjectConfig },
        allocations: Array.isArray(saved.allocations) ? saved.allocations : initial.allocations,
        schedules: saved.schedules && typeof saved.schedules === 'object' ? saved.schedules : {},
        unscheduled: Array.isArray(saved.unscheduled) ? saved.unscheduled : [],
      }
    } catch {
      throw new Error('Demo data in browser storage is unreadable. Use More Actions → Reset Demo Data to restart.')
    }
  },
  save(state) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(collegeStorageKey(STORAGE_KEY), JSON.stringify(state))
    return state
  },
  reset() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(collegeStorageKey(STORAGE_KEY))
    return initialTimetableDemoState()
  },
  generateAll(state, scope) { return this.save(generateDemoTimetables(state, scope)) },
  generateMissing(state, scope, { persist = true } = {}) {
    const nextState = generateDemoTimetables(state, scope, { missingOnly: true })
    return persist ? this.save(nextState) : nextState
  },
  saveEntry(state, entry, { persist = true } = {}) {
    const validation = validateDemoEntry(state, entry, entry.id)
    if (!validation.valid) return { state, validation }
    const schedules = { ...state.schedules }, current = schedules[entry.sectionId] || { sectionId: entry.sectionId, entries: [], publicationStatus: 'DRAFT' }
    const saved = { ...entry, ...demoEntryTimes(state.settings, entry.periodIndex, entry.duration || 1), generated: false }
    schedules[entry.sectionId] = { ...current, publicationStatus: 'DRAFT', entries: entry.id ? current.entries.map(row => row.id === entry.id ? saved : row) : [...current.entries, saved] }
    const nextState = { ...state, schedules }
    return { state: persist ? this.save(nextState) : nextState, validation }
  },
  removeEntry(state, sectionId, entryId, { persist = true } = {}) {
    const schedules = { ...state.schedules }, current = schedules[sectionId]
    if (!current) return state
    schedules[sectionId] = { ...current, publicationStatus: 'DRAFT', entries: current.entries.filter(row => row.id !== entryId) }
    const nextState = { ...state, schedules }
    return persist ? this.save(nextState) : nextState
  },
  validate(state, scope) { return validateDemoSchedules(state, scope) },
  publish(state, scope) {
    const result = this.validate(state, scope)
    if (!result.valid) return { state, validation: result }
    const schedules = { ...state.schedules }
    demoAcademicData.sections.filter(section => section.branchId === scope.branchId && section.semesterId === scope.semesterId).forEach(section => {
      if (schedules[section.id]) schedules[section.id] = { ...schedules[section.id], publicationStatus: 'PUBLISHED' }
    })
    return { state: this.save({ ...state, schedules }), validation: result }
  },
  moveToDraft(state, scope) {
    const schedules = { ...state.schedules }
    demoAcademicData.sections.filter(section => section.branchId === scope.branchId && section.semesterId === scope.semesterId).forEach(section => {
      if (schedules[section.id]) schedules[section.id] = { ...schedules[section.id], publicationStatus: 'DRAFT' }
    })
    return this.save({ ...state, schedules })
  },
  setFacultyAllocation(state, sectionId, subjectId, facultyId) {
    const allocations = state.allocations.filter(row => !(row.sectionId === sectionId && row.subjectId === subjectId))
    if (facultyId) allocations.push({ sectionId, subjectId, facultyId })
    const schedules = { ...state.schedules }
    if (schedules[sectionId]) schedules[sectionId] = { ...schedules[sectionId], publicationStatus: 'DRAFT' }
    return this.save({ ...state, allocations, schedules })
  },
}
// #endregion services/timetableDemoService.js
return {
  get initialTimetableDemoState() { return initialTimetableDemoState; },
  get timetableDemoService() { return timetableDemoService; }
};
}
