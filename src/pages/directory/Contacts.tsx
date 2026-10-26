import { useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import ContactRow from '../../components/ContactRow'
import Icon from '../../components/Icon'
import { Empty, Fab, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { must, supabase } from '../../lib/supabase'
import type { DirectoryEntry, DirectoryType } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

const pages: Record<DirectoryType, { title: string; roleLabel: string; rolePlaceholder: string }> = {
  emergency: { title: 'Emergency contacts', roleLabel: 'What for', rolePlaceholder: 'e.g. Security gate' },
  vendor: { title: 'Vendors', roleLabel: 'Service', rolePlaceholder: 'e.g. Plumber' },
  committee: { title: 'Management Committee', roleLabel: 'Position', rolePlaceholder: 'e.g. Secretary' },
}

// One screen for emergency contacts, vendors and the committee; admins can add and remove entries.
export default function Contacts() {
  const { type } = useParams() as { type: DirectoryType }
  const { isAdmin } = useAuth()
  const [editing, setEditing] = useState<DirectoryEntry | 'new' | null>(null)
  const state = useLoad(
    async () =>
      must<DirectoryEntry[]>(
        await supabase.from('directory_entries').select('*').eq('type', type).order('sort').order('name'),
      ),
    [type],
  )

  const page = pages[type]
  if (!page) return <Navigate to="/directory" replace />

  return (
    <>
      <PageHeader title={page.title} back />
      <Loaded state={state}>
        {(entries) =>
          entries.length === 0 ? (
            <Empty>Nothing added yet.</Empty>
          ) : (
            <div className="card list">
              {entries.map((e) => (
                <ContactRow
                  key={e.id}
                  title={e.name}
                  subtitle={e.role}
                  phone={e.phone}
                  extra={
                    isAdmin && (
                      <button className="icon-btn" onClick={() => setEditing(e)} aria-label={`Edit ${e.name}`}>
                        <Icon name="chevron" size={18} />
                      </button>
                    )
                  }
                />
              ))}
            </div>
          )
        }
      </Loaded>
      {isAdmin && <Fab label="Add contact" onClick={() => setEditing('new')} />}
      {editing && (
        <EntryForm
          type={type}
          entry={editing === 'new' ? null : editing}
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

function EntryForm({
  type,
  entry,
  onClose,
  onSaved,
}: {
  type: DirectoryType
  entry: DirectoryEntry | null
  onClose: () => void
  onSaved: () => void
}) {
  const page = pages[type]
  const [name, setName] = useState(entry?.name ?? '')
  const [role, setRole] = useState(entry?.role ?? '')
  const [phone, setPhone] = useState(entry?.phone ?? '')
  const [sort, setSort] = useState(String(entry?.sort ?? 0))
  const [busy, setBusy] = useState(false)

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true)
    try {
      must({ data: null, ...(await action()) })
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  function save(e: FormEvent) {
    e.preventDefault()
    const row = { type, name: name.trim(), role: role.trim() || null, phone: phone.trim() || null, sort: Number(sort) || 0 }
    run(() =>
      entry ? supabase.from('directory_entries').update(row).eq('id', entry.id) : supabase.from('directory_entries').insert(row),
    )
  }

  return (
    <Sheet title={entry ? 'Edit contact' : 'Add contact'} onClose={onClose}>
      <form onSubmit={save} className="stack">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={page.roleLabel}>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder={page.rolePlaceholder} />
        </Field>
        <Field label="Phone">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Order in list" hint="Lower numbers show first.">
          <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
        </Field>
        <button className="btn" disabled={busy}>
          Save
        </button>
        {entry && (
          <button
            type="button"
            className="btn ghost danger"
            disabled={busy}
            onClick={() => confirm(`Delete ${entry.name}?`) && run(() => supabase.from('directory_entries').delete().eq('id', entry.id))}
          >
            Delete
          </button>
        )}
      </form>
    </Sheet>
  )
}
