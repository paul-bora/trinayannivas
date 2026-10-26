import { useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
import { Empty, Fab, Field, Loaded, PageHeader, Sheet } from '../../components/ui'
import { downloadCsv } from '../../lib/csv'
import { deletePrivate, openPrivate, uploadPrivate } from '../../lib/files'
import { currentMonth, date, money, monthLabel, today } from '../../lib/format'
import { must, supabase } from '../../lib/supabase'
import type { Expense } from '../../lib/types'
import { errorMessage, useLoad } from '../../lib/useLoad'

const CATEGORIES = [
  'Security',
  'Housekeeping',
  'Electricity',
  'Water',
  'Lift',
  'Repairs & maintenance',
  'Garden',
  'Office & admin',
  'Events & festivals',
  'Other',
]

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { from: `${month}-01`, to: `${next}-01` }
}

export default function Expenses() {
  const [month, setMonth] = useState(currentMonth())
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const state = useLoad(async () => {
    const { from, to } = monthRange(month)
    return must<Expense[]>(
      await supabase.from('expenses').select('*').gte('spent_on', from).lt('spent_on', to).order('spent_on', { ascending: false }),
    )
  }, [month])

  async function exportAll() {
    try {
      const rows = must<Expense[]>(await supabase.from('expenses').select('*').order('spent_on'))
      downloadCsv(
        'expenses.csv',
        rows.map((e) => ({ Date: e.spent_on, Category: e.category, Amount: e.amount, Note: e.note, Receipt: e.receipt_path ? 'yes' : '' })),
      )
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader
        title="Expenses"
        back
        action={
          <button className="btn small ghost" onClick={exportAll}>
            Export CSV
          </button>
        }
      />
      <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      <Loaded state={state}>
        {(list) => {
          const total = list.reduce((s, e) => s + Number(e.amount), 0)
          const byCategory = Object.entries(
            list.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + Number(e.amount) }), {}),
          ).sort((a, b) => b[1] - a[1])
          return (
            <>
              <section className="card total">
                <small>Spent in {monthLabel(month)}</small>
                <div className="big">{money(total)}</div>
                {byCategory.map(([cat, amt]) => (
                  <div key={cat} className="row between small">
                    <span>{cat}</span>
                    <span>{money(amt)}</span>
                  </div>
                ))}
              </section>
              {list.length === 0 ? (
                <Empty>No expenses recorded for {monthLabel(month)}.</Empty>
              ) : (
                <div className="card list">
                  {list.map((e) => (
                    <button key={e.id} className="list-row link-btn" onClick={() => setEditing(e)}>
                      <div className="list-main">
                        <strong>
                          {e.category} {e.receipt_path && <Icon name="file" size={14} />}
                        </strong>
                        <small>
                          {date(e.spent_on)}
                          {e.note ? ` · ${e.note}` : ''}
                        </small>
                      </div>
                      <b>{money(e.amount)}</b>
                    </button>
                  ))}
                </div>
              )}
            </>
          )
        }}
      </Loaded>
      <Fab label="Add expense" onClick={() => setEditing('new')} />
      {editing && (
        <ExpenseForm
          expense={editing === 'new' ? null : editing}
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

function ExpenseForm({ expense, onClose, onSaved }: { expense: Expense | null; onClose: () => void; onSaved: () => void }) {
  const [spentOn, setSpentOn] = useState(expense?.spent_on ?? today())
  const [category, setCategory] = useState(expense?.category ?? CATEGORIES[0])
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [note, setNote] = useState(expense?.note ?? '')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      let receipt_path = expense?.receipt_path ?? null
      if (receipt) {
        receipt_path = await uploadPrivate('receipts', receipt)
        await deletePrivate('receipts', expense?.receipt_path ?? null)
      }
      const row = { spent_on: spentOn, category, amount: Number(amount), note: note.trim() || null, receipt_path }
      if (expense) must(await supabase.from('expenses').update(row).eq('id', expense.id))
      else must(await supabase.from('expenses').insert(row))
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  async function remove() {
    if (!expense || !confirm('Delete this expense?')) return
    setBusy(true)
    try {
      must(await supabase.from('expenses').delete().eq('id', expense.id))
      await deletePrivate('receipts', expense.receipt_path)
      onSaved()
    } catch (err) {
      alert(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Sheet title={expense ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <form onSubmit={save} className="stack">
        <div className="row gap">
          <Field label="Date">
            <input type="date" required value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
          </Field>
          <Field label="Amount (₹)">
            <input type="number" min="0" step="0.01" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Note">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Pump motor repair, vendor name" />
        </Field>
        <Field label={expense?.receipt_path ? 'Replace receipt (optional)' : 'Receipt photo or PDF (optional)'}>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
        </Field>
        {expense?.receipt_path && (
          <button type="button" className="btn ghost" onClick={() => openPrivate('receipts', expense.receipt_path!)}>
            View current receipt
          </button>
        )}
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {expense && (
          <button type="button" className="btn ghost danger" disabled={busy} onClick={remove}>
            Delete expense
          </button>
        )}
      </form>
    </Sheet>
  )
}
