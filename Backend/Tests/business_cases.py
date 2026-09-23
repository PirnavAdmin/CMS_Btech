# Executed by live_test.py only against its isolated imported database.
import uuid,csv,io,concurrent.futures
suffix=uuid.uuid4().hex[:8]
def verify(name,condition,details=None):
 results.append({'method':'ASSERT','path':name,'case':'business assertion','status':0,'passed':bool(condition),**({'response':details} if not condition else {})})
 if not condition:print('ASSERT FAIL',name,str(details)[:200],flush=True)
def create(path,payload,idkey):
 st,obj,h=call('POST',path,payload,[200,201],label='create valid record')
 if st not in [200,201]:raise RuntimeError('Create failed: '+str(obj))
 data=obj.get('data',obj);key=data.get(idkey)
 if key is None:raise RuntimeError('ID missing: '+str(obj))
 return key,data
college,coldata=create('/api/v1/colleges',{'collegeCode':'QA'+suffix,'collegeName':'Integration QA College '+suffix,'collegeType':'Engineering','email':f'{suffix}@example.invalid','principal':'QA Principal','principalContact':'9000000001'},'collegeId')
department,depdata=create('/api/v1/departments',{'collegeId':college,'departmentCode':'CSE'+suffix,'departmentName':'Computer Science','description':'Integration QA'},'departmentId')
course,courseData=create('/api/v1/courses',{'collegeId':college,'departmentId':department,'courseCode':'BT'+suffix,'courseName':'B.Tech QA '+suffix,'courseType':'Undergraduate','courseShortName':'B.Tech','durationYears':4,'totalSemesters':8},'courseId')
ay=int(sql('SELECT academic_year_id FROM academicyears WHERE status=1 AND is_archived=0 AND deleted_at IS NULL LIMIT 1;').strip())
branch,branchData=create('/api/v1/branches',{'courseId':course,'departmentId':department,'branchCode':'CS'+suffix,'branchName':'Computer Science QA','specialization':'AI and Data Science','duration':4,'totalSemesters':8,'intakeCapacity':60,'startingAcademicYearId':ay},'branchId')
verify('branch specialization persisted',branchData.get('specialization')=='AI and Data Science',branchData)
semester,semesterData=create('/api/semester',{'branchId':branch,'academicYearId':ay,'semesterNumber':1,'semesterName':'Semester 1','startDate':'2026-09-01','endDate':'2027-01-31','status':1},'semesterId')
verify('semester course resolved from branch',semesterData.get('courseId')==course and bool(semesterData.get('courseName')),semesterData)
# Valid hierarchy reads and deactivation blocked by active children (also old PUT path).
for entity,i in [('departments',department),('courses',course),('branches',branch)]:
 st,obj,h=call('GET',f'/api/v1/{entity}/{i}/dependencies',expect=[200])
 verify(entity+' reports dependencies',obj['data'].get('canDeactivate') in [False,0],obj)
 path=f'/api/v1/{entity}/{i}/status'
 st,obj,h=call('PATCH',path,{'status':0},[400,409],label='blocked parent deactivation')
 verify(entity+' deactivation has clear reason','active' in obj.get('message','').lower(),obj)
