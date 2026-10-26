import { must, supabase } from './supabase'
import type { Settings } from './types'

export async function loadSettings(): Promise<Settings> {
  return must(await supabase.from('settings').select('*').eq('id', 1).single())
}

export async function saveSettings(changes: Partial<Settings>) {
  must(await supabase.from('settings').update(changes).eq('id', 1))
}
