"""Real HTTP + MySQL regression for a fresh disposable copy of the supplied dump.
Apply the R12 SQL patch first and run the R12 API against that same database.
The runner creates QA users, colleges, departments, courses, years and branches.
It never sends invitations or other email. Do not use a working college database.
"""
import argparse, os, subprocess, json, time, urllib.request, urllib.error, concurrent.futures
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--base-url',required=True)
parser.add_argument('--mysql-client',default='mysql')
parser.add_argument('--mysql-host',default='127.0.0.1')
parser.add_argument('--mysql-port',type=int,default=3306)
parser.add_argument('--mysql-user',default='root')
parser.add_argument('--database',required=True)
parser.add_argument('--confirm-disposable',action='store_true')
args=parser.parse_args()
if not args.confirm_disposable or not args.database.endswith('_r12_test'):
    parser.error('Use --confirm-disposable and a fresh database ending _r12_test.')
cli=[args.mysql_client,'--protocol=TCP','-h'+args.mysql_host,'-P'+str(args.mysql_port),'-u'+args.mysql_user,'--batch','--skip-column-names']
checks=[];evidence={}
def sql(s,db=None):
 r=subprocess.run([*cli,args.database],input=s,text=True,capture_output=True)
 if r.returncode:raise Exception(r.stderr)
 return r.stdout.strip()
def check(v,label,detail=None):
 checks.append({'test':label,'passed':bool(v),**({'detail':detail} if detail is not None else {})})
 if not v:raise Exception(label+': '+str(detail))
 print('PASS',label,flush=True)
def http(method,path,body=None,token=None):
 data=None if body is None else (body if isinstance(body,bytes) else json.dumps(body).encode())
 headers={'Content-Type':'application/json','X-Correlation-ID':'r12-verification-'+str(time.time_ns())}
 if token:headers['Authorization']='Bearer '+token
 r=urllib.request.Request(args.base_url.rstrip('/')+path,data=data,headers=headers,method=method)
 try:
  with urllib.request.urlopen(r,timeout=25) as f:return f.status,json.load(f)
 except urllib.error.HTTPError as f:return f.code,json.load(f)
def login(name):
 status,r=http('POST','/api/v1/auth/login',{'loginId':name,'password':'R12LocalOnly123!'})
 check(status==200,'Login '+name,{'status':status,'message':r.get('message')})
 return r['data']['accessToken'],r['data']

h='$2b$04$4ri4LdbfK2RJrXtNB54VEOsujMVRie7wJ/V64QaO1X0vPfb.27ROO'
if sql('SELECT COUNT(*) FROM users WHERE user_id BETWEEN 10001 AND 10003;') != '0':
    raise RuntimeError('Reserved QA user IDs already exist. Import a fresh disposable dump before running.')
sql(f"""
 INSERT INTO colleges(college_id,college_code,college_name) VALUES (10001,'R12PRIMARY','R12 Assigned College'),(10002,'R12OTHER','R12 Other College');
 INSERT INTO users(user_id,college_id,employee_user_id,full_name,email,mobile,password_hash,status,profile_completed) VALUES
 (10001,NULL,'R12SUPER','Test Super','r12super@example.invalid','9876543201','{h}',1,1),
 (10002,10001,'R12ADMIN','Test College Admin','r12admin@example.invalid','9876543202','{h}',1,0),
 (10003,10001,'R12STAFF','Test Staff','r12staff@example.invalid','9876543203','{h}',1,0);
 INSERT INTO employee_profiles(user_id,house_number,status) VALUES (10001,'Super House',1),(10003,'Staff House',1);
 INSERT INTO user_roles(user_id,role_id) VALUES (10001,1),(10002,2),(10003,5);
 INSERT INTO departments(department_id,college_id,department_code,department_name) VALUES (10001,10001,'R12CSE','Computer Science'),(10002,10002,'R12FOREIGN','Foreign Department');
 INSERT INTO courses(course_id,college_id,department_id,course_code,course_name,duration_years,total_semesters) VALUES (10001,10001,10001,'R12BTECH','R12 BTech',4,8);
 INSERT INTO academicyears(academic_year_id,college_id,academic_year_name,start_date,end_date) VALUES (10001,10001,'2026-27','2026-06-01','2027-05-31'),(10002,10002,'2026-27','2026-06-01','2027-05-31');
 INSERT INTO branches(branch_id,course_id,branch_code,branch_name,total_semesters) VALUES (10001,10001,'BASELINE','R12 Baseline Branch',8);
 """)

