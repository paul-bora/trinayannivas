import { useEffect, useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { Empty, Fab, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { date } from '../../lib/format'
import { writeLocal } from '../../lib/local'
import { must, supabase } from '../../lib/supabase'
import type { Announcement } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'
import { LAST_SEEN_KEY } from './Home'

export default function Announcements() {
  const { isAdmin } = useAuth()
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null)
  const state = useLoad(async () =>
    must<Announcement[]>(
      await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false }),
    ),
  )

  useEffect(() => writeLocal(LAST_SEEN_KEY, new Date().toISOString()), [])

  async function remove(a: Announcement) {
    if (!confirm(`Delete "${a.title}"?`)) return
    must(await supabase.from('announcements').delete().eq('id', a.id))
    state.reload()
  }

  return (
    <>
      <PageHeader title="Announcements" back />
      <Loaded state={state}>
        {(list) =>
          list.length === 0 ? (
            <Empty>No announcements yet.</Empty>
          ) : (
            list.map((a) => (
              <article key={a.id} className="card announcement">
                <div className="row gap">
                  {a.pinned && <Icon name="pin" size={16} />}
                  <strong>{a.title}</strong>
                </div>
                <p className="pre">{a.body}</p>
                <div className="row between">
                  <small className="muted">{date(a.created_at)}</small>
                  {isAdmin && (
                    <div className="row gap">
                      <button className="btn small ghost" onClick={() => setEditing(a)}>
                        Edit
                      </button>
                      <button className="btn small ghost danger" onClick={() => remove(a)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))
          )
        }
      </Loaded>
      {isAdmin && <Fab label="New announcement" onClick={() => setEditing('new')} />}
      {editing && (
        <AnnouncementForm
          announcement={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            state.reload()
          }}
        />
      )}
    </>
  )
}

function AnnouncementForm({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(announcement?.title ?? '')
  const [body, setBody] = useState(announcement?.body ?? '')
  const [pinned, setPinned] = useState(announcement?.pinned ?? false)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const row = { title: title.trim(), body: body.trim(), pinned }
      if (announcement) must(await supabase.from('announcements').update(row).eq('id', announcement.id))
      else must(await supabase.from('announcements').insert(row))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title={announcement ? 'Edit announcement' : 'New announcement'} onClose={onClose}>
      <form onSubmit={save} className="stack">
        <Field label="Title">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Message">
          <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top
        </label>
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Post announcement'}
        </button>
        <p className="muted small">Tip: also share important notices in the WhatsApp group.</p>
      </form>
    </Sheet>
  )
}
