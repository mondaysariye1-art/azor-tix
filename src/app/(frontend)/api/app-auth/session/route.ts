import { getCurrentAppUser, getDashboardPathForRole, isDashboardRole } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentAppUser()
  if (!user || user.accountStatus === 'suspended' || !isDashboardRole(user.role)) {
    return Response.json(
      {
        authenticated: false,
        role: null,
        dashboardUrl: null,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }

  const dashboardUrl = user.mustChangePassword
    ? '/change-password'
    : getDashboardPathForRole(user.role)

  return Response.json(
    {
      authenticated: true,
      role: user.role,
      accountType: user.accountType || 'individual',
      name: user.accountType === 'organization' ? user.businessName || user.name : user.name,
      mustChangePassword: Boolean(user.mustChangePassword),
      dashboardUrl,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
