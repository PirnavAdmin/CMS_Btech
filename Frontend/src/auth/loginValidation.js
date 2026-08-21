const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,}$/

export function validateLogin(values) {
  const identifier = values.identifier.trim()
  const identifierError = !identifier
    ? 'Email, mobile number or employee ID is required.'
    : (EMAIL_PATTERN.test(identifier) || INDIAN_MOBILE_PATTERN.test(identifier) || EMPLOYEE_ID_PATTERN.test(identifier))
      ? ''
      : 'Enter a valid email, mobile number or employee ID.'

  return {
    identifier: identifierError,
    password: !values.password
      ? 'Password is required.'
      : values.password.length < 8
        ? 'Password must be at least 8 characters.'
        : '',
  }
}
