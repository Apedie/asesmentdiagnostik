import { isSupabaseConfigured } from '../lib/supabase'

export function Spinner({ label = 'Memuat...' }) {
  return (
    <div className="center-screen" style={{ flexDirection: 'column', gap: 16 }}>
      <div className="spinner" />
      <p className="muted">{label}</p>
    </div>
  )
}

export function ConfigWarning() {
  if (isSupabaseConfigured) return null
  return (
    <div className="alert alert-warn">
      ⚠️ Koneksi Supabase belum dikonfigurasi. Isi <code>VITE_SUPABASE_URL</code> dan{' '}
      <code>VITE_SUPABASE_ANON_KEY</code> (file <code>.env</code> lokal atau Environment Variables di Netlify).
    </div>
  )
}

export function Confetti({ n = 40 }) {
  const emojis = ['🎉', '⭐', '✨', '🏆', '🎊']
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${2 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 0.8}s`,
          }}
        >
          {emojis[i % emojis.length]}
        </span>
      ))}
    </>
  )
}
