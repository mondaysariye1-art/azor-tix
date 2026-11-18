import { notFound, redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import { getCurrentAppUser } from '@/lib/app-auth'
import { getDashboardData } from '@/lib/dashboard-data'

export default async function RoleDashboard({ params }: PageProps<'/dashboard/[role]'>) {
  const { role } = await params
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')
  if (!['organizer', 'admin', 'super-admin'].includes(role)) notFound()
  if (user.role !== role) redirect(`/dashboard/${user.role}`)
  return <Dashboard user={JSON.parse(JSON.stringify(user))} data={await getDashboardData(user)} />
}
