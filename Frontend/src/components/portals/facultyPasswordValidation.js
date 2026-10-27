export const passwordRequirements = password => [
  ['At least 8 characters', password.length >= 8],
  ['One uppercase letter', /[A-Z]/.test(password)],
  ['One lowercase letter', /[a-z]/.test(password)],
  ['One number', /\d/.test(password)],
  ['One special character', /[^A-Za-z0-9]/.test(password)],
]

export function validateFacultyPassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {}
  if (!currentPassword) errors.currentPassword = 'Current password is required.'
  if (!newPassword) errors.newPassword = 'New password is required.'
  else if (!passwordRequirements(newPassword).every(([, met]) => met)) errors.newPassword = 'Use all password requirements.'
  else if (newPassword === currentPassword) errors.newPassword = 'New password must be different from current password.'
  if (!confirmPassword) errors.confirmPassword = 'Confirm your new password.'
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}
