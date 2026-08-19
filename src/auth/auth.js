const AUTH_STORAGE_KEY = 'btech-authenticated'
export function isAuthenticated() { return localStorage.getItem(AUTH_STORAGE_KEY) === 'true' }
export function signIn() { localStorage.setItem(AUTH_STORAGE_KEY, 'true') }
export function signOut() { localStorage.removeItem(AUTH_STORAGE_KEY) }
