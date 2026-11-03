"""Run only against a disposable test DB: creates records in two colleges.
Set API_BASE, SUPER_TOKEN, COLLEGE_TOKEN, COLLEGE_A, COLLEGE_B.
The College Admin must belong to A and have academic_years create permission.
"""
import json, os, urllib.request, urllib.error, uuid
base = os.environ['API_BASE'].rstrip('/')
a, b = int(os.environ['COLLEGE_A']), int(os.environ['COLLEGE_B'])
assert a > 0 and b > 0 and a != b
super_token, college_token = os.environ['SUPER_TOKEN'], os.environ['COLLEGE_TOKEN']
name = 'Scope-' + uuid.uuid4().hex[:12]
def post(token, query_id, body_id):
    body = json.dumps({'collegeId': body_id, 'academicYearName': name, 'startDate': '2035-06-01', 'endDate': '2036-05-31'}).encode()
    request = urllib.request.Request(f'{base}/api/v1/academic-years?collegeId={query_id}', data=body, method='POST', headers={'Authorization':'Bearer '+token, 'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request) as response: return response.status, json.load(response)
    except urllib.error.HTTPError as error: return error.code, json.loads(error.read().decode())
for college in (a, b):
    status, data = post(super_token, college, college)
    assert status == 201 and data.get('data', {}).get('collegeId') == college, (college, status, data)
    print(f'PASS: Super Admin created academic year for college {college}')
status, data = post(college_token, b, b)
assert status == 403 and data.get('message') == 'Cross-college access is not permitted.', (status, data)
print('PASS: College Admin cannot create in another college')
status, data = post(super_token, a, b)
assert status == 400, (status, data)
print('PASS: mismatched query and body are rejected')
