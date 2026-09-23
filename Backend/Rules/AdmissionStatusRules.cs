using System;

namespace BTech.Rules
{
    public static class AdmissionStatusRules
    {
        public static string Normalize(string status)
        {
            var value = (status ?? string.Empty).Trim();

            return value.ToLowerInvariant() switch
            {
                "draft" => "Draft",
                "pending" => "Application Submitted",
                "submitted" => "Application Submitted",
                "application submitted" => "Application Submitted",
                "under_review" => "Under Review",
                "under review" => "Under Review",
                "verified" => "Document Verification",
                "document verification" => "Document Verification",
                "correction_required" => "Correction Required",
                "correction required" => "Correction Required",
                "approved" => "Approved",
                "rejected" => "Rejected",
                _ => value
            };
        }

        public static bool IsValidStatus(string status)
        {
            var normalized = Normalize(status);

            return normalized == "Draft"
                || normalized == "Application Submitted"
                || normalized == "Under Review"
                || normalized == "Document Verification"
                || normalized == "Correction Required"
                || normalized == "Approved"
                || normalized == "Rejected";
        }

        public static bool IsAllowedTransition(string currentStatus, string newStatus)
        {
            currentStatus = Normalize(currentStatus);
            newStatus = Normalize(newStatus);

            return (currentStatus, newStatus) switch
            {
                ("Draft", "Application Submitted") => true,
                ("Application Submitted", "Under Review") => true,
                ("Application Submitted", "Correction Required") => true,
                ("Application Submitted", "Approved") => true,
                ("Application Submitted", "Rejected") => true,
                ("Under Review", "Document Verification") => true,
                ("Under Review", "Correction Required") => true,
                ("Under Review", "Approved") => true,
                ("Under Review", "Rejected") => true,
                ("Document Verification", "Correction Required") => true,
                ("Document Verification", "Approved") => true,
                ("Document Verification", "Rejected") => true,
                ("Correction Required", "Application Submitted") => true,
                _ => false
            };
        }

        public static string[] GetAllowedNextStatuses(string currentStatus)
        {
            currentStatus = Normalize(currentStatus);

            return currentStatus switch
            {
                "Draft" => new[] { "Application Submitted" },
                "Application Submitted" => new[] { "Under Review", "Correction Required", "Approved", "Rejected" },
                "Under Review" => new[] { "Document Verification", "Correction Required", "Approved", "Rejected" },
                "Document Verification" => new[] { "Correction Required", "Approved", "Rejected" },
                "Correction Required" => new[] { "Application Submitted" },
                "Approved" => Array.Empty<string>(),
                "Rejected" => Array.Empty<string>(),
                _ => Array.Empty<string>()
            };
        }

        public static bool IsFinalStatus(string status)
        {
            status = Normalize(status);
            return status == "Approved" || status == "Rejected";
        }
    }
}
