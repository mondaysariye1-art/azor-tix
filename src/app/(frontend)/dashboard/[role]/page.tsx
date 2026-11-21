import { notFound, redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import {
  getCurrentAppUser,
  getDashboardPathForRole,
  isDashboardRole,
} from '@/lib/app-auth'
import { getDashboardData } from '@/lib/dashboard-data'

export default async function RoleDashboard({ params }: PageProps<'/dashboard/[role]'>) {
  const { role } = await params
  const user = await getCurrentAppUser()
  if (!user || user.accountStatus === 'suspended') redirect('/login')
  if (!isDashboardRole(user.role)) redirect('/')
  if (user.mustChangePassword) redirect('/change-password')
  if (!isDashboardRole(role)) notFound()
  if (user.role !== role) redirect(getDashboardPathForRole(user.role))
  return <Dashboard user={JSON.parse(JSON.stringify(user))} data={await getDashboardData(user)} />
}
