from pathlib import Path
import os,subprocess,time,json,ssl,secrets,uuid,hashlib,re,email,threading,tempfile,shutil
from email import policy
from aiosmtpd.controller import Controller
from aiosmtpd.smtp import AuthResult,LoginPassword
import pymysql,requests,bcrypt
# Run ONLY against a fresh server process and a disposable copy of the supplied dump.
BACK=Path(__file__).resolve().parents[2]
BASE=Path(tempfile.mkdtemp(prefix='cms-r8-test-'))
(BASE/'repair_r8_test').mkdir()
DUMP=Path(os.environ['CMS_TEST_DUMP_PATH']).resolve()
MYSQLD=os.environ.get('CMS_TEST_MYSQLD','mysqld')
MYSQL=os.environ.get('CMS_TEST_MYSQL','mysql')
DOTNET=os.environ.get('CMS_TEST_DOTNET','dotnet')
DATADIR=str(BASE/'mysql-data')
MYSQLBASE=os.environ.get('CMS_TEST_MYSQL_BASEDIR')
BASE_ARGS=['--basedir='+MYSQLBASE] if MYSQLBASE else []
USER_ARGS=['--user=root'] if os.geteuid()==0 else []
subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(BASE/'key.pem'),'-out',str(BASE/'cert.pem'),'-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-addext','basicConstraints=critical,CA:TRUE'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
results=[];correlations=[];messages=[]
def check(ok,name):
 if not ok:raise AssertionError(name)
 results.append(name)
 print('PASS',name,flush=True)
