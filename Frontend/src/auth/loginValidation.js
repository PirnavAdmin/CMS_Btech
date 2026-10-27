const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,}$/

export function validateLogin(values) {
  const identifier = values.identifier.trim()
  const identifierError = !identifier
    ? 'Email, mobile number, admission ID or employee ID is required.'
    : (EMAIL_PATTERN.test(identifier) || INDIAN_MOBILE_PATTERN.test(identifier) || EMPLOYEE_ID_PATTERN.test(identifier))
      ? ''
      : 'Enter a valid email, mobile number, admission ID or employee ID.'

  return {
    identifier: identifierError,
    // Login must accept existing temporary credentials; enforce password policy on creation/change.
    password: !values.password ? 'Password is required.' : '',
  }
}
