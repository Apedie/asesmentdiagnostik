import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ConfigWarning } from '../components/common'

export default function TeacherLogin() {
  const { user, signIn, signUp } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => { if (user) nav('/guru', { replace: true }) }, [user, nav])

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError(''); setInfo('')
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        nav('/guru', { replace: true })
      } else {
        if (password.length < 6) throw new Error('Password minimal 6 karakter.')
        const { data, error } = await signUp(email, password, nama)
        if (error) throw error
        if (data.session) {
          nav('/guru', { replace: true })
        } else {
          setInfo('Registrasi berhasil! Jika diminta, cek email untuk konfirmasi lalu login.')
          setMode('login')
        }
      }
    } catch (err) {
      const msg = err?.message || 'Terjadi kesalahan.'
      if (msg.includes('Invalid login')) setError('Email atau password salah.')
      else if (msg.includes('already registered')) setError('Email sudah terdaftar. Silakan login.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="center-screen">
      <div className="container-narrow" style={{ width: '100%' }}>
        <div className="text-center mb-3">
          <div style={{ fontSize: '3rem' }}>🧑‍🏫</div>
          <h1 className="brand">Dashboard Guru</h1>
          <p className="muted">{mode === 'login' ? 'Masuk untuk mengelola kelas & melihat analisis.' : 'Buat akun guru baru.'}</p>
        </div>

        <div className="card">
          <ConfigWarning />
          <form onSubmit={submit}>
            {error && <div className="alert alert-error">{error}</div>}
            {info && <div className="alert alert-info">{info}</div>}

            {mode === 'register' && (
              <div className="field">
                <label>Nama</label>
                <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Guru" required />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guru@sekolah.sch.id" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
            </div>

            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          <p className="text-center muted mt-3" style={{ fontSize: '0.9rem' }}>
            {mode === 'login' ? (
              <>Belum punya akun?{' '}
                <button className="linklike" onClick={() => { setMode('register'); setError('') }} style={btnLink}>Daftar di sini</button>
              </>
            ) : (
              <>Sudah punya akun?{' '}
                <button className="linklike" onClick={() => { setMode('login'); setError('') }} style={btnLink}>Login</button>
              </>
            )}
          </p>
        </div>

        <p className="text-center mt-4">
          <Link to="/" style={{ color: 'var(--hijau)', fontWeight: 700 }}>← Halaman siswa</Link>
        </p>
      </div>
    </div>
  )
}

const btnLink = { background: 'none', border: 'none', color: 'var(--hijau)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }
