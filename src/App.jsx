import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/common'

// Alur siswa
import StudentEntry from './pages/StudentEntry'
import StudentRegister from './pages/StudentRegister'
import Adventure from './pages/Adventure'
import Result from './pages/Result'

// Alur guru
import TeacherLogin from './pages/TeacherLogin'
import TeacherDashboard from './pages/TeacherDashboard'
import ClassDetail from './pages/ClassDetail'
import StudentProfile from './pages/StudentProfile'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/guru/login" replace />
  return children
}

export default function App() {
  return (
    <div className="app-bg">
      <Routes>
        {/* ---- Siswa (publik) ---- */}
        <Route path="/" element={<StudentEntry />} />
        <Route path="/mulai/:code" element={<StudentRegister />} />
        <Route path="/main/:studentId" element={<Adventure />} />
        <Route path="/hasil/:studentId" element={<Result />} />

        {/* ---- Guru ---- */}
        <Route path="/guru/login" element={<TeacherLogin />} />
        <Route path="/guru" element={<RequireAuth><TeacherDashboard /></RequireAuth>} />
        <Route path="/guru/kelas/:classId" element={<RequireAuth><ClassDetail /></RequireAuth>} />
        <Route path="/guru/siswa/:studentId" element={<RequireAuth><StudentProfile /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="global-footer">
        Created by parkphikri
      </footer>
    </div>
  )
}

