import crypto from 'node:crypto'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import { withTransactionLocked } from '@/lib/postgres'
import {
  buildTicketConfirmationEmail,
  getTicketsForOrderDisplay,
  issueUniqueTicket,
  recordTicketEmailDelivery,
} from '@/lib/tickets'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, any> | null
    if (!body) {
      return Response.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const rawCode = String(body.code || '').trim()
    const firstName = String(body.firstName || '').trim()
    const lastName = String(body.lastName || '').trim()
    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    const phone = String(body.phone || '').trim()

    if (!rawCode) {
      return Response.json({ error: 'Missing private invitation code.' }, { status: 400 })
    }
    if (
      firstName.length < 2 ||
      lastName.length < 2 ||
      !emailPattern.test(email) ||
      phone.length < 10
    ) {
      return Response.json(
        { error: 'Enter your first name, last name, valid email address, and phone number.' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()
    const settings: any = await payload
      .findGlobal({ slug: 'platform-settings', overrideAccess: true })
      .catch(() => null)
    if (settings?.salesEnabled === false) {
      return Response.json(
        { error: 'Ticket registrations are temporarily paused by AZORTIX administration.' },
        { status: 403 },
      )
    }

    // Match exact code (new case-sensitive base64url INV-... tokens) or legacy uppercase FREE-... codes
    const initialLookup = await payload.find({
      collection: 'free-ticket-links' as any,
      overrideAccess: true,
      where: {
        or: [{ code: { equals: rawCode } }, { code: { equals: rawCode.toUpperCase() } }],
      },
      limit: 1,
      depth: 0,
    })
    const initialLink: any = initialLookup.docs[0]
    if (!initialLink) {
      return Response.json(
        { error: 'This private invitation link is invalid or does not exist.' },
        { status: 404 },
      )
    }

    const claimResult = await withTransactionLocked(`private-invite:${initialLink.id}`, async () => {
      const link: any = await payload
        .findByID({
          collection: 'free-ticket-links' as any,
          id: initialLink.id,
          overrideAccess: true,
          depth: 0,
        })
        .catch(() => null)

      if (!link) {
        return {
          ok: false as const,
          status: 404,
          error: 'This private invitation link does not exist.',
        }
      }
      if (link.status === 'revoked') {
        return {
          ok: false as const,
          status: 409,
          error: 'This private invitation link has been revoked by the organizer.',
        }
      }
      if (
        link.status === 'expired' ||
        (link.expiresAt && new Date(link.expiresAt).valueOf() <= Date.now())
      ) {
        if (link.status !== 'expired') {
          await payload.update({
            collection: 'free-ticket-links' as any,
            id: link.id,
            overrideAccess: true,
            data: { status: 'expired' },
          })
        }
        return {
          ok: false as const,
          status: 410,
          error: 'This private invitation link has expired.',
        }
      }

      const maxClaims = Math.max(1, Number(link.maxClaims || 1))
      const existingClaims = Array.isArray(link.claims) ? link.claims : []
      const claimedCount = Math.max(Number(link.claimedCount || 0), existingClaims.length)

      if (link.status === 'claimed' || link.status === 'exhausted' || claimedCount >= maxClaims) {
        return {
          ok: false as const,
          status: 409,
          error:
            maxClaims === 1
              ? 'This private invitation has already been claimed.'
              : `This shareable invitation has reached its limit of ${maxClaims} claims.`,
        }
      }

      // Enforce individual email lock when invitationType === 'individual' and recipientEmail is set
      const invType = link.invitationType === 'shareable' ? 'shareable' : 'individual'
      if (
        invType === 'individual' &&
        link.recipientEmail &&
        String(link.recipientEmail).trim().toLowerCase() !== email
      ) {
        return {
          ok: false as const,
          status: 403,
          error:
            'This individual invitation is reserved for a different email address. Please enter the invited guest email.',
        }
      }

      // Prevent the same email from claiming multiple tickets from the exact same link
      if (
        existingClaims.some(
          (entry: any) => String(entry?.claimantEmail || '').trim().toLowerCase() === email,
        )
      ) {
        return {
          ok: false as const,
          status: 409,
          error: 'You have already claimed a ticket using this private invitation link.',
        }
      }

      const eventId = typeof link.event === 'object' ? link.event.id : link.event
      const ticketTypeId =
        typeof link.ticketType === 'object' ? link.ticketType?.id : link.ticketType || null

      const [event, ticketType] = await Promise.all([
        payload
          .findByID({
            collection: 'events',
            id: eventId,
            overrideAccess: true,
            draft: true,
            depth: 0,
          })
          .catch(() => null),
        ticketTypeId
          ? payload
              .findByID({
                collection: 'ticket-types',
                id: ticketTypeId,
                overrideAccess: true,
                depth: 0,
              })
              .catch(() => null)
          : Promise.resolve(null),
      ])

      if (!event || event.reviewStatus !== 'approved' || event._status !== 'published') {
        return {
          ok: false as const,
          status: 409,
          error: 'This event is not approved or currently accepting registrations.',
        }
      }

      const nowIso = new Date().toISOString()
      const fullName = `${firstName} ${lastName}`.trim()
      const passLabel = String(
        link.categoryLabel || ticketType?.name || 'Private Free Invitation',
      )

      const reference = `INV-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
      const order: any = await payload.create({
        collection: 'orders',
        overrideAccess: true,
        data: {
          reference,
          event: event.id,
          orderKind: 'free',
          purchaseMode: 'self',
          customer: { firstName, lastName, email, phone },
          attendeeAnswers: Array.isArray(body.attendeeAnswers) ? body.attendeeAnswers : [],
          items: [
            {
              ...(ticketType?.id ? { ticketType: ticketType.id } : {}),
              name: passLabel,
              quantity: 1,
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
          emailDeliveryStatus: 'pending',
          emailAttempts: 0,
          status: 'paid',
          paidAt: nowIso,
        } as any,
      })

      const issued = await issueUniqueTicket({
        payload,
        issuanceKey: `${order.id}:invite:${link.id}:${claimedCount + 1}`,
        orderId: String(order.id),
        eventId: String(event.id),
        ticketTypeId: ticketType?.id ? String(ticketType.id) : null,
        ticketLabel: passLabel,
        attendeeName: fullName,
        attendeeEmail: email,
        attendeePhone: phone,
        acquisitionType: 'private-invitation',
        purchaserName: fullName,
        purchaserEmail: email,
        peopleCovered: 1,
        invitationLinkId: String(link.id),
        source: 'free-claim',
      })
      const ticket: any = issued.ticket
      const ticketCode = String(ticket.code)

      const nextClaimedCount = claimedCount + 1
      const nextStatus =
        nextClaimedCount >= maxClaims ? (maxClaims === 1 ? 'claimed' : 'exhausted') : 'active'
      const nextClaims = [
        ...existingClaims,
        {
          claimantName: fullName,
          claimantEmail: email,
          claimantPhone: phone,
          ticketId: String(ticket.id),
          ticketCode,
          claimedAt: nowIso,
        },
      ]

      await payload.update({
        collection: 'free-ticket-links' as any,
        id: link.id,
        overrideAccess: true,
        data: {
          status: nextStatus,
          claimedCount: nextClaimedCount,
          claimedAt: nowIso,
          claimedByName: fullName,
          claimedByEmail: email,
          ticket: ticket.id,
          claims: nextClaims,
        } as any,
      })

      return {
        ok: true as const,
        linkId: link.id,
        linkCode: String(link.code),
        personalMessage: link.personalMessage ? String(link.personalMessage) : undefined,
        event,
        order,
        eventTitle: event.title,
        ticketTypeName: passLabel,
        ticketId: String(ticket.id),
        ticketCode,
        rawToken: issued.rawToken,
        reference,
        fullName,
        remainingClaims: Math.max(0, maxClaims - nextClaimedCount),
      }
    })

    if (!claimResult.ok) {
      return Response.json({ error: claimResult.error }, { status: claimResult.status })
    }

    const requestOrigin = (() => {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = forwardedHost || request.headers.get('host')
      const proto =
        request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
        (request.url.startsWith('https://') ? 'https' : 'http')
      return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || ''
    })()

    const ticketRecords = await getTicketsForOrderDisplay(
      payload,
      { ...claimResult.order, event: claimResult.event },
      requestOrigin,
    )
    const emailPayload = await buildTicketConfirmationEmail({
      buyerName: claimResult.fullName,
      event: claimResult.event,
      order: claimResult.order,
      tickets: ticketRecords,
      baseUrl: requestOrigin,
      variant: 'private-invitation',
      personalMessage: claimResult.personalMessage,
    })

    const emailStatus = await sendTransactionalEmail({
      payload,
      to: email,
      subject: emailPayload.subject,
      title: 'Your AZORTIX invitation is confirmed!',
      bodyHtml: emailPayload.html,
      text: emailPayload.text,
      rawHtml: true,
      attachments: emailPayload.attachments,
    })

    await recordTicketEmailDelivery(
      [claimResult.ticketId],
      emailStatus,
      String(claimResult.order.id),
    )

    await logAudit({
      payload,
      action: 'free_invitation.claimed',
      category: 'ticket',
      targetCollection: 'free-ticket-links',
      targetId: claimResult.linkId,
      summary: `Private invitation ${claimResult.linkCode} claimed by ${email} (${claimResult.ticketCode}) for "${claimResult.eventTitle}".`,
    })

    return Response.json({
      ticketCode: claimResult.ticketCode,
      orderReference: claimResult.reference,
      ticketUrl: `/tickets/${encodeURIComponent(claimResult.rawToken)}`,
      confirmationUrl: `/confirmation/${encodeURIComponent(claimResult.reference)}`,
      remainingClaims: claimResult.remainingClaims,
      emailStatus,
      message: 'Your AZORTIX invitation is confirmed! Your unique QR pass is ready.',
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to claim invitation ticket.' },
      { status: 400 },
    )
  }
}
