import { redirect } from 'next/navigation'
import { finalizePaystackPayment } from '@/lib/payments'
import { resolvePublicOrigin, verifyPaystackTransaction } from '@/lib/paystack'

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get('reference')?.trim() || ''
  if (!reference) redirect('/payment-error')

  const verification = await verifyPaystackTransaction(reference)
  if (!verification.ok) {
    console.error('[paystack/verify] verification rejected:', {
      reference,
      status: verification.status,
      error: verification.error,
    })
    redirect('/payment-error')
  }

  const baseUrl = resolvePublicOrigin(request)
  try {
    await finalizePaystackPayment(verification.data, { baseUrl })
  } catch (error) {
    console.error('[paystack/verify] finalization failed:', {
      reference,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    redirect('/payment-error')
  }
  redirect(`/confirmation/${encodeURIComponent(reference)}`)
}
