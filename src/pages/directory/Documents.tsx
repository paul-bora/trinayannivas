import { useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { Empty, Fab, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { deletePrivate, openPrivate, uploadPrivate } from '../../lib/files'
import { date } from '../../lib/format'
import { must, supabase } from '../../lib/supabase'
import type { DocumentFile } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

export default function Documents() {
  const { isAdmin } = useAuth()
  const [adding, setAdding] = useState(false)
  const state = useLoad(async () =>
    must<DocumentFile[]>(await supabase.from('documents').select('*').order('created_at', { ascending: false })),
  )

  async function remove(d: DocumentFile) {
    if (!confirm(`Delete "${d.title}"?`)) return
    must(await supabase.from('documents').delete().eq('id', d.id))
    await deletePrivate('documents', d.file_path)
    state.reload()
  }

  return (
    <>
      <PageHeader title="Documents" back />
      <Loaded state={state}>
        {(docs) =>
          docs.length === 0 ? (
            <Empty>No documents yet.</Empty>
          ) : (
            <div className="card list">
              {docs.map((d) => (
                <div key={d.id} className="list-row">
                  <button className="list-main link-btn" onClick={() => openPrivate('documents', d.file_path)}>
                    <strong>
                      <Icon name="file" size={16} /> {d.title}
                    </strong>
                    <small>{date(d.created_at)}</small>
                  </button>
                  {isAdmin && (
                    <button className="icon-btn" onClick={() => remove(d)} aria-label={`Delete ${d.title}`}>
                      <Icon name="trash" size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Loaded>
      {isAdmin && <Fab label="Upload document" onClick={() => setAdding(true)} />}
      {adding && (
        <UploadDocument
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            state.reload()
          }}
        />
      )}
    </>
  )
}

function UploadDocument({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    try {
      const file_path = await uploadPrivate('documents', file)
      must(await supabase.from('documents').insert({ title: title.trim(), file_path }))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title="Upload document" onClose={onClose}>
      <form onSubmit={save} className="stack">
        <Field label="Title">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AGM minutes 2026" />
        </Field>
        <Field label="File (PDF or photo)" hint="Keep files under 10 MB.">
          <input required type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <button className="btn" disabled={busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </Sheet>
  )
}
