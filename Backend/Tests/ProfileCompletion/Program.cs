using System.Text.Json;
using BTech.DTOs;
using BTech.Services;
using ProfileDto = BTech.DTOs.Profile.ProfileResponseDto;

var count = 0;
void Check(bool value, string name) { if (!value) throw new Exception(name); count++; }
bool Complete(string? name = "Test Employee", string? email = "employee@example.org", string? mobile = "9876543210", string? house = "12-34/A") => EmployeeProfileCompletion.IsComplete(name, email, mobile, house);
Check(Complete(), "Four required fields are sufficient");
foreach (var v in new string?[] { null, "", " \t" })
{
    Check(!Complete(name: v), "Missing name");
    Check(!Complete(email: v), "Missing email");
    Check(!Complete(mobile: v), "Missing mobile");
    Check(!Complete(house: v), "Missing house number");
}
foreach (var v in new[] { "bad", "a@@example.org", "Name <a@example.org>", "a@example.org\nb@example.org" })
    Check(!Complete(email: v), "Invalid email");
foreach (var v in new[] { "1234567890", "5876543210", "987654321", "98765432100", "+19876543210", "９８７６５４３２１０" })
    Check(!Complete(mobile: v), "Invalid Indian mobile");
foreach (var v in new[] { "6123456789", "7123456789", "8123456789", "+919876543210", "919876543210", "09876543210", " 9876543210 " })
    Check(Complete(mobile: v), "Valid Indian mobile");
Check(Complete(name: " Test Employee ", email: " employee+test@example.org ", house: " 12/A "), "Trimmed required values");
Check(EmployeeProfileCompletion.AppliesTo(["College Admin"]), "Admin uses employee rule");
Check(EmployeeProfileCompletion.AppliesTo(["FACULTY", "STAFF"]), "Employees use employee rule");
Check(!EmployeeProfileCompletion.AppliesTo(["Student"]), "Student rule preserved");
Check(!EmployeeProfileCompletion.AppliesTo(["STUDENT", "FACULTY"]), "Student mixed-role behavior preserved");
var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
foreach (var completed in new[] { false, true })
{
    foreach (var dto in new object[] { new ProfileDto { ProfileCompleted = completed }, new LoginResponseDto { ProfileCompleted = completed } })
    {
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(dto, options));
        Check(json.RootElement.GetProperty("profileCompleted").GetBoolean() == completed, "Explicit camel-case boolean contract");
    }
}
Console.WriteLine($"PASS: {count} profile completion and response contract checks.");
