'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

import { BrandLogo } from './BrandLogo'

type Mode = 'forgot' | 'login' | 'register' | 'reset' | 'verify'

export default function AuthPanel({ mode, token }: { mode: Mode; token?: string }) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(mode === 'verify')
  const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual')

  useEffect(() => {
    if (mode !== 'verify' || !token) return
    fetch('/api/app-auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setMessage('Email verified. You can now log in.')
      })
      .catch((reason) => setError(reason.message || 'Verification failed.'))
      .finally(() => setBusy(false))
  }, [mode, token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const body = Object.fromEntries(form.entries())
    if (token) body.token = token
    const response = await fetch(`/api/app-auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await response.json()
    setBusy(false)
    if (!response.ok) {
      setError(result.error || 'Please check your details and try again.')
      return
    }
    if (mode === 'login' || (mode === 'register' && result.role)) {
      window.location.assign('/dashboard')
      return
    }
    setMessage(result.message)
  }

  const titles: Record<Mode, string> = {
    forgot: 'Reset your password',
    login: 'Welcome back',
    register: 'Create your organizer account',
    reset: 'Choose a new password',
    verify: 'Verify your email',
  }

  return (
    <main className="auth-page">
      <BrandLogo light />
      <section className="auth-card">
        <span className="eyebrow">Organizer workspace</span>
        <h1>{titles[mode]}</h1>
        {mode === 'verify' ? (
          <div className="auth-status">
            {busy && <p>Verifying your secure link…</p>}
            {message && <p className="form-success">{message}</p>}
            {error && <p className="form-error">{error}</p>}
          </div>
        ) : (
          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <div className="account-type-switch" role="group" aria-label="Organizer type">
                  <button
                    type="button"
                    className={accountType === 'individual' ? 'active' : ''}
                    onClick={() => setAccountType('individual')}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    className={accountType === 'organization' ? 'active' : ''}
                    onClick={() => setAccountType('organization')}
                  >
                    Organization / Business
                  </button>
                </div>
                <input type="hidden" name="accountType" value={accountType} />
                <label>
                  {accountType === 'organization' ? 'Contact name' : 'Full name'}
                  <input name="name" required minLength={2} autoComplete="name" />
                </label>
                {accountType === 'organization' && (
                  <>
                    <label>
                      Registered business name
                      <input name="businessName" required minLength={2} />
                    </label>
                    <label>
                      CAC number <span className="optional">Optional</span>
                      <input name="cacNumber" />
                    </label>
                  </>
                )}
                <label>
                  Phone number
                  <input name="phone" type="tel" required minLength={10} autoComplete="tel" />
                </label>
                <div className="auth-grid">
                  <label>
                    Country
                    <input name="country" required autoComplete="country-name" />
                  </label>
                  <label>
                    State
                    <input name="state" required autoComplete="address-level1" />
                  </label>
                  <label>
                    City
                    <input name="city" required autoComplete="address-level2" />
                  </label>
                </div>
                {accountType === 'organization' && (
                  <label>
                    Business address
                    <input
                      name="businessAddress"
                      required
                      minLength={5}
                      autoComplete="street-address"
                    />
                  </label>
                )}
                <label>
                  Website <span className="optional">Optional</span>
                  <input name="website" type="url" placeholder="https://" />
                </label>
              </>
            )}
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <label>
                {mode === 'register' && accountType === 'organization'
                  ? 'Business email'
                  : 'Email address'}
                <input name="email" type="email" required autoComplete="email" />
              </label>
            )}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <label>
                {mode === 'reset' ? 'New password' : 'Password'}
                <input
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
            )}
            {mode === 'register' && (
              <>
                <label>
                  Confirm password
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                </label>
                <label className="terms">
                  <input name="terms" type="checkbox" required /> I agree to the organizer terms.
                </label>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && <p className="form-success">{message}</p>}
            <button className="button button-coral full" disabled={busy} type="submit">
              {busy ? 'Please wait…' : titles[mode]}
            </button>
          </form>
        )}
        <div className="auth-links">
          {mode === 'login' && (
            <>
              <Link href="/forgot-password">Forgot password?</Link>
              <Link href="/register">Create organizer account</Link>
            </>
          )}
          {mode !== 'login' && <Link href="/login">Back to login</Link>}
          <Link href="/">Back to AZOR TIX</Link>
        </div>
      </section>
    </main>
  )
}
