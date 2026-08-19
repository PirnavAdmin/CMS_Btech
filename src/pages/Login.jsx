import { useNavigate } from 'react-router-dom'
import { signIn } from '../auth/auth'
import { ROLES } from '../auth/roles'

export default function Login() {
  const navigate = useNavigate()

  const handleLogin = (role) => {
    signIn(role)
    navigate('/dashboard')
  }

  return (
    <div className="login-page">
      <h1>BTech Management System</h1>

      <h2>Login</h2>

      <div className="login-buttons">
        <button onClick={() => handleLogin(ROLES.ADMIN)}>
          Login as Admin
        </button>

        <button onClick={() => handleLogin(ROLES.FACULTY)}>
          Login as Faculty
        </button>

        <button onClick={() => handleLogin(ROLES.STUDENT)}>
          Login as Student
        </button>
      </div>
    </div>
  )
}