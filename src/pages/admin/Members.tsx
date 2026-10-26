import { useState, type FormEvent } from 'react'
import { Empty, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { must, supabase } from '../../lib/supabase'
import type { Role, Unit } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

interface Resident {
  email: string
  name: string
  unit_id: string | null
  role: Role
  joined_at: string | null
}

// Flats and the resident emails allowed to log in. Adding an email here is what lets someone use the app.
export default function Members() {
  const { profile } = useAuth()
  const [editingUnit, setEditingUnit] = useState<Unit | 'new' | null>(null)
  const [editingResident, setEditingResident] = useState<Resident | { unit_id: string | null } | null>(null)
  const [query, setQuery] = useState('')
  const state = useLoad(async () => {
    const [units, residents] = await Promise.all([
      supabase.from('units').select('*').order('number').then(must),
      supabase.from('allowed_emails').select('*').order('name').then(must),
    ])
    return { units: units as Unit[], residents: residents as Resident[] }
  })

  const q = query.trim().toLowerCase()

  return (
    <>
      <PageHeader
        title="Flats & members"
        back
        action={
          <button className="btn small" onClick={() => setEditingUnit('new')}>
            Add flat
          </button>
        }
      />
      <input className="search" type="search" placeholder="Search flat, name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Loaded state={state}>
        {({ units, residents }) => {
          const groups = [
            ...units.map((u) => ({ unit: u as Unit | null, people: residents.filter((r) => r.unit_id === u.id) })),
            { unit: null, people: residents.filter((r) => !r.unit_id || !units.some((u) => u.id === r.unit_id)) },
          ].filter(
            (g) =>
              !q ||
              (g.unit?.number ?? '').toLowerCase().includes(q) ||
              g.people.some((p) => p.name.toLowerCase().includes(q) || p.email.includes(q)),
          )
          return (
            <>
              <p className="muted small">
                {units.length} flats · {residents.length} residents · {residents.filter((r) => r.joined_at).length} logged in
              </p>
              {units.length === 0 && <Empty>Start by adding your flats with "Add flat".</Empty>}
              {groups.map((g) =>
                !g.unit && g.people.length === 0 ? null : (
                  <section key={g.unit?.id ?? 'none'} className="card">
                    <div className="section-head">
                      <h2>
                        {g.unit ? g.unit.number : 'No flat assigned'}
                        {g.unit?.owner_name && <small className="muted"> · {g.unit.owner_name}</small>}
                      </h2>
                      {g.unit && (
                        <button className="btn small ghost" onClick={() => setEditingUnit(g.unit)}>
                          Edit
                        </button>
                      )}
                    </div>
                    {g.people.map((r) => (
                      <button key={r.email} className="list-row link-btn" onClick={() => setEditingResident(r)}>
                        <div className="list-main">
                          <strong>
                            {r.name} {r.role === 'admin' && <span className="badge">Admin</span>}
                          </strong>
                          <small>
                            {r.email} · {r.joined_at ? 'logged in' : 'not logged in yet'}
                          </small>
                        </div>
                      </button>
                    ))}
                    {g.unit && (
                      <button className="btn small ghost" onClick={() => setEditingResident({ unit_id: g.unit!.id })}>
                        + Add resident
                      </button>
                    )}
                  </section>
                ),
              )}
              <button className="btn ghost" onClick={() => setEditingResident({ unit_id: null })}>
                + Add member without a flat
              </button>
            </>
          )
        }}
      </Loaded>

      {editingUnit && (
        <UnitForm
          unit={editingUnit === 'new' ? null : editingUnit}
          onClose={() => setEditingUnit(null)}
          onSaved={() => {
            setEditingUnit(null)
            state.reload()
          }}
        />
      )}
      {editingResident && state.data && (
        <ResidentForm
          resident={'email' in editingResident ? editingResident : null}
          defaultUnitId={editingResident.unit_id}
          units={state.data.units}
          isSelf={'email' in editingResident && editingResident.email === profile?.email}
          onClose={() => setEditingResident(null)}
          onSaved={() => {
            setEditingResident(null)
            state.reload()
          }}
        />
      )}
    </>
  )
}

function UnitForm({ unit, onClose, onSaved }: { unit: Unit | null; onClose: () => void; onSaved: () => void }) {
  const [number, setNumber] = useState(unit?.number ?? '')
  const [block, setBlock] = useState(unit?.block ?? '')
  const [area, setArea] = useState(unit?.area_sqft ? String(unit.area_sqft) : '')
  const [owner, setOwner] = useState(unit?.owner_name ?? '')
  const [occupancy, setOccupancy] = useState<Unit['occupancy']>(unit?.occupancy ?? 'owner')
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const row = {
      number: number.trim().toUpperCase(),
      block: block.trim() || null,
      area_sqft: area ? Number(area) : null,
      owner_name: owner.trim() || null,
      occupancy,
    }
    try {
      if (unit) must(await supabase.from('units').update(row).eq('id', unit.id))
      else must(await supabase.from('units').insert(row))
      onSaved()
    } catch (err) {
      alert(/duplicate/i.test(errorMessage(err)) ? `Flat ${row.number} already exists.` : errorMessage(err))
      setBusy(false)
    }
  }

  async function remove() {
    if (!unit || !confirm(`Delete flat ${unit.number}? Its dues and household members will also be deleted.`)) return
    try {
      must(await supabase.from('units').delete().eq('id', unit.id))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <Sheet title={unit ? `Edit ${unit.number}` : 'Add flat'} onClose={onClose}>
      <form onSubmit={save} className="stack">
        <div className="row gap">
          <Field label="Flat / house no.">
            <input required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="A-101" />
          </Field>
          <Field label="Block">
            <input value={block} onChange={(e) => setBlock(e.target.value)} />
          </Field>
        </div>
        <div className="row gap">
          <Field label="Area (sq ft)">
            <input type="number" min="0" value={area} onChange={(e) => setArea(e.target.value)} />
          </Field>
          <Field label="Occupancy">
            <select value={occupancy} onChange={(e) => setOccupancy(e.target.value as Unit['occupancy'])}>
              <option value="owner">Owner</option>
              <option value="tenant">Tenant</option>
              <option value="vacant">Vacant</option>
            </select>
          </Field>
        </div>
        <Field label="Owner name">
          <input value={owner} onChange={(e) => setOwner(e.target.value)} />
        </Field>
        <button className="btn" disabled={busy}>
          Save
        </button>
        {unit && (
          <button type="button" className="btn ghost danger" onClick={remove}>
            Delete flat
          </button>
        )}
      </form>
    </Sheet>
  )
}

function ResidentForm({
  resident,
  defaultUnitId,
  units,
  isSelf,
  onClose,
  onSaved,
}: {
  resident: Resident | null
  defaultUnitId: string | null
  units: Unit[]
  isSelf: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(resident?.name ?? '')
  const [email, setEmail] = useState(resident?.email ?? '')
  const [unitId, setUnitId] = useState(resident?.unit_id ?? defaultUnitId ?? '')
  const [role, setRole] = useState<Role>(resident?.role ?? 'resident')
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const row = { name: name.trim(), unit_id: unitId || null, role }
    try {
      if (resident) must(await supabase.from('allowed_emails').update(row).eq('email', resident.email))
      else must(await supabase.from('allowed_emails').insert({ ...row, email: email.trim().toLowerCase() }))
      onSaved()
    } catch (err) {
      alert(/duplicate/i.test(errorMessage(err)) ? 'This email is already registered.' : errorMessage(err))
      setBusy(false)
    }
  }

  async function remove() {
    if (!resident || !confirm(`Remove ${resident.name}? They will no longer be able to log in, and their posts will be deleted.`)) return
    try {
      must(await supabase.from('allowed_emails').delete().eq('email', resident.email))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
    }
  }

  return (
    <Sheet title={resident ? 'Edit member' : 'Add member'} onClose={onClose}>
      <form onSubmit={save} className="stack">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" hint={resident ? 'To change an email, remove this member and add them again.' : 'They log in with a code sent to this email.'}>
          <input type="email" required value={email} disabled={Boolean(resident)} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Flat">
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">No flat</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.number}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Access" hint={isSelf ? "You can't remove your own admin access." : undefined}>
          <select value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="resident">Resident</option>
            <option value="admin">Committee admin</option>
          </select>
        </Field>
        <button className="btn" disabled={busy}>
          Save
        </button>
        {resident && !isSelf && (
          <button type="button" className="btn ghost danger" onClick={remove}>
            Remove member
          </button>
        )}
      </form>
    </Sheet>
  )
}
