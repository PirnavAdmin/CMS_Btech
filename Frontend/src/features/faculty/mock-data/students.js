// Realistic Indian student records for Dr. Ananya Rao's assigned sections
// Total 182 students across CSE-3A (64), CSE-3B (60), and CSE-5A (58)

const indianFirstNames = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Aditya', 'Kavya', 'Rahul', 'Sneha',
  'Vikram', 'Pooja', 'Karthik', 'Divya', 'Siddharth', 'Neha', 'Arjun', 'Meera',
  'Varun', 'Rhea', 'Nikhil', 'Tanvi', 'Abhishek', 'Shreya', 'Gaurav', 'Isha',
  'Pranav', 'Anushka', 'Harsh', 'Swati', 'Manish', 'Bhavna', 'Rishi', 'Tara',
  'Deepak', 'Aparna', 'Sameer', 'Priyanka', 'Karan', 'Sanjana', 'Amit', 'Nisha',
  'Rajat', 'Simran', 'Akash', 'Shruti', 'Mayank', 'Ritu', 'Alok', 'Preeti'
]

const indianLastNames = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Kulkarni', 'Deshmukh',
  'Gupta', 'Sundaram', 'Krishnan', 'Malhotra', 'Joshi', 'Chopra', 'Rao', 'Bhat',
  'Menon', 'Mehta', 'Agarwal', 'Saxena', 'Pandey', 'Mishra', 'Choudhury', 'Nambiar'
]

function getMonthlyAttendance(attendance, seed) {
  return ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((month, index) => ({
    month,
    percentage: Math.min(100, Math.max(0, attendance + ((seed + index * 7) % 13) - 6)),
  }))
}

