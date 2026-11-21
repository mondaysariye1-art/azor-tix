import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { isEmailConfigured } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  try {
    const form = await request.formData()
    const commissionPercent = Number(form.get('commissionPercent'))
    const serviceFeePercent = Number(form.get('serviceFeePercent'))
    const minimumPayout = Number(form.get('minimumPayout'))
    const supportEmail = String(form.get('supportEmail') || '').trim()
    const salesEnabled = form.has('salesEnabled')
      ? form.get('salesEnabled') === 'true' || form.get('salesEnabled') === 'on'
      : true

    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 50 ||
      !Number.isFinite(serviceFeePercent) ||
      serviceFeePercent < 0 ||
      serviceFeePercent > 25 ||
      !Number.isFinite(minimumPayout) ||
      minimumPayout < 0 ||
      !supportEmail.includes('@')
    ) {
      return Response.json(
        {
          error:
            'Enter valid platform settings (commission 0–50%, service fee 0–25%, minimum payout >= 0, valid support email).',
        },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()
    await payload.updateGlobal({
      slug: 'platform-settings',
      overrideAccess: false,
      user,
      data: {
        commissionPercent,
        serviceFeePercent,
        emailDeliveryEnabled: isEmailConfigured(),
        minimumPayout,
        supportEmail,
        salesEnabled,
      },
    })

    await logAudit({
      payload,
      action: 'settings.updated',
      category: 'settings',
      actor: user as any,
      targetCollection: 'platform-settings',
      summary: `Super Admin updated platform settings: commission=${commissionPercent}%, serviceFee=${serviceFeePercent}%, minPayout=₦${minimumPayout}, salesEnabled=${salesEnabled}.`,
    })

    return Response.json({ message: 'Platform settings updated.' })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to update platform settings.' },
      { status: 400 },
    )
  }
}
