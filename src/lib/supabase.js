import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Pesan jelas saat env belum diisi (sering terjadi ketika lupa set di Netlify)
  console.error(
    '[Petualangan Jati Diri] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum di-set. ' +
    'Salin .env.example menjadi .env (lokal) atau isi Environment Variables di Netlify.'
  )
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const isSupabaseConfigured = Boolean(url && anonKey)
