COLLEGE STORED PROCEDURE SETUP

1. Open MySQL Workbench and connect to the database server.
2. Open CollegeStoredProcedures.sql from this folder.
3. Confirm that the database name in the first line is correct (default: cms_btech).
4. Execute the complete SQL script.
5. Start the ASP.NET Core API and test the College endpoints in Swagger.

Stored procedures used by CollegeRepository:
- sp_College_GetAll
- sp_College_Search
- sp_College_GetById
- sp_College_GetByCode
- sp_College_Create
- sp_College_Update
- sp_College_CodeExists

The six Swagger College APIs now use these procedures. Update status reuses
sp_College_GetById and sp_College_Update so the existing API contract remains unchanged.
