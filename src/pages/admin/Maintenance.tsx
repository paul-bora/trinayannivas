import { useState, type FormEvent } from 'react'
import { Empty, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { downloadCsv } from '../../lib/csv'
import { currentMonth, date, money, monthLabel, today } from '../../lib/format'
import { loadSettings } from '../../lib/settings'
import { must, supabase } from '../../lib/supabase'
import type { Due } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

type DueRow = Due & { unit: { number: string } | null }

const MODES = ['UPI', 'Cash', 'Bank transfer', 'Cheque']

export default function Maintenance() {
  const [month, setMonth] = useState(currentMonth())
  const [show, setShow] = useState<'all' | 'due' | 'paid'>('all')
  const [editing, setEditing] = useState<DueRow | null>(null)
  const [busy, setBusy] = useState(false)
  const state = useLoad(async () => {
    const [dues, settings] = await Promise.all([
      supabase.from('dues').select('*, unit:units!dues_unit_id_fkey(number)').eq('month', month).then(must),
      loadSettings(),
    ])
    const rows = (dues as DueRow[]).sort((a, b) => (a.unit?.number ?? '').localeCompare(b.unit?.number ?? '', 'en', { numeric: true }))
    return { dues: rows, settings }
  }, [month])

  async function generate(defaultAmount: number) {
    const input = prompt(`Raise maintenance for ${monthLabel(month)} for every flat.\nAmount per flat (₹):`, String(defaultAmount || ''))
    if (input === null) return
    const amount = Number(input)
    if (!(amount > 0)) return alert('Please enter an amount.')
    setBusy(true)
    try {
      const created = must(await supabase.rpc('generate_dues', { p_month: month, p_amount: amount }))
      alert(`Dues raised for ${created} flat(s). Flats that already had dues for this month were skipped.`)
      state.reload()
    } catch (e) {
      alert(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function exportAll() {
    try {
      const rows = must(await supabase.from('dues').select('*, unit:units!dues_unit_id_fkey(number)').order('month')) as DueRow[]
      downloadCsv(
        'maintenance-dues.csv',
        rows.map((d) => ({
          Month: d.month,
          Flat: d.unit?.number,
          Amount: d.amount,
          Status: d.status,
          'Paid on': d.paid_on,
          Mode: d.mode,
          Reference: d.reference,
        })),
      )
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        title="Maintenance"
        back
        action={
          <button className="btn small ghost" onClick={exportAll}>
            Export CSV
          </button>
        }
      />
      <div className="row between">
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <div className="tabs-inline compact">
          {(['all', 'due', 'paid'] as const).map((s) => (
            <button key={s} className={show === s ? 'active' : ''} onClick={() => setShow(s)}>
              {{ all: 'All', due: 'Unpaid', paid: 'Paid' }[s]}
            </button>
          ))}
        </div>
      </div>
      <Loaded state={state}>
        {({ dues, settings }) => {
          const paid = dues.filter((d) => d.status === 'paid')
          const unpaid = dues.filter((d) => d.status === 'due')
          const shown = show === 'all' ? dues : show === 'due' ? unpaid : paid
          const sum = (list: Due[]) => list.reduce((s, d) => s + Number(d.amount), 0)
          return (
            <>
              <div className="stat-grid">
                <div className="card stat">
                  <small>Collected ({paid.length})</small>
                  <b className="green-text">{money(sum(paid))}</b>
                </div>
                <div className="card stat">
                  <small>Unpaid ({unpaid.length})</small>
                  <b className="red-text">{money(sum(unpaid))}</b>
                </div>
              </div>
              <button className="btn" disabled={busy} onClick={() => generate(Number(settings.monthly_maintenance))}>
                Raise dues for {monthLabel(month)}
              </button>
              {shown.length === 0 ? (
                <Empty>{dues.length === 0 ? `No dues raised for ${monthLabel(month)} yet.` : 'Nothing in this list.'}</Empty>
              ) : (
                <div className="card list">
                  {shown.map((d) => (
                    <button key={d.id} className="list-row link-btn" onClick={() => setEditing(d)}>
                      <div className="list-main">
                        <strong>{d.unit?.number}</strong>
                        <small>
                          {d.status === 'paid'
                            ? `Paid ${date(d.paid_on)}${d.mode ? ` · ${d.mode}` : ''}`
                            : d.reported_reference
                              ? `Resident says paid: ${d.reported_reference}`
                              : 'Not paid'}
                        </small>
                      </div>
                      <div className="right">
                        <b>{money(d.amount)}</b>
                        <span className={`badge ${d.status === 'paid' ? 'green' : d.reported_reference ? 'amber' : 'red'}`}>
                          {d.status === 'paid' ? 'Paid' : d.reported_reference ? 'Check' : 'Due'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )
        }}
      </Loaded>
      {editing && (
        <DueForm
          due={editing}
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

function DueForm({ due, onClose, onSaved }: { due: DueRow; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(due.amount))
  const [paidOn, setPaidOn] = useState(due.paid_on ?? today())
  const [mode, setMode] = useState(due.mode ?? 'UPI')
  const [reference, setReference] = useState(due.reference ?? due.reported_reference ?? '')
  const [busy, setBusy] = useState(false)

  async function update(changes: Partial<Due>) {
    setBusy(true)
    try {
      must(await supabase.from('dues').update(changes).eq('id', due.id))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  function markPaid(e: FormEvent) {
    e.preventDefault()
    update({ amount: Number(amount), status: 'paid', paid_on: paidOn, mode, reference: reference.trim() || null })
  }

  async function remove() {
    if (!confirm(`Delete the ${monthLabel(due.month)} due for ${due.unit?.number}?`)) return
    setBusy(true)
    try {
      must(await supabase.from('dues').delete().eq('id', due.id))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title={`${due.unit?.number} · ${monthLabel(due.month)}`} onClose={onClose}>
      <form onSubmit={markPaid} className="stack">
        {due.reported_reference && due.status === 'due' && (
          <p className="notice">
            Resident reported payment on {date(due.reported_at)} with reference <b>{due.reported_reference}</b>. Check your bank
            or UPI statement before confirming.
          </p>
        )}
        <Field label="Amount (₹)">
          <input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="row gap">
          <Field label="Paid on">
            <input type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field label="Mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Reference / receipt no.">
          <input value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <button className="btn" disabled={busy}>
          {due.status === 'paid' ? 'Update payment' : 'Mark as paid'}
        </button>
        {due.status === 'paid' ? (
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => update({ status: 'due', paid_on: null, mode: null, reference: null })}
          >
            Mark as unpaid
          </button>
        ) : (
          <button type="button" className="btn ghost" disabled={busy} onClick={() => update({ amount: Number(amount) })}>
            Save amount only
          </button>
        )}
        <button type="button" className="btn ghost danger" disabled={busy} onClick={remove}>
          Delete this due
        </button>
      </form>
    </Sheet>
  )
}
