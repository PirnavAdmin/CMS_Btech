-- Read-only: run using the actual API connection/schema.
SELECT DATABASE() AS database_name,@@hostname AS server_name,@@port AS server_port;
SELECT required.table_name,required.column_name AS missing_column FROM (
SELECT 'users' AS table_name,'user_id' AS column_name
UNION ALL
SELECT 'users' AS table_name,'profile_completed' AS column_name
UNION ALL
SELECT 'users' AS table_name,'internal_identifier' AS column_name
UNION ALL
SELECT 'users' AS table_name,'academic_year_restricted' AS column_name
UNION ALL
SELECT 'users' AS table_name,'access_version' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'user_id' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'college_id' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'module_key' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'can_view' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'can_create' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'can_edit' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'can_delete' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'can_export' AS column_name
UNION ALL
SELECT 'user_module_permissions' AS table_name,'updated_by' AS column_name
UNION ALL
SELECT 'user_academic_year_access' AS table_name,'user_id' AS column_name
UNION ALL
SELECT 'user_academic_year_access' AS table_name,'college_id' AS column_name
UNION ALL
SELECT 'user_academic_year_access' AS table_name,'academic_year_id' AS column_name
UNION ALL
SELECT 'user_academic_year_access' AS table_name,'assigned_by' AS column_name
UNION ALL
SELECT 'user_access_audits' AS table_name,'audit_id' AS column_name
UNION ALL
SELECT 'user_access_audits' AS table_name,'actor_user_id' AS column_name
UNION ALL
SELECT 'user_access_audits' AS table_name,'target_user_id' AS column_name
UNION ALL
SELECT 'user_access_audits' AS table_name,'college_id' AS column_name
UNION ALL
SELECT 'user_access_audits' AS table_name,'action' AS column_name
UNION ALL
SELECT 'user_access_audits' AS table_name,'correlation_id' AS column_name
UNION ALL
SELECT 'user_access_audits' AS table_name,'created_at' AS column_name
UNION ALL
SELECT 'user_access_profiles' AS table_name,'user_id' AS column_name
UNION ALL
SELECT 'user_access_profiles' AS table_name,'job_title' AS column_name
UNION ALL
SELECT 'user_access_profiles' AS table_name,'city' AS column_name
UNION ALL
SELECT 'user_access_profiles' AS table_name,'state' AS column_name
UNION ALL
SELECT 'user_access_profiles' AS table_name,'postal_code' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'user_id' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'token_hash' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'purpose' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'expires_at' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'consumed_at' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'delivery_status' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'created_at' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'recipient_email' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'delivery_error_code' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'smtp_accepted_at' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'attempt_count' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'last_attempt_at' AS column_name
UNION ALL
SELECT 'user_access_invitations' AS table_name,'correlation_id' AS column_name
) required LEFT JOIN information_schema.COLUMNS actual
 ON actual.TABLE_SCHEMA=DATABASE() AND actual.TABLE_NAME=required.table_name AND actual.COLUMN_NAME=required.column_name
 WHERE actual.COLUMN_NAME IS NULL;
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','user_access_invitations') ORDER BY TABLE_NAME,ORDINAL_POSITION;
SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'user_%' GROUP BY TABLE_NAME,INDEX_NAME,NON_UNIQUE;
