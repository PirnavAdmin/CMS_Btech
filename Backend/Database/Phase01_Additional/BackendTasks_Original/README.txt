BACKEND TASK DATABASE SETUP
========================

1. Select the same MySQL schema used by appsettings.json.
2. Run the files in this order:

   01_Users_And_ForgotPassword.sql
   02_College_CRUD.sql
   03_Single_Active_AcademicYear.sql
   05_Course_CRUD.sql
   04_Branch.sql

Course runs before Branch because Branch has foreign-key links to Course and
Department. The numbering follows Backend's task list; the run order follows the
database dependency order.

These files do not drop tables or truncate data. CREATE TABLE IF NOT EXISTS is
used for existing modules. Stored procedures owned by these Backend tasks are
recreated so their parameter names match the backend repositories exactly.

Do not run the older Database/Branch_CourseStructure_SP.sql for Backend's Branch
APIs. Its legacy procedure names (sp_create_branch/sp_get_branches) do not
match the current BranchRepository names (sp_branch_create/sp_branch_get_all).

After all five files finish, use the SHOW PROCEDURE STATUS and verification
queries included at the bottom of each file.
