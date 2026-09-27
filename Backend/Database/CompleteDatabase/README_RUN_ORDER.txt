COMPLETE DATABASE RUN ORDER
===========================

Existing database:
1. Back up cms_btech.
2. Do not import the base dump again.
3. Run ../IntegrationUpdates/CMS_BTECH_INTEGRATION_UPDATE_20260903.sql.

Fresh database:
1. Run CMS_BTECH_COMPLETE_UPDATED.sql.

The complete file creates/selects cms_btech, imports the supplied database
snapshot, and applies every current integration update in one execution.

Elective Management setup (both fresh and existing databases):
After the base database import/update, select cms_btech and run these scripts
from the Backend folder in MySQL Workbench, in order:
1. Database/Elective_Group_CRUD_Migration_20260927.sql
2. Database/Sql/Stored Procedures/Electives/sp_elective_group_create.sql
3. Database/Sql/Stored Procedures/Electives/sp_elective_group_update.sql
4. Database/Sql/Stored Procedures/Electives/sp_elective_group_list.sql
5. Database/Sql/Stored Procedures/Electives/sp_elective_group_delete.sql
6. Database/Subject_Elective_Type_Migration_20260927.sql

The migration is a one-time schema change and is not run by dotnet run. It adds
elective_type and credits columns (and the selection date columns) to
elective_groups. The final script adds elective_type to subjects for Subject
Management. Both migrations are one-time schema changes and are not run by
dotnet run. Existing rows remain NULL until values are entered and saved.
