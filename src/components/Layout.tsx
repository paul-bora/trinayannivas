import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Icon, { type IconName } from './Icon'

const tabs: { to: string; label: string; icon: IconName; adminOnly?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/community', label: 'Community', icon: 'community' },
  { to: '/directory', label: 'Directory', icon: 'directory' },
  { to: '/my-unit', label: 'My Unit', icon: 'unit' },
  { to: '/admin', label: 'Admin', icon: 'admin', adminOnly: true },
]

export default function Layout() {
  const { isAdmin } = useAuth()
  return (
    <div className="app">
      <main className="content">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        {tabs
          .filter((t) => !t.adminOnly || isAdmin)
          .map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tab">
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ))}
      </nav>
    </div>
  )
}
