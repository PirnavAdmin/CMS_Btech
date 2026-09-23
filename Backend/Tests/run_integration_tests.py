"""Run HTTP and SQL integration checks against a DISPOSABLE import of the supplied dump.
Python 3.10+, a MySQL client, and the already running backend are required.
This suite creates and changes QA records. See Tests/README.md.
"""
from pathlib import Path
import argparse,os,time,json,urllib.request,urllib.error,hashlib,hmac,base64,re,sys,subprocess
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url',required=True)
parser.add_argument('--mysql-client',default='mysql')
parser.add_argument('--mysql-host',default='127.0.0.1')
parser.add_argument('--mysql-port',type=int,default=33307)
parser.add_argument('--mysql-user',default='root')
parser.add_argument('--jwt-issuer',required=True)
parser.add_argument('--jwt-audience',required=True)
parser.add_argument('--confirm-disposable',action='store_true')
args=parser.parse_args()
if not args.confirm_disposable: parser.error('This suite changes data. Use a disposable database and pass --confirm-disposable.')
if not os.environ.get('CMS_TEST_JWT_KEY'): parser.error('CMS_TEST_JWT_KEY must match the isolated backend JWT key.')
W=Path(__file__).resolve().parent
ROOT=W.parent
base=args.base_url.rstrip('/')
settings={'Jwt':{'Issuer':args.jwt_issuer,'Audience':args.jwt_audience,'Key':os.environ['CMS_TEST_JWT_KEY']}}
client=[args.mysql_client,'--host='+args.mysql_host,'--port='+str(args.mysql_port),'--user='+args.mysql_user,'--batch','--raw','--skip-column-names','cms_btech']
def sql(query):
    result=subprocess.run(client,input=query,text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout
with urllib.request.urlopen(base+'/swagger/v1/swagger.json',timeout=30) as response: swagger=json.load(response)
results=[]
def token(roles=['SUPER_ADMIN','COLLEGE_ADMIN','FACULTY','STUDENT'],college_id=1):
 enc=lambda o:base64.urlsafe_b64encode(json.dumps(o,separators=(',',':')).encode()).rstrip(b'=')
 payload={'sub':'1','http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier':'1','http://schemas.microsoft.com/ws/2008/06/identity/claims/role':roles,'collegeId':str(college_id),'iss':settings['Jwt']['Issuer'],'aud':settings['Jwt']['Audience'],'exp':int(time.time())+7200}
 s=enc({'alg':'HS256','typ':'JWT'})+b'.'+enc(payload)
 return (s+b'.'+base64.urlsafe_b64encode(hmac.new(settings['Jwt']['Key'].encode(),s,hashlib.sha256).digest()).rstrip(b'=')).decode()
def call(method,path,body=None,expect=None,auth=True,label=None,content_type=None):
 global last_raw_body
 headers={'Authorization':'Bearer '+(auth if isinstance(auth,str) else token())} if auth else {}
 if body is not None:headers['Content-Type']=content_type or 'application/json'
 headers['Origin']='http://localhost:5173'
 req=urllib.request.Request(base+path,data=body if isinstance(body,bytes) else json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as res: status=res.status;data=res.read();rh=dict(res.headers)
 except urllib.error.HTTPError as e:status=e.code;data=e.read();rh=dict(e.headers)
 except Exception as e:status=0;data=str(e).encode();rh={}
 last_raw_body=data
 try:obj=json.loads(data)
 except Exception:obj=data[:400].decode(errors='replace')
 ok=(status in expect) if expect is not None else 0<status<500
 result={'method':method,'path':path,'case':label or 'request','status':status,'passed':ok}
 if not ok:result['response']=obj;print('FAIL',method,path,status,str(obj)[:150],flush=True)
 results.append(result)
 return status,obj,rh
# Authenticate each GET route using valid sample identifiers and required query parameters from OpenAPI.
def sample_param(name):
 n=name.lower()
 if n in ['screen']:return 'courses'
 if n=='entity':return 'courses'
 if n in ['pagenumber','page','pagesize','limit']:return '1'
 if 'date' in n:return '2026-09-01'
 if 'year' in n and 'id' not in n:return '2026-27'
 if n=='eligibilitystatus':return 'Eligible'
 if 'search' in n:return 'test'
 return '1'
for path,ops in swagger['paths'].items():
 if 'get' not in ops:continue
 op=ops['get'];url=re.sub(r'\{([^}]+)\}',lambda m:sample_param(m[1]),path)
 qp=[]
 for p in op.get('parameters',[]):
  if p.get('in')=='query' and p.get('required'):qp.append(p['name']+'='+sample_param(p['name']))
 if qp:url+='?'+ '&'.join(qp)
 call('GET',url,label='authenticated read')
# All non-GET routes receive malformed JSON to test routing, binding, auth and validation without arbitrary destructive mutations.
for path,ops in swagger['paths'].items():
 for method,op in ops.items():
  if method not in ['post','put','patch','delete']:continue
  url=re.sub(r'\{([^}]+)\}',lambda m:'9223372036854770000' if m[1].lower()!='entity' else 'courses',path)
  if method=='delete':call(method.upper(),url,expect=[400,401,403,404,409],label='missing record rejection')
  elif path.endswith('/generate-next-year'): call(method.upper(),url,body={},expect=[200,201,409],label='generate next academic year')
  else:call(method.upper(),url,body={},expect=[400,401,403,404,409,415],label='invalid input rejection')

try:
    exec((W/'business_cases.py').read_text(),globals(),globals())
except Exception as error:
    results.append({'method':'TEST','path':'suite completion','case':'unexpected exception','status':0,'passed':False,'response':str(error)})
output=W/'Results';output.mkdir(exist_ok=True)
(output/'api-test-results.json').write_text(json.dumps(results,indent=2))
failed=sum(not x['passed'] for x in results)
print('RESULTS',len(results),'PASSED',len(results)-failed,'FAILED',failed)
sys.exit(1 if failed else 0)
