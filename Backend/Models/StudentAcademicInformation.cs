namespace BTech.Models
{
    public sealed class StudentAcademicInformation
    {
        public int AcademicId { get; set; }
        public string RollNumber { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public string AdmissionNumber { get; set; } = string.Empty;
        public string Course { get; set; } = string.Empty;
        public string Branch { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public int Semester { get; set; }
        public string Section { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
    }
}
