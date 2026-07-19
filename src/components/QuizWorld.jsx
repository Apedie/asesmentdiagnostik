import { useState } from 'react'

// Menampilkan soal satu per satu untuk 1 dunia dengan visual jalan TPP 3D perspektif.
// props: world, questions[], answers{qid:key}, onAnswer(qid,key), onFinish(), saving, avatarEmoji
export default function QuizWorld({ world, questions, answers, onAnswer, onFinish, saving, avatarEmoji = '🧗' }) {
  const [idx, setIdx] = useState(() => {
    // Mulai dari soal pertama yang belum dijawab (memudahkan resume)
    const firstUnanswered = questions.findIndex((q) => !answers[q.id])
    return firstUnanswered === -1 ? 0 : firstUnanswered
  })

  const [animatingKey, setAnimatingKey] = useState(null)

  const q = questions[idx]
  const total = questions.length
  const answered = questions.filter((x) => answers[x.id]).length
  const semuaTerjawab = answered === total
  const isLast = idx === total - 1
  const dipilih = answers[q?.id]

  const activeKey = animatingKey || dipilih

  function pilih(key) {
    if (animatingKey) return // Mencegah double klik saat sedang beranimasi
    setAnimatingKey(key)
    onAnswer(q.id, key)

    // Tunggu animasi berlari selesai sebelum maju ke soal berikutnya
    setTimeout(() => {
      setAnimatingKey(null)
      if (!isLast) {
        setIdx((i) => Math.min(i + 1, total - 1))
      }
    }, 850)
  }

  // Menentukan style koordinat translasi karakter berdasarkan opsi
  function getCharacterStyle(selectedKey, options) {
    if (!selectedKey) return { transform: 'translateX(-50%) translateY(0) scale(1)' }
    const optionIdx = options.findIndex((o) => o.key === selectedKey)
    if (optionIdx === -1) return { transform: 'translateX(-50%) translateY(0) scale(1)' }
    
    const N = options.length
    const span = N > 1 ? 140 : 0
    // Menghitung pergeseran X agar rata tengah di plang penunjuk jalan
    const targetX = N > 1 ? (optionIdx - (N - 1) / 2) * (span / (N - 1)) : 0
    
    return {
      transform: `translateX(calc(-50% + ${targetX}px)) translateY(-95px) scale(0.48)`
    }
  }

  // Scenery samping jalanan bergantung pada jenis dunia
  function getSceneryEmojis(worldId) {
    switch (worldId) {
      case 1: return { l1: '🌲', l2: '🌲', r1: '🌲', r2: '🌲' } // Rimba Logika
      case 2: return { l1: '☁️', l2: '🏔️', r1: '☁️', r2: '⛰️' } // Puncak Sains
      case 3: return { l1: '🍂', l2: '🌾', r1: '🌻', r2: '🍁' } // Lembah Angka
      case 4: return { l1: '🔮', l2: '🧩', r1: '💡', r2: '✨' } // Kuil Refleksi
      default: return { l1: '🌳', l2: '⛰️', r1: '🌲', r2: '🌳' }
    }
  }

  if (!q) return null

  return (
    <div className="card">
      <div className="row-between mb-3">
        <span className="badge badge-green">{world.ikon} {world.nama}</span>
        <span className="muted" style={{ fontSize: '0.9rem' }}>Soal {idx + 1} / {total}</span>
      </div>

      <div className="progress-bar mb-3">
        <div style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      {/* Kontainer Layar Petualangan Jalan TPP 3D (Tema Hutan Setapak) */}
      <div className="tpp-adventure-screen">
        <div className="tpp-sky-bg" />
        
        {/* Awan-awan di langit */}
        <span style={{ position: 'absolute', top: '10%', left: '15%', fontSize: '1.2rem', opacity: 0.4 }}>☁️</span>
        <span style={{ position: 'absolute', top: '15%', right: '20%', fontSize: '1.4rem', opacity: 0.3 }}>☁️</span>

        {/* Hiasan samping jalan bertema Hutan Rimba */}
        <div className="tpp-scenery left-1" style={{ top: '35%', left: '8%' }}>🌲</div>
        <div className="tpp-scenery left-2" style={{ top: '55%', left: '2%' }}>🌳</div>
        <div className="tpp-scenery left-3" style={{ top: '70%', left: '7%', fontSize: '1.2rem' }}>🍄</div>
        <div className="tpp-scenery left-4" style={{ top: '80%', left: '1%', fontSize: '1.5rem' }}>🌿</div>
        
        <div className="tpp-scenery right-1" style={{ top: '36%', right: '9%' }}>🌲</div>
        <div className="tpp-scenery right-2" style={{ top: '58%', right: '3%' }}>🌳</div>
        <div className="tpp-scenery right-3" style={{ top: '72%', right: '8%', fontSize: '1.2rem' }}>🌸</div>
        <div className="tpp-scenery right-4" style={{ top: '82%', right: '1%', fontSize: '1.4rem' }}>🍀</div>

        <div className="tpp-horizon" />
        
        <div className="tpp-road-container">
          <div className="tpp-road">
            {/* Merender garis pembagi lajur jalan secara dinamis berdasarkan jumlah opsi */}
            {Array.from({ length: q.opsi.length - 1 }).map((_, i) => {
              const leftPos = ((i + 1) * 100) / q.opsi.length
              return (
                <div 
                  key={i} 
                  className="tpp-road-line" 
                  style={{ left: `${leftPos}%` }} 
                />
              )
            })}
          </div>
        </div>

        {/* Plang Pilihan Jawaban di Horizon */}
        <div className="tpp-signposts">
          {q.opsi.map((o) => (
            <div key={o.key} className={`tpp-signpost ${activeKey === o.key ? 'active' : ''}`}>
              <span>{o.key}</span>
              <div className="tpp-signpost-pole" />
            </div>
          ))}
        </div>

        {/* Karakter Emoji Siswa (Memisahkan translasi luar & goyangan dalam) */}
        <div 
          className="tpp-character"
          style={getCharacterStyle(activeKey, q.opsi)}
        >
          <div className={animatingKey ? 'tpp-avatar-wiggle' : ''}>
            {avatarEmoji}
          </div>
        </div>
      </div>

      <h2 style={{ minHeight: 60, fontSize: '1.2rem', marginBottom: '16px', lineHeight: '1.4' }}>{q.teks_soal}</h2>

      <div className="mt-3">
        {q.opsi.map((o) => (
          <button
            key={o.key}
            className={`opsi ${dipilih === o.key ? 'selected' : ''}`}
            onClick={() => pilih(o.key)}
            disabled={!!animatingKey}
            type="button"
          >
            <span className="key">{o.key}</span>
            {o.text}
          </button>
        ))}
      </div>

      <div className="row-between mt-3">
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => setIdx((i) => Math.max(0, i - 1))} 
          disabled={idx === 0 || !!animatingKey}
        >
          ← Sebelumnya
        </button>

        {isLast ? (
          <button className="btn btn-emas" onClick={onFinish} disabled={!semuaTerjawab || saving || !!animatingKey}>
            {saving ? 'Menyimpan...' : semuaTerjawab ? '✅ Selesaikan Dunia' : `Jawab ${total - answered} lagi`}
          </button>
        ) : (
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))} 
            disabled={!dipilih || !!animatingKey}
          >
            Berikutnya →
          </button>
        )}
      </div>

      {!semuaTerjawab && isLast && (
        <p className="muted text-center mt-2" style={{ fontSize: '0.85rem' }}>
          Masih ada soal yang belum terjawab. Gunakan tombol “Sebelumnya” untuk mengeceknya.
        </p>
      )}
    </div>
  )
}
