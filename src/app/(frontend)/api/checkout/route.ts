import crypto from 'node:crypto'
import { getCurrentAppUser } from '@/lib/app-auth'
import { calculateOrderAmounts } from '@/lib/fees'
import { dispatchOrderTicketEmails, type GiftRecipientInput } from '@/lib/payments'
import { getPayloadClient } from '@/lib/payload'
import {
  getPaystackConfigStatus,
  initializePaystackTransaction,
  resolvePublicOrigin,
} from '@/lib/paystack'
import { withTransactionLocked } from '@/lib/postgres'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9 ]{10,16}$/

interface RequestedLineItem {
  ticketTypeId: string
  quantity: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const eventSlug = typeof body.eventSlug === 'string' ? body.eventSlug.trim() : ''
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

    // Support both new multi-category `items: [{ ticketTypeId, quantity }]` and legacy `{ ticketTypeId, quantity }`
    const requestedItemsMap = new Map<string, number>()
    if (Array.isArray(body.items) && body.items.length > 0) {
      for (const rawItem of body.items.slice(0, 20)) {
        const id =
          typeof rawItem?.ticketTypeId === 'string' || typeof rawItem?.ticketTypeId === 'number'
            ? String(rawItem.ticketTypeId).trim()
            : ''
        const qty = Number(rawItem?.quantity)
        if (!id || !Number.isInteger(qty) || qty < 0 || qty > 20) {
          return Response.json({ error: 'Enter valid ticket quantities.' }, { status: 400 })
        }
        if (qty > 0) {
          requestedItemsMap.set(id, (requestedItemsMap.get(id) || 0) + qty)
        }
      }
    } else if (body.ticketTypeId !== undefined) {
      const id =
        typeof body.ticketTypeId === 'string' || typeof body.ticketTypeId === 'number'
          ? String(body.ticketTypeId).trim()
          : ''
      const qty = Number(body.quantity)
      if (id && Number.isInteger(qty) && qty >= 1 && qty <= 20) {
        requestedItemsMap.set(id, qty)
      }
    }

    const requestedItems: RequestedLineItem[] = Array.from(requestedItemsMap.entries()).map(
      ([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }),
    )
    const totalQuantity = requestedItems.reduce((sum, item) => sum + item.quantity, 0)

    if (
      !eventSlug ||
      requestedItems.length === 0 ||
      totalQuantity < 1 ||
      totalQuantity > 20 ||
      firstName.length < 2 ||
      lastName.length < 2 ||
      !emailPattern.test(email) ||
      !phonePattern.test(phone)
    ) {
      return Response.json(
        { error: 'Enter valid buyer details and select at least one ticket (max 20 per order).' },
        { status: 400 },
      )
    }

    const purchaserFullName = `${firstName} ${lastName}`.trim()

