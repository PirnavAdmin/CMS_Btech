export const documentCategories = ['Employment', 'Payroll', 'Certificates', 'Identity', 'Service records']
export function validateDocument(file) {
  if (!file || file.size === 0) return 'Choose a non-empty file.'
  if (file.size > 5 * 1024 * 1024) return 'File size must be 5 MB or less.'
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return 'Choose a PDF, JPG or PNG file.'
  return ''
}
const database = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('staff-document-workspace', 1)
  request.onupgradeneeded = () => { request.result.createObjectStore('files') }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(new Error('Document storage is unavailable.'))
})
export async function documentFile(action, key, file) {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('files', action === 'get' ? 'readonly' : 'readwrite')
      const store = transaction.objectStore('files')
      const request = action === 'get' ? store.get(key) : action === 'put' ? store.put(file, key) : store.delete(key)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(new Error('The document could not be stored.'))
      transaction.onabort = () => reject(new Error('Document storage was interrupted.'))
    })
  } finally { db.close() }
}
