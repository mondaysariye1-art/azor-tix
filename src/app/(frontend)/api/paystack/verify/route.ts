import { redirect } from 'next/navigation'
import { finalizePaystackPayment } from '@/lib/payments'

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get('reference')
  if (!reference || !process.env.PAYSTACK_SECRET_KEY) redirect('/payment-error')
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: 'no-store',
    },
  )
  const result = await response.json()
  if (!response.ok || !result.status) redirect('/payment-error')
  try {
    await finalizePaystackPayment(result.data)
  } catch {
    redirect('/payment-error')
  }
  redirect(`/confirmation/${encodeURIComponent(reference)}`)
}
