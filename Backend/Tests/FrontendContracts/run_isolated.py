"""Seed a fresh disposable dump clone and run the HTTP contract assertions.

Start a separate R15 backend bound to the same disposable database first.
CMS_TEST_JWT_KEY, CMS_TEST_JWT_ISSUER and CMS_TEST_JWT_AUDIENCE must match that
test instance. MySQL credentials use MYSQL_PWD, never a command-line password.
"""
from pathlib import Path
import argparse,base64,hashlib,hmac,json,os,re,subprocess,sys,tempfile,time,urllib.request,uuid

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base-url',required=True);p.add_argument('--database',required=True)
p.add_argument('--mysql-client',default='mysql');p.add_argument('--mysql-host',default='127.0.0.1')
p.add_argument('--mysql-port',type=int,default=3306);p.add_argument('--mysql-user',default='root')
p.add_argument('--output',default='frontend-contract-regression.json');p.add_argument('--confirm-disposable',action='store_true')
a=p.parse_args()
if not a.confirm_disposable or not re.fullmatch(r'[A-Za-z0-9_]+_faculty_test',a.database):
    p.error('Use a fresh database ending _faculty_test and pass --confirm-disposable.')
key=os.environ.get('CMS_TEST_JWT_KEY','')
if len(key.encode())<32:p.error('Set CMS_TEST_JWT_KEY to the separate test backend key (32+ bytes).')
issuer=os.environ.get('CMS_TEST_JWT_ISSUER','cms-audit');audience=os.environ.get('CMS_TEST_JWT_AUDIENCE','cms-audit')
client=[a.mysql_client,'--protocol=TCP','-h'+a.mysql_host,'-P'+str(a.mysql_port),'-u'+a.mysql_user,'--batch','--raw','--skip-column-names',a.database]
def sql(query):
    result=subprocess.run(client,input=query,text=True,capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()
if sql('SELECT DATABASE()')!=a.database:raise RuntimeError('Unexpected MySQL schema.')
if int(sql("SELECT COUNT(*) FROM users WHERE employee_user_id LIKE 'R15AUDIT%'")):
    raise RuntimeError('R15 test accounts already exist. Use a fresh dump clone; no records were removed.')
tag='QA'+uuid.uuid4().hex[:8]
def college(suffix):
    return int(sql(f"INSERT INTO colleges(college_code,college_name,status) VALUES('{tag+suffix}','Frontend contract QA {suffix}',1);SELECT LAST_INSERT_ID();"))
own=college('A');other=college('B');users={}
hash_value=(Path(__file__).parent/'test-password-hash.txt').read_text().strip()
def jwt(uid,role):
    enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=')
    message=enc({'alg':'HS256','typ':'JWT'})+b'.'+enc({'sub':str(uid),'role':role,'collegeId':str(own),'accessVersion':'0','iss':issuer,'aud':audience,'exp':int(time.time())+7200})
    return (message+b'.'+base64.urlsafe_b64encode(hmac.new(key.encode(),message,hashlib.sha256).digest()).rstrip(b'=')).decode()
for index,role in enumerate(['SUPER_ADMIN','COLLEGE_ADMIN','FACULTY','STUDENT']):
    uid=int(sql(f"INSERT INTO users(college_id,employee_user_id,full_name,email,mobile,password_hash,status,profile_completed) VALUES({own},'R15AUDIT{index}','Audit User','r15audit{index}@example.invalid','987650000{index}','{hash_value}',1,1);SELECT LAST_INSERT_ID();"))
    sql(f"INSERT INTO user_roles(user_id,role_id,status) SELECT {uid},role_id,1 FROM roles WHERE role_code='{role}' AND status=1 AND college_id IS NULL LIMIT 1;INSERT INTO employee_profiles(user_id,house_number,status) VALUES({uid},'1-1',1);")
    users[role]={'userId':uid,'token':jwt(uid,role)}
sql(f"INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export) SELECT r.role_id,{own},pm.module_key,1,1,1,1,1 FROM roles r CROSS JOIN permission_modules pm WHERE r.role_code='COLLEGE_ADMIN' AND r.status=1 AND r.college_id IS NULL ON DUPLICATE KEY UPDATE can_view=1,can_create=1,can_edit=1,can_delete=1,can_export=1;")
# Verify the HTTP instance sees this random fixture before sending any HTTP mutation.
request=urllib.request.Request(a.base_url.rstrip('/')+f'/api/v1/colleges/{own}',headers={'Authorization':'Bearer '+users['SUPER_ADMIN']['token']})
with urllib.request.urlopen(request,timeout=20) as response:row=json.load(response)
row=row.get('data',row)
if (row.get('collegeCode') or row.get('code') or row.get('college_code'))!=tag+'A':
    raise RuntimeError('The HTTP backend is not connected to the seeded disposable schema. No HTTP mutations were sent.')
fixture={'base':a.base_url.rstrip('/'),'database':a.database,'college':own,'otherCollege':other,'users':users}
fd,name=tempfile.mkstemp(prefix='cms-test-fixture-',suffix='.json')
try:
    with os.fdopen(fd,'w') as out:json.dump(fixture,out)
    subprocess.run([sys.executable,str(Path(__file__).parent/'run_regression.py'),'--fixture',name,'--mysql-client',a.mysql_client,
        '--mysql-host',a.mysql_host,'--mysql-port',str(a.mysql_port),'--mysql-user',a.mysql_user,'--output',a.output],check=True)
finally:Path(name).unlink(missing_ok=True)
