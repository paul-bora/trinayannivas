import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

// Two steps: enter email → enter the one-time code from the email.
export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() })
    setBusy(false)
    if (error) {
      // The database rejects emails that are not on the society's list.
      setError(
        /database error|not registered|signups not allowed/i.test(error.message)
          ? 'This email is not registered with the society. Please ask the Management Committee to add you.'
          : error.message,
      )
      return
    }
    setStep('code')
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(/expired|invalid/i.test(error.message) ? 'That code is wrong or has expired. Try again.' : error.message)
  }

  return (
    <div className="login">
      <img src="/logo.svg" alt="" width={84} height={84} />
      <h1>Trinayan Nivas</h1>
      <p className="muted">Housing Society</p>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="card stack">
          <label className="field">
            <span className="field-label">Your email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? 'Sending…' : 'Send login code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="card stack">
          <p>
            We emailed a code to <b>{email}</b>. Check your spam folder if you don't see it.
          </p>
          <label className="field">
            <span className="field-label">Login code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              maxLength={8}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="code-input"
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? 'Checking…' : 'Log in'}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setStep('email')
              setCode('')
              setError('')
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="error-text">{error}</p>}
      <a className="muted small" href="/privacy.html">
        Privacy policy
      </a>
    </div>
  )
}
