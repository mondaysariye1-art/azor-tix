import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer') {
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const eventId = String(form.get('eventId') || '')
  const publishParam = form.get('publish')
  if (!eventId) {
    return Response.json({ error: 'Missing event ID.' }, { status: 400 })
  }
  const payload = await getPayloadClient()

  try {
    const existing: any = await payload.findByID({
      collection: 'events',
      overrideAccess: false,
      user,
      id: eventId,
      draft: true,
      depth: 0,
    })

    const title = form.has('title') ? String(form.get('title') || '').trim() : existing.title
    const venue = form.has('venue') ? String(form.get('venue') || '').trim() : existing.venue
    const capacity = form.has('capacity') ? Number(form.get('capacity')) : Number(existing.capacity)
    const checkInStatus = form.has('checkInStatus')
      ? form.get('checkInStatus') === 'open'
        ? 'open'
        : 'closed'
      : existing.checkInStatus || 'closed'

    if (title.length < 3 || !venue || venue.length < 3 || !Number.isFinite(capacity) || capacity < 1) {
      return Response.json({ error: 'Enter valid event settings.' }, { status: 400 })
    }

    const shouldPublish =
      publishParam === 'true'
        ? true
        : publishParam === 'false'
          ? false
          : existing._status === 'published'

    const data: Record<string, any> = {
      title,
      venue,
      capacity,
      checkInStatus,
      _status: shouldPublish ? 'published' : 'draft',
      ...(shouldPublish ? {} : { reviewStatus: 'draft' }),
    }

    const updated = await payload.update({
      collection: 'events',
      overrideAccess: false,
      user,
      id: eventId,
      draft: false,
      data,
    })

    return Response.json({
      message:
        publishParam === 'true'
          ? 'Event published and live.'
          : publishParam === 'false'
            ? 'Event moved back to draft.'
            : 'Event settings saved.',
      slug: updated.slug,
      status: updated._status,
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Event settings could not be updated.' },
      { status: 400 },
    )
  }
}
