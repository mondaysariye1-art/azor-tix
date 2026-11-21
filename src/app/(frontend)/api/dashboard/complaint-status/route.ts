import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

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
  await logAudit({
    payload,
    action: 'complaint.resolved',
    category: 'admin',
    actor: user as any,
    targetCollection: 'complaints',
    targetId: id,
    summary: `${user.role} marked complaint ${id} resolved.`,
  })
  return Response.json({ message: 'Complaint resolved.' })
}