payload={'courseId':10001,'branchId':10001,'academicYearId':10001,'semesterNumber':1,'semesterName':'Semester 1','yearNumber':1,'startDate':'','endDate':'','status':1}
super_token,_=login('R12SUPER');admin,initial=login('R12ADMIN');staff,_=login('R12STAFF')
check(initial['profileCompleted'] is False,'Incomplete employee login returns profileCompleted false')
status,r=http('PATCH','/api/v1/profile',{'houseNumber':'Initial-House'},admin)
check(status==200 and r['data']['profileCompleted'] is True,'College Admin first profile save creates employee profile row')
status,r=http('POST','/api/v1/colleges',{'collegeCode':'R12CREATED','collegeName':'R12 Created College','createdBy':10001},admin)
check(status==201 and r['data']['createdBy']==10002,'College Admin creates college; server owns CreatedBy',{'status':status,'body':r});created=r['data']['collegeId']
status,r=http('POST','/api/v1/colleges',{'collegeCode':'R12SUPERCREATED','collegeName':'R12 Super Created'},super_token)
check(status==201 and r['data']['createdBy']==10001,'Super Admin creates college with actor audit');super_created=r['data']['collegeId']
status,r=http('POST','/api/v1/colleges',{'collegeCode':'R12FORBIDDEN','collegeName':'Forbidden'},staff)
check(status in (401,403),'Faculty cannot create colleges',{'status':status})
status,r=http('GET','/api/v1/colleges',token=admin)
check(status==200 and {x['collegeId'] for x in r['data']}=={10001,created} and all('createdBy' in x for x in r['data']),'College Admin list includes only assigned and created colleges')
status,r=http('GET','/api/v1/colleges/search?pageSize=1&pageNumber=1',token=admin)
check(status==200 and r['data']['totalRecords']==2 and len(r['data']['items'])==1 and 'createdBy' in r['data']['items'][0],'College search count/pagination are scoped')
status,r=http('GET','/api/v1/colleges/search?query=R12OTHER',token=admin)
check(status==200 and r['data']['totalRecords']==0,'Search hides foreign college matches and counts')
for cid in (10001,created):
 status,r=http('GET',f'/api/v1/colleges/{cid}',token=admin);check(status==200 and 'createdBy' in r['data'],'College Admin detail for '+str(cid))
 status,r=http('PATCH',f'/api/v1/colleges/{cid}',{'city':'Test City'},admin);check(status==200 and r['data']['city']=='Test City' and 'createdBy' in r['data'],'College Admin edit for '+str(cid),{'status':status,'body':r})
for method,body in [('GET',None),('PATCH',{'city':'Forbidden'})]:
 status,r=http(method,'/api/v1/colleges/10002',body,admin);check(status in (403,404),'Foreign college '+method+' blocked',{'status':status})
