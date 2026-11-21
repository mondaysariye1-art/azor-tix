import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Download, Gift, Mail, ShieldCheck, Ticket } from 'lucide-react'
import type { TicketDisplayRecord } from '@/lib/tickets'
import { TicketActions } from './TicketActions'

interface TicketConfirmationViewProps {
  mode: 'confirmation' | 'single'
  variant?: 'standard' | 'gift-recipient' | 'gift-purchaser' | 'mixed' | 'private-invitation'
  buyerName: string
  senderName?: string
  giftMessage?: string
  eventName: string
  eventDate: string
  eventTime: string
  eventVenue: string
  peopleCovered: number
  isFree: boolean
  orderReference: string
  tickets: TicketDisplayRecord[]
  emailNotice?: string | null
  footerActions?: ReactNode
}

function getStatusBanner(status: string): { label: string; tone: 'valid' | 'used' | 'denied' } {
  switch (status) {
    case 'used':
      return { label: 'Already Used — Checked In', tone: 'used' }
    case 'cancelled':
    case 'void':
      return { label: 'Cancelled Ticket', tone: 'denied' }
    case 'refunded':
      return { label: 'Refunded Ticket', tone: 'denied' }
    default:
      return { label: 'Valid One-Time Entry Pass', tone: 'valid' }
  }
}