student,studentData=create('/api/v1/students',{'collegeId':college,'studentCode':'QA'+suffix,'fullName':'QA Student','courseId':course,'branchId':branch,'academicYearId':ay,'status':1,'gender':'Male','email':f'student-{suffix}@example.invalid','mobile':'9000000002'},'studentId')
# Missing status must not silently deactivate an existing college or student.
call('PATCH',f'/api/v1/colleges/{college}/status',{},[400],label='missing college status rejected')
call('PATCH',f'/api/v1/students/{student}/status',{},[400],label='missing student status rejected')
# Edit round-trips preserve identifiers and hierarchy.
call('PUT',f'/api/v1/courses/{course}',{'collegeId':college,'departmentId':department,'courseCode':'BT'+suffix,'courseName':'B.Tech QA Edited '+suffix,'courseType':'Undergraduate','durationYears':4,'totalSemesters':8,'description':'Changed by API test'},[200],label='edit course')
st,updatedBranch,h=call('PUT',f'/api/v1/branches/{branch}',{'courseId':course,'departmentId':department,'branchCode':'CS'+suffix,'branchName':'Computer Science QA Edited','specialization':'Machine Learning','duration':4,'totalSemesters':8,'intakeCapacity':60,'status':1},[200],label='edit branch')
if st==200: verify('edited specialization saved',updatedBranch['data'].get('specialization')=='Machine Learning',updatedBranch)
call('PATCH',f'/api/v1/courses/{course}/status',{},[400],label='missing status cannot deactivate')
# Exercise real section allocation and promotion with the relationship guards active.
sectionPayload={'collegeId':college,'academicYearId':ay,'departmentId':department,'courseId':course,'branchId':branch,'semesterId':semester,'sectionCode':'A'+suffix,'sectionName':'QA First Semester','capacity':2}
section,sectionData=create('/api/v1/sections',sectionPayload,'sectionId')
call('PATCH',f'/api/v1/sections/{section}/status',{},[400],label='missing section status rejected')
call('POST',f'/api/v1/sections/{section}/students/assign',{'studentIds':[student]},[200],label='assign student to section')
call('PATCH',f'/api/v1/sections/{section}/status',{'status':False},[400,409],label='section blocked by active student')
semester2,semData2=create('/api/semester',{'branchId':branch,'academicYearId':ay,'semesterNumber':2,'semesterName':'Semester 2','startDate':'2027-02-01','endDate':'2027-06-30','status':1},'semesterId')
section2,sectionData2=create('/api/v1/sections',sectionPayload|{'semesterId':semester2,'sectionCode':'B'+suffix,'sectionName':'QA Second Semester'},'sectionId')
sql(f"INSERT INTO academic_levels(academic_year_id,level_type,level_name,level_number,status) SELECT {ay},c.course_type,'Year 1',1,1 FROM courses c WHERE course_id={course} AND NOT EXISTS(SELECT 1 FROM academic_levels al WHERE al.academic_year_id={ay} AND al.level_number=1 AND al.level_type=c.course_type AND al.status=1);")
st,promotion,h=call('POST','/api/v1/promotions/promote',{'studentId':student},[200],label='promote student with capacity and target level')
if st==200:verify('promotion changes current section atomically',sql(f'SELECT section_id FROM student_section_assignments WHERE student_id={student} AND status=1;').strip()==str(section2),promotion)
call('GET',f'/api/v1/promotions/history?collegeId={college}',expect=[200],label='promotion history readable')
call('DELETE',f'/api/v1/sections/{section2}/students/{student}',expect=[200],label='remove active section allocation')
call('PATCH',f'/api/v1/sections/{section}/status',{'status':False},[200],label='deactivate empty first section')
call('PATCH',f'/api/v1/sections/{section2}/status',{'status':False},[200],label='deactivate empty target section')
call('PATCH',f'/api/semester/{semester2}/status',{'status':0},[200],label='deactivate empty second semester')
# Check the password rule from the additional ZIP before any email operation.
call('POST','/api/v1/access-requests',{'fullName':'QA Registrant','email':f'weak-{suffix}@example.invalid','mobile':'9000000010','password':'abcdefgh','confirmPassword':'abcdefgh','agreeToTerms':True},[400],auth=False,label='new ZIP weak-password rule')
# Real password authentication and refresh, entirely inside the isolated DB.
password_hash=(W/'test-password-hash.txt').read_text()
uid=int(sql(f"INSERT INTO users(college_id,employee_user_id,full_name,email,password_hash,status) VALUES({college},'QA{suffix}','QA Admin','qa-{suffix}@example.invalid','{password_hash}',1); SELECT LAST_INSERT_ID();").strip())
sql(f"INSERT INTO user_roles(user_id,role_id,status) SELECT {uid},role_id,1 FROM roles WHERE role_code='COLLEGE_ADMIN' LIMIT 1;")
st,login,h=call('POST','/api/v1/auth/login',{'loginId':'QA'+suffix,'password':'CmsQaTest2026!'},[200],auth=False,label='real password login')
if st==200:
 verify('login issues tokens',bool(login['data'].get('accessToken')) and bool(login['data'].get('refreshToken')))
 st,refreshed,h=call('POST','/api/v1/auth/refresh',{'refreshToken':login['data']['refreshToken']},[200],auth=False,label='refresh token rotation')
 call('POST','/api/v1/auth/refresh',{'refreshToken':login['data']['refreshToken']},[401],auth=False,label='old refresh token rejected')
