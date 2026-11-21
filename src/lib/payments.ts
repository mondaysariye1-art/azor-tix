import 'server-only'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import { withTransactionLocked } from '@/lib/postgres'
import {
  buildGiftPurchaserConfirmationEmail,
  buildTicketConfirmationEmail,
  getTicketsForOrderDisplay,
  issueUniqueTicket,
  recordTicketEmailDelivery,
  type TicketDisplayRecord,
} from '@/lib/tickets'

export interface GiftRecipientInput {
  assignmentType?: 'self' | 'gift'
  ticketTypeId?: string
  ticketLabel?: string
  recipientName: string
  recipientEmail: string
  giftMessage?: string
}

export async function dispatchOrderTicketEmails(params: {
  payload: any
  order: any
  event: any
  tickets: TicketDisplayRecord[]
  baseUrl?: string
}): Promise<{ purchaserSent: boolean; recipientFailures: number }> {
  const { payload, order, event, tickets, baseUrl } = params
  const purchaserName =
    `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest'
  const purchaserEmail = String(order.customer?.email || '').trim().toLowerCase()

  const giftTickets = tickets.filter((t) => t.acquisitionType === 'gift')
  const selfTickets = tickets.filter((t) => t.acquisitionType !== 'gift')
  const hasGifts = giftTickets.length > 0 || String(order.purchaseMode || 'self') === 'gift'

  // Pure self-purchase (zero gift tickets): send standard confirmation with all buyer QR passes
  if (!hasGifts) {
    const emailPayload = await buildTicketConfirmationEmail({
      buyerName: purchaserName,
      event,
      order,
      tickets,
      baseUrl,
      variant: 'standard',
    })
    const delivery = await sendTransactionalEmail({
      payload,
      to: purchaserEmail,
      subject: emailPayload.subject,
      title: 'Your tickets are ready!',
      bodyHtml: emailPayload.html,
      text: emailPayload.text,
      rawHtml: true,
      attachments: emailPayload.attachments,
    })
    await recordTicketEmailDelivery(
      tickets.map((t) => t.id),
      delivery,
      String(order.id),
    )
    return { purchaserSent: delivery.sent, recipientFailures: delivery.sent ? 0 : tickets.length }
  }

  // Gift-only OR Mixed (self + gift) order:
  // 1) Send individual private gift email (zero price/payment info) to each gift recipient
  let recipientFailures = 0
  for (const ticket of giftTickets) {
    const recipientPayload = await buildTicketConfirmationEmail({
      buyerName: ticket.attendeeName,
      event,
      order,
      tickets: [ticket],
      baseUrl,
      variant: 'gift-recipient',
      senderName: purchaserName,
      personalMessage: ticket.giftMessage || undefined,
    })
    const recDelivery = await sendTransactionalEmail({
      payload,
      to: ticket.attendeeEmail,
      subject: recipientPayload.subject,
      title: "You've received a ticket gift!",
      bodyHtml: recipientPayload.html,
      text: recipientPayload.text,
      rawHtml: true,
      attachments: recipientPayload.attachments,
    })
    await recordTicketEmailDelivery([ticket.id], recDelivery)
    if (!recDelivery.sent) recipientFailures += 1
  }

  // 2) Send ONE confirmation email to the purchaser covering the entire order
  //    (including the buyer's own QR passes if they also bought for themselves + all gift recipients)
  const purchaserPayload = await buildGiftPurchaserConfirmationEmail({
    purchaserName,
    event,
    order,
    tickets,
    selfTickets,
    giftTickets,
    baseUrl,
  })
  const purchaserDelivery = await sendTransactionalEmail({
    payload,
    to: purchaserEmail,
    subject: purchaserPayload.subject,
    title:
      selfTickets.length > 0
        ? 'Your tickets & gift order are confirmed!'
        : 'Your gift purchase is confirmed!',
    bodyHtml: purchaserPayload.html,
    text: purchaserPayload.text,
    rawHtml: true,
    attachments: purchaserPayload.attachments,
  })
  await recordTicketEmailDelivery(
    selfTickets.map((t) => t.id),
    purchaserDelivery,
    String(order.id),
  )

  return { purchaserSent: purchaserDelivery.sent, recipientFailures }
}

export async function finalizePaystackPayment(
  data: Record<string, any>,
  options?: { baseUrl?: string },
) {
  const reference = String(data.reference || '').trim()
  if (!reference) throw new Error('Missing payment reference.')

  return withTransactionLocked(`finalize:${reference}`, async () => {
    const payload = await getPayloadClient()
    const transactionResult = await payload.find({
      collection: 'transactions',
      overrideAccess: true,
      where: { providerReference: { equals: reference } },
      limit: 1,
      depth: 1,
    })
    const transaction = transactionResult.docs[0]
    if (!transaction) throw new Error('Transaction not found.')

    const orderID =
      typeof transaction.order === 'object' ? transaction.order.id : transaction.order
    const order: any = await payload.findByID({
      collection: 'orders',
      overrideAccess: true,
      id: orderID,
      depth: 2,
    })
    if (order.status === 'paid') return order
    if (order.status === 'refunded' || order.status === 'cancelled') {
      throw new Error(`Order is ${order.status} and cannot be fulfilled.`)
    }
    if (
      data.status !== 'success' ||
      data.currency !== 'NGN' ||
      Number(data.amount) !== Math.round(Number(transaction.amount) * 100)
    ) {
      throw new Error('Paystack verification did not match the order.')
    }

    const isFreeOrder = order.orderKind === 'free' || Number(order.total) === 0
    const purchaseMode = String(order.purchaseMode || 'self')
    const assignments: GiftRecipientInput[] = Array.isArray(order.giftRecipients)
      ? order.giftRecipients
      : []
    const eventId = typeof order.event === 'object' ? order.event.id : order.event
    const purchaserName = `${order.customer.firstName} ${order.customer.lastName}`.trim()
    const purchaserEmail = String(order.customer.email || '').trim().toLowerCase()
    const purchaserUserId =
      typeof order.purchaserUser === 'object' ? order.purchaserUser?.id : order.purchaserUser

    let issuedCount = 0
    let globalTicketIdx = 0

    for (const item of order.items || []) {
      const ticketTypeObj = typeof item.ticketType === 'object' ? item.ticketType : null
      const ticketTypeID = ticketTypeObj ? ticketTypeObj.id : item.ticketType
      const peopleCovered =
        ticketTypeObj?.ticketMode === 'group' && Number(ticketTypeObj?.groupSize) > 1
          ? Number(ticketTypeObj.groupSize)
          : 1

      for (let index = 0; index < item.quantity; index += 1) {
        const slot = assignments[globalTicketIdx] || (purchaseMode === 'gift' ? assignments[0] : null)
        const isGiftSlot =
          slot?.assignmentType === 'gift' ||
          (!slot?.assignmentType && purchaseMode === 'gift' && Boolean(slot?.recipientEmail))

        const holderName = isGiftSlot
          ? slot?.recipientName?.trim() || purchaserName
          : purchaserName
        const holderEmail = isGiftSlot
          ? (slot?.recipientEmail || purchaserEmail).trim().toLowerCase()
          : purchaserEmail
        const giftMsg = isGiftSlot ? slot?.giftMessage?.trim() || undefined : undefined

        const issuanceKey = `${order.id}:${ticketTypeID || 'pass'}:${globalTicketIdx}`
        await issueUniqueTicket({
          payload,
          issuanceKey,
          orderId: String(order.id),
          eventId: String(eventId),
          ticketTypeId: ticketTypeID ? String(ticketTypeID) : null,
          ticketLabel: String(item.name || ticketTypeObj?.name || 'Standard Pass'),
          attendeeName: holderName,
          attendeeEmail: holderEmail,
          attendeePhone: isGiftSlot ? '' : order.customer.phone,
          acquisitionType: isGiftSlot
            ? 'gift'
            : isFreeOrder
              ? 'public-free'
              : 'self-purchase',
          purchaserName,
          purchaserEmail,
          purchaserUserId: purchaserUserId ? String(purchaserUserId) : null,
          giftMessage: giftMsg,
          peopleCovered,
          source: isFreeOrder ? 'free-registration' : 'purchase',
        })
        issuedCount += 1
        globalTicketIdx += 1
      }
    }

    const paidAt = new Date().toISOString()
    const updated = await payload.update({
      collection: 'orders',
      overrideAccess: true,
      id: order.id,
      data: { status: 'paid', paidAt },
    })
    await payload.update({
      collection: 'transactions',
      overrideAccess: true,
      id: transaction.id,
      data: { status: 'success', verifiedAt: paidAt },
    })
    if (order.discountCode) {
      const discounts = await payload.find({
        collection: 'discounts',
        overrideAccess: true,
        where: {
          and: [
            { event: { equals: eventId } },
            { code: { equals: order.discountCode } },
          ],
        },
        limit: 1,
        depth: 0,
      })
      const discount = discounts.docs[0]
      if (discount) {
        await payload.update({
          collection: 'discounts',
          overrideAccess: true,
          id: discount.id,
          data: { usedCount: Number(discount.usedCount || 0) + 1 },
        })
      }
    }

    const eventTitle =
      typeof order.event === 'object' && order.event?.title
        ? order.event.title
        : 'AZORTIX Event'

    const ticketRecords = await getTicketsForOrderDisplay(payload, order, options?.baseUrl)
    await dispatchOrderTicketEmails({
      payload,
      order,
      event: typeof order.event === 'object' ? order.event : null,
      tickets: ticketRecords,
      baseUrl: options?.baseUrl,
    })

    await logAudit({
      payload,
      action:
        purchaseMode === 'mixed'
          ? 'ticket.mixed_order'
          : purchaseMode === 'gift'
            ? 'ticket.gift_order'
            : isFreeOrder
              ? 'ticket.free_registration'
              : 'ticket.paid_order',
      category: 'ticket',
      actor: { email: purchaserEmail, role: 'attendee' },
      targetCollection: 'orders',
      targetId: order.id,
      summary: `${purchaseMode === 'mixed' ? 'Mixed self & gift order' : purchaseMode === 'gift' ? 'Gift order' : isFreeOrder ? 'Free registration' : 'Paid order'} ${order.reference} completed (${issuedCount} ticket(s)) for "${eventTitle}".`,
    })

    return updated
  })
}
