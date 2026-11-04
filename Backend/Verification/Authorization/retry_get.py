"""Retry one affected GET without exposing credentials.
Set CMS_BASE_URL, CMS_AFFECTED_PATH and CMS_AUTH_TOKEN locally.
Only use the intended read endpoint. Never place the token in source control.
"""
import os,json,uuid,urllib.request,urllib.error
base=os.environ['CMS_BASE_URL'].rstrip('/')
path=os.environ['CMS_AFFECTED_PATH']
assert path.startswith('/api/') and not path.startswith('//')
trace='cms-auth-'+uuid.uuid4().hex
request=urllib.request.Request(base+path,headers={
    'Authorization':'Bearer '+os.environ['CMS_AUTH_TOKEN'],
    'X-Correlation-ID':trace,'ngrok-skip-browser-warning':'true'},method='GET')
try:
    with urllib.request.urlopen(request,timeout=30) as r:
        status=r.status; returned_trace=r.headers.get('X-Correlation-ID')
        body=r.read()
except urllib.error.HTTPError as r:
    status=r.code;returned_trace=r.headers.get('X-Correlation-ID');body=r.read()
print('HTTP status:',status)
print('Requested correlation ID:',trace)
print('Response correlation ID:',returned_trace)
if status>=400:
    try:
        data=json.loads(body)
        # Print only diagnostics, never account records/tokens.
        print(json.dumps({k:data[k] for k in ('success','code','message','statusCode','correlationId') if k in data},indent=2))
    except Exception:print('Non-JSON error response; inspect proxy/backend logs.')
raise SystemExit(0 if status==200 else 1)
