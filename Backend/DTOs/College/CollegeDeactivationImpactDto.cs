namespace BTech.DTOs.College
{
    public class CollegeDeactivationImpactDto
    {
        public int StudentCount { get; set; }
        public int FacultyCount { get; set; }
        public int DepartmentCount { get; set; }
        public int CourseCount { get; set; }
        public int SectionCount { get; set; }
        public int AdmissionCount { get; set; }
        public int TotalCount => StudentCount + FacultyCount + DepartmentCount + CourseCount + SectionCount + AdmissionCount;
    }

    public class CollegeDeactivationBlockedException : InvalidOperationException
    {
        public CollegeDeactivationImpactDto Impact { get; }
        public CollegeDeactivationBlockedException(CollegeDeactivationImpactDto impact)
            : base("College cannot be deactivated while associated data exists.")
        {
            Impact = impact;
        }
    }
}
