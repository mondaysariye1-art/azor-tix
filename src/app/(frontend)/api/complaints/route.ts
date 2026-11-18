import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Submit the support form with valid fields.' }, { status: 400 })
  }
  const value = (name: string) => String(form.get(name) || '').trim()
  const name = value('name')
  const email = value('email').toLowerCase()
  const subject = value('subject')
  const message = value('message')
  if (name.length < 2 || !email.includes('@') || subject.length < 4 || message.length < 20)
    return Response.json({ error: 'Complete every required field.' }, { status: 400 })
  const payload = await getPayloadClient()
  await payload.create({
    collection: 'complaints',
    overrideAccess: true,
    data: {
      name,
      email,
      subject,
      message,
      orderReference: value('orderReference') || undefined,
      status: 'open',
    },
  })
  return Response.json({ message: 'Support request received.' })
}
