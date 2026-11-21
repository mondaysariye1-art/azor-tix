import { redirect } from 'next/navigation'
import ChangePasswordForm from '@/components/ChangePasswordForm'
import { getCurrentAppUser } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')
  if (user.accountStatus === 'suspended') redirect('/login')

  return (
    <ChangePasswordForm
      email={user.email}
      role={user.role}
      mandatory={Boolean(user.mustChangePassword)}
    />
  )
}
