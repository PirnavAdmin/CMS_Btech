import { useEffect, useState } from 'react'
import { studentDocumentApi } from '../api/apiEndpoints'
import ViewDialog from './ViewDialog'

export default function StudentDocumentActions({ document, studentId }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  const href = document?.data ?? document?.fileUrl ?? document?.documentUrl ?? document?.downloadUrl ?? document?.url
  const documentId = document?.documentId ?? document?.id
  if (!href && (!studentId || !documentId)) return null
  const download = async (preview = false) => {
    setBusy(true); setError('')
    try {
      const result = await studentDocumentApi.download(studentId, documentId)
      const url = URL.createObjectURL(result.blob)
      if (preview) { setPreviewUrl(url); return }
      const link = window.document.createElement('a')
      link.href = url; link.download = result.fileName || document.name || 'document'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (reason) { setError(reason.message || 'Unable to download this document.') }
    finally { setBusy(false) }
  }
  return <span className="student-document-actions">
    {href && <a href={href} target="_blank" rel="noreferrer">Preview</a>}
    {!href && studentId && documentId && <button type="button" disabled={busy} onClick={() => download(true)}>Preview</button>}
    {studentId && documentId && <button type="button" disabled={busy} onClick={() => download(false)}>{busy ? 'Loading...' : 'Download'}</button>}
    {error && <small role="alert">{error}</small>}
    {previewUrl && <ViewDialog title={document.name || 'Document Preview'} onClose={() => setPreviewUrl(null)} showExport={false} maxWidth="900px"><iframe title="Document preview" src={previewUrl} style={{ width: '100%', height: '65vh', border: 0 }} /></ViewDialog>}
  </span>
}
