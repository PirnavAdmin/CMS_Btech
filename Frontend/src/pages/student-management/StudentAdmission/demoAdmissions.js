// Demo and realistic seed admissions for faculty/team presentation
export const DEMO_ADMISSIONS = [
  {
    id: 101,
    admissionId: 101,
    status: 'DRAFT',
    studentName: 'Karthik Reddy Vangala',
    personal: {
      firstName: 'Karthik Reddy',
      lastName: 'Vangala',
      dob: '2008-04-12',
      gender: 'Male',
      bloodGroup: 'O+',
      nationality: 'Indian'
    },
    contact: {
      mobile: '+91 98480 12345',
      email: 'karthik.reddy@gmail.com',
      currentAddress: 'Plot 42, Jubilee Hills, Hyderabad, Telangana - 500033',
      permanentAddress: 'Plot 42, Jubilee Hills, Hyderabad, Telangana - 500033'
    },
    parents: {
      father: { name: 'V. Krishna Reddy', mobile: '+91 98480 12340', occupation: 'Business', income: '8,50,000' },
      mother: { name: 'V. Sridevi', mobile: '+91 98480 12341' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'CSE',
      admissionType: 'Management',
      academicYear: '2026-27',
      quota: 'Management',
      semester: 'Semester 1'
    },
    application: {
      number: 'REG-2026-771024',
      registrationNumber: 'REG-2026-771024',
      date: '2026-11-24',
      updatedAt: '24 Nov 2026, 9:15 am'
    },
    fees: {
      paymentStatus: 'Pending',
      totalAmount: 120000,
      paidAmount: 0
    },
    completion: {
      percent: 30,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: false, missing: [{ label: 'Alternate Mobile', required: false }, { label: 'Permanent Address Verification', required: true }] },
        { id: 'family', label: 'Parent / guardian', complete: false, missing: [{ label: 'Father PAN / Aadhaar', required: true }] },
        { id: 'education', label: 'Previous Education', complete: false, missing: [{ label: '12th Marksheet', required: true }] }
      ]
    }
  },
  {
    id: 102,
    admissionId: 102,
    status: 'DRAFT',
    studentName: 'Ananya Sharma',
    personal: {
      firstName: 'Ananya',
      lastName: 'Sharma',
      dob: '2008-08-19',
      gender: 'Female',
      bloodGroup: 'B+',
      nationality: 'Indian'
    },
    contact: {
      mobile: '+91 94401 56789',
      email: 'ananya.sharma26@gmail.com',
      currentAddress: 'Flat 304, Green Meadows, Gachibowli, Hyderabad, Telangana - 500032',
      permanentAddress: 'Flat 304, Green Meadows, Gachibowli, Hyderabad, Telangana - 500032'
    },
    parents: {
      father: { name: 'Ramesh Sharma', mobile: '+91 94401 56780', occupation: 'Software Architect', income: '12,00,000' },
      mother: { name: 'Sunitha Sharma', mobile: '+91 94401 56781' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'AI & DS',
      admissionType: 'Regular / Counselling',
      academicYear: '2026-27',
      quota: 'Convenor',
      semester: 'Semester 1'
    },
    application: {
      number: 'REG-2026-882195',
      registrationNumber: 'REG-2026-882195',
      date: '2026-11-24',
      updatedAt: '24 Nov 2026, 9:45 am'
    },
    fees: {
      paymentStatus: 'Pending',
      totalAmount: 85000,
      paidAmount: 0
    },
    completion: {
      percent: 45,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: false, missing: [{ label: 'Mother Qualification', required: false }] },
        { id: 'education', label: 'Previous Education', complete: false, missing: [{ label: 'Transfer Certificate (TC)', required: true }] }
      ]
    }
  },
  {
    id: 103,
    admissionId: 103,
    status: 'DRAFT',
    studentName: 'Sai Teja Goud',
    personal: {
      firstName: 'Sai Teja',
      lastName: 'Goud',
      dob: '2007-11-05',
      gender: 'Male',
      bloodGroup: 'A+',
      nationality: 'Indian'
    },
    contact: {
      mobile: '+91 99890 34120',
      email: 'saiteja.goud@gmail.com',
      currentAddress: 'H.No 12-4-88, Kukatpally Housing Board, Hyderabad, Telangana - 500072',
      permanentAddress: 'H.No 12-4-88, Kukatpally Housing Board, Hyderabad, Telangana - 500072'
    },
    parents: {
      father: { name: 'Venkat Goud', mobile: '+91 99890 34121', occupation: 'Business', income: '6,50,000' },
      mother: { name: 'Laxmi Goud', mobile: '+91 99890 34122' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'ECE',
      admissionType: 'Regular / Counselling',
      academicYear: '2026-27',
      quota: 'Convenor',
      semester: 'Semester 1'
    },
    application: {
      number: 'REG-2026-993412',
      registrationNumber: 'REG-2026-993412',
      date: '2026-11-24',
      updatedAt: '24 Nov 2026, 10:20 am'
    },
    fees: {
      paymentStatus: 'Pending',
      totalAmount: 85000,
      paidAmount: 0
    },
    completion: {
      percent: 58,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: false, missing: [{ label: 'Community & Caste Certificate', required: true }] }
      ]
    }
  },
  {
    id: 104,
    admissionId: 104,
    status: 'SUBMITTED',
    studentName: 'Meghana Kulkarni',
    personal: {
      firstName: 'Meghana',
      lastName: 'Kulkarni',
      dob: '2008-01-22',
      gender: 'Female',
      bloodGroup: 'B-',
      nationality: 'Indian'
    },
    contact: {
      mobile: '+91 98855 43210',
      email: 'meghana.kulkarni@gmail.com',
      currentAddress: 'Villa 18, Palm County, Kompally, Hyderabad, Telangana - 500014',
      permanentAddress: 'Villa 18, Palm County, Kompally, Hyderabad, Telangana - 500014'
    },
    parents: {
      father: { name: 'Srinivas Kulkarni', mobile: '+91 98855 43211', occupation: 'Professor', income: '15,00,000' },
      mother: { name: 'Radha Kulkarni', mobile: '+91 98855 43212' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'AI & DS',
      admissionType: 'Management',
      academicYear: '2026-27',
      quota: 'Management',
      semester: 'Semester 1'
    },
    application: {
      number: 'REG-2026-118490',
      registrationNumber: 'REG-2026-118490',
      date: '2026-11-24',
      updatedAt: '24 Nov 2026, 11:05 am'
    },
    fees: {
      paymentStatus: 'In Progress',
      totalAmount: 110000,
      paidAmount: 50000
    },
    completion: {
      percent: 85,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: true },
        { id: 'verification', label: 'Document verification', complete: false, missing: [{ label: 'Physical verification by admission officer', required: true }] }
      ]
    }
  },
  {
    id: 105,
    admissionId: 105,
    status: 'UNDER_REVIEW',
    studentName: 'Rohit Kumar Verma',
    personal: {
      firstName: 'Rohit Kumar',
      lastName: 'Verma',
      dob: '2007-09-14',
      gender: 'Male',
      bloodGroup: 'O-',
      nationality: 'Indian'
    },
    contact: {
      mobile: '+91 97012 34567',
      email: 'rohit.verma26@gmail.com',
      currentAddress: 'Apt 501, Sai Residency, Madhapur, Hyderabad, Telangana - 500081',
      permanentAddress: 'Apt 501, Sai Residency, Madhapur, Hyderabad, Telangana - 500081'
    },
    parents: {
      father: { name: 'Mahesh Verma', mobile: '+91 97012 34568', occupation: 'Civil Engineer', income: '9,00,000' },
      mother: { name: 'Kavita Verma', mobile: '+91 97012 34569' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'ECE',
      admissionType: 'Regular / Counselling',
      academicYear: '2026-27',
      quota: 'Convenor',
      semester: 'Semester 1'
    },
    application: {
      number: 'REG-2026-224901',
      registrationNumber: 'REG-2026-224901',
      date: '2026-11-24',
      updatedAt: '24 Nov 2026, 11:40 am'
    },
    fees: {
      paymentStatus: 'In Progress',
      totalAmount: 85000,
      paidAmount: 85000
    },
    completion: {
      percent: 100,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: true },
        { id: 'verification', label: 'Document verification', complete: true }
      ]
    }
  },
  {
    id: 106,
    admissionId: 106,
    status: 'VERIFIED',
    studentName: 'Sneha Patel',
    personal: {
      firstName: 'Sneha',
      lastName: 'Patel',
      dob: '2008-03-30',
      gender: 'Female',
      bloodGroup: 'AB+',
      nationality: 'Indian'
    },
    contact: {
      mobile: '+91 91234 56789',
      email: 'sneha.patel@gmail.com',
      currentAddress: '32-A, Banjara Hills Road No 10, Hyderabad, Telangana - 500034',
      permanentAddress: '32-A, Banjara Hills Road No 10, Hyderabad, Telangana - 500034'
    },
    parents: {
      father: { name: 'Kirit Patel', mobile: '+91 91234 56780', occupation: 'Entrepreneur', income: '18,00,000' },
      mother: { name: 'Geetha Patel', mobile: '+91 91234 56781' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'IT',
      admissionType: 'Regular / Counselling',
      academicYear: '2026-27',
      quota: 'Convenor',
      semester: 'Semester 1'
    },
    application: {
      number: 'REG-2026-335812',
      registrationNumber: 'REG-2026-335812',
      date: '2026-11-24',
      updatedAt: '24 Nov 2026, 12:15 pm'
    },
    fees: {
      paymentStatus: 'In Progress',
      totalAmount: 85000,
      paidAmount: 40000
    },
    completion: {
      percent: 88,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: true }
      ]
    }
  },
  {
    id: 107,
    admissionId: 107,
    status: 'APPROVED',
    studentName: 'Aditya Vikram Raju',
    personal: {
      firstName: 'Aditya Vikram',
      lastName: 'Raju',
      dob: '2007-10-18',
      gender: 'Male',
      bloodGroup: 'O+',
      nationality: 'Indian',
      photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&h=380&fit=crop&crop=face'
    },
    contact: {
      mobile: '+91 99080 11223',
      email: 'aditya.raju@gmail.com',
      currentAddress: 'House 55, D-Block, Sainikpuri, Secunderabad, Telangana - 500094',
      permanentAddress: 'House 55, D-Block, Sainikpuri, Secunderabad, Telangana - 500094'
    },
    parents: {
      father: { name: 'Suryanarayana Raju', mobile: '+91 99080 11224', occupation: 'Govt Officer', income: '11,00,000' },
      mother: { name: 'Padmavathi Raju', mobile: '+91 99080 11225' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'CSE',
      admissionType: 'Regular / Counselling',
      academicYear: '2026-27',
      quota: 'Convenor',
      semester: 'Semester 1',
      section: 'Section A',
      rollNumber: '2601A0501'
    },
    application: {
      number: 'REG-2026-441920',
      registrationNumber: 'REG-2026-441920',
      admissionNumber: 'ADM-2026-104921',
      date: '2026-11-22',
      updatedAt: '22 Nov 2026, 2:30 pm'
    },
    previousEducation: {
      tenth: {
        board: 'BSE Telangana / SSC',
        institution: 'Kendriya Vidyalaya, Bolarum, Secunderabad',
        rollNumber: '2410182901',
        passingYear: '2024',
        scoreType: 'CGPA',
        score: '9.6'
      },
      intermediate: {
        qualification: 'Intermediate',
        board: 'Telangana State Board of Intermediate Education (TSBIE)',
        institution: 'Chaitanya Junior College, ECIL',
        rollNumber: '2612049182',
        passingYear: '2026',
        stream: 'MPC',
        scoreType: 'Percentage',
        score: '95.8'
      }
    },
    fees: {
      paymentStatus: 'Paid',
      totalAmount: 85000,
      paidAmount: 85000
    },
    completion: {
      percent: 100,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: true },
        { id: 'verification', label: 'Document verification', complete: true },
        { id: 'approval', label: 'Admission approval', complete: true }
      ]
    }
  },
  {
    id: 108,
    admissionId: 108,
    status: 'APPROVED',
    studentName: 'Divya Sri Mandava',
    personal: {
      firstName: 'Divya Sri',
      lastName: 'Mandava',
      dob: '2008-06-15',
      gender: 'Female',
      bloodGroup: 'A-',
      nationality: 'Indian',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=380&fit=crop&crop=face'
    },
    contact: {
      mobile: '+91 98499 88776',
      email: 'divya.mandava@gmail.com',
      currentAddress: '7-1-29, Ameerpet, Hyderabad, Telangana - 500016',
      permanentAddress: '7-1-29, Ameerpet, Hyderabad, Telangana - 500016'
    },
    parents: {
      father: { name: 'Chandra Sekhar Mandava', mobile: '+91 98499 88777', occupation: 'Bank Manager', income: '10,50,000' },
      mother: { name: 'Vijaya Mandava', mobile: '+91 98499 88778' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'AI & DS',
      admissionType: 'Regular / Counselling',
      academicYear: '2026-27',
      quota: 'Convenor',
      semester: 'Semester 1',
      section: 'Section A',
      rollNumber: '2601A5402'
    },
    application: {
      number: 'REG-2026-552834',
      registrationNumber: 'REG-2026-552834',
      admissionNumber: 'ADM-2026-218743',
      date: '2026-11-21',
      updatedAt: '21 Nov 2026, 4:10 pm'
    },
    previousEducation: {
      tenth: {
        board: 'BSE Andhra Pradesh / SSC',
        institution: 'Little Flower High School, Guntur',
        rollNumber: '2410394851',
        passingYear: '2024',
        scoreType: 'CGPA',
        score: '9.9'
      },
      intermediate: {
        qualification: 'Intermediate',
        board: 'Andhra Pradesh Board of Intermediate Education (BIEAP)',
        institution: 'Sri Chaitanya Junior College, Vijayawada',
        rollNumber: '2612394819',
        passingYear: '2026',
        stream: 'MPC',
        scoreType: 'Percentage',
        score: '97.2'
      }
    },
    fees: {
      paymentStatus: 'Paid',
      totalAmount: 85000,
      paidAmount: 85000
    },
    completion: {
      percent: 100,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: true },
        { id: 'verification', label: 'Document verification', complete: true },
        { id: 'approval', label: 'Admission approval', complete: true }
      ]
    }
  },
  {
    id: 109,
    admissionId: 109,
    status: 'APPROVED',
    studentName: 'Kiran Kumar Yadav',
    personal: {
      firstName: 'Kiran Kumar',
      lastName: 'Yadav',
      dob: '2007-07-04',
      gender: 'Male',
      bloodGroup: 'B+',
      nationality: 'Indian',
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=380&fit=crop&crop=face'
    },
    contact: {
      mobile: '+91 97001 22334',
      email: 'kiran.yadav@gmail.com',
      currentAddress: 'Plot 105, Pragathi Nagar, Hyderabad, Telangana - 500090',
      permanentAddress: 'Plot 105, Pragathi Nagar, Hyderabad, Telangana - 500090'
    },
    parents: {
      father: { name: 'Narsimha Yadav', mobile: '+91 97001 22335', occupation: 'Contractor', income: '8,00,000' },
      mother: { name: 'Sujatha Yadav', mobile: '+91 97001 22336' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'Mechanical Engineering',
      admissionType: 'Management',
      academicYear: '2026-27',
      quota: 'Management',
      semester: 'Semester 1',
      section: 'Section B',
      rollNumber: '2601A0301'
    },
    application: {
      number: 'REG-2026-663748',
      registrationNumber: 'REG-2026-663748',
      admissionNumber: 'ADM-2026-349012',
      date: '2026-11-20',
      updatedAt: '20 Nov 2026, 11:20 am'
    },
    previousEducation: {
      tenth: {
        board: 'BSE Telangana / SSC',
        institution: 'Gowtham Model School, Nizampet',
        rollNumber: '2410492817',
        passingYear: '2024',
        scoreType: 'CGPA',
        score: '9.4'
      },
      intermediate: {
        qualification: 'Intermediate',
        board: 'Telangana State Board of Intermediate Education (TSBIE)',
        institution: 'Narayana Junior College, Kukatpally',
        rollNumber: '2612491028',
        passingYear: '2026',
        stream: 'MPC',
        scoreType: 'Percentage',
        score: '92.5'
      }
    },
    fees: {
      paymentStatus: 'Paid',
      totalAmount: 95000,
      paidAmount: 95000
    },
    completion: {
      percent: 92,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: false, missing: [{ label: 'Migration Certificate (Pending submission)', required: false }] },
        { id: 'verification', label: 'Document verification', complete: true },
        { id: 'approval', label: 'Admission approval', complete: true }
      ]
    }
  },
  {
    id: 110,
    admissionId: 110,
    status: 'APPROVED',
    studentName: 'Pooja Ramakrishnan',
    personal: {
      firstName: 'Pooja',
      lastName: 'Ramakrishnan',
      dob: '2008-02-11',
      gender: 'Female',
      bloodGroup: 'O+',
      nationality: 'Indian',
      photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=300&h=380&fit=crop&crop=face'
    },
    contact: {
      mobile: '+91 94901 33445',
      email: 'pooja.ramakrishnan@gmail.com',
      currentAddress: 'Tower 4, Apt 1102, L&T Serene County, Gachibowli, Hyderabad - 500032',
      permanentAddress: 'Tower 4, Apt 1102, L&T Serene County, Gachibowli, Hyderabad - 500032'
    },
    parents: {
      father: { name: 'Ramakrishnan S.', mobile: '+91 94901 33446', occupation: 'Senior Consultant', income: '16,00,000' },
      mother: { name: 'Meenakshi Ramakrishnan', mobile: '+91 94901 33447' }
    },
    academic: {
      course: 'Bachelor of Technology',
      branch: 'EEE',
      admissionType: 'Regular / Counselling',
      academicYear: '2026-27',
      quota: 'Convenor',
      semester: 'Semester 1',
      section: 'Section A',
      rollNumber: '2601A0401'
    },
    application: {
      number: 'REG-2026-774859',
      registrationNumber: 'REG-2026-774859',
      admissionNumber: 'ADM-2026-482190',
      date: '2026-11-19',
      updatedAt: '19 Nov 2026, 10:45 am'
    },
    previousEducation: {
      tenth: {
        board: 'CBSE',
        institution: 'Delhi Public School, Khajaguda, Hyderabad',
        rollNumber: '2410592810',
        passingYear: '2024',
        scoreType: 'CGPA',
        score: '9.8'
      },
      intermediate: {
        qualification: '12th Standard',
        board: 'CBSE',
        institution: 'Delhi Public School, Khajaguda, Hyderabad',
        rollNumber: '2612591021',
        passingYear: '2026',
        stream: 'MPC',
        scoreType: 'Percentage',
        score: '96.4'
      }
    },
    fees: {
      paymentStatus: 'Paid',
      totalAmount: 85000,
      paidAmount: 85000
    },
    completion: {
      percent: 100,
      sections: [
        { id: 'identity', label: 'Student information', complete: true },
        { id: 'contact', label: 'Student contact', complete: true },
        { id: 'family', label: 'Parent / guardian', complete: true },
        { id: 'education', label: 'Previous Education', complete: true },
        { id: 'verification', label: 'Document verification', complete: true },
        { id: 'approval', label: 'Admission approval', complete: true }
      ]
    }
  }
]

