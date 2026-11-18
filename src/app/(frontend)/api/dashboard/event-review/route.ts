import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || !['admin', 'super-admin'].includes(user.role)) {
    return Response.json({ error: 'Staff access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const eventId = String(form.get('eventId') || '')
  const decision = form.get('decision') === 'approved' ? 'approved' : 'rejected'
  const reviewNote = String(form.get('reviewNote') || '').trim()
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'events',
    id: eventId,
    overrideAccess: false,
    user,
    draft: decision !== 'approved',
    data: {
      reviewStatus: decision,
      reviewNote,
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.id,
    },
  })
  return Response.json({
    message:
      decision === 'approved'
        ? 'Event approved and published.'
        : 'Event returned to the organizer.',
  })
}
