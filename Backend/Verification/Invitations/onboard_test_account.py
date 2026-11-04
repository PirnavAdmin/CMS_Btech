"""Creates ONE test college/admin and sends a real setup email via the API.
Run only after configuring deployment secrets and a test inbox you control.
Set CMS_BASE_URL, CMS_AUTH_TOKEN, CMS_TEST_INBOX. Never retry automatically:
a 503 with accountCreated=true requires resend-invitation, not new onboarding.
"""
import os,json,uuid,urllib.request,urllib.error
base=os.environ['CMS_BASE_URL'].rstrip('/')
recipient=os.environ['CMS_TEST_INBOX'].strip()
if '@' not in recipient:raise SystemExit('Set CMS_TEST_INBOX to your controlled test mailbox.')
trace='invite-test-'+uuid.uuid4().hex
payload={'collegeCode':'INVTEST'+uuid.uuid4().hex[:16],'collegeName':'Invitation flow test college',
         'adminName':'Invitation Test Admin','adminEmail':recipient}
req=urllib.request.Request(base+'/api/v1/admin/users/onboard-college',data=json.dumps(payload).encode(),method='POST',headers={
    'Content-Type':'application/json','Authorization':'Bearer '+os.environ['CMS_AUTH_TOKEN'],
    'X-Correlation-ID':trace,'ngrok-skip-browser-warning':'true'})
try:
    with urllib.request.urlopen(req,timeout=90) as r:status=r.status;headers=r.headers;body=json.load(r)
except urllib.error.HTTPError as r:status=r.code;headers=r.headers;body=json.load(r)
print('HTTP:',status,'Build:',headers.get('X-CMS-Build'),'Correlation:',headers.get('X-Correlation-ID') or trace)
data=body.get('data',body)
print(json.dumps({k:data[k] for k in ('collegeId','userId','accountCreated','invitationStatus','smtpAccepted','code','message','correlationId','nextAction') if k in data},indent=2))
if status==201 and data.get('smtpAccepted') is True:
    print('API reports provider acceptance. Verify inbox receipt and that the link uses the configured frontend origin. Do not share its token.')
else:
    print('Inspect matching server logs. If accountCreated=true, fix configuration and resend for the returned userId; do not rerun onboarding.')
raise SystemExit(0 if status==201 and data.get('smtpAccepted') is True else 1)
