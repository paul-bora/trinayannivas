import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Empty, Loaded, PageHeader } from '../../components/ui'
import { photoUrl } from '../../lib/files'
import { loadSettings } from '../../lib/settings'
import { useLoad } from '../../lib/useLoad'

// Society UPI and WhatsApp details for every resident, whether or not they have dues pending.
export default function Payment() {
  const state = useLoad(loadSettings)
  const [copied, setCopied] = useState(false)

  async function copy(upiId: string) {
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
    } catch {
      prompt('Copy this UPI ID:', upiId)
    }
  }

  return (
    <>
      <PageHeader title="Payment & group" back />
      <Loaded state={state}>
        {(settings) => (
          <>
            {settings.upi_id ? (
              <section className="card stack pay">
                <h2>Pay the society</h2>
                {settings.upi_name && (
                  <span>
                    Name: <b>{settings.upi_name}</b>
                  </span>
                )}
                <div className="row between">
                  <span>
                    UPI ID: <b>{settings.upi_id}</b>
                  </span>
                  <button className="btn small ghost" onClick={() => copy(settings.upi_id!)}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {settings.upi_qr_path && (
                  <img className="qr" src={photoUrl(settings.upi_qr_path)} alt="Society UPI QR code" />
                )}
                <p className="muted small">
                  To pay your maintenance, open <Link to="/my-unit/dues">My Dues</Link>. It fills in the amount and lets you
                  tell the committee once you've paid.
                </p>
              </section>
            ) : (
              <Empty>Online payment details haven't been added yet. Please pay the society treasurer.</Empty>
            )}

            {settings.whatsapp_link && (
              <section className="menu">
                <a className="menu-row" href={settings.whatsapp_link} target="_blank" rel="noreferrer">
                  <span className="menu-icon whatsapp">
                    <Icon name="whatsapp" />
                  </span>
                  <span className="menu-text">
                    <strong>Community WhatsApp group</strong>
                    <small>Join the society group</small>
                  </span>
                  <Icon name="chevron" size={18} />
                </a>
              </section>
            )}
          </>
        )}
      </Loaded>
    </>
  )
}
