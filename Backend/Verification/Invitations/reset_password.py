"""Send one setup/reset email for an EXISTING users.user_id. No auto retries.
Set CMS_BASE_URL, CMS_AUTH_TOKEN, CMS_USER_ID and optionally CMS_EXPECTED_COLLEGE_ID.
This calls the actual frontend-compatible reset-password URL. Use a controlled
account/test inbox; real SMTP email is requested when the API is configured.
"""
import os,json,uuid,urllib.request,urllib.error
base=os.environ['CMS_BASE_URL'].rstrip('/')
user_id=int(os.environ['CMS_USER_ID'])
if user_id<=0:raise SystemExit('CMS_USER_ID must be a positive users.user_id from the users API.')
body={'userId':user_id}
if os.environ.get('CMS_EXPECTED_COLLEGE_ID'):
    body['collegeId']=int(os.environ['CMS_EXPECTED_COLLEGE_ID'])
    if body['collegeId']<=0:raise SystemExit('CMS_EXPECTED_COLLEGE_ID must be positive.')
trace='reset-link-'+uuid.uuid4().hex
req=urllib.request.Request(base+f'/api/v1/admin/users/{user_id}/reset-password',data=json.dumps(body).encode(),method='POST',headers={
    'Content-Type':'application/json','Authorization':'Bearer '+os.environ['CMS_AUTH_TOKEN'],
    'X-Correlation-ID':trace,'ngrok-skip-browser-warning':'true'})
try:
    with urllib.request.urlopen(req,timeout=90) as r:status=r.status;headers=r.headers;response=json.load(r)
except urllib.error.HTTPError as r:status=r.code;headers=r.headers;response=json.load(r)
print('HTTP:',status,'Build:',headers.get('X-CMS-Build'),'Correlation:',headers.get('X-Correlation-ID') or trace)
data=response.get('data',response)
print(json.dumps({k:data[k] for k in ('userId','linkPurpose','setupRequired','smtpAccepted','invitationStatus','code','message','correlationId','nextAction') if k in data},indent=2))
print('Response correlation ID:',response.get('correlationId'))
if status==200 and data.get('smtpAccepted') is True:
    print('API reports SMTP acceptance. Check the account\'s current email inbox; receipt is a separate verification.')
else:
    print('Use this correlation ID to inspect the lookup/configuration/provider error. Do not create another account to work around this failure.')
raise SystemExit(0 if status==200 and data.get('smtpAccepted') is True else 1)
