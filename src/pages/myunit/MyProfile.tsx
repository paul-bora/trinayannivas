import { useState, type FormEvent } from 'react'
import { Field, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { must, supabase } from '../../lib/supabase'
import { errorMessage } from '../../lib/useLoad'

export default function MyProfile() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [hidePhone, setHidePhone] = useState(profile?.hide_phone ?? false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    try {
      must(await supabase.rpc('update_my_profile', { p_name: name, p_phone: phone, p_hide_phone: hidePhone }))
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account? Your posts, comments and listings will be removed. This cannot be undone.')) return
    try {
      must(await supabase.rpc('delete_my_account'))
      await signOut()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader title="My profile" back />
      <form onSubmit={save} className="card stack">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input value={profile?.email ?? ''} disabled />
        </Field>
        <Field label="Phone" hint="Shown to neighbours in the directory.">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
        </Field>
        <label className="check">
          <input type="checkbox" checked={hidePhone} onChange={(e) => setHidePhone(e.target.checked)} /> Hide my phone number
          from neighbours
        </label>
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && <p className="ok-text">Saved.</p>}
      </form>

      <div className="stack">
        <button className="btn ghost" onClick={signOut}>
          Log out
        </button>
        <button className="btn ghost danger" onClick={deleteAccount}>
          Delete my account
        </button>
        <a className="muted small center-text" href="/privacy.html">
          Privacy policy
        </a>
      </div>
    </>
  )
}
