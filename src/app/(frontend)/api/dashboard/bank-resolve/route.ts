import { requireActiveDashboardUser } from '@/lib/app-auth'
import { resolveBankAccount } from '@/lib/paystack'

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer', 'admin', 'super-admin'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, any> | null
    const accountNumber = String(body?.accountNumber || '').replace(/\s+/g, '')
    const confirmAccountNumber = String(body?.confirmAccountNumber || accountNumber).replace(/\s+/g, '')
    const bankCode = String(body?.bankCode || '').trim()

    if (accountNumber !== confirmAccountNumber) {
      return Response.json(
        { error: 'Account number and confirmation account number do not match.' },
        { status: 400 },
      )
    }

    const resolution = await resolveBankAccount(accountNumber, bankCode)
    if (!resolution.ok) {
      return Response.json({ error: resolution.error }, { status: resolution.status })
    }

    return Response.json({
      accountName: resolution.accountName,
      accountNumber: resolution.accountNumber,
      bankCode: resolution.bankCode,
      bankName: resolution.bankName,
      message: 'Bank account holder name verified.',
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to verify bank account details.' },
      { status: 400 },
    )
  }
}
