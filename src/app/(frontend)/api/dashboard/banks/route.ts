import { requireActiveDashboardUser } from '@/lib/app-auth'
import { listNigerianBanks } from '@/lib/paystack'

export async function GET() {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const result = await listNigerianBanks()
  return Response.json(result)
}
