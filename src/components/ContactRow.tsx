import type { ReactNode } from 'react'
import { telLink, whatsappLink } from '../lib/format'
import Icon from './Icon'

// A name/role row with Call and WhatsApp buttons, used across the directory.
export default function ContactRow({
  title,
  subtitle,
  phone,
  extra,
}: {
  title: string
  subtitle?: string | null
  phone?: string | null
  extra?: ReactNode
}) {
  return (
    <div className="list-row">
      <div className="list-main">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
      {phone && (
        <>
          <a className="icon-btn round" href={whatsappLink(phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${title}`}>
            <Icon name="whatsapp" />
          </a>
          <a className="icon-btn round primary" href={telLink(phone)} aria-label={`Call ${title}`}>
            <Icon name="phone" />
          </a>
        </>
      )}
      {extra}
    </div>
  )
}
