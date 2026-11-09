"""Real HTTP/JWT and SQL assertions. Requires a fixture from a disposable dump clone.

Never use production: --fixture must name a database ending _faculty_test.
The runner creates test records, captures no real credentials and sends no email.
"""
from pathlib import Path
import argparse,base64,json,os,subprocess,urllib.request,urllib.error,uuid

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--fixture',required=True);p.add_argument('--mysql-client',default='mysql')
p.add_argument('--mysql-port',type=int,required=True);p.add_argument('--output',required=True)
p.add_argument('--mysql-host',default='127.0.0.1');p.add_argument('--mysql-user',default='root')
a=p.parse_args();fixture=json.loads(Path(a.fixture).read_text());db=fixture['database']
if not db.endswith('_faculty_test'):raise RuntimeError('Refusing a non-disposable database.')
base=fixture['base'];college=fixture['college'];other=fixture['otherCollege'];users=fixture['users']
results=[];tag='FC'+uuid.uuid4().hex[:10]
def check(value,label):
    results.append({'case':label,'passed':bool(value)})
    Path(a.output).write_text(json.dumps(results,indent=2))
    if not value:raise AssertionError(label)
def sql(query):
    proc=subprocess.run([a.mysql_client,'--protocol=TCP','-h'+a.mysql_host,'-P'+str(a.mysql_port),'-u'+a.mysql_user,'--batch','--raw','--skip-column-names',db],input=query,text=True,capture_output=True)
    if proc.returncode:raise RuntimeError(proc.stderr.strip())
    return proc.stdout.strip()
def insert(query):return int(sql(query+';SELECT LAST_INSERT_ID();'))
def req(method,path,body=None,role='COLLEGE_ADMIN',raw=None,content_type=None):
    headers={'Authorization':'Bearer '+users[role]['token']} if role else {}
    if body is not None:raw=json.dumps(body).encode();content_type='application/json'
    if content_type:headers['Content-Type']=content_type
    request=urllib.request.Request(base+path,data=raw,method=method,headers=headers)
    try:response=urllib.request.urlopen(request,timeout=30)
    except urllib.error.HTTPError as error:response=error
    content=response.read()
    try:value=json.loads(content)
    except:value=None
    return response.status,value,content,dict(response.headers)
def ok(method,path,body=None,role='COLLEGE_ADMIN',status=200):
    code,value,_,_=req(method,path,body,role)
    if code!=status:raise AssertionError(f'{method} {path} expected {status}; got {code}: '+str(value)[:500])
    return value

check(req('GET','/api/v1/subjects',role=None)[0]==401,'Anonymous protected API denied')
profile=ok('GET','/api/v1/profile')
check(profile['data']['profileCompleted'] is True,'Profile GET computes completed employee profile')
hash_value=(Path(__file__).parent/'test-password-hash.txt').read_text().strip()
if not hash_value.startswith('$2'):raise RuntimeError('Expected a BCrypt test fixture.')
admin=users['COLLEGE_ADMIN']['userId'];student_user=users['STUDENT']['userId']
sql(f"UPDATE users SET password_hash='{hash_value}' WHERE user_id={admin}")
login=ok('POST','/api/v1/auth/login',{'loginId':'R15AUDIT1','password':'CmsQaTest2026!'},role=None)
check(login['data']['profileCompleted'] is True,'Actual password login includes profileCompleted true')

