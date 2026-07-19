import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WORLDS, getWorld } from '../data/worlds'
import { shuffle, lsKey } from '../lib/utils'
import { Spinner } from '../components/common'
import QuizWorld from '../components/QuizWorld'

export default function Adventure() {
  const { studentId } = useParams()
  const nav = useNavigate()
  const token = localStorage.getItem(`pjd_token_${studentId}`)

  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState('splash') // 'intro' | 'splash' | 'quiz'
  const [currentWorld, setCurrentWorld] = useState(1)
  const [worldData, setWorldData] = useState({}) // { worldId: [questions] }
  const [answers, setAnswers] = useState({}) // { qid: key }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('🧗')
  const [avatarName, setAvatarName] = useState('Petualang')
  const [avatarGelar, setAvatarGelar] = useState('')
  const [studentName, setStudentName] = useState('')

  const answersRef = useRef(answers)
  answersRef.current = answers
  const savedRef = useRef(new Set()) // qid yang sudah tersimpan ke server

  // ---- Load awal: token wajib, ambil progres server + localStorage ----
  useEffect(() => {
    if (!token) { nav('/', { replace: true }); return }
    async function init() {
      try {
        const { data, error } = await supabase.rpc('get_student_progress', {
          p_student_id: studentId, p_token: token,
        })
        if (error) throw error
        if (!data || data.length === 0) { nav('/', { replace: true }); return }
        const srv = data[0]
        if (srv.status_sesi === 'selesai') { nav(`/hasil/${studentId}`, { replace: true }); return }
        setStudentName(srv.nama || 'Petualang')

        // Ambil info karakter dari database
        if (srv.karakter_id) {
          const { data: charData } = await supabase
            .from('characters')
            .select('*')
            .eq('id', srv.karakter_id)
            .maybeSingle()
          if (charData) {
            setAvatarEmoji(charData.aset_avatar_url || '🧗')
            setAvatarName(charData.nama || 'Petualang')
            setAvatarGelar(charData.gelar || '')
          }
        }

        // Gabungkan dengan localStorage (ambil yang paling baru)
        let serverWorld = srv.current_world || 1
        let localAnswers = {}
        const raw = localStorage.getItem(lsKey(studentId))
        if (raw) {
          try {
            const cache = JSON.parse(raw)
            localAnswers = cache.answers || {}
            if ((cache.currentWorld || 1) > serverWorld) serverWorld = cache.currentWorld
            if (cache.worldData) setWorldData(cache.worldData)
          } catch { /* abaikan cache rusak */ }
        }
        setAnswers(localAnswers)
        setCurrentWorld(Math.min(serverWorld, WORLDS.length))

        // Tentukan apakah harus membaca intro cerita dulu
        const hasReadIntro = localStorage.getItem(`pjd_read_intro_${studentId}`)
        if (serverWorld === 1 && !hasReadIntro) {
          setPhase('intro')
        } else {
          setPhase('splash')
        }
      } catch (err) {
        setError('Tidak bisa memuat progres. Periksa koneksi lalu muat ulang halaman.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Mirror ke localStorage setiap perubahan (local-first) ----
  useEffect(() => {
    if (loading) return
    localStorage.setItem(lsKey(studentId), JSON.stringify({
      answers, currentWorld, worldData, updatedAt: Date.now(),
    }))
  }, [answers, currentWorld, worldData, loading, studentId])

  // ---- Ambil soal untuk dunia tertentu (sekali) ----
  const loadWorldQuestions = useCallback(async (worldId) => {
    if (worldData[worldId]) return worldData[worldId]
    const world = getWorld(worldId)
    const { data, error } = await supabase.rpc('get_questions', { p_modul: world.modul })
    if (error) throw error
    // Acak urutan soal (jika modul ini diacak) DAN urutan opsi tiap soal —
    // supaya posisi jawaban benar tidak selalu di huruf yang sama (mencegah tebakan pola).
    const base = world.acak ? shuffle(data) : data
    const ordered = base.map((q) => ({ ...q, opsi: shuffle(q.opsi) }))
    setWorldData((prev) => ({ ...prev, [worldId]: ordered }))
    return ordered
  }, [worldData])

  // ---- Simpan jawaban 1 dunia ke server ----
  const saveWorld = useCallback(async (worldId) => {
    const qs = worldData[worldId] || []
    const payload = qs
      .filter((q) => answersRef.current[q.id])
      .map((q) => ({ question_id: q.id, jawaban: answersRef.current[q.id] }))
    if (payload.length === 0) return
    const { error } = await supabase.rpc('save_answers', {
      p_student_id: studentId, p_token: token, p_world: worldId, p_answers: payload,
    })
    if (error) throw error
    payload.forEach((p) => savedRef.current.add(p.question_id))
  }, [worldData, studentId, token])

  // ---- Auto-save berkala tiap 60 detik (cadangan) ----
  useEffect(() => {
    if (loading || phase !== 'quiz') return
    const t = setInterval(async () => {
      try {
        await saveWorld(currentWorld)
        setSyncMsg('Tersimpan otomatis ✓')
        setTimeout(() => setSyncMsg(''), 2500)
      } catch (e) { console.warn('auto-save gagal (akan dicoba lagi)', e) }
    }, 60000)
    return () => clearInterval(t)
  }, [loading, phase, currentWorld, saveWorld])

  function onAnswer(qid, key) {
    setAnswers((prev) => ({ ...prev, [qid]: key }))
  }

  async function mulaiDunia() {
    setError('')
    try {
      await loadWorldQuestions(currentWorld)
      setPhase('quiz')
    } catch (e) {
      setError('Gagal memuat soal. Coba lagi.')
      console.error(e)
    }
  }

  async function selesaiDunia() {
    setSaving(true)
    setError('')
    try {
      await saveWorld(currentWorld)
      if (currentWorld >= WORLDS.length) {
        // Finalisasi seluruh petualangan
        const { error } = await supabase.rpc('finalize_student', {
          p_student_id: studentId, p_token: token,
        })
        if (error) throw error
        localStorage.removeItem(lsKey(studentId))
        nav(`/hasil/${studentId}`, { replace: true })
      } else {
        setCurrentWorld((w) => w + 1)
        setPhase('splash')
        window.scrollTo(0, 0)
      }
    } catch (e) {
      setError('Gagal menyimpan. Periksa koneksi lalu coba lagi (jawabanmu aman tersimpan di perangkat).')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function jedaSimpan() {
    setSaving(true)
    try {
      await saveWorld(currentWorld)
      setSyncMsg('Progres tersimpan. Sampai jumpa lagi! 👋')
      setTimeout(() => nav('/'), 1200)
    } catch (e) {
      setError('Gagal menyimpan ke server, tetapi progres tersimpan di perangkat ini.')
      setSaving(false)
    }
  }

  function selesaiIntro() {
    localStorage.setItem(`pjd_read_intro_${studentId}`, 'true')
    setPhase('splash')
  }

  if (loading) return <Spinner label="Menyiapkan petualangan..." />

  const world = getWorld(currentWorld)

  return (
    <div className="container-narrow">
      {/* Peta dunia */}
      <div className="world-path">
        {WORLDS.map((w, i) => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`world-node ${w.id < currentWorld ? 'done' : ''} ${w.id === currentWorld ? 'active' : ''}`} title={w.nama}>
              {w.id < currentWorld ? '✓' : w.ikon}
            </div>
            {i < WORLDS.length - 1 && <div className="world-line" />}
          </div>
        ))}
      </div>
      <p className="text-center muted mb-3" style={{ fontSize: '0.85rem' }}>
        Dunia {currentWorld} dari {WORLDS.length}{syncMsg && ` · ${syncMsg}`}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {phase === 'intro' ? (
        <div className="card text-center" style={{ borderTop: `6px solid var(--hijau)` }}>
          <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>{avatarEmoji}</div>
          <span className="pill" style={{ color: 'var(--hijau)' }}>🛡️ Mulai Petualangan Baru</span>
          <h1 className="mt-2">Halo, {studentName}!</h1>
          <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.95rem' }}>{avatarGelar}</p>
          
          <div className="alert alert-info mt-3" style={{ textAlign: 'left', lineHeight: '1.7' }}>
            <p className="mb-2">Selamat datang di <b>Petualangan Jati Diri</b>! Gerbang petualangan telah terbuka untukmu. Di depanmu terbentang 4 dunia misterius yang akan menguji kecerdasan, logika, dan kepribadianmu.</p>
            <p className="mb-2">Kekuatan terbesar di dunia ini adalah <b>kejujuran dan kemampuan dirimu sendiri</b>. Hasil petualangan ini akan membantumu mengenal dirimu secara jujur. Oleh karena itu, berjanjilah:</p>
            <ol style={{ paddingLeft: '18px', marginBottom: '8px' }}>
              <li>Selesaikan tantangan ini <b>tanpa bantuan orang lain</b> (orang tua, kakak, teman, atau guru).</li>
              <li>Kerjakan <b>tanpa menggunakan alat bantu</b> seperti kalkulator atau mencarinya di internet.</li>
              <li>Jangan takut salah! Setiap pilihanmu—baik jawaban benar maupun salah—adalah bagian dari petualangan berharga untuk mengenal dirimu.</li>
            </ol>
            <p><i>Apakah kamu siap untuk membuktikan kemampuan aslimu dan menjelajahi jati dirimu?</i></p>
          </div>
          
          <button className="btn btn-emas btn-block mt-3" onClick={selesaiIntro}>
            ⚔️ Siap, Mulai Petualangan!
          </button>
        </div>
      ) : phase === 'splash' ? (
        <div className="card splash" style={{ borderTop: `6px solid ${world.warna}` }}>
          <div className="ikon">{world.ikon}</div>
          <span className="pill" style={{ color: world.warna }}>Dunia {world.id}</span>
          <h1 className="mt-2">{world.nama}</h1>
          <p className="muted mt-2" style={{ maxWidth: 420, margin: '10px auto' }}>{world.deskripsi}</p>
          {world.tipe === 'preferensi' && (
            <div className="alert alert-info mt-3" style={{ textAlign: 'left' }}>
              Di dunia ini <b>tidak ada jawaban benar atau salah</b>. Pilih yang paling menggambarkan dirimu ya!
            </div>
          )}
          <button className="btn btn-emas btn-block mt-3" onClick={mulaiDunia}>
            Masuk ke {world.nama} →
          </button>
        </div>
      ) : (
        <>
          <QuizWorld
            world={world}
            questions={worldData[currentWorld] || []}
            answers={answers}
            onAnswer={onAnswer}
            onFinish={selesaiDunia}
            saving={saving}
            avatarEmoji={avatarEmoji}
          />
          <div className="text-center mt-3">
            <button className="btn btn-ghost btn-sm" onClick={jedaSimpan} disabled={saving}>
              ⏸️ Jeda & Simpan (lanjut nanti)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
