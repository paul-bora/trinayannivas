import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon, { type IconName } from './Icon'

export function PageHeader({ title, back, action }: { title: string; back?: boolean; action?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="page-header">
      {back && (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
      )}
      <h1>{title}</h1>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  )
}

export function Loading() {
  return <div className="center muted">Loading…</div>
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box">
      <p>{message}</p>
      {onRetry && (
        <button className="btn small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

// Shows loading / error states, then the content once data has arrived.
export function Loaded<T>({
  state,
  children,
}: {
  state: { data: T | undefined; error?: string; loading: boolean; reload: () => void }
  children: (data: T) => ReactNode
}) {
  if (state.error) return <ErrorBox message={state.error} onRetry={state.reload} />
  if (state.data === undefined) return <Loading />
  return <>{children(state.data)}</>
}

// A bottom sheet used for every add/edit form.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function MenuRow({ to, icon, title, subtitle }: { to: string; icon: IconName; title: string; subtitle?: string }) {
  return (
    <Link to={to} className="menu-row">
      <span className="menu-icon">
        <Icon name={icon} />
      </span>
      <span className="menu-text">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  )
}

export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="fab" onClick={onClick} aria-label={label}>
      <Icon name="plus" size={26} />
    </button>
  )
}
