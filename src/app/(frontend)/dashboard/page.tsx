import { redirect } from 'next/navigation'
import {
  getCurrentAppUser,
  getDashboardPathForRole,
  isDashboardRole,
} from '@/lib/app-auth'

export default async function DashboardEntry() {
  const user = await getCurrentAppUser()
  if (!user || user.accountStatus === 'suspended') redirect('/login')
  if (!isDashboardRole(user.role)) redirect('/')
  if (user.mustChangePassword) redirect('/change-password')
  redirect(getDashboardPathForRole(user.role))
}
