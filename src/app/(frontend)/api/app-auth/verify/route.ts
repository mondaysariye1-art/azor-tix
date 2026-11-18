import { getPayloadClient } from '@/lib/payload'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token) return Response.json({ error: 'Verification token is missing.' }, { status: 400 })
    const payload = await getPayloadClient()
    const verified = await payload.verifyEmail({ collection: 'users', token })
    if (!verified) throw new Error('Invalid token')
    return Response.json({ message: 'Email verified.' })
  } catch {
    return Response.json(
      { error: 'This verification link is invalid or expired.' },
      { status: 400 },
    )
  }
}