call('POST','/api/v1/auth/login',{'loginId':'QA'+suffix,'password':'WrongPassword!'},[401],auth=False,label='wrong password rejected')

# Address PATCH/GET/history stays atomic.
addresses={'houseNumber':'12-34','permanentHouseNumber':'10-25','permanentAddress':'Benz Circle, Vijayawada','permanentCity':'Vijayawada','permanentDistrict':'NTR','permanentState':'Andhra Pradesh','permanentCountry':'India','permanentPincode':'520010','changeReason':'Isolated integration test'}
st,obj,h=call('PATCH',f'/api/v1/students/{student}/profile/personal-information',addresses,[200],label='save student addresses')
if st==200:verify('all student address fields round-trip',all(obj['data'].get(k)==v for k,v in addresses.items() if k!='changeReason'),obj)
verify('student address history created',int(sql(f'SELECT COUNT(*) FROM student_profile_updates WHERE StudentId={student};').strip())>=1)
# Employee profile addresses use existing /profile endpoint and audit.
st,obj,h=call('PATCH','/api/v1/profile',addresses|{'changeReason':None},[200],label='save employee addresses')
if st==200:verify('employee address fields round-trip',all(obj['data'].get(k)==v for k,v in addresses.items() if k!='changeReason'),obj)
# Full profile screen retains nested contact and parents data atomically.
form={'personal':{'firstName':'QA','lastName':'Student','gender':'Male','dob':'2007-05-12','nationality':'Indian'},'contact':{'currentAddress':{'line1':'Current Road','city':'Hyderabad','pincode':'500020'},'permanentAddress':{'line1':'Permanent Road','city':'Vijayawada','pincode':'520010'},'alternateMobile':'9000000009'},'parents':{'guardian':{'name':'QA Guardian','relationship':'Uncle'}}}
st,full,h=call('PATCH',f'/api/v1/student-profiles/{student}?collegeId={college}',{'fullName':'QA Student','mobile':'9000000002','student':form},[200],label='full profile nested form save')
if st==200:verify('full profile contact preserved',full.get('data',{}).get('contact',{}).get('permanentAddress',{}).get('city')=='Vijayawada',full)

# Existing authenticated document download must preserve the uploaded file bytes.
pdf=b'%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
boundary='CMS-QA-'+suffix
multipart=(f'--{boundary}\r\nContent-Disposition: form-data; name="DocumentType"\r\n\r\nStudyCertificate\r\n--{boundary}\r\nContent-Disposition: form-data; name="File"; filename="qa-document.pdf"\r\nContent-Type: application/pdf\r\n\r\n').encode()+pdf+f'\r\n--{boundary}--\r\n'.encode()
st,document,h=call('POST',f'/api/v1/students/{student}/documents',multipart,[201],label='upload document multipart',content_type='multipart/form-data; boundary='+boundary)
if st==201:
 documentId=document['data']['documentId']
 call('GET',f'/api/v1/students/{student}/documents/{documentId}/download',expect=[200],label='download uploaded document')
 verify('document download bytes equal original upload',last_raw_body==pdf)
 call('DELETE',f'/api/v1/students/{student}/documents/{documentId}',expect=[200],label='delete uploaded test document')
 call('GET',f'/api/v1/students/{student}/documents/{documentId}/download',expect=[404],label='deleted document unavailable')

