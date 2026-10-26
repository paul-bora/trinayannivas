import { useState } from 'react'
import { Empty, Loaded, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { loadSettings, saveSettings } from '../../lib/settings'
import { errorMessage, useLoad } from '../../lib/useLoad'

export default function Rules() {
  const { isAdmin } = useAuth()
  const state = useLoad(loadSettings)
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await saveSettings({ rules_text: draft ?? '' })
      setDraft(null)
      state.reload()
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Society rules"
        back
        action={
          isAdmin &&
          draft === null &&
          state.data && (
            <button className="btn small ghost" onClick={() => setDraft(state.data?.rules_text ?? '')}>
              Edit
            </button>
          )
        }
      />
      <Loaded state={state}>
        {(settings) =>
          draft !== null ? (
            <div className="stack">
              <textarea rows={18} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="row gap">
                <button className="btn" onClick={save} disabled={busy}>
                  {busy ? 'Saving…' : 'Save rules'}
                </button>
                <button className="btn ghost" onClick={() => setDraft(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : settings.rules_text ? (
            <div className="card pre">{settings.rules_text}</div>
          ) : (
            <Empty>The committee hasn't added the rules yet.</Empty>
          )
        }
      </Loaded>
    </>
  )
}
