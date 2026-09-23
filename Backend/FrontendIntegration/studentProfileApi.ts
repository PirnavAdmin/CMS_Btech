// Drop this file into the frontend API/services folder.
// Set VITE_API_BASE_URL to the backend base URL (for example https://localhost:7174).

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface StudentPersonalInformation {
  studentId: number;
  studentCode: string;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  email: string | null;
  mobile: string | null;
  profilePhoto: string | null;
  alternateEmail: string | null;
  alternateMobile: string | null;
  bloodGroup: string | null;
  nationality: string | null;
  religion: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  profileStatus: string;
  isProfileCompleted: boolean;
  isVerified: boolean;
  profileCompletionPercentage: number;
  collegeId: number;
  courseId: number | null;
  courseName: string | null;
  branchId: number | null;
  branchName: string | null;
  academicYearId: number;
  academicYearName: string | null;
  updatedAt: string | null;
}

export type StudentPersonalInformationUpdate = Partial<
  Pick<
    StudentPersonalInformation,
    | "fullName"
    | "gender"
    | "dateOfBirth"
    | "email"
    | "mobile"
    | "profilePhoto"
    | "alternateEmail"
    | "alternateMobile"
    | "bloodGroup"
    | "nationality"
    | "religion"
    | "category"
    | "address"
    | "city"
    | "district"
    | "state"
    | "country"
    | "pincode"
  >
> & { changeReason?: string };

export interface StudentExamSubjectResult {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  maximumMarks: number | null;
  obtainedMarks: number | null;
  grade: string | null;
  status: string | null;
}

export interface StudentExamResult {
  resultId: number;
  examinationId: number;
  examinationName: string;
  semesterId: number | null;
  semesterName: string | null;
  publishedAt: string | null;
  totalMarks: number | null;
  obtainedMarks: number | null;
  percentage: number | null;
  grade: string | null;
  resultStatus: string | null;
  subjects: StudentExamSubjectResult[];
}

export interface StudentExamResultsPayload {
  studentId: number;
  isModuleAvailable: boolean;
  integrationStatus: string;
  contractVersion: string;
  results: StudentExamResult[];
}

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem("btech-access-token") ??
    sessionStorage.getItem("btech-access-token") ??
    localStorage.getItem("accessToken") ??
    sessionStorage.getItem("accessToken") ??
    localStorage.getItem("token") ??
    sessionStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.message ?? `Request failed with status ${response.status}`);
  }
  return body as T;
}

export async function getStudentPersonalInformation(
  studentId: number,
): Promise<StudentPersonalInformation> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/students/${studentId}/profile/personal-information`,
    { headers: authHeaders() },
  );
  return (await readJson<ApiResponse<StudentPersonalInformation>>(response)).data;
}

export async function updateStudentPersonalInformation(
  studentId: number,
  update: StudentPersonalInformationUpdate,
): Promise<StudentPersonalInformation> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/students/${studentId}/profile/personal-information`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(update),
    },
  );
  return (await readJson<ApiResponse<StudentPersonalInformation>>(response)).data;
}

export async function getStudentExamResults(
  studentId: number,
): Promise<StudentExamResultsPayload> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/students/${studentId}/profile/exam-results`,
    { headers: authHeaders() },
  );
  return (await readJson<ApiResponse<StudentExamResultsPayload>>(response)).data;
}
