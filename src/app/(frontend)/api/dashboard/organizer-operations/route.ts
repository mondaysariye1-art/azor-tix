import crypto from 'node:crypto'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import { resolveBankAccount } from '@/lib/paystack'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  const form = await request.formData()
  const action = String(form.get('action') || '')
  const text = (name: string) => String(form.get(name) || '').trim()
  const payload = await getPayloadClient()
  const eventId = text('eventId')
  let event: any = null
  if (eventId) {
    event = await payload
      .findByID({
        collection: 'events',
        id: eventId,
        overrideAccess: false,
        user,
        draft: true,
        depth: 0,
      })
      .catch(() => null)
  }

  if (action === 'discount') {
    const code = text('code').toUpperCase()
    const kind = form.get('kind') === 'fixed' ? 'fixed' : 'percentage'
    const value = Number(form.get('value'))
    if (
      !event ||
      code.length < 3 ||
      !Number.isFinite(value) ||
      value <= 0 ||
      (kind === 'percentage' && value > 100)
    ) {
      return Response.json(
        { error: 'Enter a valid event, code, and discount value.' },
        { status: 400 },
      )
    }
    const created = await payload.create({
      collection: 'discounts',
      overrideAccess: false,
      user,
      data: {
        organizer: user.id,
        event: event.id,
        code,
        kind,
        value,
        usageLimit: Number(form.get('usageLimit')) || undefined,
        active: true,
      },
    })
    await logAudit({
      payload,
      action: 'discount.created',
      category: 'event',
      actor: user as any,
      targetCollection: 'discounts',
      targetId: created.id,
      summary: `Created discount code ${code} for "${event.title}".`,
    })
    return Response.json({ message: 'Discount created.' })
  }

  if (action === 'guest') {
    const name = text('name')
    const email = text('email').toLowerCase()
    const quantity = Math.max(1, Math.min(20, Number(form.get('quantity')) || 1))
    if (!event || name.length < 2 || !emailPattern.test(email)) {
      return Response.json(
        { error: 'Enter a valid event, guest name, and email.' },
        { status: 400 },
      )
    }
    const ticketTypes = await payload.find({
      collection: 'ticket-types',
      overrideAccess: false,
      user,
      where: { event: { equals: event.id } },
      limit: 1,
      depth: 0,
    })
    const ticketType = ticketTypes.docs[0] || null

    const entry = await payload.create({
      collection: 'guest-list-entries',
      overrideAccess: false,
      user,
      data: {
        organizer: user.id,
        event: event.id,
        name,
        email,
        phone: text('phone'),
        quantity,
        notes: text('notes'),
        status: 'issued',
      },
    })
    const reference = `COMP-${crypto.randomUUID()}`
    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        reference,
        event: event.id,
        orderKind: 'complimentary',
        purchaseMode: 'self',
        purchaserUser: user.id,
        customer: {
          firstName: name,
          lastName: 'Guest',
          email,
          phone: text('phone') || '0000000000',
        },
        items: [
          {
            ...(ticketType ? { ticketType: ticketType.id } : {}),
            name: 'Complimentary Guest Pass',
            quantity,
            unitPrice: 0,
          },
        ],
        subtotal: 0,
        fees: 0,
        serviceFeePercent: 0,
        serviceFeeAmount: 0,
        commissionPercent: 0,
        commissionAmount: 0,
        organizerEarnings: 0,
        total: 0,
        status: 'paid',
        paidAt: new Date().toISOString(),
      } as any,
    })
    const {
      buildTicketConfirmationEmail,
      getTicketsForOrderDisplay,
      issueUniqueTicket,
      recordTicketEmailDelivery,
    } = await import('@/lib/tickets')
    const issuedIds: string[] = []
    for (let index = 0; index < quantity; index += 1) {
      const issued = await issueUniqueTicket({
        payload,
        issuanceKey: `${order.id}:guest:${entry.id}:${index}`,
        orderId: String(order.id),
        eventId: String(event.id),
        ticketTypeId: ticketType ? String(ticketType.id) : null,
        ticketLabel: 'Complimentary Guest Pass',
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: text('phone'),
        purchaserName: user.name || user.email,
        purchaserEmail: user.email,
        purchaserUserId: String(user.id),
        acquisitionType: 'complimentary',
        source: 'guest-list',
      })
      issuedIds.push(String(issued.ticket.id))
    }
    const ticketRecords = await getTicketsForOrderDisplay(payload, { ...order, event })
    const emailPayload = await buildTicketConfirmationEmail({
      buyerName: name,
      event,
      order,
      tickets: ticketRecords,
      variant: 'private-invitation',
    })
    const emailResult = await sendTransactionalEmail({
      payload,
      to: email,
      subject: emailPayload.subject,
      title: 'Your AZORTIX invitation is confirmed!',
      bodyHtml: emailPayload.html,
      text: emailPayload.text,
      attachments: emailPayload.attachments,
      rawHtml: true,
    })
    await recordTicketEmailDelivery(issuedIds, emailResult, String(order.id))
    await logAudit({
      payload,
      action: 'guest.tickets_issued',
      category: 'ticket',
      actor: user as any,
      targetCollection: 'guest-list-entries',
      targetId: entry.id,
      summary: `Issued ${quantity} complimentary guest-list ticket(s) for "${event.title}" to ${email}.`,
    })
    return Response.json({
      message: `${quantity} complimentary ticket${quantity === 1 ? '' : 's'} issued.`,
      emailStatus: emailResult,
    })
  }

  if (action === 'announcement') {
    const subject = text('subject')
    const message = text('message')
    if (!event || subject.length < 3 || message.length < 10) {
      return Response.json(
        { error: 'Choose an event and enter a subject and message.' },
        { status: 400 },
      )
    }
    const audience = ['all-attendees', 'checked-in', 'not-checked-in'].includes(text('audience'))
      ? (text('audience') as 'all-attendees' | 'checked-in' | 'not-checked-in')
      : 'all-attendees'
    await payload.create({
      collection: 'announcements',
      overrideAccess: false,
      user,
      data: {
        organizer: user.id,
        event: event.id,
        subject,
        message,
        audience,
        deliveryStatus: 'disabled',
      },
    })
    return Response.json({
      message: 'Announcement saved. Outbound bulk announcement broadcasts are queued in drafts.',
    })
  }

  if (action === 'bank') {
    const bankCode = text('bankCode')
    const bankNameInput = text('bankName')
    const accountNumber = text('accountNumber').replace(/\s+/g, '')
    const confirmAccountNumber = (text('confirmAccountNumber') || accountNumber).replace(/\s+/g, '')

    const existing = await payload.find({
      collection: 'bank-verifications',
      overrideAccess: true,
      where: { organizer: { equals: user.id } },
      limit: 1,
      depth: 0,
    })
    const existingBank: any = existing.docs[0]
    if (existingBank?.locked) {
      return Response.json(
        {
          error:
            'Your verified bank account is locked. Submit a Bank Account Change Appeal to request a change (subject to 3-day review).',
        },
        { status: 403 },
      )
    }

    if (accountNumber !== confirmAccountNumber) {
      return Response.json(
        { error: 'Account number and confirmation account number must match.' },
        { status: 400 },
      )
    }

    const resolution = await resolveBankAccount(accountNumber, bankCode)
    if (!resolution.ok) {
      return Response.json({ error: resolution.error }, { status: resolution.status })
    }

    const verifiedAt = new Date().toISOString()
    const bankPayload = {
      organizer: user.id,
      bankName: resolution.bankName || bankNameInput || bankCode,
      bankCode: resolution.bankCode,
      accountNumber: resolution.accountNumber,
      accountName: resolution.accountName,
      locked: true,
      verificationProvider: 'paystack',
      status: 'verified' as const,
      verifiedAt,
    }

    const saved = existingBank
      ? await payload.update({
          collection: 'bank-verifications',
          id: existingBank.id,
          overrideAccess: true,
          data: bankPayload as any,
        })
      : await payload.create({
          collection: 'bank-verifications',
          overrideAccess: true,
          data: bankPayload as any,
        })

    const emailStatus = await sendTransactionalEmail({
      payload,
      to: user.email,
      subject: 'Settlement Bank Account Verified & Locked — AZORTIX',
      title: 'Settlement bank account verified and locked',
      bodyHtml: `<p>Your settlement bank details have been verified via Paystack and locked for security.</p><p><strong>Account Name:</strong> ${bankPayload.accountName}<br/><strong>Bank:</strong> ${bankPayload.bankName}<br/><strong>Account Number:</strong> ${bankPayload.accountNumber}</p><p>Any future changes require submitting a Bank Account Change Appeal with a 3-day review window.</p>`,
      text: `Verified settlement bank account ${bankPayload.accountName} (${bankPayload.bankName} - ${bankPayload.accountNumber}) is now locked.`,
    })

    await logAudit({
      payload,
      action: 'bank.verified_and_locked',
      category: 'bank',
      actor: user as any,
      targetCollection: 'bank-verifications',
      targetId: saved.id,
      summary: `Verified via Paystack and locked bank account (${bankPayload.bankName} · ${bankPayload.accountNumber} · ${bankPayload.accountName}).`,
    })

    return Response.json({
      bank: saved,
      emailStatus,
      message: `Bank account verified (${bankPayload.accountName}) and locked.`,
    })
  }

  if (action === 'collection') {
    const name = text('name')
    const eventIds = form.getAll('events').map(String).filter(Boolean)
    if (name.length < 2)
      return Response.json({ error: 'Enter a collection name.' }, { status: 400 })
    for (const id of eventIds) {
      await payload.findByID({ collection: 'events', id, overrideAccess: false, user, depth: 0 })
    }
    await payload.create({
      collection: 'event-collections',
      overrideAccess: false,
      user,
      data: { organizer: user.id, name, description: text('description'), events: eventIds },
    })
    return Response.json({ message: 'Event collection created.' })
  }

  return Response.json({ error: 'Unknown organizer operation.' }, { status: 400 })
}
