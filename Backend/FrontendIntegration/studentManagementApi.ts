// Integration client for the supplied Student Admissions, Profiles and
// Promotions screens. This is a handoff file; the supplied frontend was not
// modified because those screens currently use localStorage/mock data.

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  correlationId?: string;
};

const token = () =>
  localStorage.getItem("btech-access-token") ??
  sessionStorage.getItem("btech-access-token") ??
  localStorage.getItem("accessToken") ??
  sessionStorage.getItem("accessToken") ??
  localStorage.getItem("token") ??
  sessionStorage.getItem("token");

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = token();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body.data;
}

async function apiMultipart<T>(path: string, formData: FormData): Promise<T> {
  const accessToken = token();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body.data;
}

export type Page<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
};

export const studentApi = {
  list: (query = "") => api<Page<Record<string, unknown>>>(`/api/v1/students${query}`),
  search: (query: string) => api<Page<Record<string, unknown>>>(
    `/api/v1/students/search?query=${encodeURIComponent(query)}`,
  ),
  detail: (studentId: number) => api<Record<string, unknown>>(`/api/v1/students/${studentId}`),
  create: (value: object) => api<Record<string, unknown>>("/api/v1/students", {
    method: "POST",
    body: JSON.stringify(value),
  }),
  update: (studentId: number, value: object) => api<Record<string, unknown>>(
    `/api/v1/students/${studentId}`,
    { method: "PUT", body: JSON.stringify(value) },
  ),
  updateStatus: (studentId: number, status: 0 | 1) => api<Record<string, unknown>>(
    `/api/v1/students/${studentId}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  ),
};

export const admissionApi = {
  list: (search = "", admissionStatus = "", pageNumber = 1, pageSize = 20) => {
    const query = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(admissionStatus ? { admissionStatus } : {}),
      pageNumber: String(pageNumber),
      pageSize: String(pageSize),
    });
    return api<Page<Record<string, unknown>>>(`/api/v1/student-admissions?${query}`);
  },
  detail: (admissionId: number) => api<Record<string, unknown>>(
    `/api/v1/student-admissions/${admissionId}`,
  ),
  create: (value: object) => api<Record<string, unknown>>("/api/v1/student-admissions", {
    method: "POST",
    body: JSON.stringify(value),
  }),
  update: (admissionId: number, value: object) => api<Record<string, unknown>>(
    `/api/v1/student-admissions/${admissionId}`,
    { method: "PUT", body: JSON.stringify(value) },
  ),
  // Sends every multi-step screen field losslessly in formData. The backend
  // also promotes queryable core values into normalized admission columns.
  createFromScreen: (formData: Record<string, any>) =>
    api<Record<string, unknown>>("/api/v1/student-admissions", {
      method: "POST",
      body: JSON.stringify(admissionScreenPayload(formData)),
    }),
  updateFromScreen: (admissionId: number, formData: Record<string, any>) =>
    api<Record<string, unknown>>(`/api/v1/student-admissions/${admissionId}`, {
      method: "PUT",
      body: JSON.stringify(admissionScreenPayload(formData)),
    }),
  submit: (admissionId: number) => api<Record<string, unknown>>(
    `/api/v1/student-admissions/${admissionId}/submit`,
    { method: "POST" },
  ),
  feeSummary: (admissionId: number) => api<Record<string, unknown>>(
    `/api/v1/student-admissions/${admissionId}/fee-summary`,
  ),
  updateFeeStructure: (admissionId: number, value: object) => api<Record<string, unknown>>(
    `/api/v1/student-admissions/${admissionId}/fee-structure`,
    { method: "PUT", body: JSON.stringify(value) },
  ),
  previousEducation: (admissionId: number) => api<Record<string, unknown>[]>(
    `/api/v1/student-admissions/${admissionId}/previous-education`,
  ),
  updatePreviousEducation: (admissionId: number, value: object) =>
    api<Record<string, unknown>[]>(
      `/api/v1/student-admissions/${admissionId}/previous-education`,
      { method: "PUT", body: JSON.stringify(value) },
    ),
};

function admissionScreenPayload(formData: Record<string, any>) {
  const personal = formData?.personal ?? {};
  const contact = formData?.contact ?? {};
  const application = formData?.application ?? {};
  const currentAddress = contact?.currentAddress ?? {};
  const father = formData?.parents?.father ?? {};
  const mother = formData?.parents?.mother ?? {};
  const guardian = formData?.parents?.guardian ?? {};
  const academic = formData?.academic ?? {};
  const tenth = formData?.previousEducation?.tenth ?? {};
  const fees = formData?.fees ?? {};
  return {
    formData,
    registrationNo: application.registrationNumber ?? application.number ?? null,
    registrationDate: application.date || null,
    admissionNo: application.admissionNumber || null,
    admissionDate: application.admissionDate || null,
    firstName: personal.firstName ?? "",
    lastName: [personal.middleName, personal.lastName].filter(Boolean).join(" "),
    gender: personal.gender ?? "",
    dateOfBirth: personal.dob || null,
    studentPhoto: personal.photo || null,
    bloodGroup: personal.bloodGroup || null,
    nationality: personal.nationality || null,
    aadhaarNumber: personal.aadhaar || null,
    mobileNumber: contact.mobile || null,
    studentEmail: contact.email || null,
    email: contact.alternateEmail || null,
    address: [currentAddress.line1, currentAddress.line2, currentAddress.town]
      .filter(Boolean).join(", ") || null,
    city: currentAddress.city || null,
    district: currentAddress.district || null,
    state: currentAddress.state || null,
    pincode: currentAddress.pincode || null,
    fatherName: father.name || null,
    occupation: father.occupation || null,
    annualIncome: father.income === "" ? null : Number(father.income),
    motherName: mother.name || null,
    motherEmail: mother.email || null,
    guardianName: guardian.name || null,
    guardianMobile: guardian.mobile || formData?.parents?.emergencyMobile || null,
    admissionType: academic.admissionType || academic.entryType || null,
    admissionQuota: academic.quota === "Other" ? academic.quotaOther : academic.quota || null,
    previousSchool: tenth.institution || null,
    previousBoard: tenth.board || null,
    previousYear: tenth.passingYear || null,
    previousPercentage: tenth.score === "" ? null : Number(tenth.score),
    previousHallTicket: tenth.rollNumber || null,
    scholarshipStatus: formData?.admission?.scholarship || null,
    admissionFeeAmount: Number(fees.admissionFee || 0),
    status: "Active",
    isActive: true,
  };
}

export const studentDocumentApi = {
  upload: (studentId: number, documentType: string, file: File) => {
    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("file", file);
    return apiMultipart<Record<string, unknown>>(
      `/api/v1/students/${studentId}/documents`,
      formData,
    );
  },
  detail: (studentId: number, documentId: number) => api<Record<string, unknown>>(
    `/api/v1/students/${studentId}/documents/${documentId}`,
  ),
  downloadUrl: (studentId: number, documentId: number) =>
    `${API_BASE_URL}/api/v1/students/${studentId}/documents/${documentId}/download`,
  remove: (studentId: number, documentId: number) => api<void>(
    `/api/v1/students/${studentId}/documents/${documentId}`,
    { method: "DELETE" },
  ),
};

export const studentProfileApi = {
  list: (query = "") => api<Record<string, unknown>[]>(`/api/v1/student-profiles${query}`),
  preview: (studentId: number) => api<Record<string, unknown>>(
    `/api/v1/student-profiles/${studentId}/preview`,
  ),
  personalInformation: (studentId: number) => api<Record<string, unknown>>(
    `/api/v1/students/${studentId}/profile/personal-information`,
  ),
  updatePersonalInformation: (studentId: number, value: object) => api<Record<string, unknown>>(
    `/api/v1/students/${studentId}/profile/personal-information`,
    { method: "PATCH", body: JSON.stringify(value) },
  ),
  updateProfileScreen: (studentId: number, value: object) => api<Record<string, unknown>>(
    `/api/v1/student-profiles/${studentId}`,
    { method: "PATCH", body: JSON.stringify(value) },
  ),
  examResults: (studentId: number) => api<Record<string, unknown>>(
    `/api/v1/students/${studentId}/profile/exam-results`,
  ),
};

export const promotionApi = {
  dashboard: (query = "") => api<Record<string, number>>(
    `/api/v1/promotions/dashboard${query}`,
  ),
  directory: (query = "") => api<Page<Record<string, unknown>>>(
    `/api/v1/promotions/directory${query}`,
  ),
  historyDirectory: (query = "") => api<Page<Record<string, unknown>>>(
    `/api/v1/promotions/history${query}`,
  ),
  eligible: (branchId: number, academicYearId: number, semesterNumber: number) => {
    const query = new URLSearchParams({
      branchId: String(branchId),
      academicYearId: String(academicYearId),
      semesterNumber: String(semesterNumber),
    });
    return api<Record<string, unknown>[]>(`/api/v1/promotions/eligible-students?${query}`);
  },
  promote: (studentId: number) => api<Record<string, unknown>>("/api/v1/promotions/promote", {
    method: "POST",
    body: JSON.stringify({ studentId }),
  }),
  promoteBulk: (studentIds: number[]) => api<Record<string, unknown>[]>(
    "/api/v1/promotions/promote-bulk",
    { method: "POST", body: JSON.stringify({ studentIds }) },
  ),
  history: (studentId: number) => api<Record<string, unknown>[]>(
    `/api/v1/promotions/student/${studentId}/history`,
  ),
};
