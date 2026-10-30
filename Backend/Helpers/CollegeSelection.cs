namespace BTech.Helpers;

/// <summary>Reconciles the selected college in the query string and request body.</summary>
public static class CollegeSelection
{
    public static long? Resolve(long? queryCollegeId, long? bodyCollegeId)
    {
        if (queryCollegeId is <= 0 || bodyCollegeId is <= 0)
            throw new ArgumentException("CollegeId must be a positive number.");
        if (queryCollegeId.HasValue && bodyCollegeId.HasValue && queryCollegeId != bodyCollegeId)
            throw new ArgumentException("The query collegeId and body collegeId must match.");
        return queryCollegeId ?? bodyCollegeId;
    }
}