    // Parse per-ticket assignments (`ticketAssignments` supports mixed self + gift in one order; falls back to legacy `purchaseMode` + `giftRecipients`)
    const normalizedAssignments: GiftRecipientInput[] = []
    if (Array.isArray(body.ticketAssignments) && body.ticketAssignments.length > 0) {
      if (body.ticketAssignments.length !== totalQuantity) {
        return Response.json(
          {
            error: `Assign each of your ${totalQuantity} ticket${totalQuantity === 1 ? '' : 's'} to yourself or a gift recipient before continuing.`,
          },
          { status: 400 },
        )
      }

      for (let i = 0; i < body.ticketAssignments.length; i += 1) {
        const entry = body.ticketAssignments[i] || {}
        const assignmentType = entry.assignmentType === 'gift' ? 'gift' : 'self'
        const slotTicketTypeId =
          typeof entry.ticketTypeId === 'string' || typeof entry.ticketTypeId === 'number'
            ? String(entry.ticketTypeId).trim()
            : undefined

        if (assignmentType === 'gift') {
          const recipientName = String(entry.recipientName || '').trim()
          const recipientEmail = String(entry.recipientEmail || '')
            .trim()
            .toLowerCase()
          const giftMessage = String(entry.giftMessage || '')
            .trim()
            .slice(0, 400)

          if (recipientName.length < 2 || !emailPattern.test(recipientEmail)) {
            return Response.json(
              {
                error: `Ticket #${i + 1} (Gift) requires a valid recipient full name and email address.`,
              },
              { status: 400 },
            )
          }
          normalizedAssignments.push({
            assignmentType: 'gift',
            ...(slotTicketTypeId ? { ticketTypeId: slotTicketTypeId } : {}),
            recipientName,
            recipientEmail,
            ...(giftMessage ? { giftMessage } : {}),
          })
        } else {
          normalizedAssignments.push({
            assignmentType: 'self',
            ...(slotTicketTypeId ? { ticketTypeId: slotTicketTypeId } : {}),
            recipientName: purchaserFullName,
            recipientEmail: email,
          })
        }
      }
    } else if (body.purchaseMode === 'gift') {
      const rawRecipients = Array.isArray(body.giftRecipients) ? body.giftRecipients : []
      if (rawRecipients.length !== totalQuantity) {
        return Response.json(
          {
            error: `Enter recipient name and email for each of the ${totalQuantity} gift ticket${totalQuantity === 1 ? '' : 's'}.`,
          },
          { status: 400 },
        )
      }
      for (let i = 0; i < rawRecipients.length; i += 1) {
        const entry = rawRecipients[i] || {}
        const recipientName = String(entry.recipientName || '').trim()
        const recipientEmail = String(entry.recipientEmail || '')
          .trim()
          .toLowerCase()
        const giftMessage = String(entry.giftMessage || '')
          .trim()
          .slice(0, 400)
        if (recipientName.length < 2 || !emailPattern.test(recipientEmail)) {
          return Response.json(
            {
              error: `Gift recipient #${i + 1} requires a valid full name and email address.`,
            },
            { status: 400 },
          )
        }
        normalizedAssignments.push({
          assignmentType: 'gift',
          recipientName,
          recipientEmail,
          ...(giftMessage ? { giftMessage } : {}),
        })
      }
    } else {
      for (let i = 0; i < totalQuantity; i += 1) {
        normalizedAssignments.push({
          assignmentType: 'self',
          recipientName: purchaserFullName,
          recipientEmail: email,
        })
      }
    }

    const selfCount = normalizedAssignments.filter((a) => a.assignmentType === 'self').length
    const giftCount = normalizedAssignments.filter((a) => a.assignmentType === 'gift').length
    const purchaseMode: 'self' | 'gift' | 'mixed' =
      giftCount === 0 ? 'self' : selfCount === 0 ? 'gift' : 'mixed'

    const [payload, currentUser] = await Promise.all([
      getPayloadClient(),
      getCurrentAppUser().catch(() => null),
    ])

    const settings: any = await payload
      .findGlobal({ slug: 'platform-settings', overrideAccess: true })
      .catch(() => null)
    if (settings?.salesEnabled === false) {
      return Response.json(
        { error: 'Ticket sales are temporarily paused by AZORTIX administration.' },
        { status: 403 },
      )
    }

    const events = await payload.find({
      collection: 'events',
      overrideAccess: false,
      where: {
        and: [
          { slug: { equals: eventSlug } },
          { _status: { equals: 'published' } },
          { reviewStatus: { equals: 'approved' } },
        ],
      },
      limit: 1,
      depth: 0,
    })
    const event = events.docs[0]
    if (!event) return Response.json({ error: 'This event is not on sale.' }, { status: 404 })
    if (event.reviewStatus === 'cancelled') {
      return Response.json({ error: 'This event has been cancelled.' }, { status: 409 })
    }

