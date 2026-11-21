import crypto from 'node:crypto'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import { getTicketBaseUrl } from '@/lib/tickets'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  try {
    const contentType = request.headers.get('content-type') || ''
    let action = 'create'
    let linkId = ''
    let eventId = ''
    let invitationType: 'individual' | 'shareable' = 'individual'
    let categoryLabel = 'Private Free Invitation'
    let maxClaims = 1
    let recipientName = ''
    let recipientEmail = ''
    let personalMessage = ''
    let expiresInHours = 0
    let expiresAtInput = ''

    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
      action = String(body.action || 'create').trim()
      linkId = String(body.linkId || '').trim()
      eventId = String(body.eventId || '').trim()
      invitationType = body.invitationType === 'shareable' ? 'shareable' : 'individual'
      categoryLabel = String(body.categoryLabel || 'Private Free Invitation').trim().slice(0, 80)
      maxClaims = Number(body.maxClaims || 1)
      recipientName = String(body.recipientName || '').trim().slice(0, 120)
      recipientEmail = String(body.recipientEmail || '').trim().toLowerCase()
      personalMessage = String(body.personalMessage || '').trim().slice(0, 500)
      expiresInHours = Number(body.expiresInHours || 0)
      expiresAtInput = String(body.expiresAt || '').trim()
    } else {
      const form = await request.formData()
      action = String(form.get('action') || 'create').trim()
      linkId = String(form.get('linkId') || '').trim()
      eventId = String(form.get('eventId') || '').trim()
      invitationType = form.get('invitationType') === 'shareable' ? 'shareable' : 'individual'
      categoryLabel = String(form.get('categoryLabel') || 'Private Free Invitation')
        .trim()
        .slice(0, 80)
      maxClaims = Number(form.get('maxClaims') || 1)
      recipientName = String(form.get('recipientName') || '').trim().slice(0, 120)
      recipientEmail = String(form.get('recipientEmail') || '')
        .trim()
        .toLowerCase()
      personalMessage = String(form.get('personalMessage') || '').trim().slice(0, 500)
      expiresInHours = Number(form.get('expiresInHours') || 0)
      expiresAtInput = String(form.get('expiresAt') || '').trim()
    }

    const payload = await getPayloadClient()

    if (action === 'revoke') {
      if (!linkId) {
        return Response.json({ error: 'Missing invitation link ID.' }, { status: 400 })
      }
      const existing: any = await payload
        .findByID({
          collection: 'free-ticket-links' as any,
          id: linkId,
          overrideAccess: false,
          user,
          depth: 0,
        })
        .catch(() => null)
      if (!existing) {
        return Response.json({ error: 'Private free invitation not found.' }, { status: 404 })
      }
      if (existing.status === 'revoked') {
        return Response.json({ message: 'Invitation link is already revoked.' })
      }
      // Revoking stops future claims without cancelling any already-issued tickets.
      await payload.update({
        collection: 'free-ticket-links' as any,
        id: linkId,
        overrideAccess: false,
        user,
        data: { status: 'revoked' },
      })
      await logAudit({
        payload,
        action: 'free_invitation.revoked',
        category: 'ticket',
        actor: user as any,
        targetCollection: 'free-ticket-links',
        targetId: linkId,
        summary: `Revoked private free invitation ${existing.code} (already-issued tickets remain valid).`,
      })
      return Response.json({
        message: 'Private invitation revoked. Future claims are blocked; already-issued tickets remain valid.',
      })
    }

    if (!eventId) {
      return Response.json({ error: 'Select an event for this private invitation.' }, { status: 400 })
    }

    const event: any = await payload
      .findByID({
        collection: 'events',
        id: eventId,
        overrideAccess: false,
        user,
        draft: true,
        depth: 0,
      })
      .catch(() => null)
    if (!event) {
      return Response.json({ error: 'Event not found on your account.' }, { status: 404 })
    }

    if (invitationType === 'individual') {
      if (recipientName.length < 2 || !emailPattern.test(recipientEmail)) {
        return Response.json(
          { error: 'Individual invitations require a guest full name and valid email address.' },
          { status: 400 },
        )
      }
      maxClaims = 1
    } else {
      if (!Number.isInteger(maxClaims) || maxClaims < 1 || maxClaims > 500) {
        return Response.json(
          { error: 'Shareable invitation claim limit must be between 1 and 500.' },
          { status: 400 },
        )
      }
    }

    const nowMs = Date.now()
    let expiresAt: string | undefined
    if (expiresAtInput) {
      const parsed = new Date(expiresAtInput)
      if (!Number.isFinite(parsed.valueOf()) || parsed.valueOf() <= nowMs) {
        return Response.json({ error: 'Expiration date must be in the future.' }, { status: 400 })
      }
      expiresAt = parsed.toISOString()
    } else if (Number.isFinite(expiresInHours) && expiresInHours > 0) {
      expiresAt = new Date(nowMs + expiresInHours * 60 * 60 * 1000).toISOString()
    }

    // Cryptographically unpredictable private invitation token (never guessable)
    const code = `INV-${crypto.randomBytes(18).toString('base64url')}`
    const organizerId =
      typeof event.organizer === 'object' ? event.organizer?.id || user.id : event.organizer || user.id

    const created: any = await payload.create({
      collection: 'free-ticket-links' as any,
      overrideAccess: true,
      data: {
        code,
        event: event.id,
        organizer: organizerId,
        invitationType,
        categoryLabel: categoryLabel || 'Private Free Invitation',
        maxClaims,
        claimedCount: 0,
        recipientName: recipientName || undefined,
        recipientEmail: recipientEmail || undefined,
        personalMessage: personalMessage || undefined,
        status: 'active',
        expiresAt,
        claims: [],
      },
    })

    const requestOrigin = (() => {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const host = forwardedHost || request.headers.get('host')
      const proto =
        request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
        (request.url.startsWith('https://') ? 'https' : 'http')
      return host ? `${proto}://${host}` : undefined
    })()
    const baseUrl = getTicketBaseUrl(requestOrigin)
    const claimPath = `/free-ticket/${encodeURIComponent(code)}`
    const fullClaimUrl = `${baseUrl}${claimPath}`

    let emailStatus: any = undefined
    if (invitationType === 'individual' && recipientEmail) {
      emailStatus = await sendTransactionalEmail({
        payload,
        to: recipientEmail,
        subject: `Private Invitation to ${event.title} — AZORTIX`,
        title: `You're invited to ${event.title}`,
        bodyHtml: `<p>Hello ${recipientName},</p><p>You have received a private free ticket invitation (<strong>${categoryLabel || 'Private Free Invitation'}</strong>) for <strong>${event.title}</strong> on AZORTIX.</p>${personalMessage ? `<blockquote style="margin:14px 0;padding:12px 16px;border-left:3px solid #0a0a0a;background:#f4f4f5;">${personalMessage}</blockquote>` : ''}<p>This invitation is reserved exclusively for <strong>${recipientEmail}</strong>.</p><p><a href="${fullClaimUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:12px 22px;text-decoration:none;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Claim Your Free Invitation</a></p><p style="font-size:12px;color:#6f6b76;">Direct link: ${fullClaimUrl}</p>`,
        text: `Hello ${recipientName}, you have received a private free ticket invitation for ${event.title} on AZORTIX. Claim it here: ${fullClaimUrl}`,
      })
    }

    await logAudit({
      payload,
      action: 'free_invitation.created',
      category: 'ticket',
      actor: user as any,
      targetCollection: 'free-ticket-links',
      targetId: created.id,
      summary: `Created ${invitationType} private free invitation (${maxClaims} claim${maxClaims === 1 ? '' : 's'}) for "${event.title}"${recipientEmail ? ` (${recipientEmail})` : ''}.`,
    })

    return Response.json({
      link: created,
      code,
      claimPath,
      fullClaimUrl,
      emailStatus,
      message:
        invitationType === 'individual'
          ? `Private invitation created for ${recipientName} (${recipientEmail}).`
          : `Shareable private invitation created (${maxClaims} claim limit).`,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to manage private invitation.' },
      { status: 400 },
    )
  }
}
