import { useState } from 'react'
import { Empty, Loaded, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { photoUrl } from '../../lib/files'
import { date, money, monthLabel } from '../../lib/format'
import { loadSettings } from '../../lib/settings'
import { must, supabase } from '../../lib/supabase'
import type { Due, Settings } from '../../lib/types'
import { upiLink } from '../../lib/upi'
import { errorMessage, useLoad } from '../../lib/useLoad'

export default function MyDues() {
  const { profile } = useAuth()
  const unitId = profile?.unit_id
  const state = useLoad(async () => {
    const [dues, settings] = await Promise.all([
      supabase.from('dues').select('*').eq('unit_id', unitId ?? '').order('month', { ascending: false }).then(must),
      loadSettings(),
    ])
    return { dues: dues as Due[], settings }
  }, [unitId])

  async function reportPaid(d: Due) {
    const ref = prompt(
      `Paid ${money(d.amount)} for ${monthLabel(d.month)}?\nEnter the UPI transaction ID (or "cash") so the committee can confirm it:`,
      d.reported_reference ?? '',
    )
    if (!ref?.trim()) return
    try {
      must(await supabase.rpc('report_payment', { p_due_id: d.id, p_reference: ref }))
      state.reload()
    } catch (e) {
      alert(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader title="My Dues" back />
      {!unitId ? (
        <Empty>Your login isn't linked to a flat yet.</Empty>
      ) : (
        <Loaded state={state}>
          {({ dues, settings }) => {
            const pending = dues.filter((d) => d.status === 'due')
            const outstanding = pending.reduce((s, d) => s + Number(d.amount), 0)
            return (
              <>
                <section className={`card total ${outstanding > 0 ? 'owing' : 'clear'}`}>
                  <small>Outstanding</small>
                  <div className="big">{money(outstanding)}</div>
                  {outstanding > 0 ? (
                    <small>
                      {pending.length} month{pending.length > 1 ? 's' : ''} unpaid
                    </small>
                  ) : (
                    <small>You're all paid up. Thank you!</small>
                  )}
                </section>

                {outstanding > 0 && <PayBox settings={settings} amount={outstanding} note={`Maintenance ${profile?.unit?.number}`} />}

                <h2>History</h2>
                {dues.length === 0 ? (
                  <Empty>No dues have been raised yet.</Empty>
                ) : (
                  <div className="card list">
                    {dues.map((d) => (
                      <div key={d.id} className="list-row">
                        <div className="list-main">
                          <strong>{monthLabel(d.month)}</strong>
                          <small>
                            {d.status === 'paid'
                              ? `Paid ${date(d.paid_on)}${d.mode ? ` · ${d.mode}` : ''}`
                              : d.reported_reference
                                ? `Payment reported (${d.reported_reference}), awaiting confirmation`
                                : 'Not paid'}
                          </small>
                        </div>
                        <div className="right">
                          <b>{money(d.amount)}</b>
                          {d.status === 'paid' ? (
                            <span className="badge green">Paid</span>
                          ) : (
                            <button className="btn small ghost" onClick={() => reportPaid(d)}>
                              I've paid
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          }}
        </Loaded>
      )}
    </>
  )
}

function PayBox({ settings, amount, note }: { settings: Settings; amount: number; note: string }) {
  const [copied, setCopied] = useState(false)
  if (!settings.upi_id) {
    return <p className="muted">Please pay the society treasurer. Online payment details haven't been added yet.</p>
  }
  const link = upiLink({ upiId: settings.upi_id, payee: settings.upi_name || settings.society_name, amount, note })

  async function copy() {
    try {
      await navigator.clipboard.writeText(settings.upi_id!)
      setCopied(true)
    } catch {
      prompt('Copy this UPI ID:', settings.upi_id!)
    }
  }

  return (
    <section className="card stack pay">
      <h2>Pay online</h2>
      <a className="btn" href={link}>
        Pay {money(amount)} with a UPI app
      </a>
      <div className="row between">
        <span>
          UPI ID: <b>{settings.upi_id}</b>
        </span>
        <button className="btn small ghost" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {settings.upi_qr_path && (
        <img className="qr" src={photoUrl(settings.upi_qr_path)} alt="Society UPI QR code" />
      )}
      <p className="muted small">
        On iPhone, scan the QR code or copy the UPI ID into your payment app. After paying, tap <b>I've paid</b> below so the
        committee can confirm it.
      </p>
    </section>
  )
}
