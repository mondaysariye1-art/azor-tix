import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'super-admin')
    return Response.json({ error: 'Super Admin access required.' }, { status: 403 })
  const form = await request.formData()
  const commissionPercent = Number(form.get('commissionPercent'))
  const serviceFeePercent = Number(form.get('serviceFeePercent'))
  const minimumPayout = Number(form.get('minimumPayout'))
  const supportEmail = String(form.get('supportEmail') || '').trim()
  if (
    commissionPercent !== 5 ||
    serviceFeePercent !== 2 ||
    minimumPayout < 0 ||
    !supportEmail.includes('@')
  )
    return Response.json({ error: 'Enter valid financial settings.' }, { status: 400 })
  const payload = await getPayloadClient()
  await payload.updateGlobal({
    slug: 'platform-settings',
    overrideAccess: false,
    user,
    data: {
      commissionPercent: 5,
      serviceFeePercent: 2,
      emailDeliveryEnabled: false,
      minimumPayout,
      supportEmail,
    },
  })
  return Response.json({ message: 'Platform settings updated.' })
}
