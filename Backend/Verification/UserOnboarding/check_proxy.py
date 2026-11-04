"""Read-only/invalid-payload route smoke checks.
Run with CMS_BASE_URL pointing at the frontend proxy origin and
CMS_SUPERADMIN_TOKEN set locally. Does not create users or send email.
"""
import os,json,urllib.request,urllib.error
base=os.environ['CMS_BASE_URL'].rstrip('/')
token=os.environ['CMS_SUPERADMIN_TOKEN']
def call(path,method='GET',body=None,authenticated=True):
    headers={'Content-Type':'application/json','ngrok-skip-browser-warning':'true'}
    if authenticated:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as e:
        try:response=json.load(e)
        except Exception:response={}
        return e.code,response
status,body=call('/api/auth/me/access')
assert status==200,(status,body.get('message'))
assert body['data']['buildId']=='cms-backend-20261103-password-setup-route-r7'
assert body['data']['isSuperAdmin'] is True
for path in ['/api/v1/admin/users','/api/v1/admin/users/lookups']:
    status,_=call(path);assert status==200,(path,status)
status,_=call('/api/v1/admin/users/onboard-college','POST',{})
assert status==400,('onboarding route should reject empty payload with 400, not 404/405',status)
status,_=call('/api/v1/admin/users/onboard-college','POST',{},False)
assert status==401,('anonymous rejection',status)
print('PASS: build, users/lookups reads, onboarding route validation, anonymous rejection through configured base URL')
