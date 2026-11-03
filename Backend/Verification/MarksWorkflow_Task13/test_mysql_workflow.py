"""MySQL 8 integration tests. Requires an explicit --run flag and mysql on PATH.

Creates a new, randomly named cms_task13_verify_* database and deletes only that
database on completion. It never imports test rows into an existing database.
Optional MYSQL_TEST_DEFAULTS points to a MySQL client option file for credentials.
Run from any directory: python test_mysql_workflow.py --run
"""
import concurrent.futures
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import unittest
import uuid

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DB = "cms_task13_verify_" + uuid.uuid4().hex[:12]
MYSQL = shutil.which("mysql")
CREATED = False


def sql(text, database=True, allow_error=False):
    command = [MYSQL]
    defaults = os.environ.get("MYSQL_TEST_DEFAULTS")
    if defaults:
        command.append("--defaults-extra-file=" + str(Path(defaults).resolve()))
    command += ["--batch", "--raw", "--skip-column-names", "--default-character-set=utf8mb4"]
    if database:
        command.append(DB)
    result = subprocess.run(command, input=text, text=True, capture_output=True, timeout=60)
    if result.returncode and not allow_error:
        raise AssertionError(result.stderr)
    return result


def quote(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def workflow(action="submit", ids=(1,), actor=101, college=1, exam=1,
             section=None, subject=None, remarks=None, super_admin=0):
    return (f"CALL sp_marks_{action}({exam},{quote(json.dumps(list(ids)))},"
            f"{section or 'NULL'},{subject or 'NULL'},{quote(remarks)},{actor or 'NULL'},"
            f"{college or 'NULL'},{super_admin});")


def mark_fixture():
    statements = ["DELETE FROM marks_approval_history; DELETE FROM marks_approvals; DELETE FROM student_marks;"]
    for mark in range(1, 11):
        college = 2 if mark == 4 else 1
        exam = "NULL" if mark == 8 else 3 if mark == 4 else 2 if mark == 6 else 1
        owner = 102 if mark == 3 else 106 if mark == 4 else 109 if mark == 7 else 101
        status = "APPROVED" if mark == 5 else "REJECTED" if mark == 9 else "DRAFT"
        statements.append(
            "INSERT INTO student_marks(mark_id,college_id,student_id,subject_id,exam_id,section_id,"
            "exam_name,max_marks,marks_obtained,entered_by,status,workflow_status,version_no) VALUES"
            f"({mark},{college},{mark},11,{exam},1,'T13_EXAM_{exam}',100,80,{owner},1,'{status}',1);"
        )
        approval_status = status if status in ("APPROVED", "REJECTED") else "PENDING"
        submitted = owner if status in ("APPROVED", "REJECTED") else "NULL"
        approved = 103 if status == "APPROVED" else "NULL"
        statements.append(
            "INSERT INTO marks_approvals(approval_id,mark_id,approval_status,submitted_by,approved_by) VALUES"
            f"({1000+mark},{mark},'{approval_status}',{submitted},{approved});"
        )
    return "\n".join(statements)


def setup_database():
    global CREATED
    sql(f"CREATE DATABASE `{DB}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;", database=False)
    CREATED = True
    sql((HERE / "mysql_fixture_schema.sql").read_text())
    sql((HERE / "mysql_fixture_get.sql").read_text())
    patch = (ROOT / "Database/MarksWorkflow_Task13/01_Marks_Workflow_Update.sql").read_text()
    sql(patch)
    sql(patch)  # Verify deployment is repeatable.
    # Keep fixture IDs isolated. FK checks are disabled ONLY during synthetic setup.
    seed = ["SET FOREIGN_KEY_CHECKS=0;"]
    seed.append("INSERT INTO roles(role_id,role_code,role_name) VALUES(1,'FACULTY','Faculty'),"
                "(2,'HOD','HOD'),(3,'COLLEGE_ADMIN','College Admin'),(4,'SUPER_ADMIN','Super Admin'),(5,'STUDENT','Student');")
    role_map = {101: [1], 102: [1], 103: [2], 104: [2], 105: [5], 106: [2], 107: [3], 108: [4], 109: [1, 2]}
    for user, roles in role_map.items():
        college = "NULL" if user == 108 else 2 if user == 106 else 1
        seed.append("INSERT INTO users(user_id,college_id,employee_user_id,full_name,password_hash) VALUES"
                    f"({user},{college},'T13_USER_{user}','Workflow Test {user}','NOT_A_LOGIN_HASH');")
        for role in roles:
            seed.append(f"INSERT INTO user_roles(user_id,role_id) VALUES({user},{role});")
    seed.append("INSERT INTO departments(department_id,college_id,department_code,department_name,hod_user_id) VALUES"
                "(10,1,'T13_A','Test A',103),(20,1,'T13_B','Test B',104),(30,2,'T13_C','Test C',106);")
    seed.append("INSERT INTO branches(branch_id,course_id,branch_code,branch_name,department_id) VALUES"
                "(1,1,'T13_A','Test A',10),(2,1,'T13_B','Test B',20),(3,2,'T13_C','Test C',30);")
    for user, department in [(101,10),(102,10),(103,10),(104,20),(106,30),(109,10)]:
        seed.append(f"INSERT INTO employee_profiles(employee_profile_id,user_id,department_id) VALUES({user},{user},{department});")
    for user in [101, 102, 109]:
        seed.append("INSERT INTO faculty(faculty_id,user_id,employee_profile_id,college_id,department_id,faculty_code,faculty_name) VALUES"
                    f"({user},{user},{user},1,10,'T13_F_{user}','Test Faculty {user}');")
        seed.append("INSERT INTO faculty_subject_allocations(faculty_id,course_id,branch_id,semester_id,section_id,subject_id,academic_year_id) VALUES"
                    f"({user},1,1,1,1,11,1);")
    for exam, college, branch in [(1,1,1),(2,1,2),(3,2,3)]:
        seed.append("INSERT INTO exams(exam_id,college_id,academic_year_id,course_id,branch_id,semester_id,exam_type_id,exam_code,exam_name,start_date,end_date) VALUES"
                    f"({exam},{college},1,1,{branch},1,1,'T13_EX_{exam}','Test Exam {exam}','2026-10-01','2026-10-31');")
    seed.append("INSERT INTO subjects(subject_id,subject_code,subject_name) VALUES(11,'T13_SUB','Test Subject');")
    seed.append("INSERT INTO sections(section_id,college_id,academic_year_id,course_id,branch_id,semester_id,section_code,section_name) VALUES"
                "(1,1,1,1,1,1,'T13_A','Test A');")
    for student in range(1, 12):
        college = 2 if student == 4 else 1
        seed.append("INSERT INTO students(student_id,college_id,student_code,full_name,academic_year_id) VALUES"
                    f"({student},{college},'T13_S{student}','Test Student {student}',1);")
    seed.append("SET FOREIGN_KEY_CHECKS=1;")
    sql("\n".join(seed))


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        sql(mark_fixture())

    def snapshot(self):
        return sql("SELECT * FROM student_marks ORDER BY mark_id;"
                   "SELECT * FROM marks_approvals ORDER BY approval_id;"
                   "SELECT * FROM marks_approval_history ORDER BY history_id;").stdout

    def deny_unchanged(self, statement, code):
        before = self.snapshot()
        result = sql(statement, allow_error=True)
        self.assertNotEqual(0, result.returncode, result.stdout)
        self.assertIn(f"ERROR {code}", result.stderr)
        self.assertEqual(before, self.snapshot(), "Failed batch changed marks, approvals or history")

    def test_submit_and_approve_exact_batch(self):
        result = sql(workflow(ids=(1,2)))
        self.assertEqual("2\t2\t0", result.stdout.splitlines()[0])
        result = sql(workflow("approve", (1,2), actor=103))
        self.assertEqual("2\t2\t0", result.stdout.splitlines()[0])
        self.assertEqual("2", sql("SELECT COUNT(*) FROM student_marks WHERE mark_id IN(1,2) AND workflow_status='APPROVED';").stdout.strip())
        self.assertEqual("4", sql("SELECT COUNT(*) FROM marks_approval_history;").stdout.strip())

    def test_reject_edit_resubmit(self):
        sql(workflow())
        sql(workflow("reject", actor=103, remarks="Correct totals"))
        sql("CALL sp_marks_entry_update(1,90,100,NULL,'Corrected',101,1,0);")
        self.assertEqual("PENDING\tNULL\tNULL", sql("SELECT approval_status,submitted_by,approved_by FROM marks_approvals WHERE mark_id=1;").stdout.strip())
        sql(workflow())
        history = sql("SELECT from_status,to_status FROM marks_approval_history WHERE mark_id=1 ORDER BY history_id;").stdout.splitlines()
        self.assertEqual(["DRAFT\tSUBMITTED","SUBMITTED\tREJECTED","REJECTED\tDRAFT","DRAFT\tSUBMITTED"], history)

    def test_direct_resubmit_preserves_rejected_status_in_history(self):
        sql(workflow(ids=(9,)))
        self.assertEqual("REJECTED\tSUBMITTED", sql("SELECT from_status,to_status FROM marks_approval_history;").stdout.strip())

    def test_missing_id_rolls_back_whole_batch(self):
        self.deny_unchanged(workflow(ids=(1,99999)),30003)

    def test_wrong_college_rolls_back_whole_batch(self):
        self.deny_unchanged(workflow(ids=(1,4)),30003)

    def test_wrong_owner(self):
        self.deny_unchanged(workflow(ids=(1,3)),30002)

    def test_wrong_department_hod(self):
        sql(workflow())
        self.deny_unchanged(workflow("approve",actor=104),30002)
        result=sql("CALL sp_marks_approval_pending_for_actor(1,NULL,NULL,104,1,0);",allow_error=True)
        self.assertIn("ERROR 30002",result.stderr)

    def test_student_cannot_submit(self):
        self.deny_unchanged(workflow(actor=105),30002)

    def test_forged_super_admin_flag(self):
        self.deny_unchanged(workflow(super_admin=1),30002)

    def test_null_and_mismatched_college(self):
        self.deny_unchanged(workflow(college=None),30002)
        self.deny_unchanged(workflow(college=2),30002)

    def test_faculty_cannot_review(self):
        sql(workflow())
        self.deny_unchanged(workflow("approve",actor=102),30002)

    def test_reject_requires_reason(self):
        sql(workflow())
        self.deny_unchanged(workflow("reject",actor=103,remarks="   "),30001)

    def test_duplicate_ids(self):
        self.deny_unchanged(workflow(ids=(1,1)),30001)

    def test_empty_and_nonpositive_ids(self):
        self.deny_unchanged(workflow(ids=()),30001)
        self.deny_unchanged(workflow(ids=(0,)),30001)

    def test_wrong_scope_and_legacy_exam(self):
        self.deny_unchanged(workflow(subject=99),30001)
        self.deny_unchanged(workflow(section=99),30001)
        self.deny_unchanged(workflow(ids=(8,)),30003)

    def test_repeat_submit_and_repeat_decision(self):
        sql(workflow())
        self.deny_unchanged(workflow(),30004)
        sql(workflow("approve",actor=103))
        self.deny_unchanged(workflow("approve",actor=103),30004)

    def test_self_review_even_for_administrator(self):
        sql(workflow(actor=107))
        self.deny_unchanged(workflow("approve",actor=107),30002)

    def test_submitted_and_approved_marks_are_locked(self):
        sql(workflow())
        self.deny_unchanged("CALL sp_marks_entry_update(1,90,100,NULL,NULL,101,1,0);",30004)
        self.deny_unchanged("CALL sp_marks_entry_update(5,90,100,NULL,NULL,101,1,0);",30004)

    def test_patch_uses_approval_id_and_checks_version(self):
        sql(workflow())
        self.deny_unchanged("CALL sp_marks_approval_decide(1,'APPROVED',NULL,2,103,1,0);",30003)
        self.deny_unchanged("CALL sp_marks_approval_decide(1001,'APPROVED',NULL,1,103,1,0);",30004)
        sql("CALL sp_marks_approval_decide(1001,'APPROVED',NULL,2,103,1,0);")

    def test_pending_and_faculty_history(self):
        sql(workflow())
        pending=sql("CALL sp_marks_approval_pending_for_actor(1,NULL,NULL,103,1,0);").stdout
        self.assertTrue(pending.startswith("1001\t1\tSUBMITTED"),pending)
        own=sql("CALL sp_marks_approval_history_for_actor(1,101,1,0);").stdout
        self.assertIn("DRAFT\tSUBMITTED\t101",own)
        result=sql("CALL sp_marks_approval_history_for_actor(1,102,1,0);",allow_error=True)
        self.assertIn("ERROR 30002",result.stderr)

    def test_competing_hod_decisions(self):
        sql(workflow())
        commands=[workflow("approve",actor=103),workflow("reject",actor=103,remarks="Correction")]
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda command:sql(command,allow_error=True),commands))
        self.assertEqual(1,sum(x.returncode==0 for x in results))
        self.assertEqual("2",sql("SELECT COUNT(*) FROM marks_approval_history WHERE mark_id=1;").stdout.strip())

    def test_bulk_rejected_correction(self):
        rows=quote(json.dumps([{"studentCode":"T13_S9","subjectCode":"T13_SUB","marksObtained":92,"maxMarks":100}]))
        result=sql(f"SET TRANSACTION ISOLATION LEVEL READ COMMITTED; START TRANSACTION; CALL sp_marks_bulk_upload(1,1,{rows},1,101,1,0); COMMIT;")
        self.assertEqual(["1","1","0","1","0"],result.stdout.splitlines()[0].split("\t")[1:])
        self.assertEqual("DRAFT\t92.00",sql("SELECT workflow_status,marks_obtained FROM student_marks WHERE mark_id=9;").stdout.strip())
        sql(workflow(ids=(9,)))

    def test_revoked_subject_allocation(self):
        sql("UPDATE faculty_subject_allocations SET status=0 WHERE faculty_id=101;")
        try:
            self.deny_unchanged(workflow(),30002)
        finally:
            sql("UPDATE faculty_subject_allocations SET status=1 WHERE faculty_id=101;")


if __name__=="__main__":
    if "--run" not in sys.argv:
        print("NOT RUN. Use --run to create and test a disposable MySQL 8 database.")
        sys.exit(0)
    if not MYSQL:
        print("BLOCKED: mysql client not installed.")
        sys.exit(2)
    try:
        setup_database()
        result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(WorkflowTests))
        sys.exit(0 if result.wasSuccessful() else 1)
    finally:
        if CREATED:
            sql(f"DROP DATABASE `{DB}`;",database=False)