    const lockedResult = await withTransactionLocked(`checkout:${event.id}`, async () => {
      const now = Date.now()
      if (
        (event.salesOpenAt && new Date(event.salesOpenAt).valueOf() > now) ||
        (event.salesCloseAt && new Date(event.salesCloseAt).valueOf() < now)
      ) {
        return {
          ok: false as const,
          status: 409,
          error: 'Ticket sales are not currently open for this event.',
        }
      }

      const resolvedLines: Array<{
        ticketType: any
        quantity: number
        isFree: boolean
      }> = []

      let requestedFreeQuantity = 0

      for (const reqItem of requestedItems) {
        const ticketType: any = await payload
          .findByID({
            collection: 'ticket-types',
            overrideAccess: false,
            id: reqItem.ticketTypeId,
            depth: 0,
          })
          .catch(() => null)

        if (
          !ticketType ||
          !ticketType.active ||
          String(typeof ticketType.event === 'object' ? ticketType.event.id : ticketType.event) !==
            String(event.id) ||
          reqItem.quantity > Number(ticketType.maxPerOrder || 8) ||
          reqItem.quantity < Number(ticketType.minPerOrder || 1) ||
          ticketType.visibility === 'invite-only' ||
          ticketType.salesStatus === 'paused' ||
          ticketType.salesStatus === 'sold-out'
        ) {
          return {
            ok: false as const,
            status: 409,
            error: ticketType?.name
              ? `"${ticketType.name}" is unavailable for the selected quantity.`
              : 'One of your selected ticket categories is unavailable.',
          }
        }

        if (
          (ticketType.salesOpenAt && new Date(ticketType.salesOpenAt).valueOf() > now) ||
          (ticketType.salesCloseAt && new Date(ticketType.salesCloseAt).valueOf() < now)
        ) {
          return {
            ok: false as const,
            status: 409,
            error: `Ticket sales are not open for "${ticketType.name}".`,
          }
        }

        const issued = await payload.count({
          collection: 'tickets',
          overrideAccess: true,
          where: {
            and: [
              { ticketType: { equals: ticketType.id } },
              { status: { not_in: ['refunded', 'void', 'cancelled'] } },
            ],
          },
        })
        if (issued.totalDocs + reqItem.quantity > Number(ticketType.quantity || 0)) {
          return {
            ok: false as const,
            status: 409,
            error: `Not enough "${ticketType.name}" tickets left for this order.`,
          }
        }

        const isFree = ticketType.ticketKind === 'free' || Number(ticketType.price) === 0
        if (isFree) requestedFreeQuantity += reqItem.quantity
        resolvedLines.push({ ticketType, quantity: reqItem.quantity, isFree })
      }

      if (requestedFreeQuantity > 0) {
        const allFreeTypes = await payload.find({
          collection: 'ticket-types',
          overrideAccess: true,
          where: {
            and: [
              { event: { equals: event.id } },
              {
                or: [{ ticketKind: { equals: 'free' } }, { price: { equals: 0 } }],
              },
            ],
          },
          limit: 100,
          depth: 0,
        })
        const freeTypeIds = allFreeTypes.docs.map((t: any) => t.id)
        const issuedFreeCount = freeTypeIds.length
          ? await payload.count({
              collection: 'tickets',
              overrideAccess: true,
              where: {
                and: [
                  { ticketType: { in: freeTypeIds } },
                  { status: { not_in: ['refunded', 'void', 'cancelled'] } },
                ],
              },
            })
          : { totalDocs: 0 }
        if (issuedFreeCount.totalDocs + requestedFreeQuantity > 10) {
          return {
            ok: false as const,
            status: 409,
            error: 'This event has reached the maximum of 10 public free tickets.',
          }
        }
      }

      // Align each assignment slot with its exact ticket category so order records are unambiguous
      const expandedLineSlots: Array<{ ticketType: any; slotIndexInLine: number }> = []
      for (const line of resolvedLines) {
        for (let i = 0; i < line.quantity; i += 1) {
          expandedLineSlots.push({ ticketType: line.ticketType, slotIndexInLine: i })
        }
      }

      const alignedAssignments: GiftRecipientInput[] = expandedLineSlots.map((slot, idx) => {
        const rawSlot = normalizedAssignments[idx]
        return {
          ...rawSlot,
          ticketTypeId: String(slot.ticketType.id),
          ticketLabel: String(slot.ticketType.name),
        }
      })

      const grossSubtotal = resolvedLines.reduce(
        (sum, line) => sum + Number(line.ticketType.price || 0) * line.quantity,
        0,
      )

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
          return {
            ok: false as const,
            status: 400,
            error: 'That discount code is invalid or expired.',
          }
        }
        discountAmount =
          discount.kind === 'percentage'
            ? Math.round((grossSubtotal * Math.min(Number(discount.value), 100)) / 100)
            : Math.min(grossSubtotal, Number(discount.value))
      }

