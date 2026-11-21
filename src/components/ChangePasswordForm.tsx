'use client'

import { FormEvent, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

export default function ChangePasswordForm({
  email,
  role,
  mandatory,
}: {
  email: string
  role: string
  mandatory: boolean
}) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword') || '')
    const newPassword = String(form.get('newPassword') || '')
    const confirmPassword = String(form.get('confirmPassword') || '')

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const response = await fetch('/api/app-auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setBusy(false)
        setError(result.error || 'Could not update password.')
        return
      }
      setMessage(result.message || 'Password updated successfully.')
      window.setTimeout(() => {
        window.location.assign(`/dashboard/${role}`)
      }, 700)
    } catch {
      setBusy(false)
      setError('Unable to connect right now. Please try again.')
    }
  }

  async function logout() {
    await fetch('/api/app-auth/logout', { method: 'POST' })
    window.location.assign('/login')
  }

  return (
    <main className="auth-page">
      <BrandLogo light />
      <section className="auth-card">
        <span className="eyebrow">
          {mandatory ? 'Security requirement · First login' : 'Account security'}
        </span>
        <h1>Change your password</h1>
        <p className="section-copy" style={{ marginBottom: 24 }}>
          Signed in as <strong>{email}</strong> ({role.replace('-', ' ')}).{' '}
          {mandatory
            ? 'For security, you must set a new password (at least 12 characters) before accessing the dashboard.'
            : 'Choose a strong password of at least 12 characters.'}
        </p>
        <form onSubmit={onSubmit}>
          <label>
            Current password
            <div className="password-field">
              <input
                name="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowCurrent((prev) => !prev)}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showCurrent ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </label>
          <label>
            New password
            <div className="password-field">
              <input
                name="newPassword"
                type={showNew ? 'text' : 'password'}
                required
                minLength={12}
                placeholder="Minimum 12 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNew((prev) => !prev)}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showNew ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </label>
          <label>
            Confirm new password
            <div className="password-field">
              <input
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={12}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showConfirm ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="form-success">{message}</p>}
          <button className="button button-coral full" disabled={busy} type="submit">
            {busy ? 'Updating password…' : 'Save new password & continue'}
          </button>
        </form>
        <div className="auth-links">
          {!mandatory && (
            <a href={`/dashboard/${role}`} className="table-action">
              Back to Dashboard
            </a>
          )}
          <button type="button" className="table-action" onClick={logout}>
            Sign out
          </button>
        </div>
      </section>
    </main>
  )
}
