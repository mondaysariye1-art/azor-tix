import { redirect } from 'next/navigation'
import EventWizard from '@/components/EventWizard'
import {
  getCurrentAppUser,
  getDashboardPathForRole,
  isDashboardRole,
} from '@/lib/app-auth'

export default async function NewEventPage() {
  const user = await getCurrentAppUser()
  if (!user || user.accountStatus === 'suspended') redirect('/login')
  if (!isDashboardRole(user.role)) redirect('/')
  if (user.mustChangePassword) redirect('/change-password')
  if (user.role !== 'organizer') redirect(getDashboardPathForRole(user.role))
  return <EventWizard dashboardUrl={getDashboardPathForRole(user.role)} />
}