      const amounts = calculateOrderAmounts(grossSubtotal, discountAmount)
      if (amounts.total > 0) {
        const paystackStatus = getPaystackConfigStatus()
        if (!paystackStatus.configured) {
          return {
            ok: false as const,
            status: 503,
            error:
              'Paystack payments are not configured yet. Add PAYSTACK_SECRET_KEY to server environment variables to enable paid ticket sales.',
          }
        }
        if (!paystackStatus.validFormat) {
          return {
            ok: false as const,
            status: 503,
            error:
              'PAYSTACK_SECRET_KEY is misconfigured on the server (expected a Paystack secret key starting with sk_test_ or sk_live_).',
          }
        }
      }

      // Clean alphanumeric Paystack-safe reference (<= 100 chars, no spaces/special symbols)
      const reference = `AZT-${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`

      const order: any = await payload.create({
        collection: 'orders',
        overrideAccess: true,
        data: {
          reference,
          event: event.id,
          orderKind: amounts.total === 0 ? 'free' : 'paid',
          purchaseMode,
          ...(currentUser?.id ? { purchaserUser: currentUser.id } : {}),
          ...(purchaseMode !== 'self' ? { giftRecipients: alignedAssignments } : {}),
          customer: { firstName, lastName, email, phone },
          items: resolvedLines.map((line) => ({
            ticketType: line.ticketType.id,
            name: line.ticketType.name,
            quantity: line.quantity,
            unitPrice: Number(line.ticketType.price || 0),
          })),
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
          emailDeliveryStatus: 'pending',
          emailAttempts: 0,
          status: 'pending',
        } as any,
      })

      if (amounts.total === 0) {
        await payload.create({
          collection: 'transactions',
          overrideAccess: true,
          data: {
            order: order.id,
            event: event.id,
            provider: 'paystack',
            providerReference: reference,
            amount: 0,
            currency: 'NGN',
            status: 'success',
            verifiedAt: new Date().toISOString(),
          },
        })

        const { issueUniqueTicket } = await import('@/lib/tickets')
        const issuedTickets: Array<{ code: string; name: string }> = []

        for (let idx = 0; idx < expandedLineSlots.length; idx += 1) {
          const { ticketType } = expandedLineSlots[idx]
          const slotAssignment = alignedAssignments[idx]
          const isGiftSlot = slotAssignment?.assignmentType === 'gift'
          const holderName = isGiftSlot ? slotAssignment.recipientName : purchaserFullName
          const holderEmail = isGiftSlot ? slotAssignment.recipientEmail : email
          const peopleCovered =
            ticketType.ticketMode === 'group' && Number(ticketType.groupSize) > 1
              ? Number(ticketType.groupSize)
              : 1
          const issuanceKey = `${order.id}:${ticketType.id}:${idx}`
          const issuedItem = await issueUniqueTicket({
            payload,
            issuanceKey,
            orderId: String(order.id),
            eventId: String(event.id),
            ticketTypeId: String(ticketType.id),
            ticketLabel: String(ticketType.name),
            attendeeName: holderName,
            attendeeEmail: holderEmail,
            attendeePhone: isGiftSlot ? '' : phone,
            acquisitionType: isGiftSlot ? 'gift' : 'public-free',
            purchaserName: purchaserFullName,
            purchaserEmail: email,
            purchaserUserId: currentUser?.id ? String(currentUser.id) : null,
            giftMessage: isGiftSlot ? slotAssignment.giftMessage : undefined,
            peopleCovered,
            source: 'free-registration',
          })
          issuedTickets.push({ code: String(issuedItem.ticket.code), name: ticketType.name })
        }

        await payload.update({
          collection: 'orders',
          overrideAccess: true,
          id: order.id,
          data: { status: 'paid', paidAt: new Date().toISOString() },
        })

        return {
          ok: true as const,
          isFree: true as const,
          reference,
          orderId: order.id,
          order,
          issuedTickets,
        }
      }

