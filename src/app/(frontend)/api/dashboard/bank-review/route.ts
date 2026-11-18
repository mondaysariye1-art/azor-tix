import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'super-admin') {
    return Response.json({ error: 'Super Admin access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const id = String(form.get('bankId') || '')
  const status = form.get('decision') === 'verified' ? 'verified' : 'rejected'
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'bank-verifications',
    id,
    overrideAccess: false,
    user,
    data: { status, ...(status === 'verified' ? { verifiedAt: new Date().toISOString() } : {}) },
  })
  return Response.json({ message: `Bank details ${status}.` })
}
