'use client'

import { Check, Download, Printer, Share2 } from 'lucide-react'
import { useState } from 'react'

interface TicketActionsProps {
  sharePath: string
  pdfDownloadPath: string
  eventName: string
  attendeeName: string
  ticketCode: string
  compact?: boolean
}

export function TicketActions({
  sharePath,
  pdfDownloadPath,
  eventName,
  attendeeName,
  ticketCode,
  compact = false,
}: TicketActionsProps) {
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle')

  const handleShare = async () => {
    const fullUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : sharePath

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${eventName} — AZORTIX Ticket`,
          text: `Digital admission pass for ${attendeeName} (${ticketCode}) — ${eventName}`,
          url: fullUrl,
        })
        setShareState('shared')
        window.setTimeout(() => setShareState('idle'), 2600)
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl)
        setShareState('copied')
        window.setTimeout(() => setShareState('idle'), 2600)
      }
    } catch {
      // Clipboard blocked in restricted iframe; fail silently without window.alert
    }
  }

  return (
    <div className={`ticket-invite-actions${compact ? ' compact' : ''} no-print`}>
      <button type="button" className="ticket-btn ticket-btn-primary" onClick={handleShare}>
        {shareState === 'idle' ? <Share2 size={15} /> : <Check size={15} />}
        <span>
          {shareState === 'copied'
            ? 'Ticket link copied'
            : shareState === 'shared'
              ? 'Ticket shared'
              : 'Share ticket'}
        </span>
      </button>

      <a
        href={pdfDownloadPath}
        download={`AZORTIX-${ticketCode}.pdf`}
        className="ticket-btn ticket-btn-outline"
      >
        <Download size={15} />
        <span>Download PDF</span>
      </a>

      {!compact && (
        <button
          type="button"
          className="ticket-btn ticket-btn-ghost"
          onClick={() => window.print()}
        >
          <Printer size={15} />
          <span>Print</span>
        </button>
      )}
    </div>
  )
}
