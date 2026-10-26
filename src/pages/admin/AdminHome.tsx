import { useState } from 'react'
import { Loaded, MenuRow, PageHeader } from '../../components/ui'
import { currentMonth, money, monthLabel } from '../../lib/format'
import { must, supabase } from '../../lib/supabase'
import { useLoad } from '../../lib/useLoad'

interface Summary {
  collected_month: number
  spent_month: number
  collected_total: number
  spent_total: number
  opening_balance: number
  pending_total: number
  pending_units: number
}

export default function AdminHome() {
  const [month, setMonth] = useState(currentMonth())
  const state = useLoad(
    async () => must<Summary>(await supabase.rpc('finance_summary', { p_month: month })),
    [month],
  )

  return (
    <>
      <PageHeader title="Committee admin" />
      <div className="row between">
        <h2>Accounts</h2>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      <Loaded state={state}>
        {(s) => {
          const balance = Number(s.opening_balance) + Number(s.collected_total) - Number(s.spent_total)
          return (
            <div className="stat-grid">
              <div className="card stat">
                <small>Collected · {monthLabel(month)}</small>
                <b className="green-text">{money(s.collected_month)}</b>
              </div>
              <div className="card stat">
                <small>Spent · {monthLabel(month)}</small>
                <b className="red-text">{money(s.spent_month)}</b>
              </div>
              <div className="card stat">
                <small>Society balance</small>
                <b>{money(balance)}</b>
              </div>
              <div className="card stat">
                <small>Pending dues</small>
                <b>{money(s.pending_total)}</b>
                <small>{s.pending_units} flats</small>
              </div>
            </div>
          )
        }}
      </Loaded>

      <section className="menu">
        <MenuRow to="/admin/maintenance" icon="rupee" title="Maintenance dues" subtitle="Raise monthly dues, mark payments" />
        <MenuRow to="/admin/expenses" icon="file" title="Expenses" subtitle="Record spending and receipts" />
        <MenuRow to="/admin/members" icon="unit" title="Flats & members" subtitle="Add flats and residents' logins" />
        <MenuRow to="/announcements" icon="pin" title="Announcements" subtitle="Post notices for everyone" />
        <MenuRow to="/admin/reports" icon="flag" title="Reported posts" subtitle="Review community reports" />
        <MenuRow to="/admin/settings" icon="admin" title="Society settings" subtitle="UPI, WhatsApp link, maintenance amount" />
      </section>
      <p className="muted small">
        Directory contacts, documents and rules can be edited directly on their pages, where admins see Add/Edit buttons.
      </p>
    </>
  )
}