export function TicketConfirmationView({
  mode,
  variant = 'standard',
  buyerName,
  senderName,
  giftMessage,
  eventName,
  eventDate,
  eventTime,
  eventVenue,
  peopleCovered,
  isFree,
  orderReference,
  tickets,
  emailNotice,
  footerActions,
}: TicketConfirmationViewProps) {
  const peopleLabel = `${peopleCovered} ${peopleCovered === 1 ? 'person' : 'people'}`
  const isGiftRecipient = variant === 'gift-recipient'
  const isGiftPurchaser = variant === 'gift-purchaser'
  const isMixedOrder = variant === 'mixed'
  const isPrivateInvite = variant === 'private-invitation'

  const headline = isGiftRecipient
    ? "You've received a ticket gift!"
    : isMixedOrder
      ? 'Your tickets & gift order are confirmed!'
      : isGiftPurchaser
        ? 'Your gift ticket purchase is confirmed!'
        : isPrivateInvite
          ? 'Your AZORTIX invitation is confirmed!'
          : 'Your tickets are ready!'

  const paymentSentence = isGiftRecipient
    ? `${senderName || 'Someone special'} gifted you ${tickets.length === 1 ? 'a ticket' : `${tickets.length} tickets`} to ${eventName}.`
    : isMixedOrder
      ? 'Your order was successful. Your own pass(es) and each gift recipient pass have been uniquely generated below.'
      : isGiftPurchaser
        ? 'Your gift purchase was successful. Individual digital tickets have been prepared for each recipient.'
        : isPrivateInvite
          ? 'No payment required. Your private complimentary invitation has been confirmed.'
          : isFree
            ? 'No payment required. Your RSVP registration has been confirmed.'
            : 'Your ticket purchase was successful.'

  return (
    <main className="ticket-invite-page">
      <article className="ticket-invite-card">
        <div className="ticket-invite-top-rule" aria-hidden="true" />

        {/* 1. OFFICIAL AZORTIX LOGO */}
        <header className="ticket-invite-header">
          <Image
            src="/assets/azor-tix-wordmark-black.png"
            alt="AZORTIX"
            width={642}
            height={214}
            priority
            referrerPolicy="no-referrer"
            className="ticket-invite-logo"
          />
        </header>

        {/* 2. TICKET CONFIRMATION CONTENT */}
        <section className="ticket-invite-intro">
          <h1>{headline}</h1>
          <p className="ticket-invite-greeting">Hello, {buyerName}</p>
          {!isGiftRecipient && !isGiftPurchaser && (
            <p>
              Your ticket registration for <strong>{eventName}</strong> has been confirmed.
            </p>
          )}
          <p className="ticket-invite-payment-line">{paymentSentence}</p>
          {isGiftRecipient && giftMessage && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 my-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1 flex items-center gap-1.5">
                <Gift size={13} /> Personal gift note from {senderName || 'your sender'}
              </p>
              <p className="m-0 italic">&ldquo;{giftMessage}&rdquo;</p>
            </div>
          )}
          <p>
            We look forward to welcoming {isGiftPurchaser ? 'your guests' : 'you'} to{' '}
            <strong>{eventName}</strong>.
          </p>
          {emailNotice && <p className="ticket-invite-email-note no-print">{emailNotice}</p>}
        </section>

        {/* 3. EVENT INFORMATION */}
        <section className="ticket-invite-event-info" aria-label="Event Information">
          <div className="ticket-invite-info-row">
            <span className="ticket-invite-info-label">Event</span>
            <span className="ticket-invite-info-value strong">{eventName}</span>
          </div>
          <div className="ticket-invite-info-row">
            <span className="ticket-invite-info-label">Date</span>
            <span className="ticket-invite-info-value">{eventDate}</span>
          </div>
          <div className="ticket-invite-info-row">
            <span className="ticket-invite-info-label">Time</span>
            <span className="ticket-invite-info-value">{eventTime}</span>
          </div>
          <div className="ticket-invite-info-row">
            <span className="ticket-invite-info-label">Venue</span>
            <span className="ticket-invite-info-value">{eventVenue}</span>
          </div>
          <div className="ticket-invite-info-row">
            <span className="ticket-invite-info-label">People Covered</span>
            <span className="ticket-invite-info-value strong">{peopleLabel}</span>
          </div>
        </section>

        {/* 4 & 6. INDIVIDUAL SCANNABLE QR PASSES + TICKET DETAILS UNDER QR */}
        <section className="ticket-invite-passes" aria-label="Digital Tickets">
          {tickets.map((ticket, index) => {
            const statusInfo = getStatusBanner(ticket.status)
            const ticketIsGift = ticket.acquisitionType === 'gift'
            const passHeading = isMixedOrder
              ? ticketIsGift
                ? `Gift Ticket ${index + 1} of ${tickets.length} · For ${ticket.attendeeName}`
                : `Your Ticket ${index + 1} of ${tickets.length}`
              : isGiftPurchaser
                ? `Gift Ticket ${index + 1} of ${tickets.length} · For ${ticket.attendeeName}`
                : tickets.length > 1
                  ? `Ticket ${index + 1} of ${tickets.length}`
                  : isGiftRecipient
                    ? 'Gift Admission Pass'
                    : isPrivateInvite
                      ? 'Private Invitation Pass'
                      : 'Individual Admission Pass'

            return (
              <div key={ticket.id} className="ticket-pass-block">
                <div className="ticket-pass-bar">
                  <span className="ticket-pass-counter">
                    {isGiftRecipient || isGiftPurchaser || (isMixedOrder && ticketIsGift) ? (
                      <Gift size={13} aria-hidden="true" />
                    ) : (
                      <Ticket size={13} aria-hidden="true" />
                    )}
                    <span>{passHeading}</span>
                  </span>
                  <span className="ticket-pass-accent">One-Time Entry QR</span>
                </div>

                <div className="ticket-pass-body">
                  <div className="ticket-qr-frame">
                    <img
                      src={ticket.qrImagePath}
                      alt={`Unique QR code for ${ticket.attendeeName} (${ticket.code})`}
                      width={220}
                      height={220}
                      className="ticket-qr-image"
                    />
                  </div>

                  <div className="ticket-pass-details">
                    <p className="ticket-holder-name">{ticket.attendeeName}</p>
                    {(isGiftPurchaser || (isMixedOrder && ticketIsGift)) && ticket.attendeeEmail && (
                      <p className="text-xs text-neutral-500 mb-1">
                        Gift sent to: {ticket.attendeeEmail}
                      </p>
                    )}
                    <p className="ticket-tier-name">{ticket.ticketTypeName}</p>
                    <code className="ticket-code-box">{ticket.code}</code>
                    <p className="ticket-event-caption">{ticket.eventName}</p>
                    <p className={`ticket-validity-line tone-${statusInfo.tone}`}>
                      <ShieldCheck size={14} aria-hidden="true" />
                      <span>{statusInfo.label}</span>
                    </p>
                  </div>

                  {mode === 'confirmation' ? (
                    <div className="ticket-pass-cta-group no-print">
                      <Link href={ticket.sharePath} className="ticket-view-share-link">
                        VIEW AND SHARE YOUR TICKET
                      </Link>
                      <a
                        href={ticket.pdfDownloadPath}
                        download={`AZORTIX-${ticket.code}.pdf`}
                        className="ticket-pdf-inline-link"
                      >
                        <Download size={14} aria-hidden="true" />
                        <span>Download PDF Pass</span>
                      </a>
                    </div>
                  ) : (
                    <TicketActions
                      sharePath={ticket.sharePath}
                      pdfDownloadPath={ticket.pdfDownloadPath}
                      eventName={ticket.eventName}
                      attendeeName={ticket.attendeeName}
                      ticketCode={ticket.code}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {/* 7. ORDER REFERENCE (hidden on gift recipient view so buyer payment/order reference stays private) */}
        {!isGiftRecipient && orderReference && (
          <section className="ticket-invite-order-ref" aria-label="Order Reference">
            <span className="ticket-order-ref-label">Order Reference</span>
            <code className="ticket-order-ref-value">{orderReference}</code>
          </section>
        )}

        {/* 8. CUSTOMER SUPPORT */}
        <footer className="ticket-invite-support">
          <h2>Questions?</h2>
          <p>For assistance with your ticket or event registration, contact:</p>
          <a href="mailto:tickets@azortix.org" className="ticket-support-email">
            <Mail size={14} aria-hidden="true" />
            <span>tickets@azortix.org</span>
          </a>
        </footer>
      </article>

      {footerActions && <div className="ticket-invite-outer-actions no-print">{footerActions}</div>}
    </main>
  )
}
