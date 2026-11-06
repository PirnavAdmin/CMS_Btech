// Keep the real employee identity through profile/photo failures. No synthetic IDs.
export async function saveFacultyRecord(api, data, collegeId, progress) {
  if (progress.uncertain) throw new Error('The previous save returned no employee identity. Verify the directory before creating another employee.')
  const id = data.id || progress.id
  const saved = id ? await api.update(id, data) : await api.create(data, collegeId)
  progress.id = String(saved?.id || saved?.facultyId || id || '')
  if (!progress.id) {
    progress.uncertain = true
    throw new Error('Employee saved, but the server did not return its ID. Verify the directory before retrying.')
  }
  const profileExists = progress.profileExists || data.profileExists
  if (profileExists) await api.updateProfile(progress.id, data)
  else await api.createProfile(progress.id, data)
  progress.profileExists = true
  if (data.photoFile && progress.uploadedPhoto !== data.photoFile) {
    await api.uploadProfilePhoto(progress.id, data.photoFile)
    progress.uploadedPhoto = data.photoFile
  }
  return { id: progress.id, saved }
}