# Admissions as sent by unchanged frontend: flat aliases and structured contact address.
admission,admissionData=create('/api/v1/student-admissions',{'registrationNumber':'REGQA'+suffix,'registrationDate':'2026-09-08','firstName':'Integration','lastName':'Student','gender':'Female','dateOfBirth':'2007-05-12','mobile':'9000000003','email':f'a-{suffix}@example.invalid','alternateEmail':f'b-{suffix}@example.invalid','currentAddress':{'line1':'Main Road','city':'Hyderabad','district':'Hyderabad','state':'Telangana','pincode':'500020'},'permanentAddress':{'line1':'Village Road','city':'Vijayawada','pincode':'520010'}},'admissionId')
verify('admission registration and mobile aliases saved',admissionData.get('registrationNumber')=='REGQA'+suffix and admissionData.get('mobile')=='9000000003',admissionData)
st,obj,h=call('PUT',f'/api/v1/student-admissions/{admission}/academic-details',{'collegeId':college,'departmentId':department,'courseId':course,'branchId':branch,'semesterId':semester,'academicYearId':ay,'admissionType':'Counseling','entryType':'Regular','regulation':'R26','batch':'2026-30'},[200],label='save all frontend academic fields')
if st==200:verify('academic fields round-trip',all(obj['data'].get(k)==v for k,v in {'courseId':course,'departmentId':department,'branchId':branch,'semesterId':semester,'regulation':'R26','batch':'2026-30'}.items()),obj)
st,obj,h=call('GET',f'/api/v1/student-admissions?courseId={course}',expect=[200],label='course impact filter')
if st==200:
 rows=obj['data']['items'];verify('admission filter returns only selected course',len(rows)==1 and all(x['courseId']==course for x in rows),rows)
 verify('structured addresses preserved after academic update',rows[0].get('currentAddress',{}).get('city')=='Hyderabad',rows[0])
# Export valid data, filters, BOM, filename, spreadsheet formula safety, JSON parity.
st,obj,h=call('GET',f'/api/v1/courses/download?collegeId={college}',expect=[200],label='CSV download')
verify('download filename present','content-disposition' in {k.lower():v for k,v in h.items()},h)
verify('download CORS exposes filename','content-disposition' in h.get('Access-Control-Expose-Headers','').lower(),h)
st,obj,h=call('GET',f'/api/v1/courses/download?collegeId={college}&format=json',expect=[200],label='JSON download')
if st==200:verify('filtered export contains complete course',len(obj)==1 and obj[0]['CourseId']==course,obj)
call('GET','/api/v1/courses/download?format=xlsx',expect=[400],label='unsupported export format')
call('GET','/api/v1/courses/download?courseId=-1',expect=[400],label='invalid export filter')
call('GET','/api/v1/courses/download',expect=[401],auth=False,label='unauthenticated export denied')
call('GET',f'/api/v1/courses/download?collegeId={college}',expect=[200],auth=token(['COLLEGE_ADMIN'],college),label='college administrator own export')
call('GET',f'/api/v1/courses/download?collegeId={college}',expect=[403],auth=token(['COLLEGE_ADMIN'],1),label='cross-college export denied')
call('GET','/api/v1/courses/download',expect=[403],auth=token(['STUDENT']),label='student cannot export administration data')
st,catalog,h=call('GET','/api/v1/exports',expect=[200],label='download catalog')
for screen in catalog['data']:
 st,csvBody,h=call('GET',screen['url'],expect=[200],label='screen CSV '+screen['screen'])
 if st==200:
  parsed=list(csv.reader(io.StringIO(last_raw_body.decode('utf-8-sig'))))
  verify('CSV contract '+screen['screen'],last_raw_body.startswith(b'\xef\xbb\xbf') and parsed[0]==screen['columns'] and len(parsed)-1==int(h['X-Total-Count']) and '.csv' in h.get('Content-Disposition',''))
 st,jsonBody,h=call('GET',screen['url']+'?format=json',expect=[200],label='screen JSON '+screen['screen'])
 if st==200:verify('JSON row count '+screen['screen'],isinstance(jsonBody,list) and len(jsonBody)==int(h['X-Total-Count']))

