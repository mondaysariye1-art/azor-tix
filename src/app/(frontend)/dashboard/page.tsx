import { redirect } from 'next/navigation'
import { getCurrentAppUser } from '@/lib/app-auth'

export default async function DashboardEntry() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')
  redirect(`/dashboard/${user.role}`)
}
