import { redirect } from 'next/navigation'
import EventWizard from '@/components/EventWizard'
import { getCurrentAppUser } from '@/lib/app-auth'

export default async function NewEventPage() {
  const user = await getCurrentAppUser()
  if (!user) redirect('/login')
  if (user.role !== 'organizer') redirect(`/dashboard/${user.role}`)
  return <EventWizard />
}
