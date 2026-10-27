import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import { useAuth } from './lib/auth'
import { configured } from './lib/supabase'
import Login from './pages/auth/Login'
import Home from './pages/home/Home'
import Announcements from './pages/home/Announcements'
import Rules from './pages/home/Rules'
import BuySell from './pages/home/BuySell'
import Community from './pages/community/Community'
import PostDetail from './pages/community/PostDetail'
import Directory from './pages/directory/Directory'
import Neighbours from './pages/directory/Neighbours'
import Documents from './pages/directory/Documents'
import Contacts from './pages/directory/Contacts'
import Payment from './pages/directory/Payment'
import MyUnit from './pages/myunit/MyUnit'
import MyDues from './pages/myunit/MyDues'
import MyProfile from './pages/myunit/MyProfile'
import AdminHome from './pages/admin/AdminHome'
import Members from './pages/admin/Members'
import Maintenance from './pages/admin/Maintenance'
import Expenses from './pages/admin/Expenses'
import SocietySettings from './pages/admin/SocietySettings'
import Reports from './pages/admin/Reports'

export default function App() {
  const { session, profile, loading, signOut, refreshProfile } = useAuth()

  if (!configured) {
    return (
      <div className="center-page">
        <h1>Setup needed</h1>
        <p>Copy .env.example to .env and add your Supabase URL and anon key, then restart.</p>
      </div>
    )
  }
  if (loading) return <Loading />
  if (!session) return <Login />
  if (!profile) {
    return (
      <div className="center-page">
        <h1>Account not linked</h1>
        <p>We couldn't load your resident profile. Check your connection, or ask the committee to check your email.</p>
        <div className="row gap">
          <button className="btn" onClick={refreshProfile}>
            Try again
          </button>
          <button className="btn ghost" onClick={signOut}>
            Log out
          </button>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="rules" element={<Rules />} />
        <Route path="buy-sell" element={<BuySell />} />
        <Route path="community" element={<Community />} />
        <Route path="community/:id" element={<PostDetail />} />
        <Route path="directory" element={<Directory />} />
        <Route path="directory/neighbours" element={<Neighbours />} />
        <Route path="directory/documents" element={<Documents />} />
        <Route path="directory/payment" element={<Payment />} />
        <Route path="directory/:type" element={<Contacts />} />
        <Route path="my-unit" element={<MyUnit />} />
        <Route path="my-unit/dues" element={<MyDues />} />
        <Route path="my-unit/profile" element={<MyProfile />} />
        <Route path="admin" element={<AdminOnly><AdminHome /></AdminOnly>} />
        <Route path="admin/members" element={<AdminOnly><Members /></AdminOnly>} />
        <Route path="admin/maintenance" element={<AdminOnly><Maintenance /></AdminOnly>} />
        <Route path="admin/expenses" element={<AdminOnly><Expenses /></AdminOnly>} />
        <Route path="admin/settings" element={<AdminOnly><SocietySettings /></AdminOnly>} />
        <Route path="admin/reports" element={<AdminOnly><Reports /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />
}
