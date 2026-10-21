export function downloadMaterial(material) {
  const url = URL.createObjectURL(new Blob([material.content], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = material.fileName || 'study-notes.txt'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
