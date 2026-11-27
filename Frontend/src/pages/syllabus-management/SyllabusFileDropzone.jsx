import { FileText, FileSpreadsheet, Presentation, Image as ImageIcon, X, RotateCcw, Upload, Ban } from 'lucide-react'
import { classifySyllabusFile, formatFileSize, SYLLABUS_ACCEPT, validateSyllabusFile, fileIdentity } from './syllabusFiles.js'

const iconFor = type => type === 'Image' ? ImageIcon : type === 'Spreadsheet' ? FileSpreadsheet : type === 'Presentation' ? Presentation : FileText

export default function SyllabusFileDropzone({ files, onChange, disabled = false, onRetry, onCancel, maxFileSize, onPreview, editableTitles = false }) {
  const addFiles = incoming => {
    const next = [...files]
    const errors = []
    const existing = new Set(next.map(item => fileIdentity(item.file)))
    for (const file of incoming) {
      const error = validateSyllabusFile(file, maxFileSize)
      if (error) { errors.push(file.name + ': ' + error); continue }
      const identity = fileIdentity(file)
      if (existing.has(identity)) { errors.push(file.name + ': this file is already selected.'); continue }
      existing.add(identity)
      next.push({ key: identity + '|' + Math.random().toString(36).slice(2), file, title: file.name.replace(/\.[^.]+$/, ''), status: 'queued', progress: 0, message: '' })
    }
    onChange(next, errors)
  }
  const handleDrop = event => {
    event.preventDefault()
    if (!disabled) addFiles(Array.from(event.dataTransfer.files || []))
  }

  return <section className="syllabus-dropzone-section" aria-label="Syllabus documents">
    <div className="syllabus-dropzone" onDragOver={event => event.preventDefault()} onDrop={handleDrop}>
      <input
        type="file"
        multiple
        accept={SYLLABUS_ACCEPT}
        disabled={disabled}
        aria-label="Choose syllabus documents"
        onChange={event => { addFiles(Array.from(event.target.files || [])); event.target.value = '' }}
      />
      <span className="syllabus-dropzone__icon" aria-hidden="true"><Upload size={20} /></span>
      <strong>Drop documents here or Browse Files</strong>
      <span>PDF, Office, OpenDocument, text, CSV and image files</span>
      <small>Maximum {formatFileSize(maxFileSize)} per file. Multiple files are supported.</small>
    </div>
    {files.length > 0 && <ul className="syllabus-file-list">
      {files.map(item => {
        const type = classifySyllabusFile(item.file)
        const Icon = iconFor(type)
        const previewable = /\.(pdf|png|jpe?g|txt|csv)$/i.test(item.file.name)
        return <li className="syllabus-file" key={item.key}>
          <span className="syllabus-file__icon" aria-hidden="true"><Icon size={19} /></span>
          <span className="syllabus-file__details">
            <strong title={item.file.name}>{item.file.name}</strong>
            {editableTitles && <label>Document title <input value={item.title} maxLength={160} disabled={disabled || item.status === 'uploaded'} onChange={event => onChange(files.map(file => file.key === item.key ? { ...file, title: event.target.value } : file), [])} /></label>}
            <small>Document type: {item.file.name.split('.').pop()?.toUpperCase() || type}</small>
            <small>{formatFileSize(item.file.size)} · {item.status === 'uploading' ? 'Uploading ' + Math.round(item.progress || 0) + '%' : item.status === 'uploaded' ? 'Uploaded' : item.status === 'failed' ? item.message || 'Upload failed' : item.status === 'cancelled' ? 'Cancelled' : 'Ready to upload'}</small>
            {item.status === 'uploading' && <progress max="100" value={item.progress || 0} aria-label={'Upload progress for ' + item.file.name} />}
          </span>
          <span className="syllabus-file__actions">
            {previewable && onPreview && <button type="button" className="syllabus-icon-button" onClick={() => onPreview(item.file)} aria-label={'Preview ' + item.file.name}>View</button>}
            {item.status === 'uploading' && <button type="button" className="syllabus-icon-button" aria-label={'Cancel ' + item.file.name + ' upload'} onClick={() => onCancel?.(item.key)}><Ban size={16} /></button>}
            {(item.status === 'failed' || item.status === 'cancelled') && !disabled && <button type="button" className="syllabus-icon-button" aria-label={'Retry ' + item.file.name} onClick={() => onRetry?.(item.key)}><RotateCcw size={16} /></button>}
            {item.status !== 'uploading' && !disabled && <button type="button" className="syllabus-icon-button" aria-label={'Remove ' + item.file.name} onClick={() => onChange(files.filter(file => file.key !== item.key), [])}><X size={17} /></button>}
          </span>
        </li>
      })}
    </ul>}
  </section>
}
