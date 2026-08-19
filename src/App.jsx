import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Attendance from './pages/Attendance'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import MySubjects from './pages/MySubjects'
import Unauthorized from './pages/Unauthorized'
import Users from './pages/Users'
export default function App() { return <Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<Dashboard />} /><Route path="/users" element={<Users />} /><Route path="/attendance" element={<Attendance />} /><Route path="/my-subjects" element={<MySubjects />} /></Route><Route path="/unauthorized" element={<Unauthorized />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes> }
