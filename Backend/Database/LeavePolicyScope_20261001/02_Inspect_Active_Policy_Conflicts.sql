-- Read-only checks. Run AFTER 01_Leave_Policy_Scope_Fix.sql in your selected database.
SET @college_id = 87;
SELECT p.policy_id,p.name,p.college_id,p.academic_year,p.applicable_to,
       p.department_id,d.department_name,p.branch_id,b.branch_name,p.from_date,p.to_date,p.status
FROM faculty_leave_policies p
LEFT JOIN branches b ON b.branch_id=p.branch_id
LEFT JOIN departments d ON d.department_id=COALESCE(p.department_id,b.department_id)
WHERE p.college_id=@college_id AND p.status='Active'
ORDER BY p.from_date,p.name;

-- Any returned pair has a real overlap under the same rule used by the backend.
SELECT a.college_id,a.policy_id AS first_policy_id,a.name AS first_policy_name,
       a.from_date AS first_from_date,a.to_date AS first_to_date,
       b.policy_id AS second_policy_id,b.name AS second_policy_name,
       b.from_date AS second_from_date,b.to_date AS second_to_date,
       fn_flp_academic_year_key(a.academic_year) AS academic_year
FROM faculty_leave_policies a
JOIN faculty_leave_policies b ON a.college_id=b.college_id AND a.policy_id<b.policy_id
LEFT JOIN branches ab ON ab.branch_id=a.branch_id
LEFT JOIN branches bb ON bb.branch_id=b.branch_id
WHERE a.college_id=@college_id AND a.status='Active' AND b.status='Active'
  AND fn_flp_academic_year_key(a.academic_year)=fn_flp_academic_year_key(b.academic_year)
  AND (fn_flp_employee_type(a.applicable_to)='Both' OR fn_flp_employee_type(b.applicable_to)='Both'
       OR fn_flp_employee_type(a.applicable_to)=fn_flp_employee_type(b.applicable_to))
  AND a.from_date<=b.to_date AND a.to_date>=b.from_date
  AND (a.branch_id IS NULL OR b.branch_id IS NULL OR a.branch_id=b.branch_id)
  AND (COALESCE(a.department_id,ab.department_id) IS NULL OR COALESCE(b.department_id,bb.department_id) IS NULL
       OR COALESCE(a.department_id,ab.department_id)=COALESCE(b.department_id,bb.department_id));

SELECT * FROM faculty_leave_policy_scope_audit ORDER BY policy_id;