# Aadhaar uniqueness: request normalization, duplicate insert/update, NULL values, index rerun.
aadhaar=str(800000000000+int(suffix,16))
aadhaarForm={'firstName':'QA Aadhaar','gender':'Female','dateOfBirth':'2007-05-12','registrationNumber':'AAD'+suffix,'aadhaarNumber':aadhaar}
aadhaarOwner,ownerData=create('/api/v1/student-admissions',aadhaarForm,'admissionId')
st,duplicate,h=call('POST','/api/v1/student-admissions',aadhaarForm|{'registrationNumber':'DUP'+suffix},[409],label='duplicate Aadhaar create rejected')
verify('duplicate Aadhaar has clear error without number','Aadhaar' in duplicate.get('message','') and aadhaar not in str(duplicate),duplicate)
blankOwner,blankData=create('/api/v1/student-admissions',aadhaarForm|{'registrationNumber':'BLANK'+suffix,'aadhaarNumber':'   '},'admissionId')
verify('blank Aadhaar stored as NULL',blankData.get('aadhaarNumber') is None,blankData)
call('PUT',f'/api/v1/student-admissions/{blankOwner}',aadhaarForm|{'registrationNumber':'BLANK'+suffix},[409],label='duplicate Aadhaar update rejected')
verify('failed duplicate update leaves original unchanged',sql(f'SELECT AadhaarNumber IS NULL FROM studentadmissions WHERE AdmissionId={blankOwner};').strip()=='1')
call('PUT',f'/api/v1/student-admissions/{aadhaarOwner}',aadhaarForm|{'aadhaarNumber':'  '+aadhaar+'  '},[200],label='same owner Aadhaar update allowed')
sql((ROOT/'Database/Integration_20260908/06_AADHAAR_UNIQUENESS.sql').read_text())
verify('Aadhaar unique constraint survives migration rerun',sql("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='studentadmissions' AND index_name='UQ_studentadmissions_AadhaarNumber' AND non_unique=0;").strip()=='1')
# Test blocked semester when linked admission active, then cancellation makes history nonblocking.
call('PATCH',f'/api/semester/{semester}/status',{'status':0},[400,409],label='semester blocked by admission')
sql(f"UPDATE studentadmissions SET IsActive=0,AdmissionStatus='Cancelled' WHERE AdmissionId={admission};")
call('PATCH',f'/api/semester/{semester}/status',{'status':0},[200],label='deactivate unreferenced semester')
call('PATCH',f'/api/v1/students/{student}/status',{'status':0},[200],label='deactivate student retains history')
call('PATCH',f'/api/v1/branches/{branch}/status',{'status':0},[200],label='deactivate branch after dependencies inactive')
call('PATCH',f'/api/v1/courses/{course}/status',{'status':0},[200],label='deactivate course after dependencies inactive')
call('PATCH',f'/api/v1/departments/{department}/status',{'status':0},[200],label='deactivate department after dependencies inactive')
verify('deactivation never deletes students',sql(f'SELECT COUNT(*) FROM students WHERE student_id={student};').strip()=='1')
call('PATCH',f'/api/v1/branches/{branch}/status',{'status':1},[400,409],label='cannot reactivate child below inactive course')
verify('student audit retained after deactivation',int(sql(f'SELECT COUNT(*) FROM student_profile_updates WHERE StudentId={student};').strip())>=1)
verify('status history recorded',int(sql(f'SELECT COUNT(*) FROM entity_status_audit WHERE entity_type=\'course\' AND entity_id={course};').strip())>=1)
call('GET','/api/v1/activity-logs?limit=10',expect=[200],label='activity logs readable')
verify('every completed request writes activity',int(sql('SELECT COUNT(*) FROM api_activity_logs;').strip())>100)
# Existing routes baseline must be a subset of current routes.
original=json.loads((ROOT/'Verification/baseline-openapi.json').read_text())
routekeys=lambda sw:{(p,m) for p,ops in sw['paths'].items() for m in ops if m in ['get','post','put','patch','delete']}
missing=routekeys(original)-routekeys(swagger)
verify('every original route preserved',not missing,sorted(missing))
(W/'Results').mkdir(exist_ok=True)
(W/'Results/route-preservation.json').write_text(json.dumps({'original':len(routekeys(original)),'updated':len(routekeys(swagger)),'missing':sorted(missing)},indent=2))
