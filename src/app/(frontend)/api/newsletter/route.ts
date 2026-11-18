import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'Enter a valid email.' }, { status: 400 })
  const payload = await getPayloadClient()
  const existing = await payload.find({
    collection: 'subscribers',
    overrideAccess: true,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs[0]) {
    await payload.update({
      collection: 'subscribers',
      overrideAccess: true,
      id: existing.docs[0].id,
      data: { status: 'subscribed' },
    })
  } else {
    await payload.create({
      collection: 'subscribers',
      overrideAccess: true,
      data: { email, status: 'subscribed' },
    })
  }
  return Response.json({ message: 'You’re on the list.' })
}
