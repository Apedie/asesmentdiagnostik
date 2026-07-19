import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { Spinner } from '../components/common'
import { exportKelasPDF } from '../lib/exportPdf'
import { exportKelasExcel } from '../lib/exportExcel'
import { analisisKelas } from '../lib/analysis'

const WARNA_VAK = { Visual: '#4361ee', Auditori: '#f4a261', Kinestetik: '#2a9d8f', Kombinasi: '#9d4edd' }

function bucketGaya(g) {
  if (!g) return null
  if (g.includes('–') || g.includes('-')) return 'Kombinasi'
  if (g.startsWith('Visual')) return 'Visual'
  if (g.startsWith('Auditori')) return 'Auditori'
  if (g.startsWith('Kinestetik')) return 'Kinestetik'
  return 'Kombinasi'
}

const statusBadge = (s) =>
  s === 'selesai' ? 'badge-green' : s === 'berjalan' ? 'badge-yellow' : 'badge-gray'

export default function ClassDetail() {
  const { classId } = useParams()
  const nav = useNavigate()
  const [kelas, setKelas] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    const { data: c, error: e1 } = await supabase.from('classes').select('*').eq('id', classId).single()
    if (e1) { setError('Kelas tidak ditemukan.'); setLoading(false); return }
    setKelas(c)

    // Ambil siswa & hasil lewat DUA query terpisah (bukan embed bersarang) lalu digabung
    // di JS. Ini menghindari kegagalan senyap bila PostgREST belum mengenali relasi
    // (mis. cache skema belum ter-refresh setelah migrasi) — kegagalan jadi terlihat.
    const { data: s, error: e2 } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('no_absen')
    if (e2) { setError('Gagal memuat daftar siswa: ' + e2.message); setLoading(false); return }

    const studentIds = (s || []).map((st) => st.id)
    let resultsById = {}
    if (studentIds.length > 0) {
      const { data: r, error: e3 } = await supabase
        .from('student_results')
        .select('*')
        .in('student_id', studentIds)
      if (e3) {
        setError('Gagal memuat hasil skor: ' + e3.message)
      } else {
        resultsById = Object.fromEntries((r || []).map((row) => [row.student_id, row]))
      }
    }

    setRows((s || []).map((st) => ({ ...st, result: resultsById[st.id] || null })))
    setLoading(false)
  }

  useEffect(() => { load() }, [classId])

  const narasiKelas = useMemo(() => analisisKelas(rows), [rows])

  const stats = useMemo(() => {
    const selesai = rows.filter((r) => r.status_sesi === 'selesai')
    const avg = (key) => {
      const vals = selesai.map((r) => r.result?.[key]).filter((v) => v != null)
      return vals.length ? Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length) : 0
    }
    const vakCount = { Visual: 0, Auditori: 0, Kinestetik: 0, Kombinasi: 0 }
    selesai.forEach((r) => {
      const b = bucketGaya(r.result?.gaya_belajar_dominan)
      if (b) vakCount[b]++
    })
    return {
      total: rows.length,
      belum: rows.filter((r) => r.status_sesi === 'belum').length,
      berjalan: rows.filter((r) => r.status_sesi === 'berjalan').length,
      selesai: selesai.length,
      avgMtk: avg('skor_matematika'),
      avgIpa: avg('skor_ipa'),
      avgPen: avg('skor_penalaran'),
      vakData: Object.entries(vakCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })),
    }
  }, [rows])

  const barData = [
    { modul: 'Matematika', rata: stats.avgMtk },
    { modul: 'IPA', rata: stats.avgIpa },
    { modul: 'Penalaran', rata: stats.avgPen },
  ]

  async function regenerateKode() {
    if (!confirm('Buat ulang kode kelas? Kode lama tidak bisa dipakai lagi.')) return
    setBusy(true)
    const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const g = () => Array.from({ length: 6 }, () => ALFABET[Math.floor(Math.random() * ALFABET.length)]).join('')
    for (let i = 0; i < 5; i++) {
      const s = g(); const kode = `${s.slice(0, 3)}-${s.slice(3)}`
      const { error } = await supabase.from('classes').update({ kode_kelas: kode }).eq('id', classId)
      if (!error) { await load(); break }
    }
    setBusy(false)
  }

  async function toggleStatus() {
    setBusy(true)
    const baru = kelas.status === 'aktif' ? 'nonaktif' : 'aktif'
    await supabase.from('classes').update({ status: baru }).eq('id', classId)
    await load()
    setBusy(false)
  }

  async function hapusKelas() {
    if (!confirm(`Hapus kelas "${kelas.nama_kelas}" beserta semua data siswanya? Tindakan ini tidak bisa dibatalkan.`)) return
    setBusy(true)
    const { error } = await supabase.from('classes').delete().eq('id', classId)
    setBusy(false)
    if (error) return setError('Gagal menghapus: ' + error.message)
    nav('/guru', { replace: true })
  }

  if (loading) return (<><Navbar /><Spinner /></>)
  if (error) return (<><Navbar /><div className="container"><div className="alert alert-error">{error}</div></div></>)

  return (
    <>
      <Navbar />
      <div className="container">
        <Link to="/guru" className="btn btn-ghost btn-sm mb-3">← Semua Kelas</Link>

        {/* Header kelas */}
        <div className="card mb-3">
          <div className="row-between">
            <div>
              <h1>{kelas.nama_kelas} <span className={`badge ${kelas.status === 'aktif' ? 'badge-green' : 'badge-gray'}`}>{kelas.status}</span></h1>
              <p className="muted">{kelas.mapel || 'Umum'} · {kelas.tahun_ajaran || '-'}</p>
            </div>
            <div className="text-center">
              <p className="muted" style={{ fontSize: '0.8rem' }}>Kode Kelas</p>
              <div className="pill" style={{ fontSize: '1.3rem', letterSpacing: 3, fontFamily: 'monospace' }}>{kelas.kode_kelas}</div>
            </div>
          </div>
          <div className="row mt-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={regenerateKode} disabled={busy}>🔄 Buat Ulang Kode</button>
            <button className="btn btn-ghost btn-sm" onClick={toggleStatus} disabled={busy}>
              {kelas.status === 'aktif' ? '🔒 Nonaktifkan' : '🔓 Aktifkan'}
            </button>
            <span className="spacer" />
            <button className="btn btn-primary btn-sm" onClick={() => exportKelasPDF(kelas, rows)}>📄 Ekspor PDF</button>
            <button className="btn btn-emas btn-sm" onClick={() => exportKelasExcel(kelas, rows)}>📊 Ekspor Excel</button>
            <button className="btn btn-danger btn-sm" onClick={hapusKelas} disabled={busy}>🗑️ Hapus</button>
          </div>
        </div>

        {/* Statistik ringkas */}
        <div className="grid grid-4 mb-3">
          <div className="stat"><div className="num">{stats.total}</div><div className="lbl">Total Siswa</div></div>
          <div className="stat"><div className="num" style={{ color: '#2d6a4f' }}>{stats.selesai}</div><div className="lbl">Selesai</div></div>
          <div className="stat"><div className="num" style={{ color: '#e9a800' }}>{stats.berjalan}</div><div className="lbl">Berjalan</div></div>
          <div className="stat"><div className="num" style={{ color: '#94a3b8' }}>{stats.belum}</div><div className="lbl">Belum Mulai</div></div>
        </div>

        {/* Kesimpulan Analisis Kelas */}
        <div className="card mb-3">
          <h3 className="mb-3">📋 Kesimpulan Analisis Kelas</h3>
          {narasiKelas.map((p, i) => (
            <p key={i} className="mb-3" style={{ lineHeight: 1.8 }}>{p}</p>
          ))}
        </div>

        {/* Grafik */}
        <div className="grid grid-2 mb-3">
          <div className="card-soft">
            <h3 className="mb-3">Distribusi Gaya Belajar</h3>
            {stats.vakData.length === 0 ? <p className="muted">Belum ada data (belum ada siswa selesai).</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.vakData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {stats.vakData.map((e) => <Cell key={e.name} fill={WARNA_VAK[e.name]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="card-soft">
            <h3 className="mb-3">Rata-rata Skor (siswa selesai)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="modul" /><YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rata" name="Rata-rata" fill="#2d6a4f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabel siswa */}
        <div className="card">
          <h3 className="mb-3">Daftar Siswa</h3>
          {rows.length === 0 ? (
            <p className="muted">Belum ada siswa yang bergabung. Bagikan kode <b>{kelas.kode_kelas}</b> ke siswa.</p>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Absen</th><th>Nama</th><th>Status</th><th>MTK</th><th>IPA</th><th>Penalaran</th><th>Gaya Belajar</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.no_absen}</td>
                      <td>{r.nama}</td>
                      <td><span className={`badge ${statusBadge(r.status_sesi)}`}>{r.status_sesi}</span></td>
                      <td>{r.result?.skor_matematika ?? '-'}</td>
                      <td>{r.result?.skor_ipa ?? '-'}</td>
                      <td>{r.result?.skor_penalaran ?? '-'}</td>
                      <td>{r.result?.gaya_belajar_dominan ?? '-'}</td>
                      <td>
                        <Link to={`/guru/siswa/${r.id}`} className="btn btn-ghost btn-sm">🔍 Detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
