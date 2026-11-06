# Module, icon and permission registry

Stage 1 records existing labels and URLs. Academic Levels is excluded because no standalone route exists. Role portal modules do not imply a blanket backend permission. Null permissions never authorize access; the registry does not implement authorization.

| ID | Current label | Existing path | Section | Lucide icon ID | Existing permission key | App role eligibility | Scope |
|---|---|---|---|---|---|---|---|
| dashboard | Overview | /dashboard | dashboard | layout-dashboard | dashboard | admin, faculty, student, staff | platform-and-college |
| colleges | Colleges | /college-institution-management | collegeSetup | landmark | colleges | admin | platform |
| academic_years | Academic Years | /academic-year-management | collegeSetup | calendar-range | academic_years | admin | college |
| departments | Departments | /department-management | collegeSetup | network | departments | admin | college |
| courses | Courses | /courses | collegeSetup | book-open | courses | admin | college |
| branches | Branches | /branches | collegeSetup | git-branch | branches | admin | college |
| semesters | Semesters | /semester-management | collegeSetup | layers-3 | semesters | admin | college |
| sections | Sections | /section-management | collegeSetup | users-round | sections | admin | college |
| rooms | Rooms & Classrooms | /rooms-management | collegeSetup | door-open | rooms | admin | college |
| fee_structures | Fee Structure | /fees/structures | finance | wallet-cards | fees | admin | college |
| fee_management | Fee Management | /fees/overview | finance | receipt-indian-rupee | fees | admin | college |
| faculty_directory | Faculty Directory | /faculty | faculty | briefcase-business | faculty_directory | admin | college |
| faculty_attendance | Faculty Attendance | /faculty/attendance | faculty | clipboard-check | faculty_attendance | admin | college |
| faculty_leaves | Leave Management | /faculty/leave-management | faculty | calendar-clock | faculty_leaves | admin | college |
| faculty_payroll | Faculty Payroll | /faculty/payroll | faculty | banknote | faculty_payroll | admin | college |
| student_admissions | Student Admissions | /student-management/admissions | students | user-round-plus | student_admissions | admin | college |
| student_profiles | Student Profiles | /student-management/profiles | students | contact-round | student_profiles | admin | college |
| student_attendance | Student Attendance | /student-management/attendance | students | list-checks | student_attendance | admin | college |
| student_promotions | Student Promotions | /student-management/promotions | students | trending-up | student_promotions | admin | college |
| subjects | Subject Management | /subject-management | curriculum | notebook-tabs | subjects | admin | college |
| credits | Credits Management | /credits-management | curriculum | award | credits | admin | college |
| electives | Elective Management | /elective-management | curriculum | list-todo | electives | admin | college |
| timetable | Timetable Management | /timetable | curriculum | calendar-days | timetable | admin | college |
| examinations | Exam Management | /examination-setup | examinations | file-pen-line | examinations | admin | college |
| marks | Marks Management | /marks-management/marks-entry | examinations | chart-no-axes-column | marks | admin | college |
| results | Grades System and Results | /grade-result-management | examinations | medal | results | admin | college |
| library | Library | /library | campus | library-big | library | admin | college |
| meetings_events | Meetings / Events | /meetings-events | campus | calendar-check | meetings_events | admin | college |
| placement | Placement | /placement | campus | building-2 | placement | admin | college |
| user_access | User Access Management | /user-access | access | shield-check | roles_permissions | admin | platform-and-college |
| roles_permissions | Roles & Designations | /roles-designations | access | key-round | roles_permissions | admin | platform-and-college |
| my_profile | My Profile | /my-profile | account | user-round | my_profile | admin | assigned-college |
| academic_settings | Settings | /settings | account | settings | academic_settings | admin | college |
| my_subjects | My Subjects | /my-subjects | account | book-marked | Unmapped; existing guard only | faculty, student | assigned-college |
| faculty_portal | Faculty Portal | /faculty-portal | workspaces | presentation | Unmapped; existing guard only | faculty | assigned-college |
| student_portal | Student Portal | /student-portal | workspaces | graduation-cap | Unmapped; existing guard only | student | assigned-college |
| staff_portal | Staff Portal | /staff-portal | workspaces | id-card | Unmapped; existing guard only | staff | assigned-college |
| authentication | Authentication | /login | system | log-in | Unmapped; existing guard only | Public / special-purpose route | public |
| landing | Landing Page | / | system | house | Unmapped; existing guard only | Public / special-purpose route | public |
| unauthorized | Unauthorized | /unauthorized | system | shield-alert | Unmapped; existing guard only | Public / special-purpose route | public |
| portal_preview | Portal Preview | /portal-preview | system | scan-eye | Unmapped; existing guard only | Public / special-purpose route | public |
