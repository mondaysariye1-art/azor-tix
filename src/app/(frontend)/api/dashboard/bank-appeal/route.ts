import { requireActiveDashboardUser } from '@/lib/app-auth'
import { logAudit } from '@/lib/audit'
import { sendTransactionalEmail } from '@/lib/email'
import { getPayloadClient } from '@/lib/payload'
import { resolveBankAccount } from '@/lib/paystack'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  try {
    const form = await request.formData()
    const bankCode = String(form.get('bankCode') || '').trim()
    const bankNameInput = String(form.get('bankName') || '').trim()
    const accountNumber = String(form.get('accountNumber') || '').replace(/\s+/g, '')
    const confirmAccountNumber = String(
      form.get('confirmAccountNumber') || accountNumber,
    ).replace(/\s+/g, '')
    const reason = String(form.get('reason') || '').trim()

    if (reason.length < 10) {
      return Response.json(
        { error: 'Provide a clear reason (at least 10 characters) for requesting a bank change.' },
        { status: 400 },
      )
    }
    if (accountNumber !== confirmAccountNumber) {
      return Response.json(
        { error: 'New account number and confirmation account number must match.' },
        { status: 400 },
      )
    }

    const payload = await getPayloadClient()
    const existingBankRes = await payload.find({
      collection: 'bank-verifications',
      overrideAccess: true,
      where: { organizer: { equals: user.id } },
      limit: 1,
      depth: 0,
    })
    const currentBank: any = existingBankRes.docs[0]
    if (!currentBank) {
      return Response.json(
        { error: 'Add and verify your initial settlement bank account before submitting an appeal.' },
        { status: 400 },
      )
    }

    const pendingAppeals = await payload.find({
      collection: 'bank-change-appeals',
      overrideAccess: true,
      where: {
        and: [{ organizer: { equals: user.id } }, { status: { equals: 'pending' } }],
      },
      limit: 1,
      depth: 0,
    })
    if (pendingAppeals.docs[0]) {
      return Response.json(
        { error: 'You already have a pending bank account change appeal under review.' },
        { status: 409 },
      )
    }

    if (
      currentBank.accountNumber === accountNumber &&
      currentBank.bankCode === bankCode
    ) {
      return Response.json(
        { error: 'The proposed bank account matches your currently locked bank account.' },
        { status: 400 },
      )
    }

    const resolution = await resolveBankAccount(accountNumber, bankCode)
    if (!resolution.ok) {
      return Response.json({ error: resolution.error }, { status: resolution.status })
    }

    const nowMs = Date.now()
    const submittedAt = new Date(nowMs).toISOString()
    const reviewEligibleAt = new Date(nowMs + THREE_DAYS_MS).toISOString()
    const proposedBankName = resolution.bankName || bankNameInput || bankCode

    const created = await payload.create({
      collection: 'bank-change-appeals',
      overrideAccess: true,
      data: {
        organizer: user.id,
        currentBankName: currentBank.bankName,
        currentBankCode: currentBank.bankCode,
        currentAccountNumber: currentBank.accountNumber,
        currentAccountName: currentBank.accountName,
        proposedBankName,
        proposedBankCode: resolution.bankCode,
        proposedAccountNumber: resolution.accountNumber,
        proposedAccountName: resolution.accountName,
        verificationProvider: 'paystack',
        reason,
        status: 'pending',
        submittedAt,
        reviewEligibleAt,
        auditHistory: [
          {
            action: 'Appeal submitted',
            actorEmail: user.email,
            actorRole: user.role,
            note: reason,
            at: submittedAt,
          },
        ],
      } as any,
    })

    const emailStatus = await sendTransactionalEmail({
      payload,
      to: user.email,
      subject: 'Bank Account Change Appeal Submitted — AZORTIX',
      title: 'Bank account change appeal received',
      bodyHtml: `<p>Your bank account change appeal has been submitted for security review.</p><p><strong>Proposed New Account:</strong> ${resolution.accountName} (${proposedBankName} · ${resolution.accountNumber})</p><p>Per AZORTIX policy, appeals enter a <strong>3-day security hold</strong> and become eligible for approval after <strong>${new Date(reviewEligibleAt).toUTCString()}</strong>.</p>`,
      text: `Bank change appeal submitted for ${resolution.accountName} (${proposedBankName} - ${resolution.accountNumber}). Eligible for approval after ${reviewEligibleAt}.`,
    })

    await logAudit({
      payload,
      action: 'bank_appeal.submitted',
      category: 'appeal',
      actor: user as any,
      targetCollection: 'bank-change-appeals',
      targetId: created.id,
      summary: `Bank change appeal submitted by ${user.email}: ${currentBank.accountNumber} -> ${resolution.accountNumber}. Eligible for approval at ${reviewEligibleAt}.`,
    })

    return Response.json({
      appeal: created,
      emailStatus,
      message:
        'Bank account change appeal submitted. A 3-day security review period applies before Admin/Super Admin approval.',
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to submit bank change appeal.' },
      { status: 400 },
    )
  }
}
