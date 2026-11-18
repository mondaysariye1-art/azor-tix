import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user) return Response.json({ error: 'Sign in required.' }, { status: 401 })
  const form = await request.formData()
  const code = String(form.get('code') || '').trim()
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'tickets',
    overrideAccess: false,
    user,
    where: { code: { equals: code } },
    limit: 1,
    depth: 1,
  })
  const ticket = result.docs[0]
  if (!ticket) return Response.json({ error: 'Ticket not found for your events.' }, { status: 404 })
  if (ticket.status !== 'valid')
    return Response.json({ error: `Ticket is already ${ticket.status}.` }, { status: 409 })
  const event = typeof ticket.event === 'object' ? ticket.event : null
  if (event?.checkInStatus !== 'open' && user.role === 'organizer')
    return Response.json({ error: 'Open check-in in event settings first.' }, { status: 409 })
  await payload.update({
    collection: 'tickets',
    overrideAccess: false,
    user,
    id: ticket.id,
    data: { status: 'used', checkedInAt: new Date().toISOString(), checkedInBy: user.id },
  })
  return Response.json({ message: `${ticket.attendeeName} checked in successfully.` })
}
