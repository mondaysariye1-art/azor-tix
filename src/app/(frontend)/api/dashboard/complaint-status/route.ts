import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || !['admin', 'super-admin'].includes(user.role)) {
    return Response.json({ error: 'Staff access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const id = String(form.get('complaintId') || '')
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'complaints',
    overrideAccess: false,
    user,
    id,
    data: { status: 'resolved' },
  })
  return Response.json({ message: 'Complaint resolved.' })
}
