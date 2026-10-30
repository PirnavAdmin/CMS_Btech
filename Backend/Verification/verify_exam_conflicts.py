"""Exercise the shipped overlap SQL with SQLite. No third-party packages required.
This checks query behavior, not MySQL connectivity or .NET compilation.
"""
import re, sqlite3
from pathlib import Path
root = Path(__file__).resolve().parents[1]
source = (root / 'Repositories/Implementations/ExamConflictGuard.cs').read_text()
def fragment(name):
    return re.search(r'var ' + name + r' = hasHallAllocations\s*\? """(.*?)"""', source, re.S).group(1)
query = re.search(r'var sql = \$\$"""(.*?)""";', source, re.S).group(1)

def run(name, schedules=(), halls=(), changes=None, expected=None, has_halls=True, exam_changes=()):
    db = sqlite3.connect(':memory:')
    db.executescript('''CREATE TABLE exams(exam_id INTEGER, college_id INTEGER, academic_year_id INTEGER,
    course_id INTEGER, branch_id INTEGER, semester_id INTEGER, status INTEGER, deleted_at TEXT);
    CREATE TABLE exam_schedules(exam_schedule_id INTEGER,exam_id INTEGER,classroom_id INTEGER,
    section_id INTEGER,exam_date TEXT,start_time TEXT,end_time TEXT,status INTEGER,deleted_at TEXT);
    CREATE TABLE exam_hall_allocations(exam_schedule_id INTEGER,classroom_id INTEGER,status INTEGER,deleted_at TEXT);''')
    exams = [(1,1,2,1,1,2,1,None),(2,1,2,1,2,2,1,None),(3,1,2,1,1,2,1,None)]
    for eid, status, deleted in exam_changes:
        exams = [x[:6]+(status,deleted) if x[0]==eid else x for x in exams]
    db.executemany('INSERT INTO exams VALUES(?,?,?,?,?,?,?,?)', exams)
    db.executemany('INSERT INTO exam_schedules VALUES(?,?,?,?,?,?,?,?,?)', schedules)
    db.executemany('INSERT INTO exam_hall_allocations VALUES(?,?,?,?)', halls)
    args = dict(ExamId=1,ScheduleId=None,ClassroomId=6,SectionId=2,ExamDate='2026-11-12',
                StartTime='09:30:00',EndTime='11:30:00',CollegeId=1,AcademicYearId=2,CourseId=1,BranchId=1,SemesterId=2)
    args.update(changes or {})
    sql=query.replace('{{allocationHalls}}',fragment('allocationHalls') if has_halls else '')
    sql=sql.replace('{{candidateAllocationHalls}}',fragment('candidateAllocationHalls') if has_halls else '')
    row=db.execute(sql,args).fetchone()
    result = row[2] if row else None
    assert result==expected, f'{name}: expected {expected!r}, got {row!r}'
    db.close()
    print('PASS:', name)

def schedule(sid=10, exam=2, room=6, section=3, date='2026-11-12', start='10:00:00', end='12:00:00', status=1, deleted=None):
    return (sid,exam,room,section,date,start,end,status,deleted)
run('Primary hall across different cohorts',[schedule()],expected='classroomId')
run('Same cohort and section in different halls',[schedule(exam=3,room=7,section=2)],expected='sectionId')
run('Whole-cohort existing schedule',[schedule(exam=3,room=7,section=None)],expected='sectionId')
run('Whole-cohort incoming schedule',[schedule(exam=3,room=7)],changes={'SectionId':None},expected='sectionId')
run('Different sections and halls allowed',[schedule(exam=3,room=7)])
run('Different cohorts and halls allowed',[schedule(room=7)])
run('Adjacent earlier exam allowed',[schedule(start='07:30:00',end='09:30:00')])
run('Adjacent later exam allowed',[schedule(start='11:30:00',end='13:30:00')])
run('Identical interval rejected',[schedule(start='09:30:00',end='11:30:00')],expected='classroomId')
run('Contained interval rejected',[schedule(start='10:00:00',end='11:00:00')],expected='classroomId')
run('Containing interval rejected',[schedule(start='08:00:00',end='13:00:00')],expected='classroomId')
run('Different dates allowed',[schedule(date='2026-11-13')])
run('Inactive schedule ignored',[schedule(status=0)])
run('Deleted schedule ignored',[schedule(deleted='2026-10-06')])
run('Inactive other exam ignored',[schedule()],exam_changes=[(2,0,None)])
run('Deleted other exam ignored',[schedule()],exam_changes=[(2,1,'2026-10-06')])
run('Unchanged update excludes itself',[schedule(sid=1,exam=1,section=2)],changes={'ScheduleId':1})
run('Allocated existing hall checked',[schedule(room=7)],[(10,6,1,None)],expected='classroomId')
run('Inactive allocation ignored',[schedule(room=7)],[(10,6,0,None)])
run('Deleted allocation ignored',[schedule(room=7)],[(10,6,1,'2026-10-06')])
run('Candidate allocated hall checked on update',[schedule(room=8)],[(1,8,1,None)],changes={'ScheduleId':1},expected='classroomId')
run('Allocation versus allocation checked',[schedule(room=None)],[(1,8,1,None),(10,8,1,None)],changes={'ScheduleId':1,'ClassroomId':None},expected='classroomId')
run('Reactivation checks schedules within inactive exam',[schedule(exam=1,section=2)],changes={'ScheduleId':1},exam_changes=[(1,0,None)],expected='classroomId')
run('Legacy schema primary hall still checked',[schedule()],expected='classroomId',has_halls=False)
run('Moving primary hall does not reserve old primary hall',[schedule(sid=1,exam=1,room=6,section=2),schedule(sid=10,room=6)],changes={'ScheduleId':1,'ClassroomId':7})
run('Self allocations excluded',[schedule(sid=1,exam=1,room=6,section=2)],[(1,8,1,None)],changes={'ScheduleId':1})
run('Hall conflict takes priority over student conflict',[schedule(sid=9,exam=3,room=7,section=2),schedule(sid=10)],expected='classroomId')
print('27 overlap SQL scenarios passed.')
