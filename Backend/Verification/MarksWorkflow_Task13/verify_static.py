"""Source/contract checks only. This is not a substitute for dotnet build or MySQL tests."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
baseline=json.loads((HERE/'baseline_manifest.json').read_text())
allowed={
    'Controllers/V1/MarksController.cs','DTOs/Marks/MarksManagementDtos.cs',
    'Services/Interfaces/IMarksService.cs','Services/Implementations/MarksService.cs',
    'Repositories/Interfaces/IMarksRepository.cs','Repositories/Implementations/MarksRepository.cs'
}
changed=[]
missing=[]
for name,expected in baseline['sha256'].items():
    path=ROOT/name
    if not path.is_file(): missing.append(name)
    elif hashlib.sha256(path.read_bytes()).hexdigest()!=expected: changed.append(name)
removed=[]
added=[]
for name,original in baseline['routes'].items():
    original=[x.replace('\r\n','\n') for x in original]
    current=re.findall(r'\[(?:Route|HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete|HttpHead|HttpOptions)\s*(?:\([^\]]*\))?\]',
                       (ROOT/name).read_text(encoding='utf-8-sig')) if (ROOT/name).exists() else []
    removed += [name+': '+x for x in (Counter(original)-Counter(current)).elements()]
    added += [name+': '+x for x in (Counter(current)-Counter(original)).elements()]

patch=(ROOT/'Database/MarksWorkflow_Task13/01_Marks_Workflow_Update.sql').read_text()
procedures={}
for part in patch.split('$$'):
    match=re.search(r'CREATE PROCEDURE\s+`?(\w+)`?\s*\((.*?)\)\s*BEGIN',part,re.S)
    if match: procedures[match.group(1)]=(match.group(2),part)
contracts=json.loads((HERE/'procedure_contracts.json').read_text())
signature_errors=[]
variable_errors=[]
for name,args in contracts.items():
    actual=re.findall(r'\bIN\s+(p_\w+)\s+([A-Z]+(?:\([0-9,]+\))?)',procedures[name][0])
    if [list(x) for x in actual]!=args: signature_errors.append(name)
for name,(args,body) in procedures.items():
    declared=set(re.findall(r'\b(?:IN|OUT|INOUT|DECLARE)\s+([vp]_\w+)',args+' '+body))
    used=set(re.findall(r'\b[vp]_\w+',body))
    if used-declared: variable_errors.append({name:sorted(used-declared)})

tests=(HERE/'test_mysql_workflow.py').read_text()
compile(tests,str(HERE/'test_mysql_workflow.py'),'exec')
report={
    'scope':'Task 13 marks approval workflow; source and contract verification only',
    'original_files_checked':len(baseline['sha256']),
    'original_controller_files':len(baseline['routes']),
    'original_http_attributes':sum(sum(not a.startswith('[Route') for a in x) for x in baseline['routes'].values()),
    'changed_original_files':changed,
    'unrelated_changes':sorted(set(changed)-allowed),
    'missing_original_files':missing,
    'removed_route_attributes':removed,
    'added_route_attributes':added,
    'preserved_existing_procedure_signatures':list(contracts),
    'procedure_signature_errors':signature_errors,
    'sql_undeclared_variable_errors':variable_errors,
    'workflow_procedures_defined':list(procedures),
    'python_test_script_syntax':'PASS',
    'mysql_integration_tests_included':len(re.findall(r'^    def test_',tests,re.M)),
    'dotnet_build':'NOT RUN - execute dotnet build BTech.csproj -c Release with .NET 8 SDK',
    'mysql_integration':'NOT RUN - execute test_mysql_workflow.py --run with MySQL 8',
    'http_integration':'NOT RUN - execute Task13_Marks_Workflow.http against the running API',
    'tool_availability':{'dotnet':bool(shutil.which('dotnet')),'mysql':bool(shutil.which('mysql'))}
}
ok=not any([missing,report['unrelated_changes'],removed,signature_errors,variable_errors])
report['static_verification']='PASS' if ok else 'FAIL'
(HERE/'verification_report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
sys.exit(0 if ok else 1)
