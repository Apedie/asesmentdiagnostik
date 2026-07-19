import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ConfigWarning } from '../components/common'

export default function StudentEntry() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    const kode = code.trim().toUpperCase()
    if (kode.length < 4) return setError('Kode kelas terlalu pendek.')
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('get_class_by_code', { p_code: kode })
      if (error) throw error
      if (!data || data.length === 0) {
        setError('Kode kelas tidak ditemukan atau sudah tidak aktif. Cek kembali dengan gurumu.')
      } else {
        nav(`/mulai/${kode}`, { state: { kelas: data[0] } })
      }
    } catch (err) {
      setError('Gagal terhubung. Periksa koneksi internetmu lalu coba lagi.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="center-screen">
      <div className="container-narrow" style={{ width: '100%' }}>
        <div className="text-center mb-3">
          <div style={{ fontSize: '4.5rem' }}>🧭</div>
          <h1 className="brand">Petualangan Jati Diri</h1>
          <p className="muted">Masukkan kode kelas dari gurumu untuk memulai petualangan!</p>
        </div>

        <div className="card">
          <ConfigWarning />
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label htmlFor="code">Kode Kelas</label>
              <input
                id="code"
                className="input uppercase"
                placeholder="7A-K3P"
                value={code}
                maxLength={12}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn btn-emas btn-block" disabled={loading}>
              {loading ? 'Mencari kelas...' : '🚀 Mulai Petualangan'}
            </button>
          </form>
        </div>

        <p className="text-center muted mt-4" style={{ fontSize: '0.9rem' }}>
          Seorang guru?{' '}
          <Link to="/guru/login" style={{ color: 'var(--hijau)', fontWeight: 700 }}>
            Masuk ke Dashboard Guru
          </Link>
        </p>
      </div>
    </div>
  )
}