export function getDemoAdmissionById(id) {
  if (!id) return null
  const cleanId = String(id).trim()
  return DEMO_ADMISSIONS.find(d => String(d.id) === cleanId || String(d.admissionId) === cleanId || d.application?.registrationNumber === cleanId || d.application?.admissionNumber === cleanId) || null
}

export function mergeWithDemoAdmissions(apiRows = [], selectedCollege, selectedAcademicYear) {
  const collegeName = selectedCollege?.name || 'raghavendra engineering college'
  const collegeId = selectedCollege?.id || 1
  const yearName = selectedAcademicYear?.name || '2026-27'
  const yearId = selectedAcademicYear?.id || 1

  // Extract set of existing registration numbers and IDs from real API records
  const existingSet = new Set(
    (apiRows || []).flatMap(r => [
      String(r.admissionId || ''),
      String(r.id || ''),
      String(r.application?.registrationNumber || ''),
      String(r.application?.number || '')
    ]).filter(Boolean)
  )

  const adaptedDemo = DEMO_ADMISSIONS
    .filter(d => !existingSet.has(String(d.id)) && !existingSet.has(d.application.registrationNumber))
    .map(d => ({
      ...d,
      collegeId,
      admission: { ...(d.admission || {}), collegeId, college: collegeName },
      academic: { ...(d.academic || {}), collegeId, college: collegeName, academicYearId: yearId, academicYear: yearName },
    }))

  return [...(apiRows || []), ...adaptedDemo]
}
