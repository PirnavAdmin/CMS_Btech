const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/

export const passwordRequirements = [
  { label: 'At least 8 characters', test: value => value.length >= 8 },
  { label: 'One uppercase English letter (A–Z)', test: value => /[A-Z]/.test(value) },
  { label: 'One lowercase English letter (a–z)', test: value => /[a-z]/.test(value) },
  { label: 'One number (0–9)', test: value => /[0-9]/.test(value) },
  { label: 'One special character', test: value => /[^\p{L}\p{N}\s]/u.test(value) },
]

export function validateRegistration(values) {
  const fullName = values.fullName.trim()
  const email = values.email.trim()
  const mobile = values.mobile.trim()

  return {
    fullName: !fullName
      ? 'Full name is required.'
      : fullName.length < 2 || !/^\p{L}[\p{L}\p{M} .?'-]*$/u.test(fullName)
        ? 'Enter a valid full name.'
        : '',
    email: !email
      ? 'Email is required.'
      : !EMAIL_PATTERN.test(email)
        ? 'Enter a valid email address.'
        : '',
    mobile: !INDIAN_MOBILE_PATTERN.test(mobile)
      ? 'Enter a valid 10-digit mobile number.'
      : '',
    password: !values.password
      ? 'Password is required.'
      : !passwordRequirements.every(rule => rule.test(values.password))
        ? 'Password must meet all five requirements below.'
        : '',
    confirmPassword: !values.confirmPassword
      ? 'Please confirm your password.'
      : values.password !== values.confirmPassword
        ? 'Passwords do not match.'
        : '',
    terms: values.terms ? '' : 'Please accept the Terms & Conditions.',
  }
}
