import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/common'

export default function StudentRegister() {
  const { code } = useParams()
  const nav = useNavigate()
  const loc = useLocation()

  const [kelas, setKelas] = useState(loc.state?.kelas || null)
  const [loadingKelas, setLoadingKelas] = useState(!loc.state?.kelas)
  const [chars, setChars] = useState([])
  const [nama, setNama] = useState('')
  const [absen, setAbsen] = useState('')
  const [karakter, setKarakter] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Validasi ulang kode (jika halaman diakses langsung tanpa state)
      if (!kelas) {
        const { data } = await supabase.rpc('get_class_by_code', { p_code: code })
        if (!data || data.length === 0) {
          nav('/', { replace: true })
          return
        }
        setKelas(data[0])
        setLoadingKelas(false)
      }
      const { data: cs } = await supabase.from('characters').select('*').order('id')
      setChars(cs || [])
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleStart(e) {
    e.preventDefault()
    if (!nama.trim()) return setError('Isi namamu dulu ya.')
    if (!absen.trim()) return setError('Isi nomor absenmu.')
    if (!karakter) return setError('Pilih satu karakter petualanganmu.')
    setSubmitting(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('register_student', {
        p_code: code,
        p_nama: nama,
        p_no_absen: absen,
        p_karakter_id: karakter,
      })
      if (error) throw error
      const row = data[0]
      // Simpan token sesi lokal untuk otorisasi save/finalize
      localStorage.setItem(`pjd_token_${row.student_id}`, row.session_token)
      if (row.status_sesi === 'selesai') {
        nav(`/hasil/${row.student_id}`, { replace: true })
      } else {
        nav(`/main/${row.student_id}`, { replace: true })
      }
    } catch (err) {
      setError('Gagal memulai. Coba lagi sebentar.')
      console.error(err)
      setSubmitting(false)
    }
  }

  if (loadingKelas) return <Spinner label="Menyiapkan kelas..." />

  return (
    <div className="container-narrow">
      <button className="btn btn-ghost btn-sm mb-3" onClick={() => nav('/')}>← Kembali</button>

      <div className="card">
        <div className="text-center mb-3">
          <span className="pill">Kelas: {kelas?.nama_kelas}{kelas?.mapel ? ` · ${kelas.mapel}` : ''}</span>
          <h1 className="mt-3">Siapa dirimu, petualang? 🗺️</h1>
        </div>

        <form onSubmit={handleStart}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label htmlFor="nama">Nama Lengkap</label>
            <input id="nama" className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama kamu" />
          </div>
          <div className="field">
            <label htmlFor="absen">Nomor Absen</label>
            <input id="absen" className="input" value={absen} onChange={(e) => setAbsen(e.target.value)} placeholder="mis. 12" inputMode="numeric" />
          </div>

          <div className="field">
            <label>Pilih Karakter Petualanganmu</label>
            <div className="avatar-grid">
              {chars.map((c) => (
                <div
                  key={c.id}
                  className={`avatar-card ${karakter === c.id ? 'selected' : ''}`}
                  onClick={() => setKarakter(c.id)}
                  role="button"
                >
                  <div className="emoji">{c.aset_avatar_url || '🙂'}</div>
                  <div className="nm">{c.nama}</div>
                  <div className="gl">{c.gelar}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="muted" style={{ fontSize: '0.85rem' }}>
            💡 Jika kamu pernah mulai sebelumnya, gunakan <b>nama & nomor absen yang sama</b> untuk melanjutkan progresmu.
          </p>

          <button className="btn btn-emas btn-block mt-3" disabled={submitting}>
            {submitting ? 'Memulai...' : '✨ Masuk ke Petualangan'}
          </button>
        </form>
      </div>
    </div>
  )
}