      const transaction: any = await payload.create({
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

      return {
        ok: true as const,
        isFree: false as const,
        reference,
        orderId: order.id,
        transactionId: transaction.id,
        total: amounts.total,
      }
    })

    if (!lockedResult.ok) {
      return Response.json({ error: lockedResult.error }, { status: lockedResult.status })
    }

    const requestOrigin = resolvePublicOrigin(request)

    if (lockedResult.isFree) {
      const { logAudit } = await import('@/lib/audit')
      const { getTicketsForOrderDisplay } = await import('@/lib/tickets')
      const ticketRecords = await getTicketsForOrderDisplay(
        payload,
        { ...lockedResult.order, event },
        requestOrigin,
      )
      await dispatchOrderTicketEmails({
        payload,
        order: lockedResult.order,
        event,
        tickets: ticketRecords,
        baseUrl: requestOrigin,
      })
      await logAudit({
        payload,
        action:
          purchaseMode === 'gift'
            ? 'ticket.gift_free_registration'
            : purchaseMode === 'mixed'
              ? 'ticket.mixed_free_registration'
              : 'ticket.free_registration',
        category: 'ticket',
        actor: { email, role: 'attendee' },
        targetCollection: 'orders',
        targetId: lockedResult.orderId,
        summary: `${purchaseMode === 'mixed' ? 'Mixed self & gift free registration' : purchaseMode === 'gift' ? 'Free gift registration' : 'Free registration'} ${lockedResult.reference} completed (${lockedResult.issuedTickets.length} ticket(s)) for "${event.title}".`,
      })
      return Response.json({
        authorizationURL: `/confirmation/${encodeURIComponent(lockedResult.reference)}`,
      })
    }

    const callbackUrl = `${requestOrigin}/api/paystack/verify?reference=${encodeURIComponent(lockedResult.reference)}`
    const initResult = await initializePaystackTransaction({
      email,
      amountNaira: lockedResult.total,
      reference: lockedResult.reference,
      callbackUrl,
      metadata: {
        orderId: String(lockedResult.orderId),
        eventId: String(event.id),
        purchaseMode,
        selfTickets: selfCount,
        giftTickets: giftCount,
      },
    })

    if (!initResult.ok) {
      await Promise.all([
        payload
          .update({
            collection: 'orders',
            overrideAccess: true,
            id: lockedResult.orderId,
            data: { status: 'failed' },
          })
          .catch(() => {}),
        payload
          .update({
            collection: 'transactions',
            overrideAccess: true,
            id: lockedResult.transactionId,
            data: {
              status: 'failed',
              providerPayload: { error: initResult.error, providerMessage: initResult.providerMessage },
            } as any,
          })
          .catch(() => {}),
      ])
      return Response.json({ error: initResult.error }, { status: initResult.status })
    }

    return Response.json({
      authorizationURL: initResult.authorizationUrl,
      reference: initResult.reference,
    })
  } catch (error) {
    console.error('[checkout] unexpected error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Checkout could not be started.' },
      { status: 400 },
    )
  }
}
