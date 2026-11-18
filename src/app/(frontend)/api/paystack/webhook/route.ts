import crypto from 'node:crypto'
import { finalizePaystackPayment } from '@/lib/payments'

export async function POST(request: Request) {
  if (!process.env.PAYSTACK_SECRET_KEY) return new Response('Not configured', { status: 503 })
  const rawBody = await request.text()
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex')
  const supplied = request.headers.get('x-paystack-signature') || ''
  const valid =
    supplied.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  if (!valid) return new Response('Invalid signature', { status: 401 })
  const event = JSON.parse(rawBody)
  if (event.event === 'charge.success') await finalizePaystackPayment(event.data)
  return Response.json({ received: true })
}
