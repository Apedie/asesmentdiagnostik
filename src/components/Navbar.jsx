import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()

  async function keluar() {
    await signOut()
    nav('/guru/login', { replace: true })
  }

  return (
    <div className="navbar">
      <Link to="/guru" className="brand-white">🧭 Petualangan Jati Diri</Link>
      <span className="spacer" />
      <span style={{ color: '#b7e4c7', fontSize: '0.85rem' }} className="hide-mobile">{user?.email}</span>
      <button className="btn btn-sm btn-ghost" style={{ borderColor: '#95d5b2', color: '#fff' }} onClick={keluar}>
        Keluar
      </button>
    </div>
  )
}
