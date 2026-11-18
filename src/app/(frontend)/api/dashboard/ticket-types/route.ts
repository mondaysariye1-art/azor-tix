import { getCurrentAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const user = await getCurrentAppUser()
  if (!user || user.role !== 'organizer') {
    return Response.json({ error: 'Organizer access required.' }, { status: 403 })
  }
  const form = await request.formData()
  const event = String(form.get('eventId') || '')
  const name = String(form.get('name') || '').trim()
  const description = String(form.get('description') || '').trim()
  const price = Number(form.get('price'))
  const quantity = Number(form.get('quantity'))
  if (!event || name.length < 2 || price < 0 || quantity < 1) {
    return Response.json({ error: 'Enter valid ticket details.' }, { status: 400 })
  }
  const payload = await getPayloadClient()
  await payload.create({
    collection: 'ticket-types',
    overrideAccess: false,
    user,
    data: { event, name, description, price, quantity, maxPerOrder: 8, active: true },
  })
  return Response.json({ message: 'Ticket category added.' })
}
