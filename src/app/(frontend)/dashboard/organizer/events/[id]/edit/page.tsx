import { notFound, redirect } from 'next/navigation'
import EventWizard from '@/components/EventWizard'
import {
  getCurrentAppUser,
  getDashboardPathForRole,
  isDashboardRole,
} from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentAppUser()
  if (!user || user.accountStatus === 'suspended') redirect('/login')
  if (!isDashboardRole(user.role)) redirect('/')
  if (user.mustChangePassword) redirect('/change-password')
  if (user.role !== 'organizer') redirect(getDashboardPathForRole(user.role))
  const { id } = await params
  const payload = await getPayloadClient()
  let event
  try {
    event = await payload.findByID({
      collection: 'events',
      id,
      overrideAccess: false,
      user,
      depth: 1,
      draft: true,
    })
  } catch {
    notFound()
  }
  const tickets = await payload.find({
    collection: 'ticket-types',
    overrideAccess: false,
    user,
    where: { event: { equals: id } },
    limit: 100,
    depth: 0,
  })
  return (
    <EventWizard
      dashboardUrl={`/dashboard/${user.role}`}
      initialEvent={JSON.parse(JSON.stringify(event))}
      initialTickets={JSON.parse(JSON.stringify(tickets.docs))}
    />
  )
}
