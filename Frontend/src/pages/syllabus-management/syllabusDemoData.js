const value = (row, ...keys) => {
  for (const key of keys) {
    const result = row?.[key] ?? row?.[key?.[0]?.toUpperCase() + key?.slice(1)]
    if (result !== undefined && result !== null && result !== '') return result
  }
  return ''
}

const same = (left, right) => String(left ?? '') === String(right ?? '')
const idOf = row => value(row, 'id', 'semesterId')
const semesterIdOf = row => value(row, 'semesterId') || value(row?.semester, 'id', 'semesterId')
const branchIdOf = row => value(row, 'branchId') || value(row?.branch, 'id', 'branchId')
const courseIdOf = row => value(row, 'courseId') || value(row?.course, 'id', 'courseId')
const semesterNumber = row => Number(value(row, 'semesterNumber', 'number') || String(value(row, 'semesterName', 'name', 'semester')).match(/\d+/)?.[0] || 1)
const branchName = branch => String(value(branch, 'name', 'branchName', 'code') || 'Configured branch')
const semesterName = semester => String(value(semester, 'semesterName', 'name') || `Semester ${semesterNumber(semester)}`)
const slug = text => String(text).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8) || 'BRANCH'

const foundationSubjects = {
  1: ['Engineering Mathematics I', 'Applied Physics', 'Programming Fundamentals', 'Basic Electrical Engineering'],
  2: ['Engineering Mathematics II', 'Engineering Chemistry', 'Engineering Graphics', 'Data Structures Fundamentals'],
}

const branchCurricula = [
  {
    match: /computer|\bcse\b|\bit\b|artificial intelligence|\bai\b|data science|software/i,
    terms: [
      ['Discrete Mathematics', 'Object Oriented Programming', 'Digital Logic Design', 'Data Structures'],
      ['Database Management Systems', 'Operating Systems', 'Computer Organization', 'Design and Analysis of Algorithms'],
      ['Computer Networks', 'Theory of Computation', 'Software Engineering', 'Web Technologies'],
      ['Machine Learning', 'Compiler Design', 'Cloud Computing', 'Information Security'],
      ['Artificial Intelligence', 'Big Data Analytics', 'Distributed Systems', 'Professional Elective'],
      ['Deep Learning', 'Internet of Things', 'Project Work', 'Open Elective'],
    ],
  },
  {
    match: /electronics|\bece\b|\beie\b|communication/i,
    terms: [
      ['Network Analysis', 'Electronic Devices', 'Signals and Systems', 'Digital System Design'],
      ['Analog Circuits', 'Electromagnetic Fields', 'Microprocessors', 'Probability and Random Processes'],
      ['Digital Signal Processing', 'Communication Systems', 'Control Systems', 'VLSI Design'],
      ['Embedded Systems', 'Microwave Engineering', 'Optical Communication', 'Professional Elective'],
      ['Wireless Networks', 'Internet of Things', 'Project Work', 'Open Elective'],
      ['Advanced Communication Systems', 'RF Design', 'Project Work', 'Professional Elective'],
    ],
  },
  {
    match: /electrical|\beee\b|power systems/i,
    terms: [
      ['Electrical Circuits', 'Electromagnetic Theory', 'Electrical Measurements', 'Digital Logic'],
      ['Electrical Machines I', 'Power Systems I', 'Analog Electronics', 'Control Systems'],
      ['Electrical Machines II', 'Power Electronics', 'Power System Analysis', 'Microprocessors'],
      ['Electrical Drives', 'Switchgear and Protection', 'Renewable Energy Systems', 'Professional Elective'],
      ['High Voltage Engineering', 'Smart Grid Technologies', 'Project Work', 'Open Elective'],
      ['Electric Vehicle Technology', 'Power System Operation', 'Project Work', 'Professional Elective'],
    ],
  },
  {
    match: /mechanical|\bmech\b|automobile/i,
    terms: [
      ['Engineering Mechanics', 'Thermodynamics', 'Materials Science', 'Manufacturing Processes'],
      ['Fluid Mechanics', 'Kinematics of Machinery', 'Strength of Materials', 'Thermal Engineering'],
      ['Machine Design', 'Heat Transfer', 'Metrology', 'Production Technology'],
      ['Finite Element Methods', 'Refrigeration and Air Conditioning', 'CAD/CAM', 'Professional Elective'],
      ['Robotics and Automation', 'Advanced Manufacturing', 'Project Work', 'Open Elective'],
      ['Automotive Engineering', 'Mechatronics', 'Project Work', 'Professional Elective'],
    ],
  },
  {
    match: /civil|construction|structural/i,
    terms: [
      ['Surveying', 'Building Materials', 'Engineering Geology', 'Strength of Materials'],
      ['Structural Analysis I', 'Fluid Mechanics', 'Geotechnical Engineering', 'Concrete Technology'],
      ['Transportation Engineering', 'Environmental Engineering', 'Hydraulics', 'Design of Structures'],
      ['Water Resources Engineering', 'Foundation Engineering', 'Construction Management', 'Professional Elective'],
      ['Earthquake Resistant Design', 'Urban Planning', 'Project Work', 'Open Elective'],
      ['Advanced Structural Design', 'Infrastructure Engineering', 'Project Work', 'Professional Elective'],
    ],
  },
]

