import crypto from 'node:crypto'
import { getPayloadClient } from '@/lib/payload'
import { calculateOrderAmounts } from '@/lib/fees'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9 ]{10,16}$/

export async function POST(request: Request) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return Response.json(
      { error: 'Paystack is not configured yet. Add PAYSTACK_SECRET_KEY to enable sales.' },
      { status: 503 },
    )
  }
  try {
    const body = await request.json()
    const eventSlug = typeof body.eventSlug === 'string' ? body.eventSlug : ''
    const ticketTypeId =
      typeof body.ticketTypeId === 'string' || typeof body.ticketTypeId === 'number'
        ? body.ticketTypeId
        : ''
    const quantity = Number(body.quantity)
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const discountCode =
      typeof body.discountCode === 'string' ? body.discountCode.trim().toUpperCase() : ''
    const attendeeAnswers = Array.isArray(body.attendeeAnswers)
      ? body.attendeeAnswers
          .slice(0, 20)
          .map((item: any) => ({
            question: typeof item.question === 'string' ? item.question.trim().slice(0, 180) : '',
            answer: typeof item.answer === 'string' ? item.answer.trim().slice(0, 1000) : '',
          }))
          .filter((item: any) => item.question && item.answer)
      : []
    if (
      !eventSlug ||
      !ticketTypeId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 8 ||
      firstName.length < 2 ||
      lastName.length < 2 ||
      !emailPattern.test(email) ||
      !phonePattern.test(phone)
    ) {
      return Response.json({ error: 'Enter valid customer and ticket details.' }, { status: 400 })
    }

    const payload = await getPayloadClient()
    const events = await payload.find({
      collection: 'events',
      overrideAccess: false,
      where: { and: [{ slug: { equals: eventSlug } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 0,
    })
    const event = events.docs[0]
    if (!event) return Response.json({ error: 'This event is not on sale.' }, { status: 404 })
    const ticketType = await payload.findByID({
      collection: 'ticket-types',
      overrideAccess: false,
      id: ticketTypeId,
      depth: 0,
    })
    if (
      !ticketType.active ||
      String(ticketType.event) !== String(event.id) ||
      quantity > ticketType.maxPerOrder ||
      quantity < Number(ticketType.minPerOrder || 1) ||
      ticketType.visibility === 'invite-only' ||
      ticketType.salesStatus === 'paused' ||
      ticketType.salesStatus === 'sold-out'
    ) {
      return Response.json({ error: 'This ticket selection is unavailable.' }, { status: 409 })
    }
    const now = Date.now()
    if (
      (ticketType.salesOpenAt && new Date(ticketType.salesOpenAt).valueOf() > now) ||
      (ticketType.salesCloseAt && new Date(ticketType.salesCloseAt).valueOf() < now) ||
      (event.salesOpenAt && new Date(event.salesOpenAt).valueOf() > now) ||
      (event.salesCloseAt && new Date(event.salesCloseAt).valueOf() < now)
    ) {
      return Response.json(
        { error: 'Ticket sales are not open for this category.' },
        { status: 409 },
      )
    }
    const issued = await payload.count({
      collection: 'tickets',
      overrideAccess: true,
      where: { ticketType: { equals: ticketType.id } },
    })
    if (issued.totalDocs + quantity > ticketType.quantity) {
      return Response.json(
        { error: 'There are not enough tickets left for this order.' },
        { status: 409 },
      )
    }

    const grossSubtotal = Number(ticketType.price) * quantity
    let discountAmount = 0
    if (discountCode) {
      const discounts = await payload.find({
        collection: 'discounts',
        overrideAccess: true,
        where: {
          and: [
            { event: { equals: event.id } },
            { code: { equals: discountCode } },
            { active: { equals: true } },
          ],
        },
        limit: 1,
        depth: 0,
      })
      const discount = discounts.docs[0]
      if (
        !discount ||
        (discount.startsAt && new Date(discount.startsAt).valueOf() > now) ||
        (discount.endsAt && new Date(discount.endsAt).valueOf() < now) ||
        (discount.usageLimit && Number(discount.usedCount || 0) >= discount.usageLimit)
      ) {
        return Response.json(
          { error: 'That discount code is invalid or expired.' },
          { status: 400 },
        )
      }
      discountAmount =
        discount.kind === 'percentage'
          ? Math.round((grossSubtotal * Math.min(Number(discount.value), 100)) / 100)
          : Math.min(grossSubtotal, Number(discount.value))
    }
    const amounts = calculateOrderAmounts(grossSubtotal, discountAmount)
    const reference = `AZT-${crypto.randomUUID()}`
    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        reference,
        event: event.id,
        customer: { firstName, lastName, email, phone },
        items: [
          {
            ticketType: ticketType.id,
            name: ticketType.name,
            quantity,
            unitPrice: ticketType.price,
          },
        ],
        subtotal: amounts.subtotal,
        fees: amounts.serviceFeeAmount,
        serviceFeePercent: amounts.serviceFeePercent,
        serviceFeeAmount: amounts.serviceFeeAmount,
        commissionPercent: amounts.commissionPercent,
        commissionAmount: amounts.commissionAmount,
        organizerEarnings: amounts.organizerEarnings,
        discountCode: discountCode || undefined,
        discountAmount,
        attendeeAnswers,
        total: amounts.total,
        status: 'pending',
      },
    })
    await payload.create({
      collection: 'transactions',
      overrideAccess: true,
      data: {
        order: order.id,
        event: event.id,
        provider: 'paystack',
        providerReference: reference,
        amount: amounts.total,
        currency: 'NGN',
        status: 'initialized',
      },
    })

    const callbackURL = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/paystack/verify?reference=${encodeURIComponent(reference)}`
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amounts.total * 100),
        currency: 'NGN',
        reference,
        callback_url: callbackURL,
        metadata: { orderId: order.id, eventId: event.id },
      }),
    })
    const result = await paystackResponse.json()
    if (!paystackResponse.ok || !result.status || !result.data?.authorization_url) {
      await payload.update({
        collection: 'orders',
        overrideAccess: true,
        id: order.id,
        data: { status: 'failed' },
      })
      throw new Error('Paystack initialization failed.')
    }
    return Response.json({ authorizationURL: result.data.authorization_url })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Checkout could not be started.' },
      { status: 400 },
    )
  }
}
