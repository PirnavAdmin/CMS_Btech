// Keep successful uploads when another document fails; retry only pending files.
export async function uploadAdmissionDocuments(studentId, documents, configuration, upload, onSaved) {
  const pending = [
    ...configuration.map(([key, label]) => ({ key, label, document: documents?.[key] })),
    ...(documents?.otherCertificates || []).map((document, index) => ({ key: 'otherCertificate', label: 'Other Certificate', document, index })),
  ].filter(item => item.document?.file instanceof File)
  if (pending.length && !studentId) throw new Error('Documents are retained. A student identity is required before they can be uploaded.')
  for (const item of pending) {
    try {
      const result = await upload(studentId, item.document.file, { documentType: item.key, documentName: item.label })
      const { file: _file, ...previous } = item.document
      onSaved(item, { ...previous, ...result, uploaded: true, name: result?.fileName ?? result?.name ?? previous.name })
    } catch (error) {
      throw new Error(`${item.label}: ${error.message || 'Upload failed'}. Saved records are retained; retry the remaining documents.`)
    }
  }
  return pending.length
}

export function admissionDecisionAllowed(status, target, authorized) {
  return authorized && ['SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'DOCUMENT_VERIFICATION'].includes(status)
    && ['APPROVED', 'REJECTED', 'CORRECTION_REQUIRED'].includes(target)
}
