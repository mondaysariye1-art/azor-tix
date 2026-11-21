import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'
import { resendTicketEmailById } from '@/lib/tickets'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser()
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  let ticketId = ''
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    ticketId = String(body.ticketId || '').trim()
  } else {
    const form = await request.formData()
    ticketId = String(form.get('ticketId') || '').trim()
  }

  if (!ticketId) {
    return Response.json({ error: 'Missing ticket ID.' }, { status: 400 })
  }

  const payload = await getPayloadClient()
  const ticket: any = await payload
    .findByID({
      collection: 'tickets',
      id: ticketId,
      overrideAccess: true,
      depth: 1,
    })
    .catch(() => null)
  if (!ticket) {
    return Response.json({ error: 'Ticket not found.' }, { status: 404 })
  }

  const eventOrganizerId =
    typeof ticket.event === 'object'
      ? String(typeof ticket.event.organizer === 'object' ? ticket.event.organizer?.id : ticket.event.organizer)
      : ''
  const purchaserUserId =
    typeof ticket.purchaserUser === 'object'
      ? String(ticket.purchaserUser?.id || '')
      : String(ticket.purchaserUser || '')
  const userEmail = String(user.email || '').trim().toLowerCase()
  const isStaff = user.role === 'admin' || user.role === 'super-admin'
  const isEventOrganizer = eventOrganizerId && eventOrganizerId === String(user.id)
  const isPurchaser =
    (purchaserUserId && purchaserUserId === String(user.id)) ||
    (ticket.purchaserEmail && String(ticket.purchaserEmail).trim().toLowerCase() === userEmail)
  const isTicketHolder =
    ticket.attendeeEmail && String(ticket.attendeeEmail).trim().toLowerCase() === userEmail

  if (!isStaff && !isEventOrganizer && !isPurchaser && !isTicketHolder) {
    return Response.json(
      { error: 'You are not authorized to resend this ticket email.' },
      { status: 403 },
    )
  }

  const requestOrigin = (() => {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = forwardedHost || request.headers.get('host')
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
      (request.url.startsWith('https://') ? 'https' : 'http')
    return host ? `${proto}://${host}` : undefined
  })()

  const result = await resendTicketEmailById({
    payload,
    ticketId: String(ticket.id),
    baseUrl: requestOrigin,
  })

  await logAudit({
    payload,
    action: 'ticket.email_resent',
    category: 'ticket',
    actor: user as any,
    targetCollection: 'tickets',
    targetId: ticket.id,
    summary: `Resend ticket email for ${ticket.code} to ${ticket.attendeeEmail}: ${result.ok ? 'sent' : `failed (${result.delivery.reason || 'unconfigured'})`}.`,
  })

  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        delivery: result.delivery,
        error: result.delivery.reason || 'Ticket email could not be delivered.',
      },
      { status: result.delivery.configured ? 502 : 503 },
    )
  }

  return Response.json({
    ok: true,
    delivery: result.delivery,
    message: `Ticket email resent to ${result.recipientEmail} (${result.ticketCode}) without creating duplicates.`,
  })
}
