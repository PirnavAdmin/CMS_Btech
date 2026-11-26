-- =====================================================================
-- CMS B.Tech - Student Admissions Demo Seed Data
-- Module: Student Management -> Student Admissions
-- Purpose: Seeds 10 realistic demo student admission records with
--          diverse statuses (Draft, Submitted, Under Review, Verified, Approved),
--          varied completion percentages, and portraits for demo presentation.
-- =====================================================================

USE `cms_btech`;

-- 1. Karthik Reddy Vangala (Draft - 30%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-771024', '2026-11-24', 'Management', 'Management',
  'Karthik Reddy', 'Vangala', 'Male', '2008-04-12', 'O+',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=380&fit=crop&crop=face',
  'karthik.reddy@gmail.com', '+91 98480 12345', 'V. Krishna Reddy', 850000.00,
  'Plot 42, Jubilee Hills, Hyderabad', 'Telangana', '500033', 1, 'Draft', 'Draft'
);

-- 2. Ananya Sharma (Draft - 45%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-882195', '2026-11-24', 'Regular / Counselling', 'Convenor',
  'Ananya', 'Sharma', 'Female', '2008-08-19', 'B+',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=380&fit=crop&crop=face',
  'ananya.sharma26@gmail.com', '+91 94401 56789', 'Ramesh Sharma', 1200000.00,
  'Flat 304, Green Meadows, Gachibowli, Hyderabad', 'Telangana', '500032', 1, 'Draft', 'Draft'
);

-- 3. Sai Teja Goud (Draft - 58%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-993412', '2026-11-24', 'Regular / Counselling', 'Convenor',
  'Sai Teja', 'Goud', 'Male', '2007-11-05', 'A+',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=380&fit=crop&crop=face',
  'saiteja.goud@gmail.com', '+91 99890 34120', 'Venkat Goud', 650000.00,
  'H.No 12-4-88, Kukatpally Housing Board, Hyderabad', 'Telangana', '500072', 1, 'Draft', 'Draft'
);

-- 4. Meghana Kulkarni (Submitted / Awaiting Review - 85%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-118490', '2026-11-24', 'Management', 'Management',
  'Meghana', 'Kulkarni', 'Female', '2008-01-22', 'B-',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=380&fit=crop&crop=face',
  'meghana.kulkarni@gmail.com', '+91 98855 43210', 'Srinivas Kulkarni', 1500000.00,
  'Villa 18, Palm County, Kompally, Hyderabad', 'Telangana', '500014', 1, 'Submitted', 'Submitted'
);

-- 5. Rohit Kumar Verma (Under Review - 90%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-224901', '2026-11-24', 'Regular / Counselling', 'Convenor',
  'Rohit Kumar', 'Verma', 'Male', '2007-09-14', 'O-',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=380&fit=crop&crop=face',
  'rohit.verma26@gmail.com', '+91 97012 34567', 'Mahesh Verma', 900000.00,
  'Apt 501, Sai Residency, Madhapur, Hyderabad', 'Telangana', '500081', 1, 'Under Review', 'Under Review'
);

-- 6. Sneha Patel (Verified - 88%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-335812', '2026-11-24', 'Regular / Counselling', 'Convenor',
  'Sneha', 'Patel', 'Female', '2008-03-30', 'AB+',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=380&fit=crop&crop=face',
  'sneha.patel@gmail.com', '+91 91234 56789', 'Kirit Patel', 1800000.00,
  '32-A, Banjara Hills Road No 10, Hyderabad', 'Telangana', '500034', 1, 'Verified', 'Verified'
);

-- 7. Aditya Vikram Raju (Approved - 100%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionNo`, `AdmissionDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-441920', '2026-11-22', 'ADM-2026-104921', '2026-11-22', 'Regular / Counselling', 'Convenor',
  'Aditya Vikram', 'Raju', 'Male', '2007-10-18', 'O+',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=380&fit=crop&crop=face',
  'aditya.raju@gmail.com', '+91 99080 11223', 'Suryanarayana Raju', 1100000.00,
  'House 55, D-Block, Sainikpuri, Secunderabad', 'Telangana', '500094', 1, 'Approved', 'Approved'
);

-- 8. Divya Sri Mandava (Approved - 100%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionNo`, `AdmissionDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-552834', '2026-11-21', 'ADM-2026-218743', '2026-11-21', 'Regular / Counselling', 'Convenor',
  'Divya Sri', 'Mandava', 'Female', '2008-06-15', 'A-',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=380&fit=crop&crop=face',
  'divya.mandava@gmail.com', '+91 98499 88776', 'Chandra Sekhar Mandava', 1050000.00,
  '7-1-29, Ameerpet, Hyderabad', 'Telangana', '500016', 1, 'Approved', 'Approved'
);

-- 9. Kiran Kumar Yadav (Approved - 100%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionNo`, `AdmissionDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-663748', '2026-11-20', 'ADM-2026-349012', '2026-11-20', 'Management', 'Management',
  'Kiran Kumar', 'Yadav', 'Male', '2007-07-04', 'B+',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=380&fit=crop&crop=face',
  'kiran.yadav@gmail.com', '+91 97001 22334', 'Narsimha Yadav', 800000.00,
  'Plot 105, Pragathi Nagar, Hyderabad', 'Telangana', '500090', 1, 'Approved', 'Approved'
);

-- 10. Pooja Ramakrishnan (Approved - 100%)
INSERT INTO `studentadmissions` (
  `RegistrationNo`, `RegistrationDate`, `AdmissionNo`, `AdmissionDate`, `AdmissionType`, `AdmissionQuota`,
  `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `BloodGroup`,
  `StudentPhoto`, `Email`, `MobileNumber`, `FatherName`, `AnnualIncome`,
  `Address`, `State`, `Pincode`, `AcademicYearId`, `AdmissionStatus`, `Status`
) VALUES (
  'REG-2026-774859', '2026-11-19', 'ADM-2026-482190', '2026-11-19', 'Regular / Counselling', 'Convenor',
  'Pooja', 'Ramakrishnan', 'Female', '2008-02-11', 'O+',
  'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&h=380&fit=crop&crop=face',
  'pooja.ramakrishnan@gmail.com', '+91 94901 33445', 'Ramakrishnan S.', 1600000.00,
  'Tower 4, Apt 1102, L&T Serene County, Gachibowli, Hyderabad', 'Telangana', '500032', 1, 'Approved', 'Approved'
);
