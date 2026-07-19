import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import { Spinner } from '../components/common'
import { warnaKategori } from '../lib/utils'
import { exportSiswaPDF } from '../lib/exportPdf'
import { analisisSiswa, topikTerurut, MODUL_LABEL, hitungStatistikKelas, kelompokkanJawabanPerKategori } from '../lib/analysis'

function SkorCard({ label, skor, kategori }) {
  return (
    <div className="stat" style={{ borderTop: `4px solid ${warnaKategori(skor)}` }}>
      <div className="num" style={{ color: warnaKategori(skor) }}>{skor ?? '-'}</div>
      <div className="lbl">{label}</div>
      <div className="badge badge-gray mt-2" style={{ fontSize: '0.72rem' }}>{kategori || '-'}</div>
    </div>
  )
}

export default function StudentProfile() {
  const { studentId } = useParams()
  const [siswa, setSiswa] = useState(null)
  const [kelas, setKelas] = useState(null)
  const [result, setResult] = useState(null)
  const [statsKelas, setStatsKelas] = useState(null)
  const [jawabanKategori, setJawabanKategori] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dbDiag, setDbDiag] = useState({ jawabanCount: null, soalCount: null, hasJawabanKategori: false, errorDetail: null })

  useEffect(() => {
    async function load() {
      // Query terpisah per tabel (bukan embed bersarang) + error masing-masing
      // dimunculkan, supaya kegagalan (mis. cache skema PostgREST basi) terlihat
      // jelas alih-alih membuat skor "hilang" tanpa keterangan.
      const { data: s, error: e1 } = await supabase.from('students').select('*').eq('id', studentId).single()
      if (e1) { setError('Data siswa tidak ditemukan: ' + e1.message); setLoading(false); return }
      setSiswa(s)

      const [{ data: c }, { data: ch }, { data: r, error: e2 }] = await Promise.all([
        s.class_id ? supabase.from('classes').select('*').eq('id', s.class_id).single() : { data: null },
        s.karakter_id ? supabase.from('characters').select('*').eq('id', s.karakter_id).single() : { data: null },
        supabase.from('student_results').select('*').eq('student_id', studentId).maybeSingle(),
      ])
      setKelas(c || null)
      setSiswa((prev) => ({ ...prev, characters: ch || null }))
      if (e2) setError('Gagal memuat hasil skor: ' + e2.message)
      setResult(r || null)

      if (r && s.class_id) {
        // Perbandingan dengan teman sekelas: ambil skor semua siswa SEKELAS yang sudah selesai.
        const { data: teman } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', s.class_id)
          .eq('status_sesi', 'selesai')
        const idTeman = (teman || []).map((t) => t.id)
        if (idTeman.length > 0) {
          const { data: hasilTeman } = await supabase
            .from('student_results')
            .select('skor_matematika, skor_ipa, skor_penalaran')
            .in('student_id', idTeman)
          setStatsKelas(hitungStatistikKelas(hasilTeman || []))
        }

        // Rincian jawaban per kategori: gabungkan student_answers + question_bank
        // (guru bisa membaca question_bank penuh berkat policy question_bank_teacher_read).
        try {
          const { data: jawaban, error: e3 } = await supabase
            .from('student_answers')
            .select('*')
            .eq('student_id', studentId)
          if (e3) {
            console.error('Gagal memuat jawaban:', e3.message)
            setDbDiag(prev => ({ ...prev, errorDetail: 'e3: ' + e3.message }))
          } else {
            const rawCount = jawaban?.length || 0
            setDbDiag(prev => ({ ...prev, jawabanCount: rawCount }))
            if (rawCount > 0) {
              const qIds = jawaban.map((j) => j.question_id)
              const { data: soal, error: e4 } = await supabase.from('question_bank').select('*').in('id', qIds)
              if (e4) {
                console.error('Gagal memuat soal:', e4.message)
                setDbDiag(prev => ({ ...prev, errorDetail: 'e4: ' + e4.message }))
              } else {
                setDbDiag(prev => ({ ...prev, soalCount: soal?.length || 0 }))
                const gabungan = jawaban.map((j) => {
                  const q = (soal || []).find((qq) => qq.id === j.question_id)
                  return { ...q, jawaban: j.jawaban, is_correct: j.is_correct }
                })
                const grouped = kelompokkanJawabanPerKategori(gabungan)
                setJawabanKategori(grouped)
                setDbDiag(prev => ({ ...prev, hasJawabanKategori: !!grouped }))
              }
            }
          }
        } catch (diagErr) {
          console.error('Exception in loading answers:', diagErr)
          setDbDiag(prev => ({ ...prev, errorDetail: 'catch: ' + diagErr.message }))
        }
      }

      setLoading(false)
    }
    load()
  }, [studentId])

  if (loading) return (<><Navbar /><Spinner /></>)
  if (error) return (<><Navbar /><div className="container"><div className="alert alert-error">{error}</div></div></>)

  const vakData = result ? [
    { g: 'Visual', v: result.vak_v ?? 0 },
    { g: 'Auditori', v: result.vak_a ?? 0 },
    { g: 'Kinestetik', v: result.vak_k ?? 0 },
  ] : []

  const rekom = result?.rekomendasi || []

  return (
    <>
      <Navbar />
      <div className="container">
        <Link to={`/guru/kelas/${kelas?.id}`} className="btn btn-ghost btn-sm mb-3">← {kelas?.nama_kelas}</Link>

        <div className="card mb-3">
          <div className="row-between">
            <div className="row">
              <div style={{ fontSize: '3rem' }}>{siswa.characters?.aset_avatar_url || '🙂'}</div>
              <div>
                <h1>{siswa.nama}</h1>
                <p className="muted">
                  Absen {siswa.no_absen} · {siswa.characters ? `${siswa.characters.nama} — ${siswa.characters.gelar}` : 'Tanpa karakter'}
                </p>
                <span className={`badge ${siswa.status_sesi === 'selesai' ? 'badge-green' : siswa.status_sesi === 'berjalan' ? 'badge-yellow' : 'badge-gray'}`}>
                  {siswa.status_sesi}
                </span>
              </div>
            </div>
            {result && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => exportSiswaPDF(kelas, siswa, result, statsKelas, jawabanKategori)}
              >
                📄 Ekspor PDF
              </button>
            )}
          </div>
        </div>

        {!result ? (
          <div className="card text-center">
            <div style={{ fontSize: '3rem' }}>⏳</div>
            <p className="muted">Siswa belum menyelesaikan asesmen. Hasil akan muncul otomatis setelah selesai.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-3 mb-3">
              <SkorCard label="Matematika" skor={result.skor_matematika} kategori={result.kategori_matematika} />
              <SkorCard label="IPA" skor={result.skor_ipa} kategori={result.kategori_ipa} />
              <SkorCard label="Penalaran Logis" skor={result.skor_penalaran} kategori={result.kategori_penalaran} />
            </div>

            <div className="grid grid-2 mb-3">
              <div className="card-soft">
                <h3 className="mb-3">Profil Gaya Belajar (VAK)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={vakData} outerRadius={85}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="g" />
                    <PolarRadiusAxis angle={30} domain={[0, 15]} />
                    <Radar name="Pilihan" dataKey="v" stroke="#2d6a4f" fill="#40916c" fillOpacity={0.5} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
                <p className="text-center">
                  Dominan: <b className="brand" style={{ fontSize: '1.1rem' }}>{result.gaya_belajar_dominan}</b>
                </p>
              </div>

              <div className="card-soft">
                <h3 className="mb-3">💡 Rekomendasi Pembelajaran</h3>
                {rekom.length === 0 ? (
                  <p className="muted">Tidak ada catatan khusus — pertahankan pendekatan yang sudah baik.</p>
                ) : (
                  <ul style={{ paddingLeft: 18, lineHeight: 1.9 }}>
                    {rekom.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
                <p className="muted mt-3" style={{ fontSize: '0.8rem' }}>
                  Catatan otomatis (rule-based) sebagai dasar pembelajaran berdiferensiasi. Sesuaikan dengan penilaian profesional guru.
                </p>
              </div>
            </div>

            {/* 1. Kemampuan deskriptif umum + 2. Perbandingan dengan teman sekelas (disatukan dalam narasi) */}
            <div className="card mb-3">
              <h3 className="mb-3">📋 Kesimpulan Analisis</h3>
              {analisisSiswa(siswa, result, statsKelas).map((p, i) => (
                <p key={i} className="mb-3" style={{ lineHeight: 1.8 }}>{p}</p>
              ))}
            </div>

            {result.detail_topik && (
              <div className="card mb-3">
                <h3 className="mb-3">🔍 Ringkasan per Topik</h3>
                <div className="grid grid-3">
                  {['matematika', 'ipa', 'penalaran'].map((modul) => {
                    const daftar = topikTerurut(result.detail_topik?.[modul]?.per_topik)
                    if (daftar.length === 0) return null
                    return (
                      <div key={modul}>
                        <h4 className="mb-2" style={{ fontSize: '0.95rem' }}>{MODUL_LABEL[modul]}</h4>
                        <div className="table-wrap">
                          <table className="data">
                            <thead><tr><th>Topik</th><th>Benar</th></tr></thead>
                            <tbody>
                              {daftar.map((t) => (
                                <tr key={t.topik}>
                                  <td>{t.label}</td>
                                  <td>
                                    <span className={`badge ${t.persen >= 70 ? 'badge-green' : t.persen >= 40 ? 'badge-yellow' : 'badge-red'}`}>
                                      {t.benar}/{t.total}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="muted mt-3" style={{ fontSize: '0.78rem' }}>
                  Catatan: sebagian topik hanya diwakili 1–3 soal, sehingga hasilnya bersifat indikatif, bukan kesimpulan mutlak.
                </p>
              </div>
            )}

            {/* 3. Jawaban siswa per kategori — lihat persis di mana siswa salah */}
            {jawabanKategori ? (
              <div className="card">
                <h3 className="mb-1">🗒️ Jawaban Siswa per Kategori</h3>
                <p className="muted mb-3" style={{ fontSize: '0.85rem' }}>
                  Rincian tiap soal yang dikerjakan, dikelompokkan per mata pelajaran dan topik. Baris merah = jawaban salah.
                </p>
                {['matematika', 'ipa', 'penalaran', 'vak'].map((modul) => {
                  const perTopik = jawabanKategori[modul]
                  if (!perTopik) return null
                  return (
                    <div key={modul} className="mb-4">
                      <h4 className="mb-2">{modul === 'vak' ? 'Gaya Belajar (VAK)' : MODUL_LABEL[modul]}</h4>
                      {Object.entries(perTopik).map(([topik, soalList]) => (
                        <div key={topik} className="mb-3">
                          <p className="muted mb-2" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{topik}</p>
                          <div className="table-wrap">
                            <table className="data">
                              <thead>
                                <tr>
                                  <th>Soal</th>
                                  <th>Jawaban Siswa</th>
                                  {!soalList[0]?.isVak && <th>Jawaban Benar</th>}
                                  {!soalList[0]?.isVak && <th>Status</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {soalList.map((s, i) => (
                                  <tr key={i} style={s.isCorrect === false ? { background: '#fff2f0' } : undefined}>
                                    <td style={{ maxWidth: 320 }}>{s.teks_soal}</td>
                                    <td>{s.jawabanSiswa}</td>
                                    {!s.isVak && <td>{s.jawabanBenar}</td>}
                                    {!s.isVak && (
                                      <td>
                                        <span className={`badge ${s.isCorrect ? 'badge-green' : 'badge-red'}`}>
                                          {s.isCorrect ? '✓ Benar' : '✗ Salah'}
                                        </span>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
                <p className="muted mt-3" style={{ fontSize: '0.72rem', textAlign: 'right' }}>
                  Diagnosis Sistem: Terisi {dbDiag.jawabanCount} jawaban.
                </p>
              </div>
            ) : (
              <div className="card alert alert-info">
                <h3 className="mb-2">🗒️ Jawaban Siswa per Kategori</h3>
                <p>ℹ️ <b>Rincian Jawaban per Soal tidak ditemukan:</b> Jawaban rinci per soal untuk siswa ini tidak dapat dimuat atau telah terhapus (misal karena pembersihan/migrasi bank soal di database). Meskipun demikian, skor akhir dan analisis deskriptif di atas tetap valid.</p>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '0.8rem', color: 'var(--teks-lembut)' }}>
                  <b>Status Diagnosis Sistem:</b>
                  <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                    <li>Jumlah jawaban di database (`student_answers`): <b>{dbDiag.jawabanCount === null ? 'Memuat...' : dbDiag.jawabanCount}</b></li>
                    {dbDiag.jawabanCount > 0 && (
                      <li>Jumlah soal yang cocok di bank soal (`question_bank`): <b>{dbDiag.soalCount === null ? 'Memuat...' : dbDiag.soalCount}</b></li>
                    )}
                    {dbDiag.errorDetail && (
                      <li style={{ color: 'var(--merah)' }}>Pesan Error: <b>{dbDiag.errorDetail}</b></li>
                    )}
                  </ul>
                  <p className="mt-2" style={{ fontSize: '0.75rem' }}>
                    💡 <i>Saran: Jika jumlah jawaban adalah 0, ini menandakan data jawaban terhapus saat database di-reset. Mintalah siswa baru untuk mencoba kuis, lalu cek kembali halaman ini.</i>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
