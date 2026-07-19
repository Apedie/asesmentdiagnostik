import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner, Confetti } from '../components/common'

const PESAN_GAYA = {
  Visual: 'Kamu belajar paling baik lewat gambar, warna, dan hal-hal yang bisa dilihat. Manfaatkan diagram & catatan berwarna!',
  Auditori: 'Kamu menyerap ilmu paling baik lewat mendengar. Diskusi dan menjelaskan ke teman akan sangat membantumu!',
  Kinestetik: 'Kamu belajar paling baik sambil bergerak dan praktik langsung. Cobalah, sentuh, dan lakukan!',
}

function pesanUntuk(gaya) {
  if (!gaya) return 'Setiap orang punya cara belajar yang unik — teruslah bersemangat!'
  const kunci = Object.keys(PESAN_GAYA).find((k) => gaya.includes(k))
  return kunci ? PESAN_GAYA[kunci] : 'Kamu punya gaya belajar kombinasi — fleksibel dalam banyak situasi!'
}

export default function Result() {
  const { studentId } = useParams()
  const nav = useNavigate()
  const token = localStorage.getItem(`pjd_token_${studentId}`)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!token) { nav('/', { replace: true }); return }
      const { data: rows } = await supabase.rpc('get_student_summary', {
        p_student_id: studentId, p_token: token,
      })
      setData(rows?.[0] || null)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <Spinner label="Menyiapkan hasilmu..." />

  return (
    <div className="center-screen">
      <Confetti />
      <div className="container-narrow" style={{ width: '100%' }}>
        <div className="card text-center" style={{ borderTop: '6px solid var(--emas-tua)' }}>
          <div style={{ fontSize: '4.5rem' }}>🏆</div>
          <h1>Petualangan Selesai!</h1>
          <p className="muted">Hebat, {data?.nama || 'Petualang'}! Kamu telah menaklukkan keempat dunia.</p>

          <div className="card-soft mt-4" style={{ background: '#f6fbf8' }}>
            <div style={{ fontSize: '3rem' }}>{data?.avatar || '🌟'}</div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>Gaya belajar dominanmu</p>
            <h2 className="brand">{data?.gaya_belajar_dominan || 'Kombinasi Unik'}</h2>
            <p className="mt-2">{pesanUntuk(data?.gaya_belajar_dominan)}</p>
          </div>

          <div className="alert alert-info mt-4" style={{ textAlign: 'left' }}>
            💬 Hasil lengkap petualanganmu (skor tiap dunia) sudah terkirim ke <b>gurumu</b> untuk membantu
            merancang pembelajaran yang paling cocok untukmu. Teruslah semangat belajar! 🌈
          </div>

          <button className="btn btn-primary btn-block mt-3" onClick={() => nav('/')}>
            🏠 Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  )
}