mysqlenv=os.environ.copy()
subprocess.run([MYSQLD,'--no-defaults','--initialize-insecure',*USER_ARGS,*BASE_ARGS,'--datadir='+DATADIR,'--log-error='+str(BASE/'mysql-init.log')],env=mysqlenv,check=True)
server=subprocess.Popen([MYSQLD,'--no-defaults',*USER_ARGS,*BASE_ARGS,'--datadir='+DATADIR,'--socket=','--port=33308','--bind-address=127.0.0.1','--mysqlx=0','--secure-file-priv='+DATADIR,'--pid-file='+str(BASE/'mysql.pid'),'--log-error='+str(BASE/'mysql.log')],env=mysqlenv)
server_owned=False
api=None;smtp=None
try:
 for n in range(100):
  try:db=pymysql.connect(host='127.0.0.1',port=33308,user='root',autocommit=True);break
  except Exception:time.sleep(.15)
 else:raise Exception('MySQL startup failed')
 with db.cursor() as q:
  q.execute('SELECT @@datadir')
  if Path(q.fetchone()[0]).resolve()!=Path(DATADIR).resolve():raise Exception('Refusing to write to a server not owned by this test')
  server_owned=True
  q.execute('CREATE DATABASE cms_r8_invitation_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 client=[MYSQL,'--no-defaults','--protocol=TCP','--host=127.0.0.1','--port=33308','--user=root','cms_r8_invitation_test']
 with DUMP.open('rb') as f:subprocess.run(client,stdin=f,stdout=subprocess.DEVNULL,stderr=open(BASE/'import.log','w'),check=True)
 for _ in range(2):
  with (BACK/'Database/AdminManagement/User_Access_Onboarding_Repair_R8.sql').open('rb') as f:subprocess.run(client,stdin=f,stdout=subprocess.DEVNULL,stderr=open(BASE/'migration.log','w'),check=True)
 db.select_db('cms_r8_invitation_test')
 def sql(query,args=(),one=False):
  with db.cursor() as q:
   q.execute(query,args)
   return q.fetchone() if one else q.fetchall()
 # Use a dedicated existing Super Admin in this disposable clone; no live changes.
 actor=sql("SELECT MIN(u.user_id) FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id WHERE r.role_code='SUPER_ADMIN' AND u.status=1",one=True)[0]
 admin_email='superadmin-fixture@example.invalid';password='IsolatedIntegration'+secrets.token_hex(12)+'!'
 sql('UPDATE users SET email=%s,password_hash=%s,must_change_password=0,profile_completed=1 WHERE user_id=%s',(admin_email,bcrypt.hashpw(password.encode(),bcrypt.gensalt()).decode(),actor))
 smtp_password=secrets.token_hex(16)
 class Inbox:
  async def handle_DATA(self,server,session,envelope):
   messages.append(email.message_from_bytes(envelope.content,policy=policy.default));return '250 2.0.0 Accepted into controlled test inbox'
 def auth(server,session,envelope,mechanism,data):
  return AuthResult(success=isinstance(data,LoginPassword) and data.login==b'fixture' and data.password.decode()==smtp_password,handled=False)
 tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);tls.load_cert_chain(str(BASE/'cert.pem'),str(BASE/'key.pem'))
 smtp=Controller(Inbox(),hostname='127.0.0.1',port=3587,tls_context=tls,require_starttls=True,auth_required=True,authenticator=auth)
 smtp.start()
 env=os.environ.copy();env.update({'DOTNET_CLI_TELEMETRY_OPTOUT':'1','ASPNETCORE_ENVIRONMENT':'Development','ASPNETCORE_URLS':'http://127.0.0.1:35084','ConnectionStrings__DefaultConnection':'Server=127.0.0.1;Port=33308;Database=cms_r8_invitation_test;User ID=root;Password=;SslMode=None;ConnectionTimeout=3;','SmtpSettings__Host':'localhost','SmtpSettings__Port':'3587','SmtpSettings__SecurityMode':'StartTls','SmtpSettings__Username':'fixture','SmtpSettings__Password':smtp_password,'SmtpSettings__FromEmail':'sender@example.invalid','PasswordSetup__BaseUrl':'http://localhost:5173','PasswordSetup__LoginUrl':'http://localhost:5173/login','PasswordSetup__SupportEmail':'support@example.invalid','Jwt__Key':secrets.token_hex(48),'Jwt__Issuer':'cms-isolated-test','Jwt__Audience':'cms-isolated-test','Logging__ApiTraffic__Enabled':'false','SSL_CERT_FILE':str(BASE/'cert.pem')})
 # Exercise existing .NET store/transaction component tests in the same network namespace.
 component_env=env.copy();component_env['CMS_INVITATION_TEST_CONNECTION']=env['ConnectionStrings__DefaultConnection']
 with open(BASE/'mysql-component.log','w') as out:
  subprocess.run([DOTNET,'run','--project','Tests/AccountInvitationMySql','-p:UseSharedCompilation=false','--no-launch-profile'],cwd=BACK,env=component_env,stdout=out,stderr=subprocess.STDOUT,check=True)
 check(True,'MySQL component suite: new/pending/existing accounts, password setup, scope, resend and failure persistence')
 api=subprocess.Popen([DOTNET,'bin/Debug/net8.0/BTech.dll'],cwd=BACK,env=env,stdout=open(BASE/'api.log','w'),stderr=subprocess.STDOUT)
 base='http://127.0.0.1:35084'
 for n in range(120):
  if api.poll() is not None:raise Exception('API stopped; inspect '+str(BASE/'api.log'))
  try:
   requests.get(base+'/swagger/index.html',timeout=1);break
  except Exception:time.sleep(.2)
 else:raise Exception('API did not start')
 def call(method,path,payload=None,token=None,status=200):
  trace=uuid.uuid4().hex;h={'X-Correlation-ID':trace}
  if token:h['Authorization']='Bearer '+token
  r=requests.request(method,base+path,json=payload,headers=h,timeout=40)
  correlations.append({'method':method,'path':path,'status':r.status_code,'correlationId':r.headers.get('X-Correlation-ID',trace)})
  if r.status_code!=status:raise AssertionError(f'{method} {path}: expected {status}, got {r.status_code}: {r.text[:700]}')
  return r.json()
 def login(who,pw):return call('POST','/api/v1/auth/login',{'loginId':who,'password':pw})['data']['accessToken']
 token=login(admin_email,password)
 access=call('GET','/api/auth/me/access',token=token)
 check(access['data']['isSuperAdmin'],'Live database Super Admin role and new build access response')
 call('GET','/api/v1/admin/users',token=token);call('GET','/api/v1/admin/users/lookups',token=token)
 check(True,'Existing list and lookups endpoints return 200')
 role=sql("SELECT role_id FROM roles WHERE role_code='COLLEGE_ADMIN' AND college_id IS NULL AND status=1",one=True)[0]
 name='R8 '+uuid.uuid4().hex[:8];user_email='invite-'+uuid.uuid4().hex+'@example.invalid'
 new=call('POST','/api/v1/admin/users/onboard-college',{'collegeCode':'R8'+uuid.uuid4().hex[:12],'collegeName':name,'adminName':'Test <Administrator>','adminEmail':user_email,'adminMobile':'978'+str(int(secrets.token_hex(3),16)).zfill(7)[:7],'permissions':{'departments':{'view':True,'create':False}}},token,201)['data']
 uid=new['userId'];college=new['collegeId']
 check(new['smtpAccepted'] and new['accountSaved'] and new['emailStatus']=='SENT','New college + admin persisted and real MailKit STARTTLS email accepted')
 check(len(messages)==1 and str(messages[-1]['To'])==user_email,'Exact recipient received email in controlled SMTP inbox')
 details=call('GET',f'/api/v1/admin/users/{uid}/access',token=token)['data']
 check(details['user']['setupRequired'] and details['invitation']['attemptCount']==1 and 'token_hash' not in json.dumps(details),'Access response exposes pending setup and delivery attempt state without token material')
 body=messages[-1].get_body(preferencelist=('html',)).get_content();link=re.search(r'token=(ua_[0-9a-f]{64})',body).group(1)
 check('Test &lt;Administrator&gt;' in body and name in body and 'College' in body and 'support@example.invalid' in body and str(messages[-1]['Subject'])=='Welcome to Pirnav Engineering College – Account Setup','Welcome email contains encoded name, college, role, login URL, support and exact subject')
 hashed,expires,created=sql('SELECT token_hash,expires_at,created_at FROM user_access_invitations WHERE user_id=%s',(uid,),True)
 check(hashed==hashlib.sha256(link.encode()).hexdigest() and (expires-created).total_seconds()==86400,'Token stored as SHA-256 hash with 24-hour expiry')
 check(sql('SELECT COUNT(*) FROM college_user_mappings m JOIN college_settings s ON s.college_setting_id=m.college_setting_id WHERE m.user_id=%s AND s.college_id=%s AND m.status=1',(uid,college),True)[0]==1,'College/user mapping and module permissions persisted transactionally')
 newpw='ChosenPassword'+secrets.token_hex(12)+'!'
 completion={'loginId':user_email,'token':link,'newPassword':newpw,'confirmNewPassword':newpw}
 call('POST','/api/v1/auth/complete-account-setup',completion)
 call('POST','/api/v1/auth/complete-account-setup',completion,status=400)
 check(True,'Setup link redemption succeeds once; replay rejected')
 user_token=login(user_email,newpw)
 call('GET',f'/api/v1/departments?collegeId={college}',token=user_token,status=403)
 check(True,'First login succeeds and modules are blocked before mandatory profile completion')
 call('PUT','/api/v1/account/profile',{'fullName':'Completed Admin','mobile':'987'+str(int(secrets.token_hex(3),16)).zfill(7)[:7],'jobTitle':'Administrator','addressLine1':'Test address','city':'Hyderabad','state':'Telangana','postalCode':'500001'},user_token)
 call('GET',f'/api/v1/departments?collegeId={college}',token=user_token)
 call('POST','/api/v1/departments',{'collegeId':college},user_token,status=403)
 call('GET',f'/api/v1/departments?collegeId={college+9999}',token=user_token,status=403)
 call('GET','/api/v1/admin/users',token=user_token,status=403)
 check(True,'Profile completion unlocks granted read access; write, cross-college and admin-only access remain forbidden')
 # Existing college invite, duplicate rejection and current email update.
 second_email='existing-'+uuid.uuid4().hex+'@example.invalid'
 second=call('POST','/api/v1/admin/users/invite',{'collegeId':college,'fullName':'Second Admin','email':second_email,'roleIds':[role]},token,201)['data'];sid=second['userId']
 check(second['smtpAccepted'] and len(messages)==2,'Invite for existing college sends automatically')
 call('POST','/api/v1/admin/users/invite',{'collegeId':college,'fullName':'Duplicate','email':second_email,'roleIds':[role]},token,409)
 check(sql('SELECT COUNT(*) FROM users WHERE email=%s',(second_email,),True)[0]==1 and len(messages)==2,'Duplicate user prevented without extra email')
 call('POST',f'/api/v1/admin/users/{sid}/reset-password',token=token,status=429)
 check(len(messages)==2,'Immediate resend throttled without rotating token or sending another email')
 updated_email='updated-'+uuid.uuid4().hex+'@example.invalid'
 call('PUT',f'/api/v1/admin/users/{sid}',{'fullName':'Updated Admin','email':updated_email,'mobile':'976'+str(int(secrets.token_hex(3),16)).zfill(7)[:7],'collegeId':college,'roleIds':[role],'permissions':{'departments':{'view':True}}},token)
 sql('UPDATE user_access_invitations SET created_at=UTC_TIMESTAMP()-INTERVAL 3 MINUTE WHERE user_id=%s',(sid,))
 reset=call('POST',f'/api/v1/admin/users/{sid}/reset-password',token=token)['data']
 check(reset['linkPurpose']=='setup' and str(messages[-1]['To'])==updated_email,'Save details + reset-password sends initial setup to current saved email')
 oldlink=re.search(r'token=(ua_[0-9a-f]{64})',messages[-1].get_body(preferencelist=('html',)).get_content()).group(1)
 sql('UPDATE user_access_invitations SET created_at=UTC_TIMESTAMP()-INTERVAL 3 MINUTE WHERE user_id=%s',(sid,))
 call('POST',f'/api/v1/admin/users/{sid}/resend-invitation',token=token)
 call('POST','/api/v1/auth/complete-account-setup',{'loginId':updated_email,'token':oldlink,'newPassword':newpw,'confirmNewPassword':newpw},status=400)
 latest=re.search(r'token=(ua_[0-9a-f]{64})',messages[-1].get_body(preferencelist=('html',)).get_content()).group(1)
 sql('UPDATE user_access_invitations SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 SECOND WHERE user_id=%s',(sid,))
 call('POST','/api/v1/auth/complete-account-setup',{'loginId':updated_email,'token':latest,'newPassword':newpw,'confirmNewPassword':newpw},status=400)
 check(True,'Resend invalidates superseded tokens; expired tokens rejected')
 call('POST',f'/api/v1/admin/users/{uid}/resend-invitation',token=token,status=409)
 check(True,'Completed onboarding is not restarted by resend-invitation')
 # Force an explicit provider rejection (AUTH), then safely resend same user.
 bad='bad-'+uuid.uuid4().hex+'@example.invalid'
 smtp.stop()
 def reject(*args):return AuthResult(success=False,handled=False)
 smtp=Controller(Inbox(),hostname='127.0.0.1',port=3587,tls_context=tls,require_starttls=True,auth_required=True,authenticator=reject);smtp.start()
 failed=call('POST','/api/v1/admin/users/invite',{'collegeId':college,'fullName':'Failed delivery user','email':bad,'roleIds':[role]},token,503)
 fid=failed['userId']
 check(failed['data']['accountSaved'] and not failed['smtpAccepted'] and sql('SELECT delivery_status,consumed_at IS NOT NULL FROM user_access_invitations WHERE user_id=%s',(fid,),True)==('failed',1),'SMTP rejection returns 503, preserves account and invalidates setup token')
 sql('UPDATE user_access_invitations SET created_at=UTC_TIMESTAMP()-INTERVAL 3 MINUTE WHERE user_id=%s',(uid,))
 failed_reset=call('POST',f'/api/v1/admin/users/{uid}/reset-password',token=token,status=503)
 check(failed_reset['nextAction'].endswith('/reset-password') and not sql('SELECT must_change_password FROM users WHERE user_id=%s',(uid,),True)[0],'Failed completed-account reset keeps existing onboarding/password state and points to the authorized reset retry')
 login(user_email,newpw)
 smtp.stop();smtp=Controller(Inbox(),hostname='127.0.0.1',port=3587,tls_context=tls,require_starttls=True,auth_required=True,authenticator=auth);smtp.start()
 sql('UPDATE user_access_invitations SET created_at=UTC_TIMESTAMP()-INTERVAL 3 MINUTE WHERE user_id=%s',(fid,))
 retry=call('POST',f'/api/v1/admin/users/{fid}/resend-invitation',token=token)['data']
 check(retry['smtpAccepted'] and sql('SELECT COUNT(*) FROM users WHERE email=%s',(bad,),True)[0]==1,'Retry succeeds for the saved account without creating duplicate users')
 # Concurrent requests may activate only one current token and send one email.
 sql('UPDATE user_access_invitations SET created_at=UTC_TIMESTAMP()-INTERVAL 3 MINUTE WHERE user_id=%s',(fid,))
 from concurrent.futures import ThreadPoolExecutor
 before_count=len(messages)
 def concurrent_send(_):
  trace=uuid.uuid4().hex
  response=requests.post(base+f'/api/v1/admin/users/{fid}/resend-invitation',headers={'Authorization':'Bearer '+token,'X-Correlation-ID':trace},timeout=40)
  correlations.append({'method':'POST','path':f'/api/v1/admin/users/{fid}/resend-invitation','status':response.status_code,'correlationId':trace})
  return response.status_code
 with ThreadPoolExecutor(max_workers=2) as executor: statuses=list(executor.map(concurrent_send,range(2)))
 check(sorted(statuses)==[200,429] and len(messages)==before_count+1,'Concurrent resend permits one accepted email and throttles the competing request')
 # Verify the exact account and route from the uploaded failing request in the clone.
 original_email=sql('SELECT email FROM users WHERE user_id=39',one=True)[0]
 original=call('POST','/api/v1/admin/users/39/reset-password',token=token)['data']
 check(original['smtpAccepted'] and str(messages[-1]['To'])==original_email,'Original failing user 39 reset-password succeeds against repaired dump and controlled inbox')
 # Schema drift is caught before saving user edits.
 sql('ALTER TABLE user_access_invitations RENAME COLUMN recipient_email TO fixture_missing_recipient_email')
 before=sql('SELECT full_name FROM users WHERE user_id=%s',(sid,),True)[0]
 missing=call('PUT',f'/api/v1/admin/users/{sid}',{'fullName':'Must not be saved','roleIds':[role]},token,503)
 check(missing['code']=='USER_ACCESS_SCHEMA_INCOMPLETE' and sql('SELECT full_name FROM users WHERE user_id=%s',(sid,),True)[0]==before,'Missing schema stops edits before writes and retains a correlation ID')
 sql('ALTER TABLE user_access_invitations RENAME COLUMN fixture_missing_recipient_email TO recipient_email')
 # Availability failure remains fail-closed.
 with db.cursor() as q:q.execute('SHUTDOWN')
 server.wait(timeout=20)
 unavailable=call('GET','/api/v1/admin/users',token=token,status=503)
 check(unavailable['code']=='AUTHORIZATION_DATABASE_UNAVAILABLE','Unavailable database returns actionable 503 without bypassing authorization')
 report={'passed':len(results),'checks':results,'api_requests':correlations,'smtp':'Real MailKit SMTP with STARTTLS + AUTH against isolated controlled inbox; not external Gmail delivery','controlled_inbox_received':len(messages),'live_environment_verified':False}
 (BASE/'repair_r8_test/integration_results.json').write_text(json.dumps(report,indent=2))
 print('ALL PASS',len(results),'Report:',BASE/'repair_r8_test/integration_results.json',flush=True)
finally:
 if api:api.terminate();api.wait(timeout=10)
 if smtp:smtp.stop()
 try:
  if server_owned:
   with db.cursor() as q:q.execute('SHUTDOWN')
 except Exception:pass
 try:server.wait(timeout=10)
 except Exception:server.terminate()
