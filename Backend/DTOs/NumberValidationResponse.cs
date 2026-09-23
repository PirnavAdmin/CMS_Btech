namespace BTech.DTOs
{
    public class NumberValidationResponse
    {
        public bool IsUnique { get; set; }

        public bool RollNumberAvailable { get; set; }

        public bool RegistrationNumberAvailable { get; set; }

        public bool AdmissionNumberAvailable { get; set; }

        public string Message { get; set; } = string.Empty;
    }
}