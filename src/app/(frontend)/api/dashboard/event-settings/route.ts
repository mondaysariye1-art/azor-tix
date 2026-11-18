import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer') {
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const eventId = String(form.get('eventId') || '')
  const title = String(form.get('title') || '').trim()
  const venue = String(form.get('venue') || '').trim()
  const capacity = Number(form.get('capacity'))
  const checkInStatus = form.get('checkInStatus') === 'open' ? 'open' : 'closed'
  if (!eventId || title.length < 3 || venue.length < 3 || capacity < 1) {
    return Response.json({ error: 'Enter valid event settings.' }, { status: 400 })
  }
  const payload = await getPayloadClient()
  const data: {
    title: string
    venue: string
    capacity: number
    checkInStatus: 'open' | 'closed'
  } = { title, venue, capacity, checkInStatus }
  if (form.get('publish') === 'true') {
    await payload.update({
      collection: 'events',
      overrideAccess: false,
      user,
      id: eventId,
      draft: false,
      data,
    })
  } else {
    await payload.update({
      collection: 'events',
      overrideAccess: false,
      user,
      id: eventId,
      draft: true,
      data,
    })
  }
  return Response.json({ message: 'Event settings saved.' })
}