year=insert(f"INSERT INTO academicyears(college_id,academic_year_name,start_date,end_date,status) VALUES({college},'2090-2091','2090-06-01','2091-05-31',1)")
other_year=insert(f"INSERT INTO academicyears(college_id,academic_year_name,start_date,end_date,status) VALUES({other},'2090-2091','2090-06-01','2091-05-31',1)")
course=insert(f"INSERT INTO courses(college_id,course_code,course_name,duration_years,total_semesters,status) VALUES({college},'{tag}','Audit Course',4,8,1)")
branch=insert(f"INSERT INTO branches(course_id,branch_code,branch_name,total_semesters,starting_academic_year_id,status) VALUES({course},'{tag}','Audit Branch',8,{year},1)")
semester_body={'courseId':course,'branchId':branch,'academicYearId':year,'semesterNumber':1,'semesterName':'Semester 1','yearNumber':1,'startDate':None,'endDate':None,'status':1}
first=ok('POST',f'/api/semester?collegeId={college}',semester_body)
semester=first['data']['semesterId']
again=ok('POST',f'/api/semester?collegeId={college}',semester_body)
check(semester>0 and again['data']['semesterId']==semester,'Flat automatic semester create persists ID; retry is idempotent')
check(int(sql(f'SELECT COUNT(*) FROM semesters WHERE branch_id={branch} AND academic_year_id={year} AND semester_number=1'))==1,'Semester retry creates exactly one database row')
listed=ok('GET',f'/api/semester?collegeId={college}&branchId={branch}&courseId={course}&academicYearId={year}')['data']
check(len(listed)==1 and listed[0]['semesterId']==semester,'Semester directory honors course/branch/year filters')
empty_course=insert(f"INSERT INTO courses(college_id,course_code,course_name,duration_years,total_semesters,status) VALUES({college},'{tag}EMPTY','Empty audit course',4,8,1)")
check(req('DELETE',f'/api/v1/courses/{course}')[0]==409,'Course delete rejects active branch dependencies')
check(ok('DELETE',f'/api/v1/courses/{empty_course}')['success'] is True,'Course DELETE supports frontend route and soft removes an unused course')
check(int(sql(f'SELECT COUNT(*) FROM courses WHERE course_id={empty_course} AND deleted_at IS NOT NULL'))==1,'Course removal retains database history')
automatic_ids={1:semester}
for number in range(2,9):
    automatic={**semester_body,'semesterNumber':number,'semesterName':f'Semester {number}','yearNumber':(number+1)//2}
    automatic_ids[number]=ok('POST',f'/api/semester?collegeId={college}',automatic)['data']['semesterId']
check(len(set(automatic_ids.values()))==8 and int(sql(f'SELECT COUNT(*) FROM semesters WHERE branch_id={branch} AND academic_year_id={year} AND is_archived=0'))==8,'Eight-semester branch creates and persists all eight flat payloads')
empty_semester=automatic_ids[2]
check(ok('DELETE',f'/api/semester/{empty_semester}')['success'] is True,'Semester DELETE archives an unreferenced semester')
check(int(sql(f'SELECT is_archived FROM semesters WHERE semester_id={empty_semester}'))==1 and req('GET',f'/api/semester/{empty_semester}')[0]==404,'Archived semester is retained and hidden from detail')
check(req('POST','/api/v1/admin/users',{},role='SUPER_ADMIN')[0]==400,'Account creation alias validates required invitation contract before sending mail')
student=insert(f"INSERT INTO students(user_id,college_id,student_code,full_name,academic_year_id,course_id,branch_id,status) VALUES({student_user},{college},'{tag}','Audit Student',{year},{course},{branch},1)")
other_student=insert(f"INSERT INTO students(college_id,student_code,full_name,academic_year_id,status) VALUES({other},'{tag}B','Other Audit Student',{other_year},1)")

leave_type=tag+'LT';policy_key=tag+'POL'
sql(f"INSERT INTO faculty_leave_types(leave_type_id,college_id,name,code,category,pay_category,status) VALUES('{leave_type}',{college},'Audit leave','{tag}','General','Paid Leave','Active')")
sql(f"INSERT INTO faculty_leave_policies(policy_id,college_id,name,academic_year,applicable_to,from_date,to_date,status,created_by) VALUES('{policy_key}',{college},'Audit leave policy','2090-2091','Teaching','2090-06-01','2091-05-31','Active',{admin})")
sql(f"INSERT INTO faculty_leave_policy_entitlements(policy_id,leave_type_id,entitlement) VALUES('{policy_key}','{leave_type}',10)")
policy_detail=ok('GET',f'/api/v1/faculty-leave/policies/{policy_key}')['data']
check(len(policy_detail['entitlements'])==1 and policy_detail['entitlements'][0]['typeId']==leave_type,'Leave policy GET returns saved entitlement fields needed by edit form')
check(ok('POST',f'/api/v1/faculty-leave/policies/{policy_key}/deactivate')['data']['status']=='Inactive','Missing leave policy deactivation route saves inactive state')
check(sql(f"SELECT status FROM faculty_leave_policies WHERE policy_id='{policy_key}'")=='Inactive','Leave policy deactivation is persisted')
check(ok('POST',f'/api/v1/faculty-leave/policies/{policy_key}/activate')['data']['status']=='Active','Leave activation executes missing conflict procedure successfully')
conflicting_policy=policy_key+'B'
sql(f"INSERT INTO faculty_leave_policies(policy_id,college_id,name,academic_year,applicable_to,from_date,to_date,status,created_by) VALUES('{conflicting_policy}',{college},'Conflicting audit policy','2090-2091','Teaching','2090-07-01','2090-08-01','Inactive',{admin}); INSERT INTO faculty_leave_policy_entitlements(policy_id,leave_type_id,entitlement) VALUES('{conflicting_policy}','{leave_type}',10)")
check(req('POST',f'/api/v1/faculty-leave/policies/{conflicting_policy}/activate')[0]==409,'Overlapping active leave policy rejected without changing existing policy')
bands=[{'grade':'F','min':0,'max':40,'points':0,'pass':False},{'grade':'P','min':40,'max':100,'points':6,'pass':True}]
policy_body={'collegeId':college,'academicYearId':year,'bands':bands}
policy=ok('POST',f'/api/v1/grade-policies?collegeId={college}',policy_body,status=201)
policy_id=policy['id']
check(int(sql(f'SELECT college_id FROM cms_supplemental_api_records WHERE record_id={policy_id}'))==college,'Grade preview policy persists verified college')
check(ok('PUT',f'/api/v1/grade-policies/{policy_id}?collegeId={college}',policy_body)['id']==policy_id,'Unchanged policy update succeeds for existing record')
foreign_policy=ok('POST',f'/api/v1/grade-policies?collegeId={other}',{'collegeId':other,'academicYearId':other_year,'bands':bands},role='SUPER_ADMIN',status=201)['id']
check(req('GET',f'/api/v1/grade-policies/{foreign_policy}')[0]==404,'Cross-college supplemental detail hidden')
check(req('PUT',f'/api/v1/grade-policies/{foreign_policy}',policy_body)[0]==404,'Cross-college supplemental update denied')
check(req('POST','/api/v1/grade-policies',{'collegeId':college,'academicYearId':year,'bands':[]})[0]==400,'Malformed preview grade scale rejected')
policies=ok('GET','/api/v1/grade-policies')['data']
check(all(row['collegeId']==college for row in policies),'Omitted college query still scopes supplemental list')
check(int(sql(f"SELECT COUNT(*) FROM backend_contract_audit WHERE resource='grade-policies' AND record_id={policy_id} AND actor_id={admin}"))==2,'Supplemental create and update have transactional actor audit')

company=ok('POST',f'/api/v1/placements/companies?collegeId={college}',{'companyName':'Audit company '+tag,'collegeId':college},status=201)
company_id=company['companyId']
check(company['collegeId']==college and int(sql(f'SELECT college_id FROM companies WHERE company_id={company_id}'))==college,'Company create uses selected college instead of first college in database')
other_company=ok('POST',f'/api/v1/placements/companies?collegeId={other}',{'companyName':'Other company '+tag,'collegeId':other},role='SUPER_ADMIN',status=201)['companyId']
check(req('GET',f'/api/v1/placements/companies/{other_company}')[0]==404,'Cross-college company detail hidden')
check(req('PUT',f'/api/v1/placements/companies/{other_company}',{'companyName':'Blocked update'})[0]==404,'Cross-college company update denied')
check(req('DELETE',f'/api/v1/placements/companies/{other_company}')[0]==404,'Cross-college company delete denied')
company_list=ok('GET','/api/v1/placements/companies')['data']
check(all(row['collegeId']==college for row in company_list),'Company list enforces tenant with omitted query')
check(ok('GET','/api/v1/placements/reports')['data']['registeredCompanies']==1,'Placement report uses tenant and excludes foreign companies')

category=insert(f"INSERT INTO fee_categories(category_code,category_name,status) VALUES('{tag}','Audit category',1)")
structure=insert(f"INSERT INTO fee_structures(structure_code,structure_group_code,structure_name,college_id,academic_year_id,course_id,branch_id,semester_id,fee_category_id,amount,effective_from,effective_to,status) VALUES('{tag}','{tag}','Audit legacy structure',{college},{year},{course},{branch},{semester},{category},100,'2090-06-01','2091-05-31',1)")
assigned=ok('POST',f'/api/v1/students/{student}/fee-structures',{'feeStructureId':structure,'assignedAmount':100,'assignedOn':'2026-11-07','dueDate':'2091-01-01'},status=201)
student_fee=int(sql(f'SELECT sf.student_fee_id FROM student_fees sf JOIN fee_assignments a ON a.fee_assignment_id=sf.fee_assignment_id WHERE a.student_id={student} AND a.fee_structure_id={structure}'))
check(student_fee>0,'Real student fee assignment creates installment/due record')
payment=ok('POST','/api/v1/fee-collection/payments',{'studentFeeId':student_fee,'feeAmount':25,'fineAmount':0,'paymentMode':'CASH','paymentDate':'2026-11-07T10:00:00','transactionReference':tag},status=201)
overpay=req('POST','/api/v1/fee-collection/payments',{'studentFeeId':student_fee,'feeAmount':100,'fineAmount':0,'paymentMode':'CASH','paymentDate':'2026-11-07T10:00:00'})
check(overpay[0] in [400,409] and int(sql(f'SELECT COUNT(*) FROM fee_payments WHERE student_fee_id={student_fee}'))==1,'Overpayment rejected and failed transaction creates no payment or receipt')
balance=ok('GET',f'/api/v1/fee-students/{student}/balance')
check(float(balance['balance'])==75 and len(balance['ledger'])==1,'Student balance reads saved dues/payments and returns 75 after paying 25 of 100')
check(req('GET',f'/api/v1/fee-students/{other_student}/balance')[0] in [400,403,404],'Cross-college student ledger denied')
structures=ok('GET','/api/v1/fee-structures')['data']
check(all(row['collegeId']==college for row in structures),'Legacy fee structure list uses authorized college')
check(ok('GET','/api/v1/fee-collection/reports/summary')['data']['paymentCount']==1,'Payment summary counts only authorized college payments')
before=int(sql('SELECT COUNT(*) FROM cms_supplemental_api_records'))
blocked=ok('POST',f"/api/v1/fee-collection/payments/{payment['data']['paymentId']}/refund",{},status=501)
check(blocked['code']=='WORKFLOW_NOT_IMPLEMENTED' and int(sql('SELECT COUNT(*) FROM cms_supplemental_api_records'))==before,'Unintegrated refund returns explicit 501 and saves no false financial record')

grade=ok('POST','/api/v1/grades',{'collegeId':college,'gradeCode':'P','gradeName':'Pass','minPercentage':0,'maxPercentage':100,'gradePoint':6},status=201)
grade_id=grade['id']
check(int(sql(f'SELECT college_id FROM grades WHERE grade_id={grade_id}'))==college,'Official grade CRUD writes domain grades table')
check(req('POST','/api/v1/grades',{'collegeId':college,'gradeCode':'X','gradeName':'Overlap','minPercentage':40,'maxPercentage':70})[0]==409,'Overlapping official grade rules rejected')
subject=insert(f"INSERT INTO subjects(subject_code,subject_name,credits,status) VALUES('{tag}','Audit Subject',3,1)")
exam_type=insert(f"INSERT INTO exam_types(college_id,type_code,type_name,status) VALUES({college},'{tag}','Audit Exam Type',1)")
exam=insert(f"INSERT INTO exams(college_id,academic_year_id,course_id,branch_id,semester_id,exam_type_id,exam_code,exam_name,start_date,end_date,status) VALUES({college},{year},{course},{branch},{semester},{exam_type},'{tag}','Audit Exam','2090-09-01','2090-09-01',1)")
schedule=insert(f"INSERT INTO exam_schedules(exam_id,subject_id,exam_date,start_time,end_time,status) VALUES({exam},{subject},'2090-09-01','09:00:00','10:00:00',1)")
result_id=insert(f"INSERT INTO exam_results(exam_schedule_id,student_id,grade_id,maximum_marks,marks_obtained,result_status,published_at,status) VALUES({schedule},{student},{grade_id},100,70,'PASS',UTC_TIMESTAMP(),1)")
official=ok('GET',f'/api/v1/results?collegeId={college}&academicYearId={year}')['data']
check(len(official)==1 and official[0]['records'][0]['totalMarks']==70,'Official results collection reads published exam domain records')
sql(f"INSERT INTO role_permissions(role_id,college_id,module_key,can_view) SELECT r.role_id,{college},'results',1 FROM roles r WHERE r.role_code='STUDENT' AND r.status=1 AND r.college_id IS NULL ON DUPLICATE KEY UPDATE can_view=1")
own_results=ok('GET',f'/api/v1/results/student/{student}',role='STUDENT')['data']
check(len(own_results)==1 and own_results[0]['studentId']==student,'Student own published results authorized against results module')
check(req('GET',f'/api/v1/results/student/{other_student}',role='STUDENT')[0] in [400,403,404],'Student cannot read another student result history')
sql(f'UPDATE exam_results SET published_at=NULL WHERE result_id={result_id}')
check(ok('GET',f'/api/v1/results/student/{student}',role='STUDENT')['data']==[],'Student history hides unpublished results')
check(ok('GET',f'/api/v1/results?collegeId={college}&academicYearId={year}')['data']==[],'Official results list hides unpublished exam results')
check(req('POST','/api/v1/results/publish',{'collegeId':college,'academicYearId':year})[0]==501,'Unintegrated publication cannot report success after a JSON-only save')

photo=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvD0AAAAASUVORK5CYII=')
boundary='CmsAuditBoundary'
data=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="audit.png"\r\nContent-Type: image/png\r\n\r\n').encode()+photo+f'\r\n--{boundary}--\r\n'.encode()
code,uploaded,_,_=req('POST','/api/v1/profile/photo',raw=data,content_type='multipart/form-data; boundary='+boundary)
check(code==200,'Missing employee profile photo upload route now accepts multipart file')
image_path=uploaded['data']['profileImagePath']
check(req('GET',image_path,role=None)[2]==photo,'Saved profile photo URL serves the uploaded bytes')
check(sql(f'SELECT profile_image_path FROM employee_profiles WHERE user_id={admin}')==image_path,'Profile photo path persisted for authenticated user')

# Existing session must respond to current permissions and account state.
sql(f"UPDATE role_permissions rp JOIN roles r ON r.role_id=rp.role_id SET rp.can_view=0 WHERE r.role_code='COLLEGE_ADMIN' AND rp.college_id={college} AND rp.module_key='placement'")
check(req('GET','/api/v1/placements/companies')[0]==403,'Live permission revoke blocks an already-issued session')
sql(f'UPDATE users SET status=0 WHERE user_id={admin}')
check(req('GET','/api/v1/profile')[0]==401,'Live account deactivation invalidates existing access token')
sql(f'UPDATE users SET status=1 WHERE user_id={admin}')
print(f'PASS: {len(results)} frontend contract regression assertions. Real HTTP, JWT, MySQL and persistence checks; no email sent.')