function generateStudents() {
  const list = []
  let globalIndex = 1

  // Section 3A (64 students)
  for (let i = 1; i <= 64; i++) {
    const fn = indianFirstNames[(globalIndex * 7) % indianFirstNames.length]
    const ln = indianLastNames[(globalIndex * 11) % indianLastNames.length]
    const roll = `23CSE${String(i).padStart(3, '0')}`
    const attendancePct = i === 4 ? 68 : i === 12 ? 71 : i === 23 ? 73 : Math.min(100, Math.max(76, 75 + ((i * 17) % 24)))
    list.push({
      id: `std-${globalIndex}`,
      rollNumber: roll,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@student.apjkit.edu.in`,
      phone: `+91 9${String(100000000 + (globalIndex * 48271) % 900000000)}`,
      sectionId: 'cse-3a',
      sectionName: 'CSE · Semester 3 · Section A',
      semester: 3,
      semesterName: 'Semester III',
      branch: 'Computer Science & Engineering',
      branchCode: 'CSE',
      academicYear: '2026–2027',
      status: 'Active',
      category: i % 5 === 0 ? 'Lateral Entry' : 'Regular',
      cgpa: (7.2 + ((i * 13) % 27) / 10).toFixed(2),
      overallAttendance: attendancePct,
      monthlyAttendance: getMonthlyAttendance(attendancePct, globalIndex),
      subjectAttendance: {
        CS301: attendancePct,
        CS302: Math.min(100, Math.max(65, attendancePct + ((i % 5) - 2))),
      },
      marks: {
        CS301_Mid1: 18 + (i % 12),
        CS302_Mid1: 20 + (i % 10),
      },
      creditsEarned: 44,
      totalCreditsRequired: 160,
      electives: ['Open Elective: Intro to AI', 'Professional Elective I: Graph Theory'],
      documents: [
        { name: '10th Marksheet.pdf', type: 'PDF', verified: true, date: '2023-08-10' },
        { name: '12th Marksheet.pdf', type: 'PDF', verified: true, date: '2023-08-10' },
        { name: 'Aadhaar Card.pdf', type: 'PDF', verified: true, date: '2023-08-10' },
      ],
      guardianName: `${fn}'s Father`,
      bloodGroup: ['O+', 'A+', 'B+', 'AB+', 'O-'][i % 5],
    })
    globalIndex++
  }

  // Section 3B (60 students)
  for (let i = 1; i <= 60; i++) {
    const fn = indianFirstNames[(globalIndex * 5) % indianFirstNames.length]
    const ln = indianLastNames[(globalIndex * 13) % indianLastNames.length]
    const roll = `23CSE${String(64 + i).padStart(3, '0')}`
    const attendancePct = i === 8 ? 69 : i === 19 ? 72 : Math.min(100, Math.max(76, 75 + ((i * 19) % 24)))
    list.push({
      id: `std-${globalIndex}`,
      rollNumber: roll,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@student.apjkit.edu.in`,
      phone: `+91 9${String(100000000 + (globalIndex * 48271) % 900000000)}`,
      sectionId: 'cse-3b',
      sectionName: 'CSE · Semester 3 · Section B',
      semester: 3,
      semesterName: 'Semester III',
      branch: 'Computer Science & Engineering',
      branchCode: 'CSE',
      academicYear: '2026–2027',
      status: 'Active',
      category: 'Regular',
      cgpa: (7.0 + ((i * 11) % 28) / 10).toFixed(2),
      overallAttendance: attendancePct,
      monthlyAttendance: getMonthlyAttendance(attendancePct, globalIndex),
      subjectAttendance: {
        CS301: attendancePct,
      },
      marks: {
        CS301_Mid1: 17 + (i % 13),
      },
      creditsEarned: 44,
      totalCreditsRequired: 160,
      electives: ['Open Elective: Robotics', 'Professional Elective I: Graph Theory'],
      documents: [
        { name: '10th Marksheet.pdf', type: 'PDF', verified: true, date: '2023-08-12' },
        { name: '12th Marksheet.pdf', type: 'PDF', verified: true, date: '2023-08-12' },
      ],
      guardianName: `${fn}'s Guardian`,
      bloodGroup: ['B+', 'O+', 'A+', 'AB+'][i % 4],
    })
    globalIndex++
  }

  // Section 5A (58 students)
  for (let i = 1; i <= 58; i++) {
    const fn = indianFirstNames[(globalIndex * 9) % indianFirstNames.length]
    const ln = indianLastNames[(globalIndex * 7) % indianLastNames.length]
    const roll = `22CSE${String(i).padStart(3, '0')}`
    const attendancePct = i === 15 ? 70 : Math.min(100, Math.max(76, 77 + ((i * 13) % 22)))
    list.push({
      id: `std-${globalIndex}`,
      rollNumber: roll,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@student.apjkit.edu.in`,
      phone: `+91 9${String(100000000 + (globalIndex * 48271) % 900000000)}`,
      sectionId: 'cse-5a',
      sectionName: 'CSE · Semester 5 · Section A',
      semester: 5,
      semesterName: 'Semester V',
      branch: 'Computer Science & Engineering',
      branchCode: 'CSE',
      academicYear: '2026–2027',
      status: 'Active',
      category: 'Regular',
      cgpa: (7.4 + ((i * 7) % 25) / 10).toFixed(2),
      overallAttendance: attendancePct,
      monthlyAttendance: getMonthlyAttendance(attendancePct, globalIndex),
      subjectAttendance: {
        CS501: attendancePct,
      },
      marks: {
        CS501_Mid1: 21 + (i % 9),
      },
      creditsEarned: 88,
      totalCreditsRequired: 160,
      electives: ['Professional Elective III: Cloud Computing', 'Open Elective II: Finance for Engineers'],
      documents: [
        { name: '10th Marksheet.pdf', type: 'PDF', verified: true, date: '2022-08-15' },
        { name: '12th Marksheet.pdf', type: 'PDF', verified: true, date: '2022-08-15' },
      ],
      guardianName: `${fn}'s Parent`,
      bloodGroup: ['A+', 'O+', 'B+'][i % 3],
    })
    globalIndex++
  }

  return list
}

export const students = generateStudents()
