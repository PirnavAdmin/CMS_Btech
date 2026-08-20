const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/

export function validateRegistration(values) {
  const fullName = values.fullName.trim()
  const email = values.email.trim()
  const mobile = values.mobile.trim()

  return {
    fullName: !fullName
      ? 'Full name is required.'
      : fullName.length < 2
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
      : values.password.length < 8
        ? 'Password must be at least 8 characters.'
        : '',
    confirmPassword: !values.confirmPassword
      ? 'Please confirm your password.'
      : values.password !== values.confirmPassword
        ? 'Passwords do not match.'
        : '',
    terms: values.terms ? '' : 'Please accept the Terms & Conditions.',
  }
}
