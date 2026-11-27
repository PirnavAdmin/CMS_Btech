import { useEffect, useState } from 'react'

export function useSyllabusYearOverview(collegeId, academicYearId, revision, subjectApi, syllabusApi, readableError) {
  const [result, setResult] = useState(null)
  const key = JSON.stringify([collegeId, academicYearId, revision])
  const enabled = Boolean(collegeId && academicYearId)
  useEffect(() => {
    if (!enabled) return undefined
    let current = true
    const query = { collegeId, academicYearId }
    const load = (field, request) => Promise.resolve().then(request)
      .then(rows => { if (!Array.isArray(rows)) throw new Error('The syllabus summary data could not be read.'); if (current) setResult(previous => ({ ...(previous?.key === key ? previous : { key }), [field]: { rows } })) })
      .catch(error => { if (current) setResult(previous => ({ ...(previous?.key === key ? previous : { key }), [field]: { error: readableError(error) } })) })
    load('subjects', () => subjectApi.list(query))
    load('records', () => syllabusApi.list(query))
    return () => { current = false }
  }, [collegeId, academicYearId, enabled, key, subjectApi, syllabusApi, readableError])
  return { enabled, ...(result?.key === key ? result : null) }
}

export function getYearSyllabusCounts({ mappings, records, academicYearId, collegeId, keyFor, isActiveContent, documentsOf, documentId, value }) {
  const inScope = row => {
    const year = value(row, 'academicYearId')
    const college = value(row, 'collegeId')
    return (!year || String(year) === String(academicYearId)) && (!college || String(college) === String(collegeId))
  }
  const subjects = mappings == null ? null : new Set(mappings.filter(inScope).map(keyFor).filter(Boolean))
  const scopedRecords = records == null ? null : records.filter(inScope)
  const created = subjects && scopedRecords
    ? new Set(scopedRecords.filter(isActiveContent).map(keyFor).filter(key => subjects.has(key))).size : null
  const documents = scopedRecords ? new Set(scopedRecords.flatMap(documentsOf).map(documentId).filter(Boolean).map(String)).size : null
  return { subjects: subjects?.size ?? null, created, documents, pending: created == null ? null : subjects.size - created }
}
