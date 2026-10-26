import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import InstallBanner from '../../components/InstallBanner'
import { Empty, Loaded, MenuRow } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { date } from '../../lib/format'
import { readLocal } from '../../lib/local'
import { loadSettings } from '../../lib/settings'
import { must, supabase } from '../../lib/supabase'
import type { Announcement } from '../../lib/types'
import { useLoad } from '../../lib/useLoad'

export const LAST_SEEN_KEY = 'announcements-last-seen'

export default function Home() {
  const { profile } = useAuth()
  const state = useLoad(async () => {
    const [announcements, settings] = await Promise.all([
      supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)
        .then(must<Announcement[]>),
      loadSettings(),
    ])
    return { announcements, settings }
  })
  const lastSeen = readLocal(LAST_SEEN_KEY) ?? ''

  return (
    <>
      <header className="hero">
        <img src="/logo.svg" alt="" width={44} height={44} />
        <div>
          <h1>Trinayan Nivas</h1>
          <p>
            Hello, {profile?.name.split(' ')[0]}
            {profile?.unit ? ` · ${profile.unit.number}` : ''}
          </p>
        </div>
      </header>

      <InstallBanner />

      <Loaded state={state}>
        {({ announcements, settings }) => (
          <>
            <section>
              <div className="section-head">
                <h2>Announcements</h2>
                <Link to="/announcements">See all</Link>
              </div>
              {announcements.length === 0 ? (
                <Empty>No announcements yet.</Empty>
              ) : (
                announcements.map((a) => (
                  <Link key={a.id} to="/announcements" className="card announcement">
                    <div className="row gap">
                      {a.pinned && <Icon name="pin" size={16} />}
                      <strong>{a.title}</strong>
                      {a.created_at > lastSeen && <span className="badge">New</span>}
                    </div>
                    <p className="clamp">{a.body}</p>
                    <small className="muted">{date(a.created_at)}</small>
                  </Link>
                ))
              )}
            </section>

            <section className="menu">
              {settings.whatsapp_link ? (
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
              ) : null}
              <MenuRow to="/rules" icon="file" title="Society rules" subtitle="Bye-laws and house rules" />
              <MenuRow to="/buy-sell" icon="rupee" title="Buy / Sell" subtitle="Items from your neighbours" />
            </section>
          </>
        )}
      </Loaded>
    </>
  )
}
