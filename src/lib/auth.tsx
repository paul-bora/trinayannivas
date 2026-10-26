import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  // The user id whose profile has been fetched; refreshes don't blank the screen.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionChecked(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoadedFor(null)
      return
    }
    const { data } = await supabase.rpc('my_profile')
    setProfile((data as Profile | null) ?? null)
    setLoadedFor(userId)
  }, [userId])

  useEffect(() => {
    if (sessionChecked) refreshProfile()
  }, [sessionChecked, refreshProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading: !sessionChecked || (Boolean(userId) && loadedFor !== userId),
        isAdmin: profile?.role === 'admin',
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
