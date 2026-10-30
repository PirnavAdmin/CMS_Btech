"""SQLite checks of the merged hall-allocation overlap SQL (not a live MySQL test)."""
from pathlib import Path
import re,sqlite3
src=(Path(__file__).resolve().parents[1]/'Controllers/V1/ExamSchedulesViewsController.cs').read_text()
part=src[src.index('    private async Task ValidateHallOverlapAsync('):]
query=re.search(r'ExecuteScalarAsync<long\?>\("""(.*?)"""',part,re.S).group(1)
def check(name,room=6,status=1,deleted=None,exam_status=1,exam_deleted=None,start='10:00:00',end='12:00:00',date='2026-11-12',allocation=None,expected=True):
 db=sqlite3.connect(':memory:')
 db.executescript('''CREATE TABLE exams(exam_id INTEGER,status INTEGER,deleted_at TEXT);
 CREATE TABLE exam_schedules(exam_schedule_id INTEGER,exam_id INTEGER,classroom_id INTEGER,status INTEGER,deleted_at TEXT,exam_date TEXT,start_time TEXT,end_time TEXT);
 CREATE TABLE exam_hall_allocations(exam_schedule_id INTEGER,classroom_id INTEGER,status INTEGER,deleted_at TEXT);''')
 db.executemany('INSERT INTO exams VALUES(?,?,?)',[(1,1,None),(2,exam_status,exam_deleted)])
 db.executemany('INSERT INTO exam_schedules VALUES(?,?,?,?,?,?,?,?)',[(1,1,6,1,None,'2026-11-12','09:30:00','11:30:00'),(2,2,room,status,deleted,date,start,end)])
 db.execute('INSERT INTO exam_hall_allocations VALUES(?,?,?,?)',(1,6,1,None))
 if allocation:db.execute('INSERT INTO exam_hall_allocations VALUES(?,?,?,?)',(2,*allocation))
 row=db.execute(query,{'ScheduleId':1,'ClassroomId':6}).fetchone()
 assert (row is not None)==expected,(name,row)
 print('PASS:',name);db.close()
check('Primary classroom overlap blocked')
check('Allocated classroom overlap blocked',room=7,allocation=(6,1,None))
check('Inactive allocation ignored',room=7,allocation=(6,0,None),expected=False)
check('Deleted allocation ignored',room=7,allocation=(6,1,'deleted'),expected=False)
check('Inactive schedule ignored',status=0,expected=False)
check('Deleted schedule ignored',deleted='deleted',expected=False)
check('Inactive exam ignored',exam_status=0,expected=False)
check('Deleted exam ignored',exam_deleted='deleted',expected=False)
check('Adjacent earlier schedule allowed',start='07:30:00',end='09:30:00',expected=False)
check('Adjacent later schedule allowed',start='11:30:00',end='13:30:00',expected=False)
check('Different date allowed',date='2026-11-13',expected=False)
check('Other classroom and own allocation allowed',room=7,expected=False)
assert src.count('await AcquireConflictLeaseAsync(connection)')==3
assert src.count('if (request.Status ?? true)')==2
print('12 hall SQL cases and shared-lock wiring checks passed.')
