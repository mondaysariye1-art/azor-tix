import crypto from 'node:crypto'
import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer') {
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const action = String(form.get('action') || '')
  const text = (name: string) => String(form.get(name) || '').trim()
  const payload = await getPayloadClient()
  const eventId = text('eventId')
  let event: any = null
  if (eventId) {
    event = await payload.findByID({
      collection: 'events',
      id: eventId,
      overrideAccess: false,
      user,
      depth: 0,
    })
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
    await payload.create({
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
    const ticketTypes = await payload.find({
      collection: 'ticket-types',
      overrideAccess: false,
      user,
      where: { event: { equals: event.id } },
      limit: 1,
      depth: 0,
    })
    const ticketType = ticketTypes.docs[0]
    if (!ticketType)
      return Response.json(
        { error: 'Add a ticket category before issuing guest tickets.' },
        { status: 409 },
      )
    const reference = `COMP-${crypto.randomUUID()}`
    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        reference,
        event: event.id,
        customer: {
          firstName: name,
          lastName: 'Guest',
          email,
          phone: text('phone') || '0000000000',
        },
        items: [{ ticketType: ticketType.id, name: 'Complimentary', quantity, unitPrice: 0 }],
        subtotal: 0,
        fees: 0,
        serviceFeePercent: 2,
        serviceFeeAmount: 0,
        commissionPercent: 5,
        commissionAmount: 0,
        organizerEarnings: 0,
        total: 0,
        status: 'paid',
        paidAt: new Date().toISOString(),
      },
    })
    for (let index = 0; index < quantity; index += 1) {
      await payload.create({
        collection: 'tickets',
        overrideAccess: true,
        data: {
          code: crypto.randomUUID(),
          issuanceKey: `${order.id}:guest:${entry.id}:${index}`,
          order: order.id,
          event: event.id,
          ticketType: ticketType.id,
          attendeeName: name,
          attendeeEmail: email,
          attendeePhone: text('phone'),
          source: 'guest-list',
          status: 'valid',
        } as any,
      })
    }
    return Response.json({
      message: `${quantity} complimentary ticket${quantity === 1 ? '' : 's'} issued.`,
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
    return Response.json({ message: 'Announcement saved. Email delivery is currently disabled.' })
  }

  if (action === 'bank') {
    const bankName = text('bankName')
    const bankCode = text('bankCode')
    const accountNumber = text('accountNumber')
    const accountName = text('accountName')
    if (
      bankName.length < 2 ||
      bankCode.length < 2 ||
      accountNumber.length < 10 ||
      accountName.length < 2
    ) {
      return Response.json({ error: 'Enter complete settlement bank details.' }, { status: 400 })
    }
    const existing = await payload.find({
      collection: 'bank-verifications',
      overrideAccess: false,
      user,
      where: { organizer: { equals: user.id } },
      limit: 1,
      depth: 0,
    })
    const data = { bankName, bankCode, accountNumber, accountName, status: 'pending' as const }
    if (existing.docs[0]) {
      await payload.update({
        collection: 'bank-verifications',
        id: existing.docs[0].id,
        overrideAccess: false,
        user,
        data,
      })
    } else {
      await payload.create({
        collection: 'bank-verifications',
        overrideAccess: false,
        user,
        data: { ...data, organizer: user.id },
      })
    }
    return Response.json({ message: 'Bank details submitted for verification.' })
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
