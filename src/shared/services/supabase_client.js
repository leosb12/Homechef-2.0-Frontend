import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep Vite bootable in development; auth calls will fail with a clear error.
  console.warn('VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridos para Supabase Auth.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
