import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || !['admin', 'super-admin'].includes(user.role)) {
    return Response.json({ error: 'Staff access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const userId = String(form.get('userId') || '')
  const status = form.get('status') === 'active' ? 'active' : 'suspended'
  const payload = await getPayloadClient()
  const target = await payload.findByID({
    collection: 'users',
    overrideAccess: false,
    user,
    id: userId,
    depth: 0,
  })
  if (target.role !== 'organizer' && user.role !== 'super-admin') {
    return Response.json({ error: 'Only Super Admin can manage staff accounts.' }, { status: 403 })
  }
  await payload.update({
    collection: 'users',
    overrideAccess: false,
    user,
    id: userId,
    data: { accountStatus: status },
  })
  return Response.json({ message: `Account ${status}.` })
}