export function sampleSubjectNames(branch, term) {
  const number = Math.max(1, Number(term) || 1)
  if (foundationSubjects[number]) return foundationSubjects[number]
  const name = branchName(branch)
  const curriculum = branchCurricula.find(item => item.match.test(name))
  const subjects = curriculum?.terms[(number - 3) % curriculum.terms.length]
  return subjects || [
    `${name} Engineering Fundamentals`,
    `${name} Core Systems`,
    `${name} Design and Applications`,
    'Professional Elective',
  ]
}

export function makeDemoSubjects(scope) {
  const { branch, semester, branchId } = scope
  const term = semesterNumber(semester)
  const prefix = `${slug(branchName(branch))}-S${term}`
  return sampleSubjectNames(branch, term).map((subjectName, index) => ({
    id: `demo-subject-${branchId}-${idOf(semester)}-${index + 1}`,
    subjectId: `demo-subject-${branchId}-${idOf(semester)}-${index + 1}`,
    courseId: courseIdOf(semester) || courseIdOf(branch),
    branchId,
    semesterId: idOf(semester),
    subjectCode: `${prefix}-${String(index + 1).padStart(2, '0')}`,
    subjectName,
    subjectType: index === 3 ? 'Laboratory / Elective' : 'Theory',
    credits: index === 3 ? 2 : 3,
    description: `${subjectName} introduces foundational concepts, analytical methods and practical applications for ${branchName(branch)} students.`,
    units: [
      { title: 'Unit I · Foundations', topics: ['Core concepts and terminology', 'Principles and introductory examples'] },
      { title: 'Unit II · Methods', topics: ['Standard methods and techniques', 'Worked problems and analysis'] },
      { title: 'Unit III · Applications', topics: ['Applied cases and design choices', 'Tools, systems and implementation'] },
      { title: 'Unit IV · Practice', topics: ['Laboratory or practical exercises', 'Review and course outcomes'] },
    ],
    learningOutcomes: [
      `Explain key concepts in ${subjectName}.`,
      'Apply suitable methods to solve representative problems.',
      'Interpret results and communicate technical reasoning.',
    ],
    status: 'Sample',
    isDemo: true,
  }))
}

const scopeHasRows = (rows, scope, getSemesterId, getBranchId, allowUnscopedBranch = false) => rows.some(row =>
  same(getSemesterId(row), idOf(scope.semester)) &&
  (same(getBranchId(row), scope.branchId) || (allowUnscopedBranch && !getBranchId(row))))

export function addDemoSubjects(realSubjects, scopes) {
  const rows = [...realSubjects]
  scopes.forEach(scope => {
    if (!scope.branchId || scopeHasRows(rows, scope, semesterIdOf, branchIdOf, true)) return
    rows.push(...makeDemoSubjects(scope))
  })
  return rows
}

export function makeDemoSyllabus(scope) {
  const { branch, semester, branchId } = scope
  const branchLabel = branchName(branch)
  const termLabel = semesterName(semester)
  const names = sampleSubjectNames(branch, semesterNumber(semester))
  const title = `${branchLabel} · ${termLabel} Sample Syllabus`
  const sampleText = [
    'SAMPLE SYLLABUS OUTLINE — LOCAL PREVIEW ONLY',
    '',
    title,
    `Branch: ${branchLabel}`,
    `Semester: ${termLabel}`,
    '',
    'Illustrative subject list:',
    ...names.map((name, index) => `${index + 1}. ${name}`),
    '',
    'This sample is for interface preview only. It is not an approved institutional syllabus.',
  ].join('\n')
  const documentId = `demo-document-${branchId}-${idOf(semester)}`
  return {
    id: `demo-syllabus-${branchId}-${idOf(semester)}`,
    syllabusId: `demo-syllabus-${branchId}-${idOf(semester)}`,
    collegeId: value(semester, 'collegeId') || value(branch, 'collegeId'),
    academicYearId: value(semester, 'academicYearId'),
    courseId: courseIdOf(semester) || courseIdOf(branch),
    branchId,
    semesterId: idOf(semester),
    title,
    category: 'Complete Semester Syllabus',
    version: '1.0',
    publicationStatus: 'Sample',
    status: 'Sample',
    isDemo: true,
    updatedAt: '2026-10-01T09:00:00.000Z',
    description: 'Sample data generated locally for the syllabus management screen.',
    revisionNotes: 'Initial local preview version.',
    documents: [{
      id: documentId,
      documentId,
      syllabusId: `demo-syllabus-${branchId}-${idOf(semester)}`,
      fileName: `${slug(branchLabel)}-S${semesterNumber(semester)}-sample-syllabus.txt`,
      contentType: 'text/plain',
      size: new Blob([sampleText]).size,
      uploadedAt: '2026-10-01T09:00:00.000Z',
      isDemo: true,
      sampleText,
    }],
    versions: [{
      id: `demo-version-${branchId}-${idOf(semester)}`,
      version: '1.0',
      status: 'Sample',
      description: 'Initial local preview version.',
      createdAt: '2026-10-01T09:00:00.000Z',
      actor: 'Sample data',
    }],
    activity: [{
      id: `demo-activity-${branchId}-${idOf(semester)}`,
      action: 'Sample syllabus generated',
      description: 'Local preview record; no backend data was created.',
      timestamp: '2026-10-01T09:00:00.000Z',
      actor: 'Sample data',
    }],
  }
}

export function addDemoSyllabi(realRecords, scopes) {
  const rows = [...realRecords]
  scopes.forEach(scope => {
    if (!scope.branchId || scopeHasRows(rows, scope, semesterIdOf, branchIdOf)) return
    rows.push(makeDemoSyllabus(scope))
  })
  return rows
}
