import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'
import { getPgPool } from '@/lib/postgres'
import {
  canUserValidateEvent,
  getEventAttendanceStats,
  validateAndCheckInTicket,
} from '@/lib/tickets'

export async function GET(request: Request) {
  const auth = await requireActiveDashboardUser()
  if (!auth.ok) {
    return Response.json(
      { ok: false, error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user
  const eventId = new URL(request.url).searchParams.get('eventId')?.trim() || ''
  if (!eventId) {
    return Response.json({ ok: false, error: 'Missing eventId parameter.' }, { status: 400 })
  }

  const pool = getPgPool(false)
  const evRes = await pool.query<{ id: string; organizer_id: string }>(
    'SELECT "id", "organizer_id" FROM "events" WHERE "id" = $1::uuid LIMIT 1',
    [eventId],
  )
  const ev = evRes.rows[0]
  if (!ev) {
    return Response.json({ ok: false, error: 'Event not found.' }, { status: 404 })
  }

  const allowed = await canUserValidateEvent(
    pool,
    {
      id: String(user.id),
      email: String((user as any).email || ''),
      role: String((user as any).role || ''),
    },
    String(ev.organizer_id),
    String(ev.id),
  )
  if (!allowed) {
    return Response.json(
      { ok: false, error: 'You are not authorized to view check-in stats for this event.' },
      { status: 403 },
    )
  }

  const stats = await getEventAttendanceStats(String(ev.id))
  return Response.json({ ok: true, stats })
}

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser()
  if (!auth.ok) {
    return Response.json(
      {
        ok: false,
        code: 'INVALID_TICKET',
        headline: 'UNAUTHORIZED',
        error: auth.error,
        message: auth.error,
        requirePasswordChange: auth.requirePasswordChange,
      },
      { status: auth.status },
    )
  }
  const user = auth.user

  let rawInput = ''
  let eventId = ''
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    rawInput = String(body.token || body.code || body.input || '').trim()
    eventId = String(body.eventId || '').trim()
  } else {
    const form = await request.formData()
    rawInput = String(form.get('token') || form.get('code') || form.get('input') || '').trim()
    eventId = String(form.get('eventId') || '').trim()
  }

  if (!rawInput) {
    return Response.json(
      {
        ok: false,
        code: 'INVALID_TICKET',
        headline: 'INVALID TICKET',
        error: 'INVALID TICKET — Ticket not found or verification failed.',
        message: 'INVALID TICKET — Ticket not found or verification failed.',
      },
      { status: 400 },
    )
  }

  const result = await validateAndCheckInTicket({
    rawInput,
    user: {
      id: String(user.id),
      name: String((user as any).name || (user as any).email || 'Staff'),
      email: String((user as any).email || ''),
      role: String((user as any).role || ''),
    },
    expectedEventId: eventId || null,
  })

  if (result.ok && result.ticket) {
    const payload = await getPayloadClient()
    await logAudit({
      payload,
      action: 'ticket.checked_in',
      category: 'ticket',
      actor: user as any,
      targetCollection: 'tickets',
      targetId: result.ticket.id,
      summary: `Checked in ${result.ticket.attendeeName} (${result.ticket.code}, ${result.ticket.acquisitionType}) for "${result.ticket.eventName}".`,
    })
  }

  const statsEventId = eventId || result.ticket?.eventId || ''
  const stats = statsEventId ? await getEventAttendanceStats(statsEventId).catch(() => null) : null

  return Response.json(
    {
      ok: result.ok,
      code: result.code,
      headline: result.headline,
      message: result.message,
      ...(result.ok ? {} : { error: result.message }),
      ticket: result.ticket ?? null,
      stats,
    },
    { status: result.httpStatus },
  )
}
