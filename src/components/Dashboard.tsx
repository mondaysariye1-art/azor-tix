'use client'

import {
  Check,
  Copy,
  ExternalLink,
  Lock,
  Menu,
  Share2,
  ShieldCheck,
  Ticket,
  UserPlus,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { formatDate, formatDateTime, formatNaira } from '@/lib/format'
import { BrandLogo } from './BrandLogo'
import { CheckInScanner } from './CheckInScanner'
import { SearchableBankSelect } from './SearchableBankSelect'

const money = (value: number) => formatNaira(value)

function buildPublicEventUrl(slug: string) {
  if (typeof window !== 'undefined') return `${window.location.origin}/events/${slug}`
  return `https://azortix.com/events/${slug}`
}

export default function Dashboard({ data, user }: { data: any; user: any }) {
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Filtering state
  const [eventFilter, setEventFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'draft'
  >('all')
  const [userFilter, setUserFilter] = useState<'all' | 'individual' | 'organization' | 'organizer' | 'admin'>('all')
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'free'>('all')

  // Organizer new ticket category pricing kind state (per event id)
  const [ticketKindByEvent, setTicketKindByEvent] = useState<Record<string, 'paid' | 'free'>>({})

  // Private Free Ticket Invitations state (decoupled from public ticket categories)
  const [claimEventId, setClaimEventId] = useState<string>(
    data.events?.[0]?.id ? String(data.events[0].id) : '',
  )
  const [invitationType, setInvitationType] = useState<'individual' | 'shareable'>('individual')

  // Team / Check-In Staff assignment state
  const [teamRole, setTeamRole] = useState<'check-in' | 'manager' | 'analyst' | 'finance'>('check-in')
  const [teamAssignedEventIds, setTeamAssignedEventIds] = useState<string[]>(
    data.events?.[0]?.id ? [String(data.events[0].id)] : [],
  )
  const [resendingTicketId, setResendingTicketId] = useState<string | null>(null)

  // Organizer Bank Setup & Resolution state
  const [bankCode, setBankCode] = useState<string>(data.bank?.bankCode || data.banks?.[0]?.code || '')
  const [accountNumber, setAccountNumber] = useState<string>(data.bank?.accountNumber || '')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>(data.bank?.accountNumber || '')
  const [resolvedBankName, setResolvedBankName] = useState<string>(
    data.bank?.bankName || data.banks?.[0]?.name || '',
  )
  const [resolvedAccountName, setResolvedAccountName] = useState<string>(data.bank?.accountName || '')
  const [bankVerifiedOk, setBankVerifiedOk] = useState<boolean>(false)
  const [bankResolveError, setBankResolveError] = useState<string>('')
  const [bankResolveMessage, setBankResolveMessage] = useState<string>('')

  // Organizer Bank Change Appeal state
  const [showAppealForm, setShowAppealForm] = useState(false)
  const [appealBankCode, setAppealBankCode] = useState<string>(data.banks?.[0]?.code || '')
  const [appealAccountNumber, setAppealAccountNumber] = useState('')
  const [appealConfirmAccountNumber, setAppealConfirmAccountNumber] = useState('')
  const [appealResolvedAccountName, setAppealResolvedAccountName] = useState('')
  const [appealResolvedBankName, setAppealResolvedBankName] = useState<string>(
    data.banks?.[0]?.name || '',
  )
  const [appealReason, setAppealReason] = useState('')
  const [appealResolveError, setAppealResolveError] = useState<string>('')
  const [appealResolveMessage, setAppealResolveMessage] = useState<string>('')

  const organizer = user.role === 'organizer'
  const superAdmin = user.role === 'super-admin'
  const isOrganizationAccount = user.accountType === 'organization'
  const isBankLocked = Boolean(data.bank?.locked)

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [transferEventId, setTransferEventId] = useState<string>(
    data.eventBalances?.[0]?.eventId || data.events?.[0]?.id || '',
  )
  const [transferIdempotencyKey, setTransferIdempotencyKey] = useState<string>('')

  useEffect(() => {
    setTransferIdempotencyKey(
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `tr-${crypto.randomUUID()}`
        : `tr-${Date.now()}`,
    )
  }, [])

  useEffect(() => {
    if (!mobileNavOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileNavOpen])

  const pendingEventsCount = useMemo(
    () => (data.events || []).filter((ev: any) => ev.reviewStatus === 'pending').length,
    [data.events],
  )

  const filteredEvents = useMemo(() => {
    const list = data.events || []
    if (eventFilter === 'all') return list
    if (eventFilter === 'pending') return list.filter((ev: any) => ev.reviewStatus === 'pending')
    if (eventFilter === 'approved') return list.filter((ev: any) => ev.reviewStatus === 'approved')
    if (eventFilter === 'rejected') return list.filter((ev: any) => ev.reviewStatus === 'rejected')
    return list.filter(
      (ev: any) => !ev.reviewStatus || ev.reviewStatus === 'draft',
    )
  }, [data.events, eventFilter])

  const filteredUsers = useMemo(() => {
    const list = data.users || []
    if (userFilter === 'all') return list
    if (userFilter === 'individual') {
      return list.filter((u: any) => (u.accountType || 'individual') === 'individual')
    }
    if (userFilter === 'organization') {
      return list.filter((u: any) => u.accountType === 'organization')
    }
    if (userFilter === 'organizer') {
      return list.filter((u: any) => u.role === 'organizer')
    }
    if (userFilter === 'admin') {
      return list.filter((u: any) => u.role === 'admin' || u.role === 'super-admin')
    }
    return list
  }, [data.users, userFilter])

  const filteredOrders = useMemo(() => {
    const list = data.orders || []
    if (orderFilter === 'all') return list
    if (orderFilter === 'free') {
      return list.filter(
        (o: any) => o.orderKind === 'free' || o.orderKind === 'complimentary' || Number(o.total || 0) === 0,
      )
    }
    return list.filter((o: any) => o.orderKind === 'paid' || Number(o.total || 0) > 0)
  }, [data.orders, orderFilter])

  async function copyText(id: string, textValue: string) {
    if (!textValue) return
    await navigator.clipboard?.writeText(textValue).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000)
  }

  async function shareUrl(id: string, title: string, url: string) {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // Fallback to copy
      }
    }
    await copyText(id, url)
    setNotice('Link copied to clipboard for sharing.')
  }

  async function togglePublish(eventId: string, shouldPublish: boolean) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const body = new FormData()
      body.set('eventId', eventId)
      body.set('publish', shouldPublish ? 'true' : 'false')
      const response = await fetch('/api/dashboard/event-settings', { method: 'POST', body })
      const result = await response.json().catch(() => ({ error: 'Unexpected response.' }))
      if (!response.ok) {
        if (result?.requirePasswordChange) window.location.assign('/change-password')
        return setError(result.error || 'Could not update event publication status.')
      }
      setNotice(result.message || 'Updated.')
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const form = event.currentTarget
    try {
      const response = await fetch(endpoint, { method: 'POST', body: new FormData(form) })
      const result = await response.json().catch(() => ({ error: 'Unexpected server response.' }))
      if (!response.ok) {
        if (result?.requirePasswordChange) window.location.assign('/change-password')
        return setError(result.error || 'The request could not be completed.')
      }
      setNotice(result.message || 'Saved.')
      form.reset()
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  async function resendTicketEmail(ticketId: string) {
    if (resendingTicketId) return
    setResendingTicketId(ticketId)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/dashboard/tickets/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      })
      const result = await response.json().catch(() => ({ error: 'Unexpected server response.' }))
      if (!response.ok) {
        setError(result.error || 'Could not resend ticket email.')
        return
      }
      setNotice(result.message || 'Ticket email resent.')
      window.location.reload()
    } catch {
      setError('Network error while resending ticket email.')
    } finally {
      setResendingTicketId(null)
    }
  }

  async function manageTicketCategory(action: 'toggle' | 'delete', ticketTypeId: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const body = new FormData()
      body.set('action', action)
      body.set('ticketTypeId', ticketTypeId)
      const response = await fetch('/api/dashboard/ticket-types', { method: 'POST', body })
      const result = await response.json().catch(() => ({ error: 'Unexpected server response.' }))
      if (!response.ok) {
        setError(result.error || 'Could not update ticket category.')
        return
      }
      setNotice(result.message || 'Ticket category updated.')
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  function toggleTeamAssignedEvent(eventId: string) {
    setTeamAssignedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
    )
  }

  async function resolveBank(mode: 'initial' | 'appeal') {
    setBusy(true)
    setError('')
    setNotice('')
    if (mode === 'initial') {
      setBankResolveError('')
      setBankResolveMessage('')
    } else {
      setAppealResolveError('')
      setAppealResolveMessage('')
    }

    const activeAccount = (mode === 'initial' ? accountNumber : appealAccountNumber).replace(/\D/g, '')
    const activeConfirm = (mode === 'initial' ? confirmAccountNumber : appealConfirmAccountNumber).replace(
      /\D/g,
      '',
    )
    const activeBankCode = (mode === 'initial' ? bankCode : appealBankCode).trim()

    if (!activeBankCode) {
      const msg = 'Select a Nigerian bank from the search list first.'
      if (mode === 'initial') setBankResolveError(msg)
      else setAppealResolveError(msg)
      setError(msg)
      setBusy(false)
      return
    }
    if (!/^\d{10}$/.test(activeAccount)) {
      const msg = 'Enter a valid 10-digit Nigerian NUBAN account number.'
      if (mode === 'initial') setBankResolveError(msg)
      else setAppealResolveError(msg)
      setError(msg)
      setBusy(false)
      return
    }
    if (activeConfirm && activeConfirm !== activeAccount) {
      const msg = 'Account number and confirmation account number do not match.'
      if (mode === 'initial') setBankResolveError(msg)
      else setAppealResolveError(msg)
      setError(msg)
      setBusy(false)
      return
    }

    try {
      const response = await fetch('/api/dashboard/bank-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankCode: activeBankCode,
          accountNumber: activeAccount,
          confirmAccountNumber: activeConfirm || activeAccount,
        }),
      })
      const result = await response.json().catch(() => ({ error: 'Unexpected server response.' }))
      if (!response.ok) {
        const msg = result.error || 'Could not verify bank account.'
        setError(msg)
        if (mode === 'initial') {
          setBankResolveError(msg)
          setResolvedAccountName('')
          setBankVerifiedOk(false)
        } else {
          setAppealResolveError(msg)
          setAppealResolvedAccountName('')
        }
        return
      }
      if (mode === 'initial') {
        setResolvedAccountName(result.accountName)
        setResolvedBankName(
          result.bankName ||
            (data.banks || []).find((b: any) => b.code === activeBankCode)?.name ||
            '',
        )
        setBankVerifiedOk(true)
        setBankResolveMessage(`Verified via Paystack: ${result.accountName}`)
      } else {
        setAppealResolvedAccountName(result.accountName)
        setAppealResolvedBankName(
          result.bankName ||
            (data.banks || []).find((b: any) => b.code === activeBankCode)?.name ||
            '',
        )
        setAppealResolveMessage(`Verified via Paystack: ${result.accountName}`)
      }
      setNotice(`Paystack verified account holder: ${result.accountName}`)
    } catch {
      const msg = 'Network error while verifying bank account with Paystack. Please try again.'
      setError(msg)
      if (mode === 'initial') {
        setBankResolveError(msg)
      } else {
        setAppealResolveError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  async function submitBankAppeal(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const body = new FormData()
      body.set('bankCode', appealBankCode)
      body.set(
        'bankName',
        appealResolvedBankName ||
          (data.banks || []).find((b: any) => b.code === appealBankCode)?.name ||
          '',
      )
      body.set('accountNumber', appealAccountNumber)
      body.set('confirmAccountNumber', appealConfirmAccountNumber)
      body.set('reason', appealReason)
      const response = await fetch('/api/dashboard/bank-appeal', { method: 'POST', body })
      const result = await response.json().catch(() => ({ error: 'Unexpected server response.' }))
      if (!response.ok) {
        setError(result.error || 'Could not submit bank appeal.')
        return
      }
      setNotice(result.message || 'Appeal submitted.')
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await fetch('/api/app-auth/logout', { method: 'POST' })
    window.location.assign('/')
  }

  const eventTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const ev of data.events || []) {
      map.set(String(ev.id), String(ev.title || 'Event'))
    }
    return map
  }, [data.events])

  const selectedEventBalance = useMemo(
    () =>
      (data.eventBalances || []).find((item: any) => String(item.eventId) === String(transferEventId)) ||
      null,
    [data.eventBalances, transferEventId],
  )

  return (
    <div className="dashboard">
      {mobileNavOpen && (
        <div
          className="dashboard-nav-backdrop"
          aria-hidden="true"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={mobileNavOpen ? 'dashboard-nav open' : 'dashboard-nav'}>
        <div className="dashboard-sidebar-header">
          <div className="dashboard-sidebar-brand-row">
            <BrandLogo light />
            <button
              type="button"
              className="mobile-nav-close"
              aria-label="Close navigation menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="dashboard-sidebar-user">
            <span className="eyebrow">
              {organizer
                ? isOrganizationAccount
                  ? 'Organization account'
                  : 'Individual account'
                : user.role.replace('-', ' ')}
            </span>
            <h2>{isOrganizationAccount ? user.businessName || user.name : user.name}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        <nav className="dashboard-sidebar-menu" aria-label="Dashboard navigation">
          <a href="#overview" onClick={() => setMobileNavOpen(false)}>Overview</a>
          <a href="#my-tickets" onClick={() => setMobileNavOpen(false)}>My tickets &amp; gifts</a>
          <a href="#events" onClick={() => setMobileNavOpen(false)}>Events</a>
          <a href="#orders" onClick={() => setMobileNavOpen(false)}>Orders &amp; tickets</a>
          <a href="#free-links" onClick={() => setMobileNavOpen(false)}>Free ticket invitations</a>
          <a href="#check-in" onClick={() => setMobileNavOpen(false)}>Check-in scanner</a>
          <a href="#team" onClick={() => setMobileNavOpen(false)}>Team &amp; staff</a>
          {organizer && (
            <>
              <a href="#profile" onClick={() => setMobileNavOpen(false)}>Profile</a>
              <a href="#sales" onClick={() => setMobileNavOpen(false)}>Sales &amp; reports</a>
              <a href="#guests" onClick={() => setMobileNavOpen(false)}>Guests &amp; discounts</a>
              <a href="#announcements" onClick={() => setMobileNavOpen(false)}>Announcements</a>
              <a href="#bank" onClick={() => setMobileNavOpen(false)}>Bank verification</a>
              <a href="#payouts" onClick={() => setMobileNavOpen(false)}>Payouts</a>
            </>
          )}
          {!organizer && (
            <>
              <a href="#users" onClick={() => setMobileNavOpen(false)}>Users directory</a>
              <a href="#bank-appeals" onClick={() => setMobileNavOpen(false)}>Banks &amp; appeals</a>
              <a href="#payouts-control" onClick={() => setMobileNavOpen(false)}>Transfers &amp; payouts</a>
              <a href="#operations" onClick={() => setMobileNavOpen(false)}>Complaints &amp; reports</a>
              <a href="#audit-logs" onClick={() => setMobileNavOpen(false)}>Audit logs</a>
            </>
          )}
          {superAdmin && (
            <>
              <a href="#admin-management" onClick={() => setMobileNavOpen(false)}>Manage admins</a>
              <a href="#settings" onClick={() => setMobileNavOpen(false)}>System settings</a>
            </>
          )}
        </nav>
        <div className="dashboard-sidebar-footer">
          <button type="button" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header>
          <div className="dashboard-header-left">
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={18} />
              <span>Menu</span>
            </button>
            <div>
              <span className="eyebrow">Abuja operations</span>
              <h1>{organizer ? 'Organizer' : superAdmin ? 'Super Admin' : 'Admin'} dashboard</h1>
            </div>
          </div>
          <a className="button button-coral" href="/">
            View site
          </a>
        </header>
        {(notice || error) && (
          <div className={error ? 'dashboard-alert error' : 'dashboard-alert'}>
            {error || notice}
          </div>
        )}
        <section id="overview">
          <div className="metric-grid">
            <article>
              <span>Events</span>
              <b>{data.metrics.events}</b>
            </article>
            <article>
              <span>Paid / Free registrations</span>
              <b>
                {data.metrics.paidOrdersCount ?? data.metrics.orders} /{' '}
                {data.metrics.freeRegistrationsCount ?? 0}
              </b>
            </article>
            <article>
              <span>Tickets (Paid · Free)</span>
              <b>
                {data.metrics.paidTicketsCount ?? data.metrics.tickets} ·{' '}
                {data.metrics.freeTicketsCount ?? 0}
              </b>
            </article>
            <article>
              <span>{organizer ? 'Net earnings' : 'Gross revenue'}</span>
              <b>{money(organizer ? data.metrics.organizerEarnings : data.metrics.grossRevenue)}</b>
            </article>
          </div>
        </section>

        {/* Personal Buyer / Ticket Holder & Gift Purchases Section */}
        <section id="my-tickets" className="dashboard-section">
          <div className="dashboard-title">
            <div>
              <span className="eyebrow">Your AZORTIX Passes</span>
              <h2>My tickets, received gifts &amp; gift purchases</h2>
            </div>
            <a className="button button-cream" href="/discover">
              Browse events
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-bold mb-2">
                Tickets in your name ({(data.myTickets || []).length})
              </h3>
              {(data.myTickets || []).length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Tickets you purchase for yourself or receive as gifts/invitations using{' '}
                  <strong>{user.email}</strong> appear here with instant QR &amp; PDF downloads.
                </p>
              ) : (
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Event &amp; Pass</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.myTickets || []).map((t: any) => (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.eventTitle}</strong>
                            <div className="table-subtext">
                              {t.ticketLabel} · <code>{t.code}</code>
                            </div>
                            {t.isGift && t.purchaserName && (
                              <div className="table-subtext">
                                Gift from {t.purchaserName}
                                {t.giftMessage ? ` — "${t.giftMessage}"` : ''}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="status-pill">
                              {t.acquisitionType === 'gift'
                                ? 'Gift Received'
                                : t.acquisitionType === 'private-invitation'
                                  ? 'Invitation'
                                  : t.acquisitionType === 'public-free'
                                    ? 'Free RSVP'
                                    : 'Self Purchase'}
                            </span>
                          </td>
                          <td>{t.status}</td>
                          <td>
                            <div className="table-action-row">
                              <a
                                className="table-action"
                                href={t.sharePath}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open QR
                              </a>
                              <a
                                className="table-action"
                                href={t.pdfDownloadPath}
                                download={`AZORTIX-${t.code}.pdf`}
                              >
                                PDF
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base font-bold mb-2">
                Gift tickets you bought for others ({(data.myGiftPurchases || []).length})
              </h3>
              {(data.myGiftPurchases || []).length === 0 ? (
                <p className="text-sm text-neutral-500">
                  When you buy a ticket as a gift for someone else, track delivery status and resend
                  their ticket email here without duplicating tickets.
                </p>
              ) : (
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Event &amp; Code</th>
                        <th>Email Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.myGiftPurchases || []).map((t: any) => (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.attendeeName}</strong>
                            <div className="table-subtext">{t.attendeeEmail}</div>
                          </td>
                          <td>
                            {t.eventTitle}
                            <div className="table-subtext">
                              {t.ticketLabel} · <code>{t.code}</code>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill status-${t.emailDeliveryStatus || 'pending'}`}>
                              {t.emailDeliveryStatus || 'pending'}
                            </span>
                            {t.emailLastError && (
                              <div className="table-subtext">{t.emailLastError.slice(0, 60)}</div>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              disabled={resendingTicketId === t.id}
                              onClick={() => void resendTicketEmail(t.id)}
                              className="table-action"
                            >
                              {resendingTicketId === t.id ? 'Sending…' : 'Resend Email'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="events" className="dashboard-section">
          <div className="dashboard-title">
            <div>
              <span className="eyebrow">Events</span>
              <h2>{organizer ? 'Create and manage' : 'All platform events'}</h2>
            </div>
            {!organizer && (
              <a className="button button-dark" href="/api/dashboard/reports">
                Export Events/Sales CSV
              </a>
            )}
          </div>
          {organizer && (
            <div className="dashboard-callout">
              <div>
                <b>Six-step event studio</b>
                <p>
                  Build the page, custom URL slug, paid & free ticket inventory (max 10 free/event),
                  attendee questions, and publish with autosaved drafts.
                </p>
              </div>
              <a className="button button-coral" href="/dashboard/organizer/events/new">
                Create an event
              </a>
            </div>
          )}
          {!organizer && pendingEventsCount > 0 && (
            <div className="dashboard-callout">
              <div>
                <b>
                  {pendingEventsCount} event{pendingEventsCount === 1 ? '' : 's'} pending approval
                </b>
                <p>
                  New organizer events remain hidden from the public site and cannot accept payments
                  until approved by an AZORTIX Admin or Super Admin.
                </p>
              </div>
              <button
                type="button"
                className="button button-coral"
                onClick={() => setEventFilter('pending')}
              >
                Review Pending ({pendingEventsCount})
              </button>
            </div>
          )}
          <div className="filter-pills" style={{ marginBottom: 14 }}>
            {(
              [
                ['all', `All (${(data.events || []).length})`],
                ['pending', `Pending Approval (${pendingEventsCount})`],
                ['approved', 'Approved / Live'],
                ['rejected', 'Rejected'],
                ['draft', 'Drafts'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={eventFilter === key ? 'active' : ''}
                onClick={() => setEventFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Custom Event URL</th>
                  <th>Tickets (Paid / Free)</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No events match this filter.</td>
                  </tr>
                ) : (
                  filteredEvents.map((event: any) => {
                    const isApproved = event.reviewStatus === 'approved'
                    const isPublished = event._status === 'published' && isApproved
                    const eventPath = event.slug ? `/events/${event.slug}` : ''
                    const statusLabel = isPublished
                      ? 'Published'
                      : event.reviewStatus === 'pending'
                        ? 'Pending approval'
                        : event.reviewStatus === 'rejected'
                          ? 'Rejected'
                          : event.reviewStatus === 'cancelled'
                            ? 'Cancelled'
                            : isApproved
                              ? 'Approved draft'
                              : 'Draft'

                    const reviewerName =
                      event.reviewedBy && typeof event.reviewedBy === 'object'
                        ? event.reviewedBy.name || event.reviewedBy.email
                        : ''

                    const evTypes = (data.ticketTypes || []).filter(
                      (t: any) =>
                        String(typeof t.event === 'object' ? t.event.id : t.event) ===
                        String(event.id),
                    )
                    const paidAllocated = evTypes
                      .filter((t: any) => t.ticketKind !== 'free' && Number(t.price) > 0)
                      .reduce((s: number, t: any) => s + Number(t.quantity || 0), 0)
                    const freeAllocated = evTypes
                      .filter((t: any) => t.ticketKind === 'free' || Number(t.price) === 0)
                      .reduce((s: number, t: any) => s + Number(t.quantity || 0), 0)

                    return (
                      <tr key={event.id}>
                        <td>
                          <strong>{event.title}</strong>
                          <div className="table-subtext">
                            {event.venue || 'Abuja'}
                            {event.reviewedAt
                              ? ` · Reviewed ${formatDateTime(event.reviewedAt, event.timezone)}${
                                  reviewerName ? ` by ${reviewerName}` : ''
                                }`
                              : ''}
                          </div>
                          {event.reviewNote && (
                            <div
                              className="table-subtext"
                              style={{
                                color: event.reviewStatus === 'rejected' ? '#b91c1c' : undefined,
                                fontWeight: event.reviewStatus === 'rejected' ? 600 : undefined,
                              }}
                            >
                              {event.reviewStatus === 'rejected'
                                ? `Rejection reason: ${event.reviewNote}`
                                : `Review note: ${event.reviewNote}`}
                            </div>
                          )}
                        </td>
                        <td>
                          {eventPath ? (
                            <div className="event-url-cell">
                              <code>https://azortix.com{eventPath}</code>
                            </div>
                          ) : (
                            'Pending slug'
                          )}
                        </td>
                        <td>
                          {paidAllocated} paid · {freeAllocated}/10 free
                        </td>
                        <td>
                          {event.startsAt
                            ? formatDate(event.startsAt, event.timezone)
                            : 'Not set'}
                        </td>
                        <td>
                          <span
                            className={`status-pill status-${statusLabel
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td>
                          {organizer ? (
                            <div className="table-action-row">
                              {event.slug && (
                                <>
                                  <button
                                    type="button"
                                    className="table-action"
                                    onClick={() =>
                                      copyText(String(event.id), buildPublicEventUrl(String(event.slug)))
                                    }
                                  >
                                    {copiedId === String(event.id) ? (
                                      <Check size={12} />
                                    ) : (
                                      <Copy size={12} />
                                    )}
                                    <span>{copiedId === String(event.id) ? 'Copied!' : 'Copy Link'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="table-action"
                                    onClick={() =>
                                      shareUrl(
                                        `share-${event.id}`,
                                        event.title,
                                        buildPublicEventUrl(String(event.slug)),
                                      )
                                    }
                                  >
                                    <Share2 size={12} />
                                    <span>Share</span>
                                  </button>
                                </>
                              )}
                              {isPublished && eventPath ? (
                                <a
                                  className="table-action"
                                  href={eventPath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink size={12} />
                                  <span>View Event</span>
                                </a>
                              ) : isApproved ? (
                                <button
                                  type="button"
                                  className="table-action"
                                  disabled={busy}
                                  onClick={() => togglePublish(String(event.id), true)}
                                >
                                  Publish
                                </button>
                              ) : event.reviewStatus === 'pending' ? (
                                <span className="table-action muted-action">Pending Approval</span>
                              ) : (
                                <button
                                  type="button"
                                  className="table-action"
                                  disabled={busy}
                                  onClick={() => togglePublish(String(event.id), true)}
                                >
                                  {event.reviewStatus === 'rejected'
                                    ? 'Resubmit for approval'
                                    : 'Submit for approval'}
                                </button>
                              )}
                              {isPublished && (
                                <button
                                  type="button"
                                  className="table-action muted-action"
                                  disabled={busy}
                                  onClick={() => togglePublish(String(event.id), false)}
                                >
                                  Unpublish
                                </button>
                              )}
                              <a
                                className="table-action"
                                href={`/dashboard/organizer/events/${event.id}/edit`}
                              >
                                {event.reviewStatus === 'rejected' ? 'Edit & Resubmit' : 'Edit Event'}
                              </a>
                            </div>
                          ) : (
                            <div className="table-action-row">
                              {isPublished && eventPath && (
                                <a
                                  className="table-action"
                                  href={eventPath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                              )}
                              <form
                                className="inline-review-form"
                                autoComplete="off"
                                onSubmit={(formEvent) => submit(formEvent, '/api/dashboard/event-review')}
                              >
                                <input type="hidden" name="eventId" value={event.id} />
                                <input
                                  name="reviewNote"
                                  aria-label="Review note or rejection reason"
                                  placeholder="Reason (required to reject)"
                                  autoComplete="off"
                                  defaultValue={event.reviewNote || ''}
                                />
                                <select
                                  name="decision"
                                  defaultValue={event.reviewStatus === 'pending' ? 'approved' : 'approved'}
                                >
                                  <option value="approved">Approve &amp; Publish</option>
                                  <option value="rejected">Reject (Reason Required)</option>
                                  <option value="cancelled">Cancel Event</option>
                                </select>
                                <button className="table-action">Apply</button>
                              </form>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {organizer && (
            <div className="event-settings-grid">
              {data.events.map((event: any) => {
                const evTicketTypes = data.ticketTypes.filter(
                  (ticket: any) =>
                    String(typeof ticket.event === 'object' ? ticket.event.id : ticket.event) ===
                    String(event.id),
                )
                const evFreeTotal = evTicketTypes
                  .filter((t: any) => t.ticketKind === 'free' || Number(t.price) === 0)
                  .reduce((s: number, t: any) => s + Number(t.quantity || 0), 0)
                const selectedKind = ticketKindByEvent[String(event.id)] || 'paid'

                return (
                  <details key={event.id}>
                    <summary>{event.title} settings & tickets</summary>
                    <form
                      className="dashboard-form compact"
                      onSubmit={(formEvent) => submit(formEvent, '/api/dashboard/event-settings')}
                    >
                      <input type="hidden" name="eventId" value={event.id} />
                      <label>
                        Title
                        <input name="title" defaultValue={event.title} required />
                      </label>
                      <label>
                        Custom URL Slug (/events/…)
                        <input name="slug" defaultValue={event.slug || ''} placeholder="abuja-groove-party" />
                      </label>
                      <label>
                        Venue
                        <input name="venue" defaultValue={event.venue} required />
                      </label>
                      <label>
                        Capacity
                        <input
                          name="capacity"
                          type="number"
                          min="1"
                          defaultValue={event.capacity}
                          required
                        />
                      </label>
                      <label>
                        Check-in
                        <select name="checkInStatus" defaultValue={event.checkInStatus}>
                          <option value="closed">Closed</option>
                          <option value="open">Open</option>
                        </select>
                      </label>
                      <button className="button button-dark">Save event settings</button>
                    </form>
                    <form
                      className="dashboard-form compact"
                      onSubmit={(formEvent) => submit(formEvent, '/api/dashboard/ticket-types')}
                    >
                      <input type="hidden" name="eventId" value={event.id} />
                      <label>
                        Pricing Tier (Free tickets used on event: {evFreeTotal}/10)
                        <select
                          name="ticketKind"
                          value={selectedKind}
                          onChange={(e) =>
                            setTicketKindByEvent((curr) => ({
                              ...curr,
                              [String(event.id)]: e.target.value === 'free' ? 'free' : 'paid',
                            }))
                          }
                        >
                          <option value="paid">Paid Ticket</option>
                          <option value="free">Free Ticket (₦0 · max 10 per event)</option>
                        </select>
                      </label>
                      <label>
                        New ticket category
                        <input name="name" required />
                      </label>
                      <label>
                        Description
                        <input name="description" />
                      </label>
                      {selectedKind === 'free' ? (
                        <label>
                          Price
                          <input type="number" name="price" value="0" readOnly />
                        </label>
                      ) : (
                        <label>
                          Price (NGN)
                          <input name="price" type="number" min="1" required />
                        </label>
                      )}
                      <label>
                        Quantity
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          max={selectedKind === 'free' ? Math.max(1, 10 - evFreeTotal) : undefined}
                          required
                        />
                      </label>
                      <button className="button button-coral">Add ticket category</button>
                    </form>
                    <div className="mt-4 space-y-2">
                      {evTicketTypes.length === 0 ? (
                        <p className="text-xs text-neutral-500">
                          No public ticket categories yet. Add categories above—AZORTIX never
                          auto-creates default categories.
                        </p>
                      ) : (
                        evTicketTypes.map((ticket: any) => {
                          const isFree = ticket.ticketKind === 'free' || Number(ticket.price) === 0
                          const isPaused =
                            ticket.active === false || ticket.salesStatus === 'paused'
                          const sold = Number(ticket.sold || 0)
                          const remaining =
                            typeof ticket.remaining === 'number'
                              ? ticket.remaining
                              : Math.max(0, Number(ticket.quantity || 0) - sold)
                          return (
                            <div
                              key={ticket.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs"
                            >
                              <div>
                                <strong>{ticket.name}</strong> ·{' '}
                                {isFree ? 'FREE (₦0)' : money(ticket.price)} · Sold{' '}
                                <strong>{sold}</strong> / {ticket.quantity} ({remaining} left)
                                {ticket.visibility === 'invite-only' ? ' · Invite-only' : ''}
                                {isPaused ? ' · PAUSED' : ''}
                              </div>
                              <div className="table-action-row">
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="table-action"
                                  onClick={() => void manageTicketCategory('toggle', ticket.id)}
                                >
                                  {isPaused ? 'Resume' : 'Pause'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="table-action muted-action"
                                  onClick={() => void manageTicketCategory('delete', ticket.id)}
                                >
                                  {sold > 0 ? 'Archive' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </section>

        <section id="orders" className="dashboard-section">
          <div className="dashboard-title">
            <div>
              <span className="eyebrow">Commerce & Registrations</span>
              <h2>Paid orders & free registrations</h2>
            </div>
            <div className="filter-tabs" role="tablist">
              {(['all', 'paid', 'free'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={orderFilter === tab ? 'active' : ''}
                  onClick={() => setOrderFilter(tab)}
                >
                  {tab === 'all' ? 'All' : tab === 'paid' ? 'Paid Orders' : 'Free / Claims'}
                </button>
              ))}
            </div>
          </div>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Event</th>
                  <th>Attendee</th>
                  <th>Total</th>
                  <th>Status</th>
                  {!organizer && <th>Refund</th>}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: any) => {
                  const kind =
                    order.orderKind ||
                    (Number(order.total || 0) === 0 ? 'free' : 'paid')
                  return (
                    <tr key={order.id}>
                      <td>{order.reference}</td>
                      <td>
                        <span className={`kind-badge kind-${kind}`}>
                          {kind === 'free'
                            ? 'Free'
                            : kind === 'complimentary'
                              ? 'Complimentary'
                              : 'Paid'}
                        </span>
                      </td>
                      <td>
                        {typeof order.event === 'object' ? order.event?.title : order.event}
                      </td>
                      <td>{order.customer?.email}</td>
                      <td>{Number(order.total || 0) === 0 ? '₦0 (Free)' : money(order.total)}</td>
                      <td>{order.status}</td>
                      {!organizer && (
                        <td>
                          {order.status === 'paid' ? (
                            <form
                              className="inline-review-form"
                              onSubmit={(event) => submit(event, '/api/dashboard/refunds')}
                            >
                              <input type="hidden" name="orderId" value={order.id} />
                              <input
                                name="reason"
                                required
                                minLength={5}
                                placeholder="Refund reason"
                                aria-label="Refund reason"
                              />
                              <button className="table-action" disabled={busy}>
                                Issue Refund
                              </button>
                            </form>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {data.tickets?.length > 0 && (
            <div className="data-table" style={{ marginTop: 24 }}>
              <table>
                <thead>
                  <tr>
                    <th>Ticket Code</th>
                    <th>Acquisition</th>
                    <th>Ticket Holder</th>
                    <th>Purchaser</th>
                    <th>Category</th>
                    <th>Email Delivery</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.slice(0, 80).map((ticket: any) => {
                    const acq =
                      ticket.acquisitionType ||
                      (ticket.source === 'free-claim'
                        ? 'private-invitation'
                        : ticket.source === 'guest-list'
                          ? 'complimentary'
                          : ticket.source === 'free-registration'
                            ? 'public-free'
                            : 'self-purchase')
                    const acqLabel =
                      acq === 'gift'
                        ? 'Gift Ticket'
                        : acq === 'private-invitation'
                          ? 'Private Invitation'
                          : acq === 'complimentary'
                            ? 'Complimentary'
                            : acq === 'public-free'
                              ? 'Public Free'
                              : 'Self Purchase'
                    const categoryLabel =
                      ticket.ticketLabel ||
                      (typeof ticket.ticketType === 'object'
                        ? ticket.ticketType?.name
                        : ticket.ticketType) ||
                      'Pass'
                    const emailStatus = ticket.emailDeliveryStatus || 'pending'
                    return (
                      <tr key={ticket.id}>
                        <td>
                          <code>{ticket.code}</code>
                        </td>
                        <td>
                          <span className={`kind-badge kind-${ticket.source}`}>{acqLabel}</span>
                        </td>
                        <td>
                          {ticket.attendeeName}
                          <div className="table-subtext">{ticket.attendeeEmail}</div>
                        </td>
                        <td>
                          {ticket.purchaserName || ticket.attendeeName}
                          {ticket.purchaserEmail && (
                            <div className="table-subtext">{ticket.purchaserEmail}</div>
                          )}
                        </td>
                        <td>{categoryLabel}</td>
                        <td>
                          <span className={`status-pill status-${emailStatus}`}>{emailStatus}</span>
                          {ticket.emailLastError && (
                            <div className="table-subtext">
                              {String(ticket.emailLastError).slice(0, 48)}
                            </div>
                          )}
                        </td>
                        <td>{ticket.status}</td>
                        <td>
                          <div className="table-action-row">
                            <a
                              className="table-action"
                              href={ticket.sharePath || `/tickets/${ticket.code}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              QR
                            </a>
                            <a
                              className="table-action"
                              href={ticket.pdfDownloadPath || `/api/tickets/${ticket.code}/pdf`}
                              download={`AZORTIX-${ticket.code}.pdf`}
                            >
                              PDF
                            </a>
                            <button
                              type="button"
                              disabled={resendingTicketId === ticket.id}
                              onClick={() => void resendTicketEmail(ticket.id)}
                              className="table-action"
                            >
                              {resendingTicketId === ticket.id ? 'Sending…' : 'Resend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section id="free-links" className="dashboard-section split-panel">
          <div>
            <span className="eyebrow">Private Complimentary Access</span>
            <h2>Free Ticket Invitations</h2>
            <p>
              Issue private free invitations directly—without creating any public free ticket
              category. Choose an <strong>Individual (email-locked)</strong> invite or a{' '}
              <strong>Shareable Private Link</strong> with a claim limit. Private invitations never
              appear on public event pages, and revoking a link blocks future claims while keeping
              already-issued tickets valid.
            </p>
            <div className="data-table" style={{ marginTop: 20 }}>
              <table>
                <thead>
                  <tr>
                    <th>Invitation &amp; Pass</th>
                    <th>Mode &amp; Claims</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.freeTicketLinks || []).length === 0 ? (
                    <tr>
                      <td colSpan={4}>No private free invitations created yet.</td>
                    </tr>
                  ) : (
                    (data.freeTicketLinks || []).map((link: any) => {
                      const claimUrl =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/free-ticket/${link.code}`
                          : `/free-ticket/${link.code}`
                      const mode =
                        link.invitationType === 'shareable' || Number(link.maxClaims || 1) > 1
                          ? 'shareable'
                          : 'individual'
                      const maxC = Math.max(1, Number(link.maxClaims || 1))
                      const claimedC = Math.max(
                        0,
                        Number(link.claimedCount || (link.status === 'claimed' ? 1 : 0)),
                      )
                      const evTitle =
                        typeof link.event === 'object'
                          ? link.event?.title
                          : eventTitleById.get(String(link.event)) || 'Event'
                      return (
                        <tr key={link.id}>
                          <td>
                            <strong>{link.categoryLabel || 'Private Invitation Pass'}</strong> ·{' '}
                            {evTitle}
                            <div className="table-subtext">
                              <code>/free-ticket/{link.code}</code>
                            </div>
                            {link.recipientEmail && (
                              <div className="table-subtext">
                                Locked to: {link.recipientName ? `${link.recipientName} · ` : ''}
                                {link.recipientEmail}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="status-pill">
                              {mode === 'shareable' ? 'Shareable Link' : 'Individual'}
                            </span>
                            <div className="table-subtext">
                              {claimedC} / {maxC} claimed ({Math.max(0, maxC - claimedC)} left)
                            </div>
                            {link.claimedByEmail && (
                              <div className="table-subtext">Last: {link.claimedByEmail}</div>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill status-${link.status}`}>
                              {link.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-row">
                              <button
                                type="button"
                                className="table-action"
                                onClick={() => copyText(`fl-${link.id}`, claimUrl)}
                              >
                                {copiedId === `fl-${link.id}` ? 'Copied!' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                className="table-action"
                                onClick={() =>
                                  shareUrl(
                                    `fl-share-${link.id}`,
                                    `AZORTIX Private Invitation — ${evTitle}`,
                                    claimUrl,
                                  )
                                }
                              >
                                Share
                              </button>
                              {link.status === 'active' && (
                                <form
                                  onSubmit={(ev) => submit(ev, '/api/dashboard/free-ticket-links')}
                                >
                                  <input type="hidden" name="action" value="revoke" />
                                  <input type="hidden" name="linkId" value={link.id} />
                                  <button className="table-action muted-action">Revoke</button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <form
            className="dashboard-form compact"
            autoComplete="off"
            onSubmit={(event) => submit(event, '/api/dashboard/free-ticket-links')}
          >
            <input type="hidden" name="action" value="create" />
            <label>
              Event
              <select
                name="eventId"
                required
                value={claimEventId}
                onChange={(e) => setClaimEventId(e.target.value)}
              >
                {(data.events || []).map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Invitation Type
              <select
                name="invitationType"
                value={invitationType}
                onChange={(e) =>
                  setInvitationType(e.target.value === 'shareable' ? 'shareable' : 'individual')
                }
              >
                <option value="individual">Individual (Email-locked · 1 claim)</option>
                <option value="shareable">Shareable Private Link (Custom claim limit)</option>
              </select>
            </label>
            <label>
              Pass Label (shown on QR pass &amp; email)
              <input
                name="categoryLabel"
                required
                autoComplete="off"
                defaultValue="VIP Guest Invitation"
                placeholder="e.g. VIP Guest, Media Pass, Speaker"
              />
            </label>
            {invitationType === 'individual' ? (
              <>
                <label>
                  Guest Full Name
                  <input name="recipientName" required autoComplete="off" placeholder="e.g. Amina Bello" />
                </label>
                <label>
                  Guest Email Address (required · locks invitation)
                  <input
                    name="recipientEmail"
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="guest@example.com"
                  />
                </label>
              </>
            ) : (
              <label>
                Maximum Claims Allowed
                <input
                  name="maxClaims"
                  type="number"
                  min="1"
                  max="500"
                  required
                  defaultValue="10"
                />
              </label>
            )}
            <label>
              Personal Invitation Message (optional)
              <textarea
                name="personalMessage"
                rows={2}
                placeholder="We would be delighted to host you as our guest."
              />
            </label>
            <label>
              Expires in hours (0 = no expiry)
              <input name="expiresInHours" type="number" min="0" defaultValue="168" />
            </label>
            <button disabled={busy || !claimEventId} className="button button-coral">
              <Ticket size={14} />
              <span>
                {invitationType === 'individual'
                  ? 'Create Individual Invitation'
                  : 'Create Shareable Private Link'}
              </span>
            </button>
          </form>
        </section>

        {organizer && (
          <section id="profile" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Public presence</span>
              <h2>Organizer profile</h2>
              <p>
                Build trust with a public organizer page and keep contact and social details
                current.
              </p>
              {data.profile?.slug && (
                <a className="text-link" href={`/organizers/${data.profile.slug}`}>
                  View public profile
                </a>
              )}
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/profile')}
            >
              <label>
                Display / organizer name
                <input
                  name="displayName"
                  required
                  defaultValue={data.profile?.displayName || user.businessName || user.name}
                />
              </label>
              <label>
                Contact name
                <input name="contactName" required defaultValue={user.name} />
              </label>
              <label>
                Logo
                <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
              </label>
              <label>
                About
                <textarea name="about" defaultValue={data.profile?.about || user.bio || ''} />
              </label>
              <label>
                Contact email
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={data.profile?.contact?.email || user.email}
                />
              </label>
              <label>
                Contact phone
                <input
                  name="phone"
                  type="tel"
                  required
                  defaultValue={data.profile?.contact?.phone || user.phone || ''}
                />
              </label>
              <label>
                Website
                <input
                  name="website"
                  type="url"
                  defaultValue={data.profile?.social?.website || user.website || ''}
                />
              </label>
              <label>
                Instagram
                <input
                  name="instagram"
                  defaultValue={data.profile?.social?.instagram || ''}
                  placeholder="https://instagram.com/..."
                />
              </label>
              <label>
                Facebook
                <input
                  name="facebook"
                  defaultValue={data.profile?.social?.facebook || ''}
                  placeholder="https://facebook.com/..."
                />
              </label>
              <label>
                TikTok
                <input
                  name="tiktok"
                  defaultValue={data.profile?.social?.tiktok || ''}
                  placeholder="https://tiktok.com/@..."
                />
              </label>
              <button disabled={busy} className="button button-dark">
                Save profile
              </button>
            </form>
          </section>
        )}

        <section id="check-in" className="dashboard-section">
          <CheckInScanner
            dashboardUrl={`/dashboard/${user.role || 'organizer'}`}
            events={
              Array.isArray(data.scannerEvents) && data.scannerEvents.length > 0
                ? data.scannerEvents
                : (data.events || []).map((ev: any) => ({
                    id: String(ev.id),
                    title: String(ev.title || 'Untitled event'),
                    startsAt: ev.startsAt || null,
                    timezone: ev.timezone || 'Africa/Lagos',
                    venue: ev.venue || '',
                    address: ev.address || '',
                    checkInStatus: ev.checkInStatus === 'open' ? 'open' : 'closed',
                    canManageCheckInStatus: true,
                  }))
            }
          />
        </section>

        {organizer && (
          <section id="sales" className="dashboard-section">
            <div className="dashboard-title">
              <div>
                <span className="eyebrow">Finance</span>
                <h2>Sales, earnings & reports</h2>
              </div>
              <a className="button button-dark" href="/api/dashboard/reports">
                Download CSV
              </a>
            </div>
            <div className="finance-grid">
              <article>
                <span>Gross ticket sales</span>
                <b>{money(data.metrics.grossRevenue)}</b>
              </article>
              <article>
                <span>Platform commission (5%)</span>
                <b>{money(data.metrics.platformCommission)}</b>
              </article>
              <article>
                <span>Organizer earnings</span>
                <b>{money(data.metrics.organizerEarnings)}</b>
              </article>
              <article>
                <span>Customer service fee</span>
                <b>2%</b>
              </article>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((transaction: any) => (
                    <tr key={transaction.id}>
                      <td>{transaction.providerReference}</td>
                      <td>{money(transaction.amount)}</td>
                      <td>{transaction.status}</td>
                      <td>
                        {transaction.verifiedAt
                          ? formatDate(transaction.verifiedAt)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {organizer && (
          <section id="guests" className="dashboard-section operations-grid">
            <div>
              <span className="eyebrow">Guest list</span>
              <h2>Complimentary tickets</h2>
              <form
                className="dashboard-form compact"
                autoComplete="off"
                onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
              >
                <input type="hidden" name="action" value="guest" />
                <label>
                  Event
                  <select name="eventId" required>
                    {data.events.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Guest name
                  <input name="name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" />
                </label>
                <label>
                  Quantity
                  <input name="quantity" type="number" min="1" max="20" defaultValue="1" />
                </label>
                <label>
                  Notes
                  <textarea name="notes" />
                </label>
                <button className="button button-dark">Issue complimentary ticket</button>
              </form>
              <div className="chip-list">
                {data.guests.map((guest: any) => (
                  <span key={guest.id}>
                    {guest.name} · {guest.quantity} · {guest.status}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow">Promotions</span>
              <h2>Discount codes</h2>
              <form
                className="dashboard-form compact"
                onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
              >
                <input type="hidden" name="action" value="discount" />
                <label>
                  Event
                  <select name="eventId" required>
                    {data.events.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Code
                  <input name="code" required minLength={3} />
                </label>
                <label>
                  Type
                  <select name="kind">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </label>
                <label>
                  Value
                  <input name="value" type="number" min="1" required />
                </label>
                <label>
                  Usage limit
                  <input name="usageLimit" type="number" min="1" />
                </label>
                <button className="button button-coral">Create discount</button>
              </form>
              <div className="chip-list">
                {data.discounts.map((discount: any) => (
                  <span key={discount.id}>
                    {discount.code} ·{' '}
                    {discount.kind === 'percentage' ? `${discount.value}%` : money(discount.value)}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {organizer && (
          <section id="announcements" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Audience</span>
              <h2>Email announcements</h2>
              <p>
                Compose and save attendee announcements. Transactional emails require Resend
                environment credentials to send live messages.
              </p>
              <div className="chip-list">
                {data.announcements.map((item: any) => (
                  <span key={item.id}>
                    {item.subject} · {item.deliveryStatus}
                  </span>
                ))}
              </div>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
            >
              <input type="hidden" name="action" value="announcement" />
              <label>
                Event
                <select name="eventId" required>
                  {data.events.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Audience
                <select name="audience">
                  <option value="all-attendees">All attendees</option>
                  <option value="checked-in">Checked in</option>
                  <option value="not-checked-in">Not checked in</option>
                </select>
              </label>
              <label>
                Subject
                <input name="subject" required />
              </label>
              <label>
                Message
                <textarea name="message" required minLength={10} />
              </label>
              <button className="button button-dark">Save announcement</button>
            </form>
          </section>
        )}

        {organizer && (
          <section className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">Curation</span>
              <h2>Event collections</h2>
              <p>Group related events for internal organization and future campaigns.</p>
              <div className="chip-list">
                {data.collections.map((collection: any) => (
                  <span key={collection.id}>
                    {collection.name} · {collection.events?.length || 0} events
                  </span>
                ))}
              </div>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
            >
              <input type="hidden" name="action" value="collection" />
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Description
                <textarea name="description" />
              </label>
              <label>
                Events
                <select name="events" multiple size={Math.min(6, Math.max(2, data.events.length))}>
                  {data.events.map((event: any) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button-dark">Create collection</button>
            </form>
          </section>
        )}

        {organizer && (
          <section id="bank" className="dashboard-section">
            <div className="dashboard-title">
              <div>
                <span className="eyebrow">Settlement Bank Account</span>
                <h2>Bank account verification</h2>
              </div>
              {isBankLocked && (
                <span className="status-pill status-published">
                  <Lock size={12} /> Verified & Locked
                </span>
              )}
            </div>

            {!data.capabilities?.paystackConfigured && (
              <p className="payment-note">
                <strong>Bank Account Verification Unavailable:</strong>{' '}
                Live bank account resolution is not configured on this server yet. Unverified bank
                account holder names cannot be entered manually or saved until verification
                credentials are configured.
              </p>
            )}

            {isBankLocked ? (
              <div className="bank-locked-panel">
                <div className="bank-locked-summary">
                  <div>
                    <span>Verified Account Holder</span>
                    <strong>{data.bank.accountName}</strong>
                  </div>
                  <div>
                    <span>Bank</span>
                    <strong>{data.bank.bankName}</strong>
                  </div>
                  <div>
                    <span>Account Number</span>
                    <strong>{data.bank.accountNumber}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{data.bank.status} · Locked</strong>
                  </div>
                </div>
                <p className="section-copy">
                  Settlement accounts are locked after verification to prevent unauthorized payout
                  redirects. To change your settlement bank account, submit an appeal below (3-day
                  security review period applies before Admin/Super Admin approval).
                </p>
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="button button-coral"
                    onClick={() => setShowAppealForm((prev) => !prev)}
                  >
                    {showAppealForm ? 'Cancel Bank Change Request' : 'Request Bank Account Change'}
                  </button>
                </div>

                {showAppealForm && (
                  <form className="dashboard-form" onSubmit={submitBankAppeal}>
                    <div className="wide">
                      <label htmlFor="appeal-bank-search">New Nigerian Bank (Search & Select)</label>
                      <SearchableBankSelect
                        id="appeal-bank-search"
                        banks={data.banks || []}
                        value={appealBankCode}
                        onChange={(bank) => {
                          setAppealBankCode(bank.code)
                          setAppealResolvedBankName(bank.name)
                          setAppealResolvedAccountName('')
                          setAppealResolveError('')
                          setAppealResolveMessage('')
                        }}
                      />
                    </div>
                    <label>
                      New 10-Digit Account Number
                      <input
                        required
                        pattern="\d{10}"
                        minLength={10}
                        maxLength={10}
                        inputMode="numeric"
                        value={appealAccountNumber}
                        onChange={(e) => {
                          setAppealAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                          setAppealResolvedAccountName('')
                          setAppealResolveError('')
                          setAppealResolveMessage('')
                        }}
                      />
                    </label>
                    <label>
                      Confirm New Account Number
                      <input
                        required
                        pattern="\d{10}"
                        minLength={10}
                        maxLength={10}
                        inputMode="numeric"
                        value={appealConfirmAccountNumber}
                        onChange={(e) => {
                          setAppealConfirmAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                          setAppealResolveError('')
                        }}
                      />
                    </label>
                    <div className="wide">
                      <button
                        type="button"
                        disabled={busy || !appealBankCode || appealAccountNumber.length !== 10}
                        className="button button-cream"
                        onClick={() => resolveBank('appeal')}
                      >
                        {busy ? 'Verifying account holder…' : 'Verify Proposed Account Holder Name'}
                      </button>
                      {appealResolveError && (
                        <p className="bank-inline-alert error" role="alert">
                          {appealResolveError}
                        </p>
                      )}
                      {appealResolveMessage && (
                        <p className="bank-inline-alert success">{appealResolveMessage}</p>
                      )}
                    </div>
                    <label>
                      Verified Proposed Account Holder Name (Read-Only)
                      <input
                        readOnly
                        tabIndex={-1}
                        aria-readonly="true"
                        value={appealResolvedAccountName}
                        placeholder="Automatically populated after verification"
                        className="bg-neutral-100 text-neutral-800 cursor-not-allowed"
                      />
                    </label>
                    <label>
                      Reason for Bank Account Change (min 10 characters)
                      <textarea
                        required
                        minLength={10}
                        value={appealReason}
                        onChange={(e) => setAppealReason(e.target.value)}
                        placeholder="Explain why your settlement bank account needs to change..."
                      />
                    </label>
                    <button
                      disabled={busy || !appealResolvedAccountName}
                      className="button button-dark"
                    >
                      Submit 3-Day Bank Change Appeal
                    </button>
                  </form>
                )}

                {data.bankAppeals?.length > 0 && (
                  <div className="data-table" style={{ marginTop: 24 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Proposed Bank</th>
                          <th>Account Holder</th>
                          <th>Reason</th>
                          <th>Submitted</th>
                          <th>3-Day Eligible At</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bankAppeals.map((appeal: any) => (
                          <tr key={appeal.id}>
                            <td>
                              {appeal.proposedBankName} · {appeal.proposedAccountNumber}
                            </td>
                            <td>{appeal.proposedAccountName}</td>
                            <td>{appeal.reason}</td>
                            <td>{formatDate(appeal.submittedAt)}</td>
                            <td>{formatDateTime(appeal.reviewEligibleAt)}</td>
                            <td>
                              <span className={`status-pill status-${appeal.status}`}>
                                {appeal.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <form
                className="dashboard-form"
                autoComplete="off"
                onSubmit={(event) => submit(event, '/api/dashboard/organizer-operations')}
              >
                <input type="hidden" name="action" value="bank" />
                <input type="hidden" name="bankCode" value={bankCode} />
                <input type="hidden" name="bankName" value={resolvedBankName} />
                <div className="wide">
                  <label htmlFor="initial-bank-search">Select Nigerian Bank (Search by name or code)</label>
                  <SearchableBankSelect
                    id="initial-bank-search"
                    banks={data.banks || []}
                    value={bankCode}
                    onChange={(bank) => {
                      setBankCode(bank.code)
                      setResolvedBankName(bank.name)
                      setResolvedAccountName('')
                      setBankVerifiedOk(false)
                      setBankResolveError('')
                      setBankResolveMessage('')
                    }}
                  />
                </div>
                <label>
                  10-Digit NUBAN Account Number
                  <input
                    name="accountNumber"
                    required
                    minLength={10}
                    maxLength={10}
                    pattern="\d{10}"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                      setResolvedAccountName('')
                      setBankVerifiedOk(false)
                      setBankResolveError('')
                      setBankResolveMessage('')
                    }}
                  />
                </label>
                <label>
                  Confirm Account Number
                  <input
                    name="confirmAccountNumber"
                    required
                    minLength={10}
                    maxLength={10}
                    pattern="\d{10}"
                    inputMode="numeric"
                    value={confirmAccountNumber}
                    onChange={(e) => {
                      setConfirmAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                      setBankResolveError('')
                    }}
                  />
                </label>
                <div className="wide">
                  <button
                    type="button"
                    disabled={busy || !bankCode || accountNumber.length !== 10}
                    className="button button-cream"
                    onClick={() => resolveBank('initial')}
                  >
                    {busy ? 'Verifying account holder…' : 'Verify Account Holder Name'}
                  </button>
                  {bankResolveError && (
                    <p className="bank-inline-alert error" role="alert">
                      {bankResolveError}
                    </p>
                  )}
                  {bankResolveMessage && (
                    <p className="bank-inline-alert success">{bankResolveMessage}</p>
                  )}
                </div>
                <label>
                  Verified Account Holder Name (Automatically retrieved — not editable)
                  <input
                    name="accountName"
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    value={resolvedAccountName}
                    placeholder="Automatically populated after verification"
                    className="bg-neutral-100 text-neutral-800 cursor-not-allowed"
                  />
                </label>
                <button disabled={busy || !bankVerifiedOk} className="button button-dark">
                  Save & Lock Bank Account
                </button>
              </form>
            )}
          </section>
        )}

        {organizer && (
          <section id="payouts" className="dashboard-section">
            <span className="eyebrow">Finance</span>
            <h2>Payout history</h2>
            <p className="section-copy">
              Payouts are initiated and authorized only by AZORTIX Super Admin. Your verified
              earnings and status appear here.
            </p>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map((payout: any) => (
                    <tr key={payout.id}>
                      <td>{payout.reference}</td>
                      <td>{money(payout.amount)}</td>
                      <td>{payout.status}</td>
                      <td>
                        {payout.paidAt ? formatDate(payout.paidAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section id="team" className="dashboard-section split-panel">
          <div>
            <span className="eyebrow">Event-Scoped Access</span>
            <h2>Team &amp; Check-In Staff</h2>
            <p>
              Assign Check-In Staff to specific events only. Assigned staff can scan QR tickets and
              view live attendance solely for their assigned events, with zero access to payouts,
              refunds, or unrelated events.
            </p>
            <div className="data-table" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Assigned Events</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.team || []).length === 0 ? (
                    <tr>
                      <td colSpan={5}>No team or check-in staff added yet.</td>
                    </tr>
                  ) : (
                    (data.team || []).map((member: any) => {
                      const assignedIds: string[] = Array.isArray(member.assignedEvents)
                        ? member.assignedEvents.map(String)
                        : []
                      const assignedLabels = assignedIds
                        .map((id) => eventTitleById.get(id) || id.slice(0, 8))
                        .join(', ')
                      const isRevoked =
                        member.active === false || member.invitationStatus === 'revoked'
                      return (
                        <tr key={member.id}>
                          <td>
                            <strong>{member.name}</strong>
                            <div className="table-subtext">{member.email}</div>
                          </td>
                          <td>{member.role}</td>
                          <td>
                            {assignedLabels ||
                              (member.role === 'manager'
                                ? 'All organizer events'
                                : 'No events assigned')}
                          </td>
                          <td>
                            <span className={`status-pill status-${isRevoked ? 'revoked' : 'active'}`}>
                              {isRevoked ? 'Revoked' : 'Active'}
                            </span>
                          </td>
                          <td>
                            {!isRevoked ? (
                              <form onSubmit={(ev) => submit(ev, '/api/dashboard/team')}>
                                <input type="hidden" name="action" value="revoke" />
                                <input type="hidden" name="memberId" value={member.id} />
                                <button className="table-action muted-action">Revoke</button>
                              </form>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <form
            className="dashboard-form compact"
            autoComplete="off"
            onSubmit={(event) => submit(event, '/api/dashboard/team')}
          >
            <input type="hidden" name="action" value="invite" />
            <label>
              Staff / Collaborator Name
              <input name="name" required autoComplete="off" placeholder="e.g. Tunde Adeyemi" />
            </label>
            <label>
              Email Address
              <input name="email" type="email" required autoComplete="off" placeholder="staff@example.com" />
            </label>
            <label>
              Role
              <select
                name="role"
                value={teamRole}
                onChange={(e) => setTeamRole(e.target.value as any)}
              >
                <option value="check-in">Check-in Staff (Event-scoped scanner only)</option>
                <option value="manager">Event Manager</option>
                <option value="analyst">Analyst</option>
                <option value="finance">Finance</option>
              </select>
            </label>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-neutral-700 block">
                Assigned Events {teamRole === 'check-in' ? '(required for Check-In Staff)' : '(optional)'}
              </span>
              {(data.events || []).length === 0 ? (
                <p className="text-xs text-neutral-500">Create an event first to assign staff.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-neutral-200 p-2 space-y-1.5 bg-white">
                  {(data.events || []).map((ev: any) => {
                    const idStr = String(ev.id)
                    const checked = teamAssignedEventIds.includes(idStr)
                    return (
                      <label
                        key={idStr}
                        className="flex items-center gap-2 text-xs font-normal cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="assignedEvents"
                          value={idStr}
                          checked={checked}
                          onChange={() => toggleTeamAssignedEvent(idStr)}
                        />
                        <span>{ev.title}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <button
              disabled={busy || (teamRole === 'check-in' && teamAssignedEventIds.length === 0)}
              className="button button-dark"
            >
              Add Staff / Teammate
            </button>
          </form>
        </section>

        {!organizer && (
          <section id="users" className="dashboard-section">
            <div className="dashboard-title">
              <div>
                <span className="eyebrow">Accounts Directory</span>
                <h2>All platform users ({filteredUsers.length})</h2>
              </div>
              <div className="filter-tabs" role="tablist">
                {(
                  [
                    ['all', 'All Users'],
                    ['individual', 'Individual'],
                    ['organization', 'Organization'],
                    ['organizer', 'Organizers'],
                    ['admin', 'Staff'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={userFilter === key ? 'active' : ''}
                    onClick={() => setUserFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Account type</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((account: any) => (
                    <tr key={account.id}>
                      <td>
                        {account.accountType === 'organization'
                          ? account.businessName || account.name
                          : account.name}
                      </td>
                      <td>{account.email}</td>
                      <td>{account.accountType || 'individual'}</td>
                      <td>{account.role}</td>
                      <td>{account.accountStatus}</td>
                      <td>
                        {account.role === 'organizer' ? (
                          <form onSubmit={(event) => submit(event, '/api/dashboard/user-status')}>
                            <input type="hidden" name="userId" value={account.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={account.accountStatus === 'active' ? 'suspended' : 'active'}
                            />
                            <button className="table-action">
                              {account.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </form>
                        ) : (
                          <span className="status-pill">Permanent {account.role}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!organizer && (
          <section id="bank-appeals" className="dashboard-section">
            <span className="eyebrow">Security & Verification</span>
            <h2>Settlement banks & 3-day change appeals</h2>

            <div className="data-table" style={{ marginTop: 20 }}>
              <table>
                <thead>
                  <tr>
                    <th>Account holder</th>
                    <th>Bank</th>
                    <th>Account</th>
                    <th>Locked</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.bankVerifications || []).map((bank: any) => (
                    <tr key={bank.id}>
                      <td>{bank.accountName}</td>
                      <td>{bank.bankName}</td>
                      <td>{bank.accountNumber}</td>
                      <td>{bank.locked ? 'Locked' : 'Unlocked'}</td>
                      <td>{bank.status}</td>
                      <td>
                        <form onSubmit={(event) => submit(event, '/api/dashboard/bank-review')}>
                          <input type="hidden" name="bankId" value={bank.id} />
                          <select name="decision" defaultValue={bank.status === 'verified' ? 'verified' : 'verified'}>
                            <option value="verified">Verify & Lock</option>
                            <option value="rejected">Reject</option>
                          </select>
                          <button className="table-action">Apply</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginTop: 36, fontSize: 22 }}>Bank Account Change Appeals</h3>
            <p className="section-copy">
              3-day review hold is enforced before any bank change appeal can be approved.
            </p>
            <div className="data-table" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Current Bank</th>
                    <th>Proposed New Bank</th>
                    <th>Reason</th>
                    <th>3-Day Eligibility</th>
                    <th>Status & Audit</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.bankAppeals || []).map((appeal: any) => {
                    const eligibleAtMs = new Date(appeal.reviewEligibleAt).valueOf()
                    const referenceNowMs = Number(data.serverTimeMs || 0)
                    const isEligibleNow =
                      Number.isFinite(eligibleAtMs) && referenceNowMs >= eligibleAtMs
                    const canDecide =
                      appeal.status === 'pending' || superAdmin

                    return (
                      <tr key={appeal.id}>
                        <td>
                          <strong>{appeal.currentAccountName}</strong>
                          <div className="table-subtext">
                            {appeal.currentBankName} · {appeal.currentAccountNumber}
                          </div>
                        </td>
                        <td>
                          <strong>{appeal.proposedAccountName}</strong>
                          <div className="table-subtext">
                            {appeal.proposedBankName} · {appeal.proposedAccountNumber}
                          </div>
                        </td>
                        <td>{appeal.reason}</td>
                        <td>
                          {isEligibleNow
                            ? 'Eligible now'
                            : `Locked until ${formatDateTime(appeal.reviewEligibleAt)}`}
                        </td>
                        <td>
                          <span className={`status-pill status-${appeal.status}`}>
                            {appeal.status}
                          </span>
                          <div className="table-subtext">
                            {(appeal.auditHistory || []).length} audit entries
                          </div>
                        </td>
                        <td>
                          {canDecide ? (
                            <form
                              className="inline-review-form"
                              onSubmit={(event) => submit(event, '/api/dashboard/bank-appeal-review')}
                            >
                              <input type="hidden" name="appealId" value={appeal.id} />
                              {appeal.status !== 'pending' && superAdmin && (
                                <input type="hidden" name="override" value="true" />
                              )}
                              <input
                                name="reviewNote"
                                placeholder={appeal.status !== 'pending' ? 'Override note' : 'Review note'}
                              />
                              <select name="decision" defaultValue="rejected">
                                <option value="approved">
                                  {appeal.status !== 'pending' ? 'Override -> Approve' : 'Approve'}
                                </option>
                                <option value="rejected">
                                  {appeal.status !== 'pending' ? 'Override -> Reject' : 'Reject'}
                                </option>
                              </select>
                              <button className="table-action">Apply</button>
                            </form>
                          ) : (
                            'Reviewed'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!organizer && (
          <section id="operations" className="dashboard-section">
            <span className="eyebrow">Support</span>
            <h2>Complaints and reports</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.complaints.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.subject}</td>
                      <td>{item.email}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.status !== 'resolved' && (
                          <form
                            onSubmit={(event) => submit(event, '/api/dashboard/complaint-status')}
                          >
                            <input type="hidden" name="complaintId" value={item.id} />
                            <button className="table-action">Resolve</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!organizer && (
          <section id="audit-logs" className="dashboard-section">
            <span className="eyebrow">Compliance</span>
            <h2>System audit logs</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Category</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.auditLogs || []).map((entry: any) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.createdAt)}</td>
                      <td>{entry.category}</td>
                      <td>
                        <code>{entry.action}</code>
                      </td>
                      <td>
                        {entry.actorEmail} ({entry.actorRole})
                      </td>
                      <td>{entry.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {superAdmin && (
          <section id="admin-management" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">System Roles · Permanent Protection</span>
              <h2>Administrators Directory</h2>
              <p>
                Both Admin and Super Admin are permanent system-level roles. Neither role can
                delete, deactivate, suspend, or demote the other. Super Admin can provision new
                Admin accounts (password change required on first login).
              </p>
              <div className="data-table" style={{ marginTop: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Admin</th>
                      <th>Status</th>
                      <th>Protection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.users || [])
                      .filter((u: any) => u.role === 'admin' || u.role === 'super-admin')
                      .map((staffUser: any) => (
                        <tr key={staffUser.id}>
                          <td>
                            <strong>{staffUser.name}</strong>
                            <div className="table-subtext">
                              {staffUser.email} · {staffUser.role}
                            </div>
                          </td>
                          <td>{staffUser.accountStatus}</td>
                          <td>
                            <span className="status-pill">Permanent system role</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <form
              className="dashboard-form compact"
              autoComplete="off"
              onSubmit={(event) => submit(event, '/api/dashboard/admins')}
            >
              <input type="hidden" name="action" value="create" />
              <label>
                Full Name
                <input name="name" required minLength={2} autoComplete="off" placeholder="Admin full name" />
              </label>
              <label>
                Admin Email
                <input name="email" type="email" required autoComplete="off" placeholder="newadmin@azortix.com" />
              </label>
              <label>
                Temporary Password (min 12 chars)
                <input
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
              </label>
              <button disabled={busy} className="button button-coral">
                <UserPlus size={14} />
                <span>Create Admin Account</span>
              </button>
            </form>
          </section>
        )}

        {!organizer && (
          <section id="payouts-control" className="dashboard-section">
            <div className="dashboard-title">
              <div>
                <span className="eyebrow">Shared Finance · Admin &amp; Super Admin</span>
                <h2>Paystack Transfers &amp; Payout Control</h2>
              </div>
              <span className="status-pill">
                {data.capabilities?.paystackConfigured
                  ? 'Paystack Transfer API Ready'
                  : 'PAYSTACK_SECRET_KEY Missing'}
              </span>
            </div>
            <p className="section-copy">
              Both Admin and Super Admin have equal permission to view verified event balances,
              initiate Paystack transfers to verified locked bank accounts, and track transfer
              references and failures. Every transfer is idempotent and audit-logged.
            </p>
            <form
              className="dashboard-form payout-authorize"
              onSubmit={(event) => submit(event, '/api/dashboard/payouts')}
            >
              <input type="hidden" name="idempotencyKey" value={transferIdempotencyKey} />
              <label>
                Event (Available Balance)
                <select
                  name="eventId"
                  required
                  value={transferEventId}
                  onChange={(e) => setTransferEventId(e.target.value)}
                >
                  {(data.eventBalances || []).map((item: any) => (
                    <option key={item.eventId} value={item.eventId}>
                      {item.title} · Avail {money(item.available)}{' '}
                      {item.bankVerified ? '· Bank Verified' : '· Bank Unverified'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Transfer Amount (NGN · min ₦1,000)
                <input
                  name="amount"
                  type="number"
                  min="1000"
                  max={
                    selectedEventBalance && selectedEventBalance.available >= 1000
                      ? selectedEventBalance.available
                      : undefined
                  }
                  required
                />
              </label>
              <label>
                Reason / Reference Note
                <input name="reason" placeholder="Event settlement payout" />
              </label>
              <button
                className="button button-coral"
                disabled={busy || !selectedEventBalance?.bankVerified}
              >
                Initiate Paystack Transfer
              </button>
            </form>
            {selectedEventBalance && (
              <div className="bank-locked-summary" style={{ marginBottom: 24 }}>
                <div>
                  <span>Verified Net Earnings</span>
                  <strong>{money(selectedEventBalance.earnings)}</strong>
                </div>
                <div>
                  <span>Reserved / Paid</span>
                  <strong>{money(selectedEventBalance.reserved)}</strong>
                </div>
                <div>
                  <span>Available Balance</span>
                  <strong>{money(selectedEventBalance.available)}</strong>
                </div>
                <div>
                  <span>Verified Destination Bank</span>
                  <strong>
                    {selectedEventBalance.bankVerified
                      ? `${selectedEventBalance.accountName} (${selectedEventBalance.bankName} · ${selectedEventBalance.accountNumber})`
                      : 'Not verified / unlocked'}
                  </strong>
                </div>
              </div>
            )}
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Reference / Transfer Code</th>
                    <th>Initiated By</th>
                    <th>Destination Bank</th>
                    <th>Amount</th>
                    <th>Status &amp; Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payouts.map((payout: any) => (
                    <tr key={payout.id}>
                      <td>
                        <code>{payout.reference}</code>
                        {payout.paystackTransferCode && (
                          <div className="table-subtext">Code: {payout.paystackTransferCode}</div>
                        )}
                      </td>
                      <td>{payout.initiatedByRole || 'staff'}</td>
                      <td>
                        {payout.accountName ? (
                          <>
                            <strong>{payout.accountName}</strong>
                            <div className="table-subtext">
                              {payout.bankName} · {payout.accountNumber}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{money(payout.amount)}</td>
                      <td>
                        <span className={`status-pill status-${payout.status}`}>
                          {payout.status}
                        </span>
                        {payout.failureReason && (
                          <div className="table-subtext">{payout.failureReason}</div>
                        )}
                      </td>
                      <td>
                        {['pending', 'approved'].includes(payout.status) ? (
                          <form
                            className="inline-review-form"
                            onSubmit={(event) => submit(event, '/api/dashboard/payout-review')}
                          >
                            <input type="hidden" name="payoutId" value={payout.id} />
                            <select name="decision" defaultValue="initiate-transfer">
                              <option value="initiate-transfer">Send Paystack Transfer</option>
                              {payout.status === 'pending' && (
                                <option value="approved">Approve</option>
                              )}
                              <option value="rejected">Reject</option>
                            </select>
                            <button className="table-action" disabled={busy}>
                              Apply
                            </button>
                          </form>
                        ) : (
                          'Recorded'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {superAdmin && (
          <section id="settings" className="dashboard-section split-panel">
            <div>
              <span className="eyebrow">System controls</span>
              <h2>Platform & financial settings</h2>
              <p>
                Commission: {data.settings?.commissionPercent ?? 5}% · Service fee:{' '}
                {data.settings?.serviceFeePercent ?? 2}% · Minimum payout:{' '}
                {money(data.settings?.minimumPayout)}
              </p>
              <div className="integration-status-list">
                <span>
                  <ShieldCheck size={14} /> Paystack Bank Resolve:{' '}
                  {data.capabilities?.paystackConfigured ? 'Configured' : 'Missing PAYSTACK_SECRET_KEY'}
                </span>
                <span>
                  <ShieldCheck size={14} /> Resend Email:{' '}
                  {data.capabilities?.emailConfigured
                    ? 'Configured'
                    : 'Missing RESEND_API_KEY / AZOR_EMAIL_FROM'}
                </span>
              </div>
            </div>
            <form
              className="dashboard-form compact"
              onSubmit={(event) => submit(event, '/api/dashboard/settings')}
            >
              <label>
                Commission %
                <input
                  name="commissionPercent"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  defaultValue={data.settings?.commissionPercent ?? 5}
                  required
                />
              </label>
              <label>
                Customer service fee %
                <input
                  name="serviceFeePercent"
                  type="number"
                  min="0"
                  max="25"
                  step="0.5"
                  defaultValue={data.settings?.serviceFeePercent ?? 2}
                  required
                />
              </label>
              <label>
                Minimum payout (NGN)
                <input
                  name="minimumPayout"
                  type="number"
                  min="0"
                  defaultValue={data.settings?.minimumPayout ?? 10000}
                  required
                />
              </label>
              <label>
                Support email
                <input
                  name="supportEmail"
                  type="email"
                  defaultValue={data.settings?.supportEmail || 'support@azortix.com'}
                  required
                />
              </label>
              <label className="terms">
                <input
                  type="checkbox"
                  name="salesEnabled"
                  defaultChecked={data.settings?.salesEnabled !== false}
                />{' '}
                Ticket sales & free registrations enabled
              </label>
              <button disabled={busy} className="button button-coral">
                Save settings
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
