'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { formatReadableDateTime } from '@/lib/format'
import type { CheckInValidationResponse } from '@/lib/tickets'

interface VerifyTicketClientProps {
  token: string
  initialResult: CheckInValidationResponse
  dashboardUrl: string
}

function getResultTone(code: CheckInValidationResponse['code']): 'valid' | 'warn' | 'error' {
  if (code === 'VALID_TICKET') return 'valid'
  if (code === 'ALREADY_USED') return 'warn'
  return 'error'
}

export function VerifyTicketClient({
  token,
  initialResult,
  dashboardUrl,
}: VerifyTicketClientProps) {
  const [result, setResult] = useState<CheckInValidationResponse>(initialResult)
  const [checkedInNow, setCheckedInNow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [networkError, setNetworkError] = useState('')

  const handleConfirmEntry = async () => {
    if (submitting) return
    setSubmitting(true)
    setNetworkError('')
    try {
      const response = await fetch('/api/dashboard/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json().catch(() => null)
      if (!data) {
        setNetworkError('Unable to reach the check-in server. Please try again.')
        return
      }
      setResult({
        ok: Boolean(data.ok),
        code: data.code || 'INVALID_TICKET',
        headline: data.headline || (data.ok ? 'VALID TICKET' : 'INVALID TICKET'),
        message: data.message || data.error || 'Verification failed.',
        httpStatus: response.status,
        ticket: data.ticket || result.ticket,
      })
      if (data.ok) {
        setCheckedInNow(true)
      }
    } catch {
      setNetworkError('Network error while checking in ticket. Please retry.')
    } finally {
      setSubmitting(false)
    }
  }

  const tone = getResultTone(result.code)

  return (
    <div className="verify-ticket-panel">
      <div className={`checkin-result-banner tone-${tone}`}>
        <div className="checkin-result-icon" aria-hidden="true">
          {tone === 'valid' ? (
            <CheckCircle2 size={26} />
          ) : tone === 'warn' ? (
            <AlertTriangle size={26} />
          ) : (
            <XCircle size={26} />
          )}
        </div>
        <div>
          <p className="checkin-result-headline">
            {checkedInNow ? 'CHECKED IN — ENTRY CONFIRMED' : result.headline}
          </p>
          <p className="checkin-result-message">
            {checkedInNow
              ? 'VALID TICKET — Entry permitted. This one-time ticket is now marked as used.'
              : result.message}
          </p>
        </div>
      </div>

      {result.ticket && (
        <dl className="verify-ticket-meta">
          <div>
            <dt>Attendee</dt>
            <dd>{result.ticket.attendeeName}</dd>
          </div>
          <div>
            <dt>Ticket Type</dt>
            <dd>{result.ticket.ticketTypeName}</dd>
          </div>
          <div>
            <dt>Event</dt>
            <dd>{result.ticket.eventName}</dd>
          </div>
          <div>
            <dt>Ticket Code</dt>
            <dd>
              <code>{result.ticket.code}</code>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className="verify-status-text">{result.ticket.status.toUpperCase()}</dd>
          </div>
          {result.ticket.checkedInAt && (
            <div>
              <dt>Checked In At</dt>
              <dd>
                {formatReadableDateTime(result.ticket.checkedInAt)}
                {result.ticket.checkedInByName ? ` by ${result.ticket.checkedInByName}` : ''}
              </dd>
            </div>
          )}
        </dl>
      )}

      {networkError && (
        <div className="checkin-error-inline" role="alert">
          <ShieldAlert size={16} aria-hidden="true" />
          <span>{networkError}</span>
        </div>
      )}

      <div className="verify-ticket-actions">
        {result.ok && !checkedInNow && (
          <button
            type="button"
            className="ticket-btn ticket-btn-primary"
            disabled={submitting}
            onClick={handleConfirmEntry}
          >
            {submitting ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            <span>{submitting ? 'Confirming entry...' : 'Confirm Entry (One-Time Check-In)'}</span>
          </button>
        )}

        <Link href={`${dashboardUrl}#check-in`} className="ticket-btn ticket-btn-outline">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Open Check-In Scanner</span>
        </Link>
      </div>
    </div>
  )
}
