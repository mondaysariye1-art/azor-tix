'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { AlertTriangle, CheckCircle2, Lock, Mail, Ticket, Users } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { BrandLogo } from './BrandLogo'

export default function FreeTicketClaim({
  code,
  linkStatus,
  reason,
  invitationType = 'individual',
  maxClaims = 1,
  claimedCount = 0,
  remainingClaims = 1,
  eventTitle,
  eventSlug,
  eventDate,
  eventVenue,
  ticketName,
  recipientName,
  recipientEmail,
  personalMessage,
  expiresAt,
}: {
  code: string
  linkStatus: 'active' | 'claimed' | 'expired' | 'revoked' | 'exhausted' | 'unavailable'
  reason?: string
  invitationType?: 'individual' | 'shareable'
  maxClaims?: number
  claimedCount?: number
  remainingClaims?: number
  eventTitle: string
  eventSlug?: string
  eventDate?: string
  eventVenue?: string
  ticketName: string
  recipientName?: string
  recipientEmail?: string
  personalMessage?: string
  expiresAt?: string
}) {
  const emailLocked = invitationType === 'individual' && Boolean(recipientEmail)
  const [firstName, setFirstName] = useState(recipientName?.split(' ')[0] || '')
  const [lastName, setLastName] = useState(recipientName?.split(' ').slice(1).join(' ') || '')
  const [email, setEmail] = useState(recipientEmail || '')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [claimedResult, setClaimedResult] = useState<{
    ticketCode: string
    ticketUrl: string
    confirmationUrl: string
    pdfUrl?: string
    emailNote?: string
  } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/free-tickets/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, firstName, lastName, email, phone }),
      })
      const result = await response.json().catch(() => ({ error: 'Unexpected server response.' }))
      if (!response.ok) {
        setError(result.error || 'Could not claim this private invitation.')
        return
      }
      setClaimedResult({
        ticketCode: result.ticketCode,
        ticketUrl: result.ticketUrl,
        confirmationUrl: result.confirmationUrl,
        pdfUrl: result.pdfUrl,
        emailNote:
          result.emailStatus?.configured === false
            ? result.emailStatus.reason
            : result.emailStatus?.sent === false
              ? result.emailStatus.error || 'Ticket created, but confirmation email could not be delivered yet.'
              : undefined,
      })
    } catch {
      setError('Network error while claiming your invitation. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <BrandLogo light />
      <div className="auth-card">
        <span className="eyebrow">AZORTIX · Private Free Invitation</span>
        <h1>{eventTitle}</h1>
        <p className="claim-meta">
          <strong>{ticketName}</strong> · Free Invitation (₦0)
          {eventVenue ? ` · ${eventVenue}, Abuja` : ''}
          {eventDate ? ` · ${eventDate}` : ''}
        </p>

        {personalMessage && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
              Message from the organizer
            </p>
            <p className="m-0">{personalMessage}</p>
          </div>
        )}

        {invitationType === 'shareable' && linkStatus === 'active' && !claimedResult && (
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 mb-4">
            <Users size={14} className="shrink-0" />
            <span>
              <strong>
                {remainingClaims} of {maxClaims}
              </strong>{' '}
              private invitation {remainingClaims === 1 ? 'pass' : 'passes'} remaining
              {claimedCount > 0 ? ` (${claimedCount} claimed)` : ''}.
              {expiresAt ? ` Expires ${formatDate(expiresAt)}.` : ''}
            </span>
          </div>
        )}

        {emailLocked && linkStatus === 'active' && !claimedResult && (
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 mb-4">
            <Lock size={14} className="shrink-0" />
            <span>
              This private invitation is reserved exclusively for <strong>{recipientEmail}</strong>.
            </span>
          </div>
        )}

        {claimedResult ? (
          <div className="claim-success-box">
            <CheckCircle2 size={28} />
            <h2>Your AZORTIX invitation is confirmed!</h2>
            <p>
              Ticket code <strong>{claimedResult.ticketCode}</strong> is ready. Present your QR
              code at the entrance for one-time check-in.
            </p>
            {claimedResult.emailNote ? (
              <p className="payment-note">{claimedResult.emailNote}</p>
            ) : (
              <p className="text-xs text-neutral-600 flex items-center justify-center gap-1.5">
                <Mail size={13} />A copy of your QR pass has been sent to {email}.
              </p>
            )}
            <div className="claim-actions">
              <Link className="button button-coral full" href={claimedResult.ticketUrl}>
                Open Digital QR Ticket
              </Link>
              {claimedResult.pdfUrl && (
                <a className="button button-dark full" href={claimedResult.pdfUrl}>
                  Download PDF Ticket
                </a>
              )}
              <Link className="button button-dark full" href={claimedResult.confirmationUrl}>
                View Confirmation
              </Link>
            </div>
          </div>
        ) : linkStatus !== 'active' ? (
          <div className="claim-blocked-box">
            <AlertTriangle size={24} />
            <h2>Invitation unavailable ({linkStatus})</h2>
            <p>{reason || 'This private invitation link cannot be claimed.'}</p>
            {eventSlug && (
              <Link className="button button-dark" href={`/events/${eventSlug}`}>
                View Event Page
              </Link>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="auth-grid two-col">
              <label>
                First name
                <input
                  required
                  minLength={2}
                  autoComplete="off"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label>
                Last name
                <input
                  required
                  minLength={2}
                  autoComplete="off"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </div>
            <label>
              Email address {emailLocked ? '(locked to invitation)' : ''}
              <input
                type="email"
                required
                autoComplete="off"
                readOnly={emailLocked}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                required
                minLength={10}
                autoComplete="off"
                placeholder="0801 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <button disabled={busy} className="button button-coral full">
              <Ticket size={16} />
              <span>{busy ? 'Issuing Invitation Pass…' : 'Claim Free Invitation Pass (₦0)'}</span>
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
