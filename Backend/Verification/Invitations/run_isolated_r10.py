from pathlib import Path
import os,subprocess,time,json,ssl,secrets,uuid,hashlib,re,email,threading,tempfile,shutil
from email import policy
from aiosmtpd.controller import Controller
from aiosmtpd.smtp import AuthResult,LoginPassword
import pymysql,requests,bcrypt
# Run ONLY against a fresh server process and a disposable copy of the supplied dump.
BACK=Path(__file__).resolve().parents[2]
BASE=Path(tempfile.mkdtemp(prefix='cms-r10-test-'))
(BASE/'repair_r10_test').mkdir()
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
  q.execute('CREATE DATABASE cms_r10_invitation_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
 client=[MYSQL,'--no-defaults','--protocol=TCP','--host=127.0.0.1','--port=33308','--user=root','cms_r10_invitation_test']
 with DUMP.open('rb') as f:subprocess.run(client,stdin=f,stdout=subprocess.DEVNULL,stderr=open(BASE/'import.log','w'),check=True)
 db.select_db('cms_r10_invitation_test')
 def fingerprint():
  result={}
  with db.cursor() as q:
   for table in ['users','colleges','roles','user_roles','college_user_mappings','user_access_invitations','user_module_permissions']:
    q.execute('SELECT '+('user_id,token_hash,purpose,expires_at,consumed_at,delivery_status,created_at,recipient_email,delivery_error_code,smtp_accepted_at,attempt_count,last_attempt_at,correlation_id' if table=='user_access_invitations' else '*')+' FROM '+table+' ORDER BY 1');result[table]=hashlib.sha256(repr(q.fetchall()).encode()).hexdigest()
  return result
 before_patch=fingerprint()
 for _ in range(2):
  with (BACK/'Database/AdminManagement/User_Access_Invitation_Diagnostics_R10.sql').open('rb') as f:subprocess.run(client,stdin=f,stdout=subprocess.DEVNULL,stderr=open(BASE/'migration.log','w'),check=True)
 db.select_db('cms_r10_invitation_test')
 if fingerprint()!=before_patch:raise AssertionError('Migration changed existing records')
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
 env=os.environ.copy();env.update({'DOTNET_CLI_TELEMETRY_OPTOUT':'1','ASPNETCORE_ENVIRONMENT':'Development','ASPNETCORE_URLS':'http://127.0.0.1:35084','ConnectionStrings__DefaultConnection':'Server=127.0.0.1;Port=33308;Database=cms_r10_invitation_test;User ID=root;Password=;SslMode=None;ConnectionTimeout=3;','SmtpSettings__Host':'localhost','SmtpSettings__Port':'3587','SmtpSettings__SecurityMode':'StartTls','SmtpSettings__Username':'fixture','SmtpSettings__Password':smtp_password,'SmtpSettings__FromEmail':'sender@example.invalid','PasswordSetup__BaseUrl':'http://localhost:5173','PasswordSetup__LoginUrl':'http://localhost:5173/login','PasswordSetup__SupportEmail':'support@example.invalid','Jwt__Key':secrets.token_hex(48),'Jwt__Issuer':'cms-isolated-test','Jwt__Audience':'cms-isolated-test','Logging__ApiTraffic__Enabled':'false','SSL_CERT_FILE':str(BASE/'cert.pem')})
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
  return r.json() if r.content else {}
 def login(who,pw):return call('POST','/api/v1/auth/login',{'loginId':who,'password':pw})['data']['accessToken']
 token=login(admin_email,password)
 access=call('GET','/api/auth/me/access',token=token)
 check(access['data']['isSuperAdmin'],'Live database Super Admin role and new build access response')
 call('GET','/api/v1/admin/users',token=token);call('GET','/api/v1/admin/users/lookups',token=token)
 check(True,'Existing list and lookups endpoints return 200')
 diagnostic=call('POST','/api/v1/admin/users/email-diagnostics',token=token)['data']
 check(diagnostic['authenticationConfirmed'] and diagnostic['tlsEstablished'] and not diagnostic['emailSent'] and not diagnostic['invitationTokenCreated'] and not messages,'Runtime diagnostics use effective configuration and authenticate with TLS without sending mail')
 check(smtp_password not in json.dumps(diagnostic) and diagnostic['senderVerification']=='Unverified' and diagnostic['inboxDelivery']=='Unverified','Diagnostics protect credentials and distinguish authentication from sender acceptance/inbox delivery')
 call('POST','/api/v1/admin/users/email-diagnostics',token=token,status=429)
 call('POST','/api/v1/admin/users/email-diagnostics',status=401)
 check(True,'Runtime diagnostic authorization and per-process cooldown enforced')
 initial_records=call('GET','/api/v1/admin/users/invitations',token=token)['data']['items']
 check(isinstance(call('GET','/api/v1/admin/users/invitations?responseFormat=array',token=token)['data'],list),'Array invitation envelope supported while paged default is preserved')
 check(next(r for r in initial_records if r['userId']==41)['createdAt'] is None,'Untracked legacy registration time stays unknown')

 for original_user in [39,40,41]:
  original_record=next(r for r in initial_records if r['userId']==original_user)
  check(original_record['invitationStatus']=='Email Failed' and original_record['invitationId']==original_user,'Saved failed onboarding is discoverable for original user '+str(original_user))
 check(next(r for r in initial_records if r['userId']==39)['lastEmailAttempt'] is None,'Untracked legacy email-attempt dates stay unavailable instead of being guessed')
 check(not any(k in json.dumps(initial_records).lower() for k in ['token_hash','tokenhash','password_hash','passwordhash']),'Invitation directory never exposes token or password material')
 original_record=next(r for r in initial_records if r['userId']==41)
 original_payload={'collegeCode':original_record['collegeCode'],'collegeName':original_record['collegeName'],'adminName':original_record['fullName'],'adminEmail':original_record['email'],'adminMobile':original_record['mobile']}
 baseline_counts=sql('SELECT (SELECT COUNT(*) FROM colleges),(SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM user_access_invitations)',one=True)
 conflict=call('POST','/api/v1/admin/users/onboard-college',original_payload,token,409)
 check(conflict['code']=='ONBOARDING_ALREADY_EXISTS' and conflict['data']['existingInvitation']['userId']==41 and conflict['data']['canResend'],'Exact existing onboarding yields a verified recovery record without automatic resend')
 for changed,expected in [({'adminEmail':'different-'+uuid.uuid4().hex+'@example.invalid','adminMobile':'975'+str(int(secrets.token_hex(3),16)).zfill(7)[:7]},'COLLEGE_CODE_CONFLICT'),({'collegeCode':'OTHER'+uuid.uuid4().hex[:8]},'ADMIN_EMAIL_CONFLICT'),({'collegeCode':'OTHER'+uuid.uuid4().hex[:8],'adminEmail':'another-'+uuid.uuid4().hex+'@example.invalid'},'ADMIN_MOBILE_CONFLICT')]:
  result=call('POST','/api/v1/admin/users/onboard-college',{**original_payload,**changed},token,409)
  check(result['code']==expected and result['data']['existingInvitation'] is None and not result['data']['canResend'],'Unrelated duplicate is not eligible for recovery: '+expected)
 check(sql('SELECT (SELECT COUNT(*) FROM colleges),(SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM user_access_invitations)',one=True)==baseline_counts and not messages,'Duplicate requests never create colleges/users, rotate tokens or send email')
 # Test the exact, unchanged frontend resolver against the real backend response.
 frontend=os.environ.get('CMS_TEST_FRONTEND_ROOT')
 if frontend:
  js="import {resolveOnboardingConflict,canResendInvitation} from "+json.dumps((Path(frontend)/'src/pages/admin-management/invitationRecovery.js').as_uri())+";let text='';for await(const c of process.stdin)text+=c;const x=JSON.parse(text);const result=resolveOnboardingConflict(x.records,x.payload);if(result.match?.userId!==41 || !canResendInvitation(result.match))throw Error('Frontend/backend contract mismatch');console.log('PASS actual frontend recovery contract');"
  subprocess.run(['node','--input-type=module','-e',js],input=json.dumps({'records':initial_records,'payload':{'email':original_record['email'],'mobile':original_record['mobile'],'collegeCode':original_record['collegeCode']}}),text=True,check=True)
  check(True,'Unchanged frontend resolves and can resend the server-confirmed matching invitation')

 # Simulate registration storage failure after college/user inserts: all onboarding writes must roll back.
 rollback_email='rollback-'+uuid.uuid4().hex+'@example.invalid'
 counts=sql('SELECT (SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM colleges),(SELECT COUNT(*) FROM user_access_invitations)',one=True)
 sql("CREATE TRIGGER fixture_invitation_failure BEFORE INSERT ON user_access_invitations FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Controlled registration failure'")
 call('POST','/api/v1/admin/users/onboard-college',{'collegeCode':'ROLL'+uuid.uuid4().hex[:10],'collegeName':'Rollback fixture','adminName':'Rollback Admin','adminEmail':rollback_email},token,400)
 sql('DROP TRIGGER fixture_invitation_failure')
 check(sql('SELECT (SELECT COUNT(*) FROM users),(SELECT COUNT(*) FROM colleges),(SELECT COUNT(*) FROM user_access_invitations)',one=True)==counts and not messages,'Invitation registration failure rolls back college/account/role/mapping transaction before email')
 from concurrent.futures import ThreadPoolExecutor
 duplicate_payload={'collegeCode':'RACE'+uuid.uuid4().hex[:10],'collegeName':'Race fixture','adminName':'Race Admin','adminEmail':'race-'+uuid.uuid4().hex+'@example.invalid','adminMobile':'985'+str(int(secrets.token_hex(3),16)).zfill(7)[:7]}
 def duplicate_onboard(_):
  return requests.post(base+'/api/v1/admin/users/onboard-college',json=duplicate_payload,headers={'Authorization':'Bearer '+token},timeout=40).status_code
 with ThreadPoolExecutor(max_workers=2) as executor: outcomes=list(executor.map(duplicate_onboard,range(2)))
 check(sorted(outcomes)==[201,409] and sql('SELECT COUNT(*) FROM users WHERE email=%s',(duplicate_payload['adminEmail'],),True)[0]==1,'Concurrent duplicate onboarding creates one college/account/invitation and one conflict')
 # Restore only the controlled inbox counter used by subsequent exact-count assertions.
 race_message_count=len(messages)
 messages.clear()
 role=sql("SELECT role_id FROM roles WHERE role_code='COLLEGE_ADMIN' AND college_id IS NULL AND status=1",one=True)[0]
 name='R8 '+uuid.uuid4().hex[:8];user_email='invite-'+uuid.uuid4().hex+'@example.invalid'
 new=call('POST','/api/v1/admin/users/onboard-college',{'collegeCode':'R8'+uuid.uuid4().hex[:12],'collegeName':name,'adminName':'Test <Administrator>','adminEmail':user_email,'adminMobile':'978'+str(int(secrets.token_hex(3),16)).zfill(7)[:7],'universityName':'Fixture University','email':'college@example.invalid','mobile':'0401234567','addressLine1':'College Road','city':'Hyderabad','state':'Telangana','pincode':'500001','country':'India','permissions':{'departments':{'view':True,'create':False}}},token,201)['data']
 uid=new['userId'];college=new['collegeId']
 check(sql('SELECT university_name,email,mobile,address_line1,city,state,pincode,country FROM colleges WHERE college_id=%s',(college,),True)==('Fixture University','college@example.invalid','0401234567','College Road','Hyderabad','Telangana','500001','India'),'Existing frontend college fields are persisted separately from administrator contact')
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
 myprofile=call('GET','/api/v1/profile',token=user_token)['data']
 check(myprofile['profileCompleted']==False,'Frontend GET profile remains accessible while profile completion is required')
 patched=call('PATCH','/api/v1/profile',{'fullName':'Profile Admin','mobile':'986'+str(int(secrets.token_hex(3),16)).zfill(7)[:7],'designation':'Administrator','address':'Test road','city':'Hyderabad','state':'Telangana','pincode':'500001'},user_token)
 check(patched['data']['profileCompleted']==True and call('GET','/api/v1/profile',token=user_token)['data']['profileCompleted']==True,'PATCH profile saves validated completion and returns authoritative completion flag')

 call('PUT','/api/v1/account/profile',{'fullName':'Completed Admin','mobile':'987'+str(int(secrets.token_hex(3),16)).zfill(7)[:7],'jobTitle':'Administrator','addressLine1':'Test address','city':'Hyderabad','state':'Telangana','postalCode':'500001'},user_token)
 call('GET',f'/api/v1/departments?collegeId={college}',token=user_token)
 call('POST','/api/v1/departments',{'collegeId':college},user_token,status=403)
 call('GET',f'/api/v1/departments?collegeId={college+9999}',token=user_token,status=403)
 call('GET','/api/v1/admin/users',token=user_token,status=403)
 call('GET','/api/v1/admin/users/invitations',token=user_token,status=403)
 call('GET','/api/v1/admin/users/invitations',status=401)
 check(True,'Profile completion unlocks granted read access; write, cross-college and admin-only access remain forbidden')
 directory_row=next(x for x in call('GET','/api/v1/admin/users',token=token)['data']['items'] if x['userId']==uid)
 before_grants=sql('SELECT module_key,can_view,can_create,can_edit,can_delete,can_export FROM user_module_permissions WHERE user_id=%s ORDER BY module_key',(uid,))
 call('PUT',f'/api/v1/admin/users/{uid}',{'collegeId':college,'fullName':directory_row['fullName'],'email':directory_row['email'],'mobile':directory_row['mobile'],'roleIds':directory_row['roleIds'],'permissions':directory_row['permissions']},token)
 check(sql('SELECT module_key,can_view,can_create,can_edit,can_delete,can_export FROM user_module_permissions WHERE user_id=%s ORDER BY module_key',(uid,))==before_grants,'Unchanged frontend directory/edit round trip preserves the assigned module permissions')

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
 check(next(x for x in call('GET','/api/v1/admin/users/invitations',token=token)['data']['items'] if x['userId']==sid)['invitationStatus']=='Expired','Expired invitation state remains visible and recoverable')
 check(True,'Resend invalidates superseded tokens; expired tokens rejected')
 call('POST',f'/api/v1/admin/users/{uid}/resend-invitation',token=token,status=409)
 check(next(x for x in call('GET','/api/v1/admin/users/invitations',token=token)['data']['items'] if x['userId']==uid)['invitationStatus']=='Accepted','Completed onboarding is listed as accepted and cannot enter pending recovery')
 check(True,'Completed onboarding is not restarted by resend-invitation')
 # Persisted bounded lease: no second sender while a prior send may still be active.
 sql("UPDATE user_access_invitations SET delivery_status='sending',created_at=UTC_TIMESTAMP()-INTERVAL 2 MINUTE WHERE user_id=%s",(sid,))
 lease_response=requests.post(base+f'/api/v1/admin/users/{sid}/resend-invitation',headers={'Authorization':'Bearer '+token},timeout=40)
 check(lease_response.status_code==429 and 1<=int(lease_response.headers['Retry-After'])<=180,'Sending lease produces HTTP 429 and accurate Retry-After')
 sql("UPDATE user_access_invitations SET created_at=UTC_TIMESTAMP()-INTERVAL 6 MINUTE WHERE user_id=%s",(sid,))
 call('POST',f'/api/v1/admin/users/{sid}/resend-invitation',token=token)
 check(True,'Interrupted send becomes recoverable after bounded five-minute lease')

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
 failure_payload={'collegeCode':'FAIL'+uuid.uuid4().hex[:8],'collegeName':'Committed onboarding failure fixture','adminName':'Pending fixture','adminEmail':'onboard-fail-'+uuid.uuid4().hex+'@example.invalid','adminMobile':'974'+str(int(secrets.token_hex(3),16)).zfill(7)[:7]}
 failure_onboard=call('POST','/api/v1/admin/users/onboard-college',failure_payload,token,503)
 recovery_id=failure_onboard['userId'];recovery_college=failure_onboard['collegeId']
 duplicate_failed=call('POST','/api/v1/admin/users/onboard-college',failure_payload,token,409)
 check(failure_onboard['accountCreated'] and duplicate_failed['data']['existingInvitation']['userId']==recovery_id and duplicate_failed['data']['existingInvitation']['invitationStatus']=='Email Failed','Committed new-college onboarding failure remains recoverable through the duplicate dialog')
 smtp.stop();smtp=Controller(Inbox(),hostname='127.0.0.1',port=3587,tls_context=tls,require_starttls=True,auth_required=True,authenticator=auth);smtp.start()
 sql('UPDATE user_access_invitations SET created_at=UTC_TIMESTAMP()-INTERVAL 3 MINUTE WHERE user_id=%s',(recovery_id,))
 call('POST',f'/api/v1/admin/users/{recovery_id}/resend-invitation',token=token)
 check(sql('SELECT COUNT(*) FROM colleges WHERE college_id=%s',(recovery_college,),True)[0]==1 and sql('SELECT COUNT(*) FROM users WHERE user_id=%s',(recovery_id,),True)[0]==1,'New-college partial failure is repaired by explicit resend without duplicate creation')
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
 # Recover the failed REC invitation without creating its college/account again.
 before_users=sql('SELECT COUNT(*) FROM users',one=True)[0];before_colleges=sql('SELECT COUNT(*) FROM colleges',one=True)[0]
 call('POST','/api/v1/admin/users/41/resend-invitation',token=token)
 after_record=next(x for x in call('GET','/api/v1/admin/users/invitations',token=token)['data']['items'] if x['userId']==41)
 check(after_record['invitationStatus']=='Pending Invitation' and after_record['emailStatus']=='Accepted' and after_record['attemptCount']==original_record['attemptCount']+1 and after_record['createdAt']==original_record['createdAt'],'Resend of original user 41 refreshes delivery/attempt state while preserving creation date')
 check(sql('SELECT COUNT(*) FROM users',one=True)[0]==before_users and sql('SELECT COUNT(*) FROM colleges',one=True)[0]==before_colleges,'Existing REC recovery never creates another college or user')
 sql('UPDATE college_user_mappings SET status=0 WHERE user_id=%s',(fid,))
 unavailable_record=next(x for x in call('GET','/api/v1/admin/users/invitations',token=token)['data']['items'] if x['userId']==fid)
 call('POST',f'/api/v1/admin/users/{fid}/resend-invitation',token=token,status=409)
 check(unavailable_record['invitationStatus']=='Unavailable' and not unavailable_record['canResend'],'Missing college ownership disables recovery and rejects resend')
 sql('UPDATE college_user_mappings SET status=1 WHERE user_id=%s',(fid,))
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
 report={'passed':len(results),'checks':results,'api_requests':correlations,'smtp':'Real MailKit SMTP with STARTTLS + AUTH against isolated controlled inbox; not external Gmail delivery','controlled_inbox_received':len(messages)+race_message_count,'frontend_tests':'Not run: frontend source not supplied','live_environment_verified':False}
 (BASE/'repair_r10_test/integration_results.json').write_text(json.dumps(report,indent=2))
 print('ALL PASS',len(results),'Report:',BASE/'repair_r10_test/integration_results.json',flush=True)
finally:
 if api:api.terminate();api.wait(timeout=10)
 if smtp:smtp.stop()
 try:
  if server_owned:
   with db.cursor() as q:q.execute('SHUTDOWN')
 except Exception:pass
 try:server.wait(timeout=10)
 except Exception:server.terminate()
