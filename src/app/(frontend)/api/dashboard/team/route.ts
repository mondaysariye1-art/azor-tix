import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer')
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  const form = await request.formData()
  const name = String(form.get('name') || '').trim()
  const email = String(form.get('email') || '')
    .trim()
    .toLowerCase()
  const role = String(form.get('role') || '')
  if (
    name.length < 2 ||
    !email.includes('@') ||
    !['manager', 'check-in', 'analyst', 'finance'].includes(role)
  )
    return Response.json({ error: 'Enter valid teammate details.' }, { status: 400 })
  const payload = await getPayloadClient()
  const permissions: Array<'events' | 'attendees' | 'check-in' | 'reports' | 'finance'> =
    role === 'manager'
      ? ['events', 'attendees', 'check-in', 'reports']
      : role === 'check-in'
        ? ['attendees', 'check-in']
        : role === 'analyst'
          ? ['reports']
          : ['finance', 'reports']
  await payload.create({
    collection: 'team-memberships',
    overrideAccess: false,
    user,
    data: {
      organizer: user.id,
      name,
      email,
      role: role as 'manager' | 'check-in' | 'analyst' | 'finance',
      permissions,
      invitationStatus: 'pending',
      active: true,
    },
  })
  return Response.json({ message: 'Teammate added.' })
}
