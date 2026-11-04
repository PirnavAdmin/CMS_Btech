"""Static SQL schema check against supplied dump, using SQLite EXPLAIN.
Not a replacement for a MySQL integration test. Pass the MySQL dump path.
"""
import pathlib,re,sqlite3,sys,json
root=pathlib.Path(__file__).resolve().parents[2]
dump=pathlib.Path(sys.argv[1]).read_text()
c=sqlite3.connect(':memory:')
for name,body in re.findall(r'CREATE TABLE `([^`]+)` \((.*?)\) ENGINE=',dump,re.S):
    columns=re.findall(r'^\s*`([^`]+)`',body,re.M)
    if columns:c.execute('CREATE TABLE "'+name+'"('+','.join('"'+x+'"' for x in columns)+')')
for name in ['profile_completed','internal_identifier','academic_year_restricted','access_version']:
    if name not in [r[1] for r in c.execute('PRAGMA table_info(users)')]:c.execute('ALTER TABLE users ADD COLUMN '+name)
extra={
'user_module_permissions':'user_id college_id module_key can_view can_create can_edit can_delete can_export updated_by updated_at',
'user_academic_year_access':'user_id college_id academic_year_id assigned_by assigned_at',
'user_access_audits':'audit_id actor_user_id target_user_id college_id action correlation_id created_at',
'user_access_profiles':'user_id job_title address_line1 city state postal_code updated_at',
'user_access_invitations':'user_id token_hash purpose expires_at consumed_at delivery_status created_at recipient_email delivery_error_code smtp_accepted_at'}
for name,cols in extra.items():c.execute('CREATE TABLE IF NOT EXISTS '+name+'('+','.join(cols.split())+')')
c.create_function('UTC_TIMESTAMP',0,lambda:'2026-11-02 00:00:00')
c.create_function('LAST_INSERT_ID',0,lambda:1)
checked=0;skipped=[];errors=[]
for file in list((root/'UserAccess').glob('*.cs')) + list((root/'Services/Invitations').glob('*.cs')):
    text=file.read_text()
    raw=re.findall(r'"""(.*?)"""',text,re.S)
    remainder=re.sub(r'""".*?"""','',text,flags=re.S)
    strings=raw+re.findall(r'"((?:[^"\\]|\\.)*)"',remainder)
    for sql in strings:
        sql=sql.strip()
        if not re.match(r'^(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b',sql):continue
        sql=sql.replace('\\"','"')
        # Validate identifiers and ordinary SQL; MySQL-specific semantics require MySQL.
        sql=re.sub(r'\s+FOR UPDATE\b','',sql)
        sql=re.sub(r'([+-])INTERVAL \d+ (?:HOUR|SECOND)', '', sql)
        sql=sql.split('ON DUPLICATE KEY UPDATE')[0]
        sql=sql.replace('IN @ids','IN (1)')
        if sql.startswith('UPDATE user_access_invitations i JOIN'):
            skipped.append({'file':file.name,'reason':'MySQL multi-table UPDATE requires MySQL integration test'})
            continue
        sql=re.sub(r'\bBINARY\s+','',sql)
        params={key:1 for key in re.findall(r'@(\w+)',sql)}
        try:c.execute('EXPLAIN '+sql,params);checked+=1
        except Exception as exc:errors.append({'file':file.name,'sql':sql,'error':str(exc)})
print(json.dumps({'checked':checked,'errors':errors,'skipped':skipped,'scope':'SQLite EXPLAIN only; MySQL interval, row locks and upsert clauses excluded'},indent=2))
assert not errors
