import { useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { Empty, Field, Loaded, MenuRow, PageHeader, Sheet } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { money } from '../../lib/format'
import { must, supabase } from '../../lib/supabase'
import type { Unit } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

interface Member {
  id: string
  name: string
  relation: string | null
}

export default function MyUnit() {
  const { profile, refreshProfile } = useAuth()
  const unit = profile?.unit

  if (!unit) {
    return (
      <>
        <PageHeader title="My Unit" />
        <Empty>Your login isn't linked to a flat yet. Please ask the Management Committee.</Empty>
        <section className="menu">
          <MenuRow to="/my-unit/profile" icon="unit" title="My profile" subtitle="Name, phone, log out" />
        </section>
      </>
    )
  }
  return <UnitView unit={unit} onVehiclesSaved={refreshProfile} />
}

function UnitView({ unit, onVehiclesSaved }: { unit: Unit; onVehiclesSaved: () => Promise<void> }) {
  const [addingMember, setAddingMember] = useState(false)
  const [editingVehicles, setEditingVehicles] = useState(false)
  const state = useLoad(async () => {
    const [members, dues] = await Promise.all([
      supabase.from('unit_members').select('id, name, relation').eq('unit_id', unit.id).order('created_at').then(must),
      supabase.from('dues').select('amount').eq('unit_id', unit.id).eq('status', 'due').then(must),
    ])
    return {
      members: members as Member[],
      outstanding: (dues as { amount: number }[]).reduce((sum, d) => sum + Number(d.amount), 0),
    }
  }, [unit.id])

  async function removeMember(m: Member) {
    if (!confirm(`Remove ${m.name}?`)) return
    must(await supabase.from('unit_members').delete().eq('id', m.id))
    state.reload()
  }

  return (
    <>
      <PageHeader title="My Unit" />
      <section className="card unit-card">
        <div className="unit-number">{unit.number}</div>
        <dl className="facts">
          {unit.block && (
            <>
              <dt>Block</dt>
              <dd>{unit.block}</dd>
            </>
          )}
          {unit.area_sqft && (
            <>
              <dt>Area</dt>
              <dd>{unit.area_sqft} sq ft</dd>
            </>
          )}
          {unit.owner_name && (
            <>
              <dt>Owner</dt>
              <dd>{unit.owner_name}</dd>
            </>
          )}
          <dt>Occupancy</dt>
          <dd className="cap">{unit.occupancy}</dd>
        </dl>
      </section>

      <Loaded state={state}>
        {({ members, outstanding }) => (
          <>
            <section className="menu">
              <MenuRow
                to="/my-unit/dues"
                icon="rupee"
                title="My Dues"
                subtitle={outstanding > 0 ? `${money(outstanding)} outstanding` : 'All paid up'}
              />
              <MenuRow to="/my-unit/profile" icon="unit" title="My profile" subtitle="Name, phone, log out" />
            </section>

            <section className="card">
              <div className="section-head">
                <h2>House members ({members.length})</h2>
                <button className="btn small ghost" onClick={() => setAddingMember(true)}>
                  Add
                </button>
              </div>
              {members.length === 0 && <p className="muted">Add the people who live in your flat.</p>}
              {members.map((m) => (
                <div key={m.id} className="list-row">
                  <div className="list-main">
                    <strong>{m.name}</strong>
                    {m.relation && <small>{m.relation}</small>}
                  </div>
                  <button className="icon-btn" onClick={() => removeMember(m)} aria-label={`Remove ${m.name}`}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
            </section>
          </>
        )}
      </Loaded>

      <section className="card">
        <div className="section-head">
          <h2>Vehicles</h2>
          <button className="btn small ghost" onClick={() => setEditingVehicles(true)}>
            Edit
          </button>
        </div>
        <div className="stats">
          <div>
            <b>{unit.two_wheelers}</b>
            <small>Two-wheelers</small>
          </div>
          <div>
            <b>{unit.four_wheelers}</b>
            <small>Four-wheelers</small>
          </div>
        </div>
        {unit.vehicle_numbers && <p className="muted pre">{unit.vehicle_numbers}</p>}
      </section>

      {addingMember && (
        <AddMember
          unitId={unit.id}
          onClose={() => setAddingMember(false)}
          onSaved={() => {
            setAddingMember(false)
            state.reload()
          }}
        />
      )}
      {editingVehicles && (
        <EditVehicles
          unit={unit}
          onClose={() => setEditingVehicles(false)}
          onSaved={async () => {
            await onVehiclesSaved()
            setEditingVehicles(false)
          }}
        />
      )}
    </>
  )
}

function AddMember({ unitId, onClose, onSaved }: { unitId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      must(await supabase.from('unit_members').insert({ unit_id: unitId, name: name.trim(), relation: relation.trim() || null }))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title="Add house member" onClose={onClose}>
      <form onSubmit={save} className="stack">
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Relation">
          <input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="e.g. Spouse, Son, Tenant" />
        </Field>
        <button className="btn" disabled={busy}>
          Add
        </button>
      </form>
    </Sheet>
  )
}

function EditVehicles({ unit, onClose, onSaved }: { unit: Unit; onClose: () => void; onSaved: () => Promise<void> }) {
  const [two, setTwo] = useState(String(unit.two_wheelers))
  const [four, setFour] = useState(String(unit.four_wheelers))
  const [numbers, setNumbers] = useState(unit.vehicle_numbers)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      must(await supabase.rpc('update_my_vehicles', { p_two: Number(two) || 0, p_four: Number(four) || 0, p_numbers: numbers.trim() }))
      await onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title="Vehicles" onClose={onClose}>
      <form onSubmit={save} className="stack">
        <div className="row gap">
          <Field label="Two-wheelers">
            <input type="number" min="0" inputMode="numeric" value={two} onChange={(e) => setTwo(e.target.value)} />
          </Field>
          <Field label="Four-wheelers">
            <input type="number" min="0" inputMode="numeric" value={four} onChange={(e) => setFour(e.target.value)} />
          </Field>
        </div>
        <Field label="Registration numbers" hint="One per line, e.g. AS01 AB 1234">
          <textarea rows={3} value={numbers} onChange={(e) => setNumbers(e.target.value)} />
        </Field>
        <button className="btn" disabled={busy}>
          Save
        </button>
      </form>
    </Sheet>
  )
}
