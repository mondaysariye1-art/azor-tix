'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { BrandLogo } from './BrandLogo'

type Mode = 'forgot' | 'login' | 'register' | 'reset' | 'verify'
type AccountType = 'individual' | 'organization'

export default function AuthPanel({ mode, token }: { mode: Mode; token?: string }) {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(mode === 'verify')
  const [accountType, setAccountType] = useState<AccountType>('individual')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  function switchAccountType(nextType: AccountType) {
    if (nextType === accountType) return
    setAccountType(nextType)
    setError('')
    setMessage('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)
    const body: Record<string, any> = Object.fromEntries(form.entries())

    if (mode === 'register') {
      body.accountType = accountType
      const password = String(body.password || '')
      const confirmPassword = String(body.confirmPassword || '')
      if (password.length < 12) {
        setError('Password must be at least 12 characters long.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setBusy(true)
    try {
      const response = await fetch(`/api/app-auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) {
        setBusy(false)
        setError(result.error || 'Please check your details and try again.')
        return
      }
      if (mode === 'register' && result.role) {
        setBusy(false)
        setMessage(
          result.message || 'Account created successfully! Opening your organizer dashboard…',
        )
        window.setTimeout(() => {
          window.location.assign('/dashboard')
        }, 1400)
        return
      }
      if (mode === 'login') {
        if (result.mustChangePassword) {
          window.location.assign('/change-password')
        } else {
          window.location.assign('/dashboard')
        }
        return
      }
      setBusy(false)
      setMessage(result.message)
    } catch {
      setBusy(false)
      setError('Unable to connect right now. Please try again.')
    }
  }

  const titles: Record<Mode, string> = {
    forgot: 'Reset your password',
    login: 'Welcome back',
    register: 'Create your account',
    reset: 'Choose a new password',
    verify: 'Verify your email',
  }

  return (
    <main className="auth-page">
      <BrandLogo light />
      <section className="auth-card">
        <span className="eyebrow">
          {mode === 'register'
            ? accountType === 'organization'
              ? 'Organization registration'
              : 'Individual registration'
            : 'Organizer workspace'}
        </span>
        <h1>{titles[mode]}</h1>
        {mode === 'verify' ? (
          <div className="auth-status">
            {busy && <p>Verifying your secure link…</p>}
            {message && <p className="form-success">{message}</p>}
            {error && <p className="form-error">{error}</p>}
          </div>
        ) : (
          <form onSubmit={submit} autoComplete={mode === 'login' ? 'on' : 'off'}>
            {mode === 'register' && (
              <>
                <div className="account-type-block">
                  <span className="account-type-label">Account type</span>
                  <div className="account-type-switch" role="tablist" aria-label="Account type">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={accountType === 'individual'}
                      data-testid="account-type-individual"
                      className={accountType === 'individual' ? 'active' : ''}
                      onClick={() => switchAccountType('individual')}
                    >
                      <strong>Individual</strong>
                      <span>Personal account</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={accountType === 'organization'}
                      data-testid="account-type-organization"
                      className={accountType === 'organization' ? 'active' : ''}
                      onClick={() => switchAccountType('organization')}
                    >
                      <strong>Organization</strong>
                      <span>Company or brand</span>
                    </button>
                  </div>
                </div>
                <input type="hidden" name="accountType" value={accountType} />

                {accountType === 'individual' ? (
                  <div className="account-fields-group" key="individual-fields">
                    <div className="auth-grid two-col">
                      <label>
                        First name
                        <input
                          name="firstName"
                          required
                          minLength={2}
                          autoComplete="off"
                          placeholder="Amara"
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          name="lastName"
                          required
                          minLength={2}
                          autoComplete="off"
                          placeholder="Okafor"
                        />
                      </label>
                    </div>
                    <label>
                      Email address
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                        placeholder="amara@example.com"
                      />
                    </label>
                    <label>
                      Phone number
                      <input
                        name="phone"
                        type="tel"
                        required
                        minLength={10}
                        autoComplete="off"
                        placeholder="+234 800 000 0000"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="account-fields-group" key="organization-fields">
                    <label>
                      Organization or company name
                      <input
                        name="businessName"
                        required
                        minLength={2}
                        autoComplete="off"
                        placeholder="House of Waves Ltd"
                      />
                    </label>
                    <label>
                      Contact person’s full name
                      <input
                        name="name"
                        required
                        minLength={2}
                        autoComplete="off"
                        placeholder="Nana Eze"
                      />
                    </label>
                    <label>
                      Business email address
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                        placeholder="events@houseofwaves.ng"
                      />
                    </label>
                    <label>
                      Phone number
                      <input
                        name="phone"
                        type="tel"
                        required
                        minLength={10}
                        autoComplete="off"
                        placeholder="+234 800 000 0000"
                      />
                    </label>
                    <div className="auth-grid two-col">
                      <label>
                        CAC number <span className="optional">Optional</span>
                        <input name="cacNumber" autoComplete="off" placeholder="RC 123456" />
                      </label>
                      <label>
                        Website <span className="optional">Optional</span>
                        <input name="website" type="url" autoComplete="off" placeholder="https://" />
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}

            {(mode === 'login' || mode === 'forgot') && (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete={mode === 'login' ? 'email' : 'off'}
                />
              </label>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <label>
                {mode === 'reset' ? 'New password' : 'Password'}
                <div className="password-field">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'login' ? undefined : 12}
                    placeholder={mode === 'login' ? 'Enter your password' : 'Minimum 12 characters'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    data-testid="toggle-password"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
              </label>
            )}

            {mode === 'register' && (
              <>
                <label>
                  Confirm password
                  <div className="password-field">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={12}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      data-testid="toggle-confirm-password"
                      aria-label={
                        showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                      }
                      aria-pressed={showConfirmPassword}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                      <span>{showConfirmPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                </label>
                <label className="terms">
                  <input name="terms" type="checkbox" required /> I agree to the AZORTIX organizer
                  terms.
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
              {busy
                ? 'Please wait…'
                : mode === 'register'
                  ? accountType === 'organization'
                    ? 'Create organization account'
                    : 'Create individual account'
                  : titles[mode]}
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
          <Link href="/">Back to AZORTIX</Link>
        </div>
      </section>
    </main>
  )
}