status,r=http('PATCH','/api/v1/colleges/10002',{'city':'Super City'},super_token);check(status==200,'Super Admin retains cross-college edit')
status,r=http('GET','/api/v1/colleges',token=super_token);check(status==200 and len(r['data'])>=5,'Super Admin retains full list')
status,r=http('PATCH','/api/v1/profile',{'houseNumber':'','departmentId':10001,'designation':'Administrator','address':'Current Road','country':'India','permanentHouseNumber':'P-2','permanentAddress':'Permanent Road','permanentCity':'Hyderabad','permanentDistrict':'Hyderabad','permanentState':'Telangana','permanentCountry':'India','permanentPincode':'500081','bio':'Initial bio'},admin)
check(status==200 and r['data']['departmentName']=='Computer Science' and r['data']['profileCompleted'] is False,'Department name resolves and incomplete profile remains false',{'status':status,'body':r})
status,r=http('PATCH','/api/v1/profile',{'houseNumber':'12/A'},admin)
check(status==200 and r['data']['profileCompleted'] is True and r['data']['departmentId']==10001 and r['data']['permanentAddress']=='Permanent Road','Final required field completes profile and omitted fields persist',{'status':status,'body':r})
org={'collegeId':10001,'collegeType':'Engineering','universityName':'R12 University','officialEmail':'college@example.invalid','officialPhone':'04012345678','address':'Organization Road','addressLine2':'Building 2','city':'Hyderabad','district':'Hyderabad','state':'Telangana','country':'India','pincode':'500081','website':'https://example.invalid','collegeName':'Attempted Rename','roles':['SUPER_ADMIN'],'userId':10001}
status,r=http('PATCH','/api/v1/profile',{'assignedOrganization':org},admin)
check(status==200 and r['data']['assignedOrganization']['officialEmail']=='college@example.invalid' and r['data']['collegeName']=='R12 Assigned College' and r['data']['userId']==10002 and r['data']['roles']==['COLLEGE_ADMIN'],'Assigned organization fields saved; name, identity and role remain system managed',{'status':status,'body':r})
check(all(r['data']['assignedOrganization'].get(k)==v for k,v in org.items() if k not in ['collegeName','roles','userId']),'All assigned organization fields returned')
check(r['data']['address']=='Current Road' and r['data']['profileCompleted'] is True,'Organization update preserves personal address and completion')
status,r=http('PATCH','/api/v1/profile',{'bio':'Updated bio','assignedOrganization':{'city':'Warangal'}},admin)
check(status==200 and r['data']['aboutMe']=='Updated bio' and r['data']['bio']=='Updated bio' and r['data']['assignedOrganization']['officialEmail']=='college@example.invalid','Partial profile/organization PATCH preserves omitted values')
status,r=http('PATCH','/api/v1/profile',{'bio':'MUST NOT PERSIST','assignedOrganization':{'collegeId':created,'city':'Forbidden'}},admin)
check(status==403,'Assigned organization update cannot target even a college created by this admin',{'status':status})
status,r=http('PATCH','/api/v1/profile',{'departmentId':10002,'bio':'MUST NOT PERSIST'},admin)
check(status==400,'Profile rejects another college department')
status,r=http('GET','/api/v1/profile',token=admin)
check(status==200 and r['data']['bio']=='Updated bio' and r['data']['profileCompleted'] is True and r['data']['houseNumber']=='12/A','GET reflects saved fields after rejected PATCH requests')
admin,again=login('R12ADMIN');check(again['profileCompleted'] is True,'Login and profile agree after setup completion')
status,r=http('GET','/api/v1/account/profile',token=admin)
check(status==200 and r['data']['profileCompleted'] is True and r['data']['departmentName']=='Computer Science','Account profile GET uses the shared result')
status,r=http('PUT','/api/v1/account/profile',{'jobTitle':'Senior Administrator'},admin)
check(status==200 and r['profileCompleted'] is True and r['data']['designation']=='Senior Administrator' and r['data']['houseNumber']=='12/A','Legacy account profile PUT aliases preserve omitted fields and report actual completion')
status,r=http('PATCH','/api/v1/profile',{'assignedOrganization':{'city':'Forbidden'}},staff);check(status==403,'Non-admin cannot edit assigned organization')
status,r=http('POST','/api/v1/branches',{'courseId':10001,'branchCode':'R12NEW','branchName':'R12 New Branch','departmentId':10001,'duration':4,'totalSemesters':8,'startingAcademicYearId':10001,'status':1},super_token)
check(status==200,'Save new branch before semester requests',{'status':status,'body':r});branch=r['data']['branchId']
def semester(number):return {**payload,'branchId':branch,'semesterNumber':number,'semesterName':f'Semester {number}','yearNumber':(number+1)//2,'status':'Active' if number%2 else '1'}
ids=[]
for n in range(1,9):
 status,r=http('POST','/api/semester',semester(n),super_token)
 check(status==200 and r['data']['semesterId']>0,'Flat POST creates semester '+str(n),{'status':status,'body':r});ids.append(r['data']['semesterId'])
for n in range(1,9):
 status,r=http('POST','/api/semester',semester(n),super_token)
 check(status==200 and r['data']['semesterId']==ids[n-1],'Retry returns original semester '+str(n))
check(sql(f'SELECT COUNT(*) FROM semesters WHERE branch_id={branch} AND academic_year_id=10001 AND is_archived=0;')=='8','Database has exactly 8 saved semesters after all retries')
# A fresh branch gives concurrent requests a chance to collide at the unique constraint.
status,r=http('POST','/api/v1/branches',{'courseId':10001,'branchCode':'R12RACE','branchName':'R12 Race Branch','totalSemesters':8,'startingAcademicYearId':10001,'status':1},super_token);check(status==200,'Create concurrent retry test branch');race_branch=r['data']['branchId']
race={**semester(1),'branchId':race_branch}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:race_results=list(pool.map(lambda _:http('POST','/api/semester',race,super_token),range(12)))
check(all(s==200 for s,r in race_results) and len({r['data']['semesterId'] for s,r in race_results})==1,'12 simultaneous semester requests return one saved ID',race_results)
check(sql(f'SELECT COUNT(*) FROM semesters WHERE branch_id={race_branch} AND is_archived=0;')=='1','Unique key prevents concurrent duplicates')
status,r=http('POST','/api/semester',{**semester(1),'startDate':'not-a-date'},super_token)
check(status==400 and '$.startDate' in r['errors'],'Invalid semester date gives field-level HTTP 400',r);evidence['r12InvalidDate']={'route':'POST /api/semester','status':status,'response':r}
status,r=http('POST','/api/semester',{'dto':semester(1)},super_token);check(status==400,'Nested dto wrapper is rejected with missing-field validation')
status,r=http('POST','/api/semester',{**semester(1),'academicYearId':10002},super_token);check(status==400,'Semester cannot use academic year from another college')
status,r=http('POST','/api/semester',{**semester(1),'status':'Unknown'},super_token);check(status==400 and '$.status' in r['errors'],'Invalid status is rejected with its JSON path')
# Read back persistence through the search endpoint, not only POST echoes.
status,r=http('GET',f'/api/semester/search?branchId={branch}&academicYearId=10001',token=super_token)
check(status==200 and {x['semesterId'] for x in r['data']}==set(ids),'Semester search verifies all 8 generated IDs')
evidence['eightSemesters']={'branchId':branch,'semesterIds':ids,'databaseCount':8,'retries':8,'concurrentRetryRequests':12}
evidence['summary']={'passed':len(checks),'failed':0,'database':args.database}
evidence['checks']=checks
Path('R12_Regression_Results.json').write_text(json.dumps(evidence,indent=2))
print('All',len(checks),'checks passed. Results: R12_Regression_Results.json')
