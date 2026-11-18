import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'super-admin') {
    return Response.json({ error: 'Super Admin access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const id = String(form.get('payoutId') || '')
  const decision = String(form.get('decision') || '')
  const status = decision === 'paid' ? 'paid' : decision === 'approved' ? 'approved' : 'rejected'
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'payout-requests',
    overrideAccess: false,
    user,
    id,
    data: {
      status,
      reviewedBy: user.id,
      ...(status === 'paid' ? { paidAt: new Date().toISOString() } : {}),
    },
  })
  return Response.json({ message: `Payout request ${status}.` })
}
