import { createClient } from '@supabase/supabase-js'

// Keep only https://<project>.supabase.co, in case a longer URL such as ".../rest/v1/" was pasted.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/^(https?:\/\/[^/]+).*$/, '$1')
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost', key || 'missing')

// Supabase returns { data, error }; this turns the error into a thrown Error.
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
