import { useState, type FormEvent } from 'react'
import { Field, Loaded, PageHeader } from '../../components/ui'
import { deletePhoto, photoUrl, uploadPhoto } from '../../lib/files'
import { loadSettings, saveSettings } from '../../lib/settings'
import type { Settings } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

export default function SocietySettings() {
  const state = useLoad(loadSettings)
  return (
    <>
      <PageHeader title="Society settings" back />
      <Loaded state={state}>{(settings) => <SettingsForm settings={settings} onSaved={state.reload} />}</Loaded>
    </>
  )
}

function SettingsForm({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [upiId, setUpiId] = useState(settings.upi_id ?? '')
  const [upiName, setUpiName] = useState(settings.upi_name ?? '')
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp_link ?? '')
  const [maintenance, setMaintenance] = useState(String(settings.monthly_maintenance ?? 0))
  const [opening, setOpening] = useState(String(settings.opening_balance ?? 0))
  const [qr, setQr] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    try {
      let upi_qr_path = settings.upi_qr_path
      if (qr) {
        upi_qr_path = await uploadPhoto(qr)
        await deletePhoto(settings.upi_qr_path)
      }
      await saveSettings({
        upi_id: upiId.trim() || null,
        upi_name: upiName.trim() || null,
        whatsapp_link: whatsapp.trim() || null,
        monthly_maintenance: Number(maintenance) || 0,
        opening_balance: Number(opening) || 0,
        upi_qr_path,
      })
      setSaved(true)
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="stack">
      <section className="card stack">
        <h2>Payments</h2>
        <Field label="Society UPI ID" hint="e.g. trinayannivas@okhdfcbank: residents pay to this">
          <input value={upiId} onChange={(e) => setUpiId(e.target.value)} autoCapitalize="off" />
        </Field>
        <Field label="Account name shown in UPI app">
          <input value={upiName} onChange={(e) => setUpiName(e.target.value)} placeholder="Trinayan Nivas Housing Society" />
        </Field>
        <Field label="UPI QR code image" hint="A screenshot of the society's UPI QR. Shown to iPhone users.">
          <input type="file" accept="image/*" onChange={(e) => setQr(e.target.files?.[0] ?? null)} />
        </Field>
        {settings.upi_qr_path && !qr && <img className="qr" src={photoUrl(settings.upi_qr_path)} alt="Current UPI QR" />}
        <Field label="Default monthly maintenance per flat (₹)">
          <input type="number" min="0" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
        </Field>
        <Field label="Opening balance (₹)" hint="Money the society already had before using this app.">
          <input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
      </section>
      <section className="card stack">
        <h2>Community</h2>
        <Field label="WhatsApp group invite link" hint="WhatsApp → group → Invite via link → Copy link">
          <input type="url" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="https://chat.whatsapp.com/…" />
        </Field>
      </section>
      <button className="btn" disabled={busy}>
        {busy ? 'Saving…' : 'Save settings'}
      </button>
      {saved && <p className="ok-text">Saved.</p>}
    </form>
  )
}
