import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { Spinner } from '../components/common'

// Kode kelas 6 karakter tanpa huruf/angka yang membingungkan (0/O, 1/I)
const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateKode() {
  let s = ''
  for (let i = 0; i < 6; i++) s += ALFABET[Math.floor(Math.random() * ALFABET.length)]
  return `${s.slice(0, 3)}-${s.slice(3)}`
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nama_kelas: '', mapel: '', tahun_ajaran: '2026/2027' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('classes')
      .select('*, students(count)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setClasses(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function buatKelas(e) {
    e.preventDefault()
    if (!form.nama_kelas.trim()) return setError('Nama kelas wajib diisi.')
    setSaving(true); setError('')
    // Coba beberapa kali kalau kode kebetulan bentrok
    for (let attempt = 0; attempt < 5; attempt++) {
      const kode = generateKode()
      const { error } = await supabase.from('classes').insert({
        teacher_id: user.id,
        nama_kelas: form.nama_kelas.trim(),
        mapel: form.mapel.trim() || null,
        tahun_ajaran: form.tahun_ajaran.trim() || null,
        kode_kelas: kode,
      })
      if (!error) {
        setForm({ nama_kelas: '', mapel: '', tahun_ajaran: '2026/2027' })
        setShowForm(false)
        setSaving(false)
        load()
        return
      }
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        setError('Gagal membuat kelas: ' + error.message)
        setSaving(false)
        return
      }
    }
    setError('Gagal membuat kode unik, coba lagi.')
    setSaving(false)
  }

  if (loading) return (<><Navbar /><Spinner /></>)

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="row-between mb-3">
          <div>
            <h1>Kelas Saya</h1>
            <p className="muted">Kelola kelas dan pantau progres asesmen siswa.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? '✕ Batal' : '+ Buat Kelas'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {showForm && (
          <div className="card mb-3">
            <h3 className="mb-3">Kelas Baru</h3>
            <form onSubmit={buatKelas}>
              <div className="grid grid-3">
                <div className="field">
                  <label>Nama Kelas *</label>
                  <input className="input" value={form.nama_kelas} onChange={(e) => setForm({ ...form, nama_kelas: e.target.value })} placeholder="Kelas 7A" />
                </div>
                <div className="field">
                  <label>Mapel</label>
                  <input className="input" value={form.mapel} onChange={(e) => setForm({ ...form, mapel: e.target.value })} placeholder="IPA" />
                </div>
                <div className="field">
                  <label>Tahun Ajaran</label>
                  <input className="input" value={form.tahun_ajaran} onChange={(e) => setForm({ ...form, tahun_ajaran: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-emas" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Kelas'}</button>
            </form>
          </div>
        )}

        {classes.length === 0 ? (
          <div className="card text-center">
            <div style={{ fontSize: '3rem' }}>📚</div>
            <p className="muted">Belum ada kelas. Klik “Buat Kelas” untuk memulai.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {classes.map((c) => (
              <Link key={c.id} to={`/guru/kelas/${c.id}`} className="card-soft" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="row-between">
                  <h3>{c.nama_kelas}</h3>
                  <span className={`badge ${c.status === 'aktif' ? 'badge-green' : 'badge-gray'}`}>{c.status}</span>
                </div>
                <p className="muted" style={{ fontSize: '0.9rem' }}>{c.mapel || 'Umum'} · {c.tahun_ajaran || '-'}</p>
                <div className="row-between mt-3">
                  <span className="pill" style={{ letterSpacing: 2, fontFamily: 'monospace' }}>{c.kode_kelas}</span>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>👥 {c.students?.[0]?.count ?? 0} siswa</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
